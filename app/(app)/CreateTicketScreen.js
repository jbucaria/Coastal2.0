'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  View,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import DateTimePicker from '@react-native-community/datetimepicker' // Keep for Date picking
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete'
import 'react-native-get-random-values'
import * as ImagePicker from 'expo-image-picker'
import { collection, getDocs, addDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import { handleCreateTicket } from '@/utils/generateTicket'
import { useUserStore } from '@/store/useUserStore'
import PhotoGallery from '@/components/PhotoGallery'
import { formatPhoneNumber, parseAddressComponents } from '@/utils/helpers'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { formatAddress } from '@/utils/helpers'
import { pickAndUploadPhotos } from '@/utils/photoUpload'
import useAuthStore from '@/store/useAuthStore'
import { createCustomerInQuickBooks } from '@/utils/quickbooksApi'
import { ScrollView as RNScrollView } from 'react-native'
import Constants from 'expo-constants' // *** CHANGE 1: Import Constants ***

// *** CHANGE 2: Retrieve Google Maps API key from Constants ***
const GOOGLE_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey

// *** CHANGE 3: Add check for the key and log/alert if missing ***
if (!GOOGLE_API_KEY) {
  const errorMsg =
    'Missing Google Maps API key for Places Autocomplete. Ensure GOOGLE_API_KEY is set in .env and loaded in app.config.js under extra.googleMapsApiKey. Restart server (-c).'
  console.error(errorMsg)
  // Alert only in development to avoid disrupting users if key is missing in prod build
  if (__DEV__) {
    Alert.alert('Configuration Error', errorMsg)
  }
  // The component might still render but Autocomplete will fail.
}

// Initial ticket state object
const initialTicketStatus = {
  street: '',
  apt: '',
  city: '',
  state: '',
  zip: '',
  date: '',
  customer: '',
  customerName: '',
  customerNumber: '',
  customerEmail: '',
  customerId: '',
  homeOwnerName: '', // Optional homeowner contact
  homeOwnerNumber: '',
  builderSupervisorName: '', // Supervisor of the builder contact
  builderSupervisorPhone: '',
  lotNumber: '', // Lot number for the property
  inspectorName: '',
  reason: '',
  hours: '',
  typeOfJob: '',
  recommendedActions: '',
  startTime: new Date(),
  endTime: (() => {
    const defaultEndTime = new Date()
    defaultEndTime.setHours(defaultEndTime.getHours() + 2) // Default to 2 hours after start time
    // Adjust to nearest quarter hour if needed
    const minutes = defaultEndTime.getMinutes()
    const remainder = minutes % 15
    if (remainder !== 0) {
      defaultEndTime.setMinutes(minutes + (15 - remainder))
    }
    // Also adjust start time initially
    const initialStartTime = new Date()
    const initialMinutes = initialStartTime.getMinutes()
    const initialRemainder = initialMinutes % 15
    if (initialRemainder !== 0) {
      initialStartTime.setMinutes(initialMinutes + (15 - initialRemainder))
    }
    // Ensure default end time is after adjusted start time
    if (defaultEndTime <= initialStartTime) {
      defaultEndTime.setTime(initialStartTime.getTime() + 2 * 60 * 60 * 1000)
      const endMinutes = defaultEndTime.getMinutes()
      const endRemainder = endMinutes % 15
      if (endRemainder !== 0) {
        defaultEndTime.setMinutes(endMinutes + (15 - endRemainder))
      }
    }
    return defaultEndTime
  })(),
  messageCount: 0,
  reportPhotos: [],
  ticketPhotos: [],
  status: 'Open',
  onSite: false,
  inspectionComplete: false,
  remediationRequired: null,
  remediationStatus: '',
  equipmentOnSite: false,
  siteComplete: false,
  measurementsRequired: null,
}

const CreateTicketScreen = () => {
  const router = useRouter()
  const { user } = useUserStore()
  const { accessToken, quickBooksCompanyId } = useAuthStore()

  // Main state variables
  const [newTicket, setNewTicket] = useState(initialTicketStatus)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date()) // Date for both start and end times
  // startTime and endTime are now directly in newTicket state, but we'll keep local state to drive pickers more easily
  const [startTime, setStartTime] = useState(initialTicketStatus.startTime)
  const [endTime, setEndTime] = useState(initialTicketStatus.endTime)

  const [headerHeight, setHeaderHeight] = useState(0)
  const marginBelowHeader = 8
  const [step, setStep] = useState(1) // Step for conditional flow

  // Modal visibility state (for Job Type, Vacancy, Inspector, Add Photo)
  const [jobTypeModalVisible, setJobTypeModalVisible] = useState(false)
  const [vacancyModalVisible, setVacancyModalVisible] = useState(false)
  const [inspectorModalVisible, setInspectorModalVisible] = useState(false)
  const [addPhotoModalVisible, setAddPhotoModalVisible] = useState(false)

  // State for Native Date Picker (only for Date)
  const [showDatePicker, setShowDatePicker] = useState(false)

  // State for Custom Time Picker Modal
  const [customTimePickerModalVisible, setCustomTimePickerModalVisible] =
    useState(false)
  const [pickingTimeFor, setPickingTimeFor] = useState(null) // 'start' or 'end'
  const [tempHour, setTempHour] = useState('12') // Hour selected in the modal (1-12)
  const [tempMinute, setTempMinute] = useState('00') // Minute selected in the modal ('00', '15', '30', '45')
  const [tempPeriod, setTempPeriod] = useState('AM') // AM or PM selected in the modal

  // Helper to convert Date object time to picker values (12-hour format)
  const getTimeForPicker = date => {
    let hours = date.getHours()
    const minutes = date.getMinutes()
    const period = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12 // the hour '0' should be '12'
    const formattedHours = String(hours)

    let formattedMinutes = '00'
    if (minutes >= 0 && minutes < 15) formattedMinutes = '00'
    else if (minutes >= 15 && minutes < 30) formattedMinutes = '15'
    else if (minutes >= 30 && minutes < 45) formattedMinutes = '30'
    else formattedMinutes = '45' // covers 45-59

    return {
      hour: formattedHours,
      minute: formattedMinutes,
      period: period,
    }
  }

  // Open custom time picker modal
  const handleOpenCustomTimePicker = type => {
    setPickingTimeFor(type)
    const dateToPick = type === 'start' ? startTime : endTime
    const { hour, minute, period } = getTimeForPicker(dateToPick)
    setTempHour(hour)
    setTempMinute(minute)
    setTempPeriod(period)
    setCustomTimePickerModalVisible(true)
  }

  // Handle setting time from custom picker
  const handleSetCustomTime = () => {
    const selectedHours24 =
      tempPeriod === 'PM' && parseInt(tempHour, 10) !== 12
        ? parseInt(tempHour, 10) + 12
        : tempPeriod === 'AM' && parseInt(tempHour, 10) === 12
        ? 0 // 12 AM is 0 hours
        : parseInt(tempHour, 10)

    const newTime = new Date(selectedDate) // Start with the selected date
    newTime.setHours(selectedHours24, parseInt(tempMinute, 10), 0, 0)

    let updatedStartTime = startTime
    let updatedEndTime = endTime

    if (pickingTimeFor === 'start') {
      updatedStartTime = newTime
      // Ensure end time is after new start time
      if (updatedEndTime <= updatedStartTime) {
        const adjustedEndTime = new Date(updatedStartTime)
        adjustedEndTime.setTime(adjustedEndTime.getTime() + 2 * 60 * 60 * 1000) // Set 2 hours later
        // Adjust to nearest quarter hour
        const endMinutes = adjustedEndTime.getMinutes()
        const remainder = endMinutes % 15
        if (remainder !== 0) {
          adjustedEndTime.setMinutes(endMinutes + (15 - remainder))
        }
        updatedEndTime = adjustedEndTime
        Alert.alert(
          'Adjusted End Time',
          'End time must be after start time. It has been set to 2 hours after the new start time.'
        )
      }
      setStartTime(updatedStartTime)
      setEndTime(updatedEndTime) // Update end time state if adjusted
      setNewTicket(prev => ({
        ...prev,
        startTime: updatedStartTime,
        endTime: updatedEndTime,
      }))
    } else if (pickingTimeFor === 'end') {
      updatedEndTime = newTime
      // Ensure end time is after start time
      if (updatedEndTime <= startTime) {
        const adjustedEndTime = new Date(startTime)
        adjustedEndTime.setTime(adjustedEndTime.getTime() + 2 * 60 * 60 * 1000) // Set 2 hours later
        // Adjust to nearest quarter hour
        const endMinutes = adjustedEndTime.getMinutes()
        const remainder = endMinutes % 15
        if (remainder !== 0) {
          adjustedEndTime.setMinutes(endMinutes + (15 - remainder))
        }
        updatedEndTime = adjustedEndTime

        Alert.alert(
          'Adjusted End Time',
          'End time must be after start time. It has been set to 2 hours after the start time.'
        )
      }
      setEndTime(updatedEndTime)
      setNewTicket(prev => ({ ...prev, endTime: updatedEndTime }))
    }

    setCustomTimePickerModalVisible(false)
    setPickingTimeFor(null)
  }

  // Address state (from AddressModal)
  const [street, setStreet] = useState('')
  const [lotNumber, setLotNumber] = useState('') // Lot number field
  const [city, setCity] = useState('')
  const [stateField, setStateField] = useState('')
  const [zip, setZip] = useState('')

  // Builder state (from BuilderModal)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [allCustomers, setAllCustomers] = useState([])
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanyAddress, setNewCompanyAddress] = useState('')
  const [loading, setLoading] = useState(false)

  // Other state variables
  const [jobType, setJobType] = useState('')
  const [vacancy, setVacancy] = useState('')
  const [newNote, setNewNote] = useState('')

  // Function to toggle inspector modal
  const handleToggleInspectorPicker = () => {
    setInspectorModalVisible(!inspectorModalVisible)
  }

  // Load customers from Firestore
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const querySnapshot = await getDocs(collection(firestore, 'customers'))
        const customersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        setAllCustomers(customersData)
      } catch (error) {
        console.error('Error fetching customers:', error)
      }
    }
    fetchCustomers()
  }, [])

  // Update builder suggestions as the search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([])
      return
    }
    const queryLower = searchQuery.toLowerCase()
    const filtered = allCustomers.filter(c =>
      c.displayName?.toLowerCase().includes(queryLower)
    )
    setSuggestions(filtered)
  }, [searchQuery, allCustomers])

  // Date picker change handlers
  const handleDateChange = (event, date) => {
    setShowDatePicker(false) // Always hide after selection
    if (date) {
      setSelectedDate(date)
      // Update start and end times to use the new date
      const newStartTime = new Date(startTime)
      newStartTime.setFullYear(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      )
      const newEndTime = new Date(endTime)
      newEndTime.setFullYear(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      )
      setStartTime(newStartTime)
      setEndTime(newEndTime)
      setNewTicket(prev => ({
        ...prev,
        startTime: newStartTime,
        endTime: newEndTime,
      }))
    }
  }

  // Address handlers (from AddressModal)
  const handleAutocompletePress = (data, details = null) => {
    if (details && details.address_components) {
      const components = parseAddressComponents(details.address_components)
      setStreet(components.street)
      setCity(components.city)
      setStateField(components.state)
      setZip(components.zip)
    }
  }

  // Builder handlers (from BuilderModal)
  const handleSelectCustomer = customer => {
    setNewTicket(prev => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.displayName || '',
      customerEmail: customer.email || '',
      customerNumber: customer.number || '',
    }))
    setSearchQuery(customer.displayName)
  }

  const handleSaveNewCustomer = async () => {
    setLoading(true)
    try {
      const newCustomer = {
        displayName: newName || '',
        email: newEmail || '',
        phone: newPhone || '',
        companyName: newCompanyName || '',
        companyAddress: newCompanyAddress || '',
      }

      // Send the new customer to QuickBooks
      // NOTE: The QuickBooks API call here needs to be fully implemented.
      // This is a placeholder. You need to send the newCustomer data
      // to your backend/API that interacts with QuickBooks using accessToken
      // and quickBooksCompanyId.
      // For now, simulating success and generating a dummy ID.

      // const qbCustomerId = await createCustomerInQuickBooks( newCustomer, quickBooksCompanyId, accessToken );
      // Using a dummy ID for demonstration
      const qbCustomerId = `qb-${Date.now()}`

      // Add the QuickBooks customer id to the new customer object
      newCustomer.id = qbCustomerId // Use the ID from QuickBooks

      // Save the new customer to Firestore
      const docRef = await addDoc(
        collection(firestore, 'customers'),
        newCustomer
      )

      // Update newTicket with the new customer
      // Use the Firestore ID for internal reference if needed,
      // or primarily use the qbCustomerId if that's the main identifier.
      // For now, updating with the newCustomer object which includes qbCustomerId as 'id'
      handleSelectCustomer(newCustomer)

      // Reset the form fields
      setNewName('')
      setNewEmail('')
      setNewPhone('')
      setNewCompanyName('')
      setNewCompanyAddress('')
      setIsAddingNew(false)
      Alert.alert('Success', 'New customer saved.')
    } catch (error) {
      console.error('Error saving new customer:', error)
      Alert.alert(
        'Error',
        'Failed to save new customer. Check console for details.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  const resetForm = () => {
    setNewTicket(initialTicketStatus)
    setSearchQuery('')
    setSuggestions([])
    setStep(1) // Reset to the first step
    setStreet('')
    setCity('')
    setStateField('')
    setZip('')
    setNewName('')
    setNewEmail('')
    setNewPhone('')
    setNewCompanyName('')
    setNewCompanyAddress('')
    setIsAddingNew(false)
    // Reset time states as well
    const now = new Date()
    const initialStartTimeAdjusted = new Date(now)
    const initialMinutes = initialStartTimeAdjusted.getMinutes()
    const initialRemainder = initialMinutes % 15
    if (initialRemainder !== 0) {
      initialStartTimeAdjusted.setMinutes(
        initialMinutes + (15 - initialRemainder)
      )
    }

    const initialEndTimeAdjusted = new Date(initialStartTimeAdjusted)
    initialEndTimeAdjusted.setTime(
      initialStartTimeAdjusted.getTime() + 2 * 60 * 60 * 1000
    )
    const endMinutes = initialEndTimeAdjusted.getMinutes()
    const endRemainder = endMinutes % 15
    if (endRemainder !== 0) {
      initialEndTimeAdjusted.setMinutes(endMinutes + (15 - endRemainder))
    }
    setStartTime(initialStartTimeAdjusted)
    setEndTime(initialEndTimeAdjusted)
    setSelectedDate(new Date())
    setJobType('')
    setVacancy('')
    setNewNote('')
  }

  const handleTogglePicker = () => {
    setJobTypeModalVisible(prev => !prev)
  }
  const handleToggleVacancyPicker = () => {
    setVacancyModalVisible(prev => !prev)
  }

  const handleRemovePhoto = index => {
    setNewTicket(prev => ({
      ...prev,
      ticketPhotos: prev.ticketPhotos.filter((_, i) => i !== index),
    }))
  }

  const handleJobTypeChange = itemValue => {
    setJobType(itemValue)
    setNewTicket(prev => ({ ...prev, typeOfJob: itemValue }))
  }
  const handleVacancyChange = itemValue => {
    setVacancy(itemValue)
    setNewTicket(prev => ({ ...prev, occupied: itemValue === 'occupied' }))
  }

  const handleCreate = () => {
    // Ensure the latest state for time is in newTicket before creating
    const finalTicketData = {
      ...newTicket,
      startTime: startTime,
      endTime: endTime,
      street: street, // Address fields
      lotNumber: lotNumber, // Lot number, optional
      city: city,
      state: stateField,
      zip: zip,
      // Ticket-specific details
      typeOfJob: jobType,
      occupied: vacancy === 'occupied',
      note: newNote, // General note
      builderSupervisorName: newTicket.builderSupervisorName,
      builderSupervisorPhone: newTicket.builderSupervisorPhone,
    }

    // Add validation for required fields before creating
    if (
      !finalTicketData.street ||
      !finalTicketData.city ||
      !finalTicketData.state ||
      !finalTicketData.zip ||
      !finalTicketData.customerName ||
      !finalTicketData.inspectorName ||
      !finalTicketData.reason ||
      !finalTicketData.typeOfJob
    ) {
      Alert.alert(
        'Missing Information',
        'Please fill out all required fields (Address, Builder, Inspector, Reason, Job Type).'
      )
      return
    }

    handleCreateTicket(
      finalTicketData, // Pass the potentially updated ticket data
      selectedDate, // This might be redundant if startTime/endTime are correct
      finalTicketData.startTime,
      finalTicketData.endTime,
      resetForm,
      setIsSubmitting,
      isSubmitting, // Pass the current value, not the setter
      newNote, // Pass note separately if needed by generateTicket
      user
    )
  }

  const handleAddPhoto = useCallback(async () => {
    const folder = 'ticketPhotos'
    const photosArray = await pickAndUploadPhotos({ folder, quality: 0.7 })
    if (photosArray.length > 0) {
      // Store both storagePath and downloadURL for each photo
      setNewTicket(prev => ({
        ...prev,
        ticketPhotos: [...prev.ticketPhotos, ...photosArray],
      }))
      Alert.alert('Success', 'Photos added successfully.')
    } else {
      Alert.alert('No Selection', 'You did not select any image.')
    }
  }, [])

  // Navigation between steps
  const handleNextStep = () => {
    // Basic validation before moving to the next step
    let validationError = null
    if (step === 1) {
      // No specific validation needed for just date/time selection UI state
    } else if (step === 2) {
      if (!street || !city || !stateField || !zip) {
        validationError = 'Please complete the address information.'
      }
    } else if (step === 3) {
      if (!newTicket.customerName) {
        validationError = 'Please select or add a builder.'
      }
    } else if (step === 4) {
      // Homeowner name/number are optional based on initialTicketStatus structure
      // Add validation here if you make them required
    } else if (step === 5) {
      // Validation happens in the final handleCreate step
    }

    if (validationError) {
      Alert.alert('Validation Error', validationError)
      return // Stop if validation fails
    }

    if (step === 2) {
      // Save address to newTicket before proceeding
      const addressObj = {
        street,
        city,
        state: stateField,
        zip,
      }
      setNewTicket(prev => ({
        ...prev,
        ...addressObj,
      }))
    }
    setStep(prev => Math.min(prev + 1, 5)) // Max step is 5
  }

  const handlePreviousStep = () => {
    setStep(prev => Math.max(prev - 1, 1)) // Min step is 1
  }

  // Format date and time for display
  const formatDate = date => {
    if (!(date instanceof Date) || isNaN(date)) {
      return 'Select Date' // Handle invalid date
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = time => {
    if (!(time instanceof Date) || isNaN(time)) {
      return 'Select Time' // Handle invalid time
    }
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const hours = Array.from({ length: 12 }, (_, i) => String(i + 1)) // ['1', ..., '12']
  const minutes = ['00', '15', '30', '45']
  const periods = ['AM', 'PM']

  return (
    <View style={styles.fullScreenContainer}>
      <HeaderWithOptions
        title="Create Ticket"
        onBack={handleBack}
        options={[]}
        onHeightChange={height => setHeaderHeight(height)}
      />
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0} // Adjust offset as needed
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          {/* Using RNScrollView as suggested, though ScrollView from 'react-native' is common */}
          <RNScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.contentContainer,
              { paddingTop: headerHeight + marginBelowHeader },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Step 1: Date & Time */}
            {step === 1 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Date & Time</Text>
                <View style={styles.dateTimeSection}>
                  <Text style={styles.label}>Date:</Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    style={styles.dateTimeButton}
                  >
                    <Text style={styles.dateTimeText}>
                      {formatDate(selectedDate)}
                    </Text>
                  </TouchableOpacity>
                  {/* Native Date Picker */}
                  {showDatePicker && (
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      // Use 'calendar' or 'spinner' display mode for iOS
                      // 'default' for Android
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                    />
                  )}

                  <Text style={styles.label}>Start Time:</Text>
                  <TouchableOpacity
                    onPress={() => handleOpenCustomTimePicker('start')}
                    style={styles.dateTimeButton}
                  >
                    <Text style={styles.dateTimeText}>
                      {formatTime(startTime)}
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.label}>End Time:</Text>
                  <TouchableOpacity
                    onPress={() => handleOpenCustomTimePicker('end')}
                    style={styles.dateTimeButton}
                  >
                    <Text style={styles.dateTimeText}>
                      {formatTime(endTime)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Step 2: Address */}
            {step === 2 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Address</Text>
                {/* Google Places Autocomplete */}
                <GooglePlacesAutocomplete
                  debounce={500}
                  disableScroll={true} // Keep true if inside a ScrollView
                  fetchDetails={true}
                  onPress={(data, details) => {
                    handleAutocompletePress(data, details)
                  }}
                  placeholder="Search address..."
                  query={{
                    // *** CHANGE 4: Use the GOOGLE_API_KEY variable ***
                    key: GOOGLE_API_KEY || '', // Use loaded key or empty string if missing
                    language: 'en',
                    components: 'country:us',
                  }}
                  // Ensure textInputProps are set if you want to control value directly
                  textInputProps={{
                    onChangeText: text => {
                      /* Optional: handle text changes if needed */
                    },
                    // value: `${street} ${city} ${stateField} ${zip}`.trim(), // Can set value if needed
                    // Disable Autocomplete if key is missing
                    editable: !!GOOGLE_API_KEY,
                  }}
                  styles={{
                    container: {
                      // Add container style if needed
                      flex: 0, // Prevent container from expanding unnecessarily
                      marginBottom: 10,
                    },
                    textInputContainer: styles.autocompleteContainer,
                    textInput: [
                      styles.searchInput,
                      !GOOGLE_API_KEY && { backgroundColor: '#e0e0e0' }, // Grey out if disabled
                    ],
                    listView: {
                      backgroundColor: 'white',
                      elevation: 5,
                      maxHeight: 200,
                      position: 'absolute', // Helps positioning results over content
                      top: 50, // Adjust based on searchInput height and container padding
                      left: 0,
                      right: 0,
                      zIndex: 1000, // Ensure it's above other content
                    },
                    row: {
                      // Style for each suggestion item
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                    },
                    separator: {
                      // Optional separator style
                      height: StyleSheet.hairlineWidth,
                      backgroundColor: '#c8c7cc',
                    },
                  }}
                  enablePoweredByContainer={false} // Hide "powered by Google" logo
                  minLength={2} // Minimum characters before searching
                />

                {/* Address Input Fields (filled by Autocomplete or manually) */}
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
                <TextInput
                  style={styles.inputField}
                  placeholder="Lot Number (optional)"
                  value={lotNumber}
                  onChangeText={setLotNumber}
                />
              </View>
            )}

            {/* Step 3: Builder */}
            {step === 3 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Builder</Text>
                {isAddingNew ? (
                  <View>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Name"
                      value={newName}
                      onChangeText={setNewName}
                    />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Email"
                      value={newEmail}
                      onChangeText={setNewEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Phone Number"
                      value={newPhone}
                      onChangeText={text =>
                        setNewPhone(formatPhoneNumber(text))
                      } // Apply formatting
                      keyboardType="phone-pad"
                    />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Company Name"
                      value={newCompanyName}
                      onChangeText={setNewCompanyName}
                    />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Company Address"
                      value={newCompanyAddress}
                      onChangeText={setNewCompanyAddress}
                    />
                    {loading ? (
                      <ActivityIndicator size="small" color="#2980b9" />
                    ) : (
                      <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleSaveNewCustomer}
                      >
                        <Text style={styles.saveButtonText}>Save Customer</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => setIsAddingNew(false)}>
                      <Text style={styles.modalClose}>Back to Search</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Search builder by name..."
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                    {searchQuery.trim() !== '' && suggestions.length > 0 && (
                      <ScrollView style={styles.modalList}>
                        {suggestions.map(cust => (
                          <TouchableOpacity
                            key={cust.id}
                            onPress={() => handleSelectCustomer(cust)}
                            style={styles.modalItem}
                          >
                            <Text style={styles.modalItemText}>
                              {cust.displayName}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                    {searchQuery.trim() === '' && (
                      <Text style={styles.modalMessage}>
                        Type to search for builders.
                      </Text>
                    )}
                    {searchQuery.trim() !== '' &&
                      suggestions.length === 0 &&
                      !loading && (
                        <Text style={styles.modalMessage}>
                          No builders found matching your search.
                        </Text>
                      )}
                    <TouchableOpacity onPress={() => setIsAddingNew(true)}>
                      <Text style={styles.addNewText}>+ Add New Customer</Text>
                    </TouchableOpacity>
                    {newTicket.customerName && (
                      <View style={styles.selectedCustomerContainer}>
                        <Text style={styles.selectedCustomerText}>
                          Selected Builder:
                        </Text>
                        <Text style={styles.selectedCustomerName}>
                          {newTicket.customerName}
                        </Text>
                        <Text style={styles.selectedCustomerDetails}>
                          {newTicket.customerEmail}
                        </Text>
                        <Text style={styles.selectedCustomerDetails}>
                          {newTicket.customerNumber}
                        </Text>
                        {/* Supervisor fields for this ticket */}
                        <TextInput
                          style={styles.inputField}
                          placeholder="Builder Supervisor Name"
                          value={newTicket.builderSupervisorName}
                          onChangeText={text =>
                            setNewTicket(prev => ({
                              ...prev,
                              builderSupervisorName: text,
                            }))
                          }
                        />
                        <TextInput
                          style={styles.inputField}
                          placeholder="Builder Supervisor Phone"
                          value={newTicket.builderSupervisorPhone}
                          onChangeText={text =>
                            setNewTicket(prev => ({
                              ...prev,
                              builderSupervisorPhone: formatPhoneNumber(text),
                            }))
                          }
                          keyboardType="phone-pad"
                        />
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Step 4: Homeowner */}
            {step === 4 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Homeowner (Optional)</Text>
                {/* Homeowner Name and Number */}
                <TextInput
                  style={styles.inputField}
                  placeholder="Homeowner Name"
                  value={newTicket.homeOwnerName}
                  onChangeText={text =>
                    setNewTicket({ ...newTicket, homeOwnerName: text })
                  }
                />
                <TextInput
                  style={styles.inputField}
                  placeholder="Homeowner Number"
                  value={newTicket.homeOwnerNumber}
                  onChangeText={text => {
                    const formatted = formatPhoneNumber(text)
                    setNewTicket(prev => ({
                      ...prev,
                      homeOwnerNumber: formatted,
                    }))
                  }}
                  keyboardType="phone-pad"
                />
              </View>
            )}

            {/* Step 5: Ticket Details */}
            {step === 5 && (
              <View style={styles.stepContainer}>
                {/* Ticket Details Section */}
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Ticket Details</Text>
                  <View style={styles.inputGroup}>
                    <TouchableOpacity
                      onPress={handleToggleInspectorPicker}
                      style={styles.pickerButton}
                      accessibilityLabel="Select Inspector"
                    >
                      <Text style={styles.pickerButtonText}>
                        {newTicket.inspectorName
                          ? newTicket.inspectorName
                          : 'Select Inspector'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputGroup}>
                    <TextInput
                      style={styles.inputField}
                      placeholder="Reason for visit"
                      value={newTicket.reason}
                      onChangeText={text =>
                        setNewTicket({ ...newTicket, reason: text })
                      }
                      multiline
                      numberOfLines={4}
                      accessibilityLabel="Reason for visit"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <TextInput
                      style={styles.inputField}
                      placeholder="Add a note for this ticket..."
                      value={newNote}
                      onChangeText={setNewNote}
                      multiline
                      numberOfLines={3}
                      accessibilityLabel="Ticket note"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <TouchableOpacity
                      onPress={handleTogglePicker}
                      style={styles.pickerButton}
                      accessibilityLabel="Select Job Type"
                    >
                      <Text style={styles.pickerButtonText}>
                        {jobType ? jobType : 'Select Job Type'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputGroup}>
                    <TouchableOpacity
                      onPress={handleToggleVacancyPicker}
                      style={styles.pickerButton}
                      accessibilityLabel="Select Occupancy"
                    >
                      <Text style={styles.pickerButtonText}>
                        {vacancy === 'occupied'
                          ? 'Occupied'
                          : vacancy === 'unoccupied'
                          ? 'Unoccupied'
                          : 'Select Occupancy'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Photos Section */}
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Photos</Text>
                  {newTicket.ticketPhotos.length > 0 ? (
                    <RNScrollView horizontal style={styles.photoGallery}>
                      {newTicket.ticketPhotos.map((photoObj, index) => (
                        <View key={index} style={styles.photoContainer}>
                          <Image
                            source={{ uri: photoObj.downloadURL }}
                            style={styles.thumbnail}
                          />
                          <TouchableOpacity
                            style={styles.removePhotoButton}
                            onPress={() => handleRemovePhoto(index)}
                          >
                            <IconSymbol
                              name="xmark-circle-fill"
                              size={20}
                              color="red"
                            />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </RNScrollView>
                  ) : (
                    <Text style={styles.noPhotosText}>
                      No photos added yet.
                    </Text>
                  )}
                  {/* Instead of a separate modal, let's make Add Photo action direct */}
                  <TouchableOpacity
                    onPress={handleAddPhoto} // Directly call handleAddPhoto
                    style={styles.addPhotoButton}
                    accessibilityLabel="Add Photo"
                  >
                    <Text style={styles.addPhotoButtonText}>Add Photo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Inspector Modal */}
            <Modal
              visible={inspectorModalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={handleToggleInspectorPicker}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                  <Text style={styles.modalTitle}>Select Inspector</Text>
                  <Picker
                    selectedValue={newTicket.inspectorName}
                    onValueChange={itemValue => {
                      setNewTicket({ ...newTicket, inspectorName: itemValue })
                      handleToggleInspectorPicker() // Close modal on selection
                    }}
                    style={styles.modalPicker}
                    itemStyle={styles.pickerItem}
                    accessibilityLabel="Select Inspector"
                  >
                    <Picker.Item label="Select Inspector" value="" />
                    <Picker.Item
                      label="Bobby Blasewitz"
                      value="Bobby Blasewitz"
                    />
                    <Picker.Item label="David Sprott" value="David Sprott" />
                    <Picker.Item label="John Bucaria" value="John Bucaria" />
                  </Picker>
                  <TouchableOpacity
                    onPress={handleToggleInspectorPicker}
                    style={styles.modalCloseButton}
                    accessibilityLabel="Close Inspector Modal"
                  >
                    <Text style={styles.modalCloseButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Job Type Modal */}
            <Modal
              visible={jobTypeModalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={handleTogglePicker}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                  <Text style={styles.modalTitle}>Select Job Type</Text>
                  <Picker
                    selectedValue={jobType}
                    onValueChange={itemValue => {
                      handleJobTypeChange(itemValue)
                      handleTogglePicker() // Close modal on selection
                    }}
                    style={styles.modalPicker}
                    itemStyle={styles.pickerItem}
                    accessibilityLabel="Select Job Type"
                  >
                    <Picker.Item label="Select Job Type" value="" />
                    <Picker.Item
                      label="Leak Detection"
                      value="Leak Detection" // Use consistent casing/values
                    />
                    <Picker.Item label="Inspection" value="Inspection" />
                    <Picker.Item label="Containment" value="Containment" />
                    <Picker.Item label="Flood" value="Flood" />
                    <Picker.Item label="Mold Job" value="Mold Job" />
                    <Picker.Item label="Wipe Down" value="Wipe Down" />
                  </Picker>
                  <TouchableOpacity
                    onPress={handleTogglePicker}
                    style={styles.modalCloseButton}
                    accessibilityLabel="Close Job Type Modal"
                  >
                    <Text style={styles.modalCloseButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Vacancy Modal */}
            <Modal
              visible={vacancyModalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={handleToggleVacancyPicker}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                  <Text style={styles.modalTitle}>Select Occupancy</Text>
                  <Picker
                    selectedValue={vacancy}
                    onValueChange={itemValue => {
                      handleVacancyChange(itemValue)
                      handleToggleVacancyPicker() // Close modal on selection
                    }}
                    style={styles.modalPicker}
                    itemStyle={styles.pickerItem}
                    accessibilityLabel="Select Occupancy"
                  >
                    <Picker.Item label="Select Occupancy" value="" />
                    <Picker.Item label="Occupied" value="occupied" />
                    <Picker.Item label="Unoccupied" value="unoccupied" />
                  </Picker>
                  <TouchableOpacity
                    onPress={handleToggleVacancyPicker}
                    style={styles.modalCloseButton}
                    accessibilityLabel="Close Occupancy Modal"
                  >
                    <Text style={styles.modalCloseButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Custom Time Picker Modal */}
            <Modal
              visible={customTimePickerModalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setCustomTimePickerModalVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                  <Text style={styles.modalTitle}>
                    Select {pickingTimeFor === 'start' ? 'Start' : 'End'} Time
                  </Text>
                  <View style={styles.timePickerContainer}>
                    <Picker
                      selectedValue={tempHour}
                      onValueChange={itemValue => setTempHour(itemValue)}
                      style={styles.timePickerColumn}
                      itemStyle={styles.pickerItem}
                    >
                      {hours.map(h => (
                        <Picker.Item key={h} label={h} value={h} />
                      ))}
                    </Picker>
                    <Text style={styles.timePickerSeparator}>:</Text>
                    <Picker
                      selectedValue={tempMinute}
                      onValueChange={itemValue => setTempMinute(itemValue)}
                      style={styles.timePickerColumn}
                      itemStyle={styles.pickerItem}
                    >
                      {minutes.map(m => (
                        <Picker.Item key={m} label={m} value={m} />
                      ))}
                    </Picker>
                    <Picker
                      selectedValue={tempPeriod}
                      onValueChange={itemValue => setTempPeriod(itemValue)}
                      style={styles.timePickerPeriodColumn}
                      itemStyle={styles.pickerItem}
                    >
                      {periods.map(p => (
                        <Picker.Item key={p} label={p} value={p} />
                      ))}
                    </Picker>
                  </View>
                  <TouchableOpacity
                    onPress={handleSetCustomTime}
                    style={styles.modalConfirmButton}
                    accessibilityLabel={`Set ${
                      pickingTimeFor === 'start' ? 'Start' : 'End'
                    } Time`}
                  >
                    <Text style={styles.modalConfirmButtonText}>Set Time</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setCustomTimePickerModalVisible(false)}
                    style={styles.modalCloseButton}
                    accessibilityLabel="Cancel Time Selection"
                  >
                    <Text style={styles.modalCloseButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Navigation Buttons */}
            <View style={styles.navigationButtons}>
              {step > 1 && (
                <TouchableOpacity
                  onPress={handlePreviousStep}
                  style={[styles.actionButton, styles.previousButton]}
                >
                  <Text style={styles.actionButtonText}>Previous</Text>
                </TouchableOpacity>
              )}
              {step < 5 ? (
                <TouchableOpacity
                  onPress={handleNextStep}
                  style={[styles.actionButton, styles.nextButton]}
                >
                  <Text style={styles.actionButtonText}>Next</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleCreate}
                  style={[
                    styles.actionButton,
                    styles.createButton,
                    isSubmitting && styles.disabledButton,
                  ]}
                  disabled={isSubmitting}
                >
                  <Text style={styles.actionButtonText}>
                    {isSubmitting ? 'Creating...' : 'Create'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </RNScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  )
}

export default CreateTicketScreen

// Styles remain the same as before
const styles = StyleSheet.create({
  actionButton: {
    backgroundColor: '#2980b9',
    flex: 1,
    alignItems: 'center',
    borderRadius: 5,
    padding: 12,
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addNewText: {
    fontSize: 16,
    color: '#2980b9',
    textAlign: 'center',
    marginVertical: 10,
  },
  addPhotoButton: {
    backgroundColor: '#2ecc71',
    borderRadius: 5,
    padding: 12,
    alignItems: 'center',
    marginVertical: 10, // Added some margin
  },
  addPhotoButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  autocompleteContainer: {
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
    // marginBottom: 10, // Space before address fields
    zIndex: 1000, // Ensure results list appears above other content
    // Removed flex: 1 which might cause issues in ScrollView
  },
  button: {
    backgroundColor: '#2980b9',
    borderRadius: 5,
    padding: 12,
    alignItems: 'center',
    marginVertical: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#F5F8FA',
    borderColor: '#E1E8ED',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 15, // Increased margin between cards
    padding: 15, // Increased padding inside cards
  },
  contentContainer: {
    paddingBottom: 20,
    paddingHorizontal: 10, // Added horizontal padding to main container
  },
  createButton: {
    backgroundColor: '#2c3e50',
  },
  dateTimeButton: {
    padding: 12, // Increased padding
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginVertical: 8, // Increased vertical margin
  },
  dateTimeSection: {
    marginBottom: 10,
  },
  dateTimeText: {
    fontSize: 16,
    color: '#333',
  },
  disabledButton: {
    opacity: 0.6,
  },
  flex1: {
    flex: 1,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#E8ECF0', // Added a background color to the screen
  },
  inputField: {
    width: '100%',
    minHeight: 50, // Changed from fixed height to minHeight for multiline
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10, // Increased vertical padding
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top',
    marginBottom: 10, // Added margin bottom
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
    fontWeight: '500', // Made labels slightly bolder
  },
  modalClose: {
    color: '#2980b9',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 15,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    marginTop: 15,
    backgroundColor: '#ccc', // Changed close button color
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%', // Make button full width
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#333', // Changed close button text color
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    marginTop: 15,
    backgroundColor: '#2ecc71',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%', // Make button full width
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    width: '90%', // Slightly wider modal
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalInput: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8, // Rounded corners
    padding: 12, // Increased padding
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
    width: '100%', // Make input full width
    backgroundColor: '#f9f9f9', // Light background
  },
  modalItem: {
    paddingVertical: 12, // Increased padding
    paddingHorizontal: 8, // Added horizontal padding
    borderBottomWidth: StyleSheet.hairlineWidth, // Use hairlineWidth
    borderColor: '#eee',
  },
  modalItemText: {
    fontSize: 16,
    color: '#555',
  },
  modalList: {
    maxHeight: 200,
    marginBottom: 15, // Increased margin
    borderColor: '#ddd', // Added border
    borderWidth: 1,
    borderRadius: 8, // Rounded corners
    width: '100%', // Ensure list takes full width
  },
  modalMessage: {
    fontSize: 16,
    color: '#666', // Darker grey
    textAlign: 'center',
    marginBottom: 15,
    fontStyle: 'italic', // Italicize message
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', // Darker overlay
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalPicker: {
    width: '100%',
    height: 180, // Increased height
  },
  modalTitle: {
    fontSize: 22, // Larger title
    fontWeight: 'bold', // Bolder title
    marginBottom: 15, // Increased margin
    color: '#333',
    textAlign: 'center',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15, // Increased top margin
    marginBottom: 10,
    paddingHorizontal: 5, // Add horizontal padding
  },
  nextButton: {
    backgroundColor: '#2980b9',
  },
  noPhotosText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginVertical: 15, // Increased margin
  },
  photoContainer: {
    marginRight: 10,
    position: 'relative', // Needed for absolute positioning of remove button
  },
  photoGallery: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingVertical: 5, // Add vertical padding
  },
  pickerButton: {
    height: 50,
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginBottom: 10, // Added margin bottom for consistency
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  pickerItem: {
    fontSize: 18, // Slightly larger font in picker items
    height: 180, // Must match picker height for Android
  },
  previousButton: {
    // Added style for Previous button
    backgroundColor: '#7f8c8d', // Grey color for previous
  },
  removePhotoButton: {
    position: 'absolute',
    top: -5, // Adjust position
    right: -5, // Adjust position
    backgroundColor: 'white', // Add background for visibility
    borderRadius: 15, // Make it round
    padding: 2,
    zIndex: 1, // Ensure it's on top
  },
  saveButton: {
    backgroundColor: '#2ecc71', // Green for save
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    width: '100%',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1, // Allow scroll view to take available space
  },
  searchInput: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8, // Rounded corners
    padding: 12, // Increased padding
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9', // Light background
    height: 50, // Explicit height can help layout
  },
  selectedCustomerContainer: {
    marginTop: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#aed6f1', // Light blue border
    borderRadius: 8,
    backgroundColor: '#e8f6f3', // Light green background
  },
  selectedCustomerText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#2c3e50',
  },
  selectedCustomerName: {
    fontSize: 16,
    marginBottom: 2,
    color: '#333',
  },
  selectedCustomerDetails: {
    fontSize: 14,
    color: '#555',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold', // Bolder title
    marginVertical: 8,
    color: '#2c3e50',
    borderBottomWidth: 1, // Add separator line
    borderColor: '#eee',
    paddingBottom: 5,
  },
  stepContainer: {
    flex: 1,
    paddingVertical: 10,
  },
  thumbnail: {
    // Style for image thumbnails
    width: 80,
    height: 80,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: 180, // Match picker height
    marginBottom: 15,
  },
  timePickerColumn: {
    width: '32%', // Adjust width as needed
    height: 180,
  },
  timePickerPeriodColumn: {
    width: '25%', // Adjust width as needed for AM/PM
    height: 180,
  },
  timePickerSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 5,
  },
})
