import React from 'react'
import { View, Text, TextInput } from 'react-native'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'
import { styles } from '../../styles'

const Step2Address = ({
  street,
  setStreet,
  city,
  setCity,
  stateField,
  setStateField,
  zip,
  setZip,
  handleAutocompletePress,
}) => (
  <View style={styles.card}>
    <Text style={styles.sectionTitle}>Address</Text>
    <GooglePlacesAutocomplete
      debounce={500}
      disableScroll={true}
      fetchDetails={true}
      onPress={(data, details) => handleAutocompletePress(data, details)}
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
  </View>
)

export default Step2Address
