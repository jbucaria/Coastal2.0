// AddressModal.js
import React, { useState } from 'react'
import {
  View,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'
import { parseAddressComponents } from '@/utils/helpers'

const AddressModal = ({ visible, onClose, onAddressSelected }) => {
  // Local state for each address component
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [stateField, setStateField] = useState('')
  const [zip, setZip] = useState('')

  // When an address is selected from autocomplete, parse the address components and update state.
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
    setStreet('')
    setCity('')
    setStateField('')
    setZip('')
    onClose()
  }

  const handleSaveAddress = () => {
    const addressObj = {
      street,
      city,
      state: stateField,
      zip,
    }
    // Pass the object back to the parent
    onAddressSelected(addressObj)
    // Reset fields if desired
    setStreet('')
    setCity('')
    setStateField('')
    setZip('')
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Address</Text>

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
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveAddress}
          >
            <Text style={styles.saveButtonText}>Save Address</Text>
          </TouchableOpacity>

          {/* Close Button */}
          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.modalClose}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export default AddressModal

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    height: '70%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    color: '#333',
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
  modalClose: {
    color: '#2980b9',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 15,
  },
})
