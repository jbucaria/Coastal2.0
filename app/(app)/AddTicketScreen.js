import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from 'react-native'
import { useRouter } from 'expo-router'
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'
import DateTimePicker from '@react-native-community/datetimepicker'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import { parseAddressComponents, formatAddress } from '@/utils/helpers'

const AddTicketScreen = () => {
  const router = useRouter()
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
  })
  const [selectedAddress, setSelectedAddress] = useState('')
  const [manualEntry, setManualEntry] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [startTime, setStartTime] = useState(null)
  const [endTime, setEndTime] = useState(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showStartTimePicPker, setShowStartTimePicker] = useState(false)
  const [showEndTimePicker, setShowEndTimePicker] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0)
  const marginBelowHeader = 8

  // Handle date change
  const handleDateChange = (event, date) => {
    setShowDatePicker(false)
    if (date) setSelectedDate(date)
  }

  // Handle start time change
  const handleStartTimeChange = (event, time) => {
    setShowStartTimePicker(false)
    if (time) setStartTime(time)
  }

  // Handle end time change
  const handleEndTimeChange = (event, time) => {
    setShowEndTimePicker(false)
    if (time) setEndTime(time)
  }

  // Handle address selection from Google Places
  const handleAutocompletePress = (data, details = null) => {
  
    if (details && details.address_components) {
      const components = parseAddressComponents(details.address_components)
      const newAddress = {
        street: components.street || '',
        city: components.city || '',
        state: components.state || '',
        zip: components.zip || '',
      }
      setAddress(newAddress)
      setSelectedAddress(formatAddress(newAddress))
    } else {
      setAddress({ street: data.description, city: '', state: '', zip: '' })
      setSelectedAddress(data.description)
    }
  }

  // Handle autocomplete failure
  const handleAutocompleteFail = error => {
    console.error('Google Places Autocomplete Failed:', error)
    alert('Address search failed. Check console for details.')
  }

  // Handle manual address input
  const handleManualAddressChange = (field, value) => {
    setAddress(prev => ({ ...prev, [field]: value }))
    setSelectedAddress('')
  }

  // Navigate to CreateTicketScreen
  const handleCreateProject = () => {
    if (!address.street || !selectedDate || !startTime || !endTime) {
      alert(
        'Please provide a street address, appointment date, start time, and end time'
      )
      return
    }
    const fullAddress = `${address.street}${
      address.city ? ', ' + address.city : ''
    }${address.state ? ', ' + address.state : ''} ${address.zip}`.trim()
    router.push({
      pathname: '/CreateTicketScreen',
      params: {
        address: fullAddress,
        appointmentDate: selectedDate.toISOString(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
    })
  }

  const handleBack = () => {
    router.back()
  }

  const toggleManualEntry = () => {
    setManualEntry(prev => !prev)
    setSelectedAddress('')
    setAddress({ street: '', city: '', state: '', zip: '' })
  }

  const headerOptions = [
    { label: 'Create Project', onPress: handleCreateProject },
  ]

  return (
    <View style={styles.fullScreenContainer}>
      <HeaderWithOptions
        title="Add Ticket"
        onBack={handleBack}
        options={headerOptions}
        onHeightChange={height => setHeaderHeight(height)}
      />
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={40}
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View
            style={[
              styles.contentContainer,
              { paddingTop: headerHeight + marginBelowHeader },
            ]}
          >
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Property Address</Text>
              <View style={styles.toggleContainer}>
                <TouchableOpacity onPress={toggleManualEntry}>
                  <Text style={styles.toggleText}>
                    {manualEntry ? 'Use Address Search' : 'Enter Manually'}
                  </Text>
                </TouchableOpacity>
              </View>

              {!manualEntry ? (
                <View style={styles.addressContainer}>
                  <GooglePlacesAutocomplete
                    debounce={500}
                    fetchDetails={true}
                    onPress={handleAutocompletePress}
                    onFail={handleAutocompleteFail}
                    placeholder="Search address..."
                    query={{
                      key: 'AIzaSyCaaprXbVDmKz6W5rn3s6W4HhF4S1K2-zs', // Replace with your actual key
                      language: 'en',
                      components: 'country:us',
                    }}
                    styles={{
                      container: styles.autocompleteContainer,
                      textInputContainer: styles.autocompleteTextContainer,
                      textInput: styles.searchInput,
                      listView: styles.autocompleteList,
                      poweredContainer: { display: 'none' },
                    }}
                    enablePoweredByContainer={false}
                  />
                  {selectedAddress ? (
                    <View style={styles.selectedBox}>
                      <Text style={styles.selectedText}>
                        Selected Address: {selectedAddress}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.placeholderText}>
                      Type to search...
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.manualContainer}>
                  <TextInput
                    style={styles.inputField}
                    placeholder="Street Address"
                    value={address.street}
                    onChangeText={text =>
                      handleManualAddressChange('street', text)
                    }
                  />
                  <TextInput
                    style={styles.inputField}
                    placeholder="City"
                    value={address.city}
                    onChangeText={text =>
                      handleManualAddressChange('city', text)
                    }
                  />
                  <TextInput
                    style={styles.inputField}
                    placeholder="State"
                    value={address.state}
                    onChangeText={text =>
                      handleManualAddressChange('state', text)
                    }
                  />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Zip Code"
                    value={address.zip}
                    onChangeText={text =>
                      handleManualAddressChange('zip', text)
                    }
                    keyboardType="numeric"
                  />
                </View>
              )}

              <View style={styles.appointmentContainer}>
                <Text style={styles.sectionTitle}>Appointment Date & Time</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={styles.dateField}
                >
                  <Text style={styles.dateFieldText}>
                    {selectedDate
                      ? selectedDate.toLocaleDateString()
                      : 'Select Date'}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate || new Date()}
                    mode="date" // Only select date
                    display="default"
                    onChange={handleDateChange}
                  />
                )}
                <TouchableOpacity
                  onPress={() => setShowStartTimePicker(true)}
                  style={styles.dateField}
                >
                  <Text style={styles.dateFieldText}>
                    {startTime
                      ? startTime.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Select Start Time'}
                  </Text>
                </TouchableOpacity>
                {showStartTimePicker && (
                  <DateTimePicker
                    value={startTime || new Date()}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={handleStartTimeChange}
                    minuteInterval={15}
                  />
                )}
                <TouchableOpacity
                  onPress={() => setShowEndTimePicker(true)}
                  style={styles.dateField}
                >
                  <Text style={styles.dateFieldText}>
                    {endTime
                      ? endTime.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Select End Time'}
                  </Text>
                </TouchableOpacity>
                {showEndTimePicker && (
                  <DateTimePicker
                    value={endTime || new Date()}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={handleEndTimeChange}
                    minuteInterval={15}
                  />
                )}
                {selectedDate && startTime && endTime && (
                  <View style={styles.selectedBox}>
                    <Text style={styles.selectedText}>
                      Selected: {selectedDate.toLocaleDateString()} | Start:{' '}
                      {startTime.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      | End:{' '}
                      {endTime.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  fullScreenContainer: { flex: 1 },
  flex1: { flex: 1 },
  contentContainer: { paddingHorizontal: 5, paddingBottom: 20 },
  card: {
    backgroundColor: '#F5F8FA',
    borderColor: '#E1E8ED',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 8,
    color: '#2c3e50',
  },
  toggleContainer: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  toggleText: {
    color: '#2980b9',
    fontSize: 14,
  },
  addressContainer: {
    marginBottom: 20,
    zIndex: 1000,
  },
  autocompleteContainer: {
    flex: 0,
    zIndex: 1000,
  },
  autocompleteTextContainer: {
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
  },
  searchInput: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    color: '#333',
    zIndex: 1001,
  },
  autocompleteList: {
    backgroundColor: 'white',
    elevation: 5,
    maxHeight: 200,
    zIndex: 1002,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 5,
    position: 'relative',
  },
  selectedBox: {
    backgroundColor: '#f9f9f9',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    marginTop: 10,
  },
  selectedText: {
    fontSize: 16,
    color: '#555',
  },
  placeholderText: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  manualContainer: {
    marginBottom: 20,
  },
  inputField: {
    backgroundColor: '#f9f9f9',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    fontSize: 16,
    padding: 10,
    marginBottom: 10,
  },
  appointmentContainer: {
    marginTop: 20,
    zIndex: 500,
  },
  dateField: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
  },
  dateFieldText: {
    fontSize: 16,
    color: '#333',
  },
})

export default AddTicketScreen
