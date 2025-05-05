import React, { useState } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'
import { parseAddressComponents } from '@/utils/helpers'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'

const AddressScreen = () => {
  const router = useRouter()
  const { initialAddress } = useLocalSearchParams() // Get initial address from params (if any)

  // Parse initial address if provided
  const parsedInitialAddress = initialAddress
    ? JSON.parse(initialAddress)
    : null

  // Local state for each address component
  const [street, setStreet] = useState(parsedInitialAddress?.street || '')
  const [city, setCity] = useState(parsedInitialAddress?.city || '')
  const [stateField, setStateField] = useState(
    parsedInitialAddress?.state || ''
  )
  const [zip, setZip] = useState(parsedInitialAddress?.zip || '')
  const [headerHeight, setHeaderHeight] = useState(0)
  const marginBelowHeader = 8

  // When an address is selected from autocomplete, parse the address components and update state
  const handleAutocompletePress = (data, details = null) => {
    if (details && details.address_components) {
      const components = parseAddressComponents(details.address_components)
      setStreet(components.street)
      setCity(components.city)
      setStateField(components.state)
      setZip(components.zip)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  const handleSaveAddress = () => {
    const addressObj = {
      street,
      city,
      state: stateField,
      zip,
    }
    // Navigate back to CreateTicketScreen with the selected address
    router.back()
    router.setParams({ selectedAddress: JSON.stringify(addressObj) })
  }

  return (
    <View style={styles.container}>
      <HeaderWithOptions
        title="Select Address"
        onBack={handleCancel}
        options={[]}
        onHeightChange={height => setHeaderHeight(height)}
      />
      <View
        style={[
          styles.contentContainer,
          { paddingTop: headerHeight + marginBelowHeader },
        ]}
      >
        {/* Google Places Autocomplete */}
        <GooglePlacesAutocomplete
          debounce={500}
          disableScroll={true}
          fetchDetails={true}
          onPress={(data, details) => {
            handleAutocompletePress(data, details)
          }}
          placeholder="Search address..."
          query={{
            key: 'AIzaSyCaaprXbVDmKz6W5rn3s6W4HhF4S1K2-zs',
            language: 'en',
            components: 'country:us',
          }}
          styles={{
            textInputContainer: styles.autocompleteContainer,
            textInput: styles.searchInput,
            listView: {
              backgroundColor: 'white',
              elevation: 5,
              maxHeight: 200,
            },
          }}
        />

        {/* Address Input Fields */}
        <TextInput
          style={styles.inputField}
          placeholder="Street"
          value={street}
          onChangeText={setStreet}
        />
        <TextInput
          style={styles.inputField}
          placeholder="City"
          value={city}
          onChangeText={setCity}
        />
        <TextInput
          style={styles.inputField}
          placeholder="State"
          value={stateField}
          onChangeText={setStateField}
        />
        <TextInput
          style={styles.inputField}
          placeholder="Zip"
          value={zip}
          onChangeText={setZip}
          keyboardType="numeric"
        />

        {/* Save Address Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveAddress}>
          <Text style={styles.saveButtonText}>Save Address</Text>
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default AddressScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  autocompleteContainer: {
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
    marginBottom: 10,
  },
  searchInput: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    color: '#333',
  },
  inputField: {
    backgroundColor: '#f9f9f9',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    marginTop: 10,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#2980b9',
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 15,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  cancelButton: {
    color: '#2980b9',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 15,
  },
})
