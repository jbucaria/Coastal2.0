'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'expo-router'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { auth, firestore } from '@/firebaseConfig'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'

// Helper function to format phone number as (222) 787-9282
const formatPhoneNumber = phone => {
  // Remove all non-digit characters
  const cleaned = ('' + phone).replace(/\D/g, '')

  // Handle formatting based on length of digits:
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/)
  if (!match) return phone
  let formatted = ''
  if (match[1]) {
    formatted = '(' + match[1]
  }
  if (match[1] && match[1].length === 3) {
    formatted += ')'
  }
  if (match[2]) {
    formatted += match[2].length ? match[2] : ''
  }
  if (match[3]) {
    formatted += match[3].length ? '-' + match[3] : ''
  }
  return formatted
}

const onboardingScreen = () => {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    full: '',
  })
  const [error, setError] = useState('')
  const router = useRouter()
  const autocompleteRef = useRef(null)

  const handleAutocompletePress = (data, details = null) => {
    if (details && details.address_components) {
      const parsed = parseAddressComponents(details.address_components)
      setAddress({
        street: parsed.street,
        city: parsed.city,
        state: parsed.state,
        zip: parsed.zip,
        full: data.description,
      })
    } else {
      console.log('No details returned:', data)
      setAddress(prev => ({
        ...prev,
        street: data.description,
        full: data.description,
      }))
    }
  }

  // A helper function to parse address components returned by Google
  const parseAddressComponents = components => {
    let street = ''
    let city = ''
    let state = ''
    let zip = ''

    components.forEach(component => {
      const types = component.types
      if (types.includes('street_number')) {
        street = component.long_name + ' ' + street
      }
      if (types.includes('route')) {
        street += component.long_name
      }
      if (types.includes('locality')) {
        city = component.long_name
      }
      if (types.includes('administrative_area_level_1')) {
        state = component.short_name
      }
      if (types.includes('postal_code')) {
        zip = component.long_name
      }
    })
    return { street, city, state, zip }
  }

  // Handle updating phone with formatting
  const handlePhoneChange = text => {
    // Remove non-digit characters from input
    const digits = text.replace(/\D/g, '')
    const formatted = formatPhoneNumber(digits)
    setPhone(formatted)
  }

  const handleOnboarding = async () => {
    console.log('handleOnboarding called, starting validations...')
    if (
      fullName.trim() === '' ||
      phone.trim() === '' ||
      address.full.trim() === ''
    ) {
      console.log('Validation failed, missing required fields')
      setError('Display name, phone, and address are required.')
      return
    }

    console.log('Passed validations, attempting setDoc...')

    try {
      const currentUser = auth.currentUser
      if (currentUser) {
        await setDoc(
          doc(firestore, 'users', currentUser.uid),
          {
            fullName,
            phone,
            address,
            onboarded: true,
            email: currentUser.email,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        )

        router.replace('/(tabs)')
      } else {
      }
    } catch (err) {
      setError('Failed to save your profile. Please try again.')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome! Complete Your Profile</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter full name"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter your phone number"
        value={phone}
        onChangeText={handlePhoneChange}
        keyboardType="phone-pad"
      />
      <GooglePlacesAutocomplete
        ref={autocompleteRef}
        filterReverseGeocodingByTypes={['locality']}
        debounce={500}
        disableScroll={true}
        placeholder="Enter address"
        onPress={handleAutocompletePress}
        query={{
          key: 'AIzaSyCaaprXbVDmKz6W5rn3s6W4HhF4S1K2-zs', // Replace with your actual API key
          language: 'en',
          components: 'country:us',
        }}
        fetchDetails={true}
        styles={{
          textInputContainer: styles.autocompleteContainer,
          textInput: styles.input,
          listView: {
            backgroundColor: 'white',
            maxHeight: 200,
            elevation: 5,
            zIndex: 5,
          },
        }}
      />
      {/* Display the selected address */}
      {address.full ? (
        <Text style={styles.selectedAddress}>
          Selected Address: {address.full}
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleOnboarding}>
        <Text style={styles.buttonText}>Save & Continue</Text>
      </TouchableOpacity>
    </View>
  )
}

export default onboardingScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    fontSize: 18,
    marginBottom: 12,
    borderRadius: 8,
  },
  autocompleteContainer: {
    marginBottom: 12,
  },
  selectedAddress: {
    fontSize: 16,
    marginBottom: 12,
    color: '#333',
    textAlign: 'center',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#2C3E50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
})
