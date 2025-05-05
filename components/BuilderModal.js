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
import DateTimePicker from '@react-native-community/datetimepicker'
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

// Initial ticket state object
const initialTicketStatus = {
  street: '1111',
  apt: '',
  city: 'Trinity',
  state: 'Fl',
  zip: '34655',
  date: '',
  customer: 'DR Horton',
  customerName: 'Jakie Waller',
  customerNumber: '(727) 555-1234',
  customerEmail: 'jwaller@gmail.com',
  customerId: '191',
  homeOwnerName: 'John Smith',
  homeOwnerNumber: '(727) 555-5678',
  inspectorName: 'Dave Smith',
  reason: 'Leak in the bathroom',
  hours: '3',
  typeOfJob: 'Leak Detection',
  recommendedActions: '',
  startTime: new Date(),
  endTime: new Date(),
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
  const [startTime, setStartTime] = useState(new Date()) // Start time
  const [endTime, setEndTime] = useState(new Date()) // End time
  const [headerHeight, setHeaderHeight] = useState(0)
  const marginBelowHeader = 8
  const [step, setStep] = useState(1) // Step for conditional flow

  // Modal visibility state (for Job Type and Vacancy)
  const [jobTypeModalVisible, setJobTypeModalVisible] = useState(false)
  const [vacancyModalVisible, setVacancyModalVisible] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showStartTimePicker, setShowStartTimePicker] = useState(false)
  const [showEndTimePicker, setShowEndTimePicker] = useState(false)

  // Address state (from AddressModal)
  const [street, setStreet] = useState('')
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

  // Toggle for Homeowner info section
  const [showHomeowner, setShowHomeowner] = useState(false)

  // Other state variables
  const [jobType, setJobType] = useState('')
  const [vacancy, setVacancy] = useState('')
  const [newNote, setNewNote] = useState('')

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

  // Date and time picker change handlers
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

  const handleStartTimeChange = (event, time) => {
    setShowStartTimePicker(false) // Always hide after selection
    if (time) {
      const newStartTime = new Date(selectedDate)
      newStartTime.setHours(time.getHours(), time.getMinutes(), 0, 0)
      setStartTime(newStartTime)
      setNewTicket(prev => ({ ...prev, startTime: newStartTime }))

      // Ensure end time is after start time
      const newEndTime = new Date(endTime)
      if (newEndTime <= newStartTime) {
        newEndTime.setTime(newStartTime.getTime() + 2 * 60 * 60 * 1000) // Set end time 2 hours later
        setEndTime(newEndTime)
        setNewTicket(prev => ({ ...prev, endTime: newEndTime }))
      }
    }
  }

  const handleEndTimeChange = (event, time) => {
    setShowEndTimePicker(false) // Always hide after selection
    if (time) {
      const newEndTime = new Date(selectedDate)
      newEndTime.setHours(time.getHours(), time.getMinutes(), 0, 0)
      if (newEndTime <= startTime) {
        Alert.alert('Invalid End Time', 'End time must be after start time.')
        return
      }
      setEndTime(newEndTime)
      setNewTicket(prev => ({ ...prev, endTime: newEndTime }))
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
      const qbCustomerId = await createCustomerInQuickBooks(
        newCustomer,
        quickBooksCompanyId,
        accessToken
      )

      // Add the QuickBooks customer id to the new customer object
      newCustomer.id = qbCustomerId

      // Save the new customer to Firestore
      await addDoc(collection(firestore, 'customers'), newCustomer)

      // Update newTicket with the new customer
      handleSelectCustomer(newCustomer)

      // Reset the form fields
      setNewName('')
      setNewEmail('')
      setNewPhone('')
      setNewCompanyName('')
      setNewCompanyAddress('')
      setIsAddingNew(false)
    } catch (error) {
      console.error('Error saving new customer:', error)
      Alert.alert('Error', 'Failed to save new customer.')
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
    handleCreateTicket(
      newTicket,
      selectedDate,
      newTicket.startTime,
      newTicket.endTime,
      resetForm,
      setIsSubmitting,
      isSubmitting,
      newNote,
      user
    )
  }

  const handleAddPhoto = useCallback(async () => {
    const folder = 'ticketPhotos'
    const photosArray = await pickAndUploadPhotos({ folder, quality: 0.7 })
    if (photosArray.length > 0) {
      const urls = photosArray.map(photo => photo.downloadURL)
      setNewTicket(prev => ({
        ...prev,
        ticketPhotos: [...prev.ticketPhotos, ...urls],
      }))
      Alert.alert('Success', 'Photos added successfully.')
    } else {
      Alert.alert('No Selection', 'You did not select any image.')
    }
  }, [])

  // Navigation between steps
  const handleNextStep = () => {
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
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = time => {
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

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
        keyboardVerticalOffset={40}
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <ScrollView
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
                  {showDatePicker && (
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      onChange={handleDateChange}
                    />
                  )}

                  <Text style={styles.label}>Start Time:</Text>
                  <TouchableOpacity
                    onPress={() => setShowStartTimePicker(true)}
                    style={styles.dateTimeButton}
                  >
                    <Text style={styles.dateTimeText}>
                      {formatTime(startTime)}
                    </Text>
                  </TouchableOpacity>
                  {showStartTimePicker && (
                    <DateTimePicker
                      value={startTime}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      onChange={handleStartTimeChange}
                      minuteInterval={15}
                    />
                  )}

                  <Text style={styles.label}>End Time:</Text>
                  <TouchableOpacity
                    onPress={() => setShowEndTimePicker(true)}
                    style={styles.dateTimeButton}
                  >
                    <Text style={styles.dateTimeText}>
                      {formatTime(endTime)}
                    </Text>
                  </TouchableOpacity>
                  {showEndTimePicker && (
                    <DateTimePicker
                      value={endTime}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'inline' : 'default'}
                      onChange={handleEndTimeChange}
                      minuteInterval={15}
                    />
                  )}
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
                    />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Phone Number"
                      value={newPhone}
                      onChangeText={setNewPhone}
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
                    <TouchableOpacity onPress={() => setIsAddingNew(true)}>
                      <Text style={styles.addNewText}>+ Add New Customer</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Step 4: Homeowner */}
            {step === 4 && (
              <View style={styles.card}>
                <View
                  style={[
                    styles.selectionContainer,
                    {
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                    },
                  ]}
                >
                  <Text style={styles.modalTitle}>Homeowner</Text>
                  <TouchableOpacity
                    onPress={() => setShowHomeowner(prev => !prev)}
                    style={[
                      styles.plusButton,
                      { backgroundColor: showHomeowner ? 'red' : '#2980b9' },
                    ]}
                  >
                    <IconSymbol
                      name={showHomeowner ? 'minus' : 'plus'}
                      color="white"
                    />
                  </TouchableOpacity>
                </View>
                {showHomeowner && (
                  <>
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
                  </>
                )}
              </View>
            )}

            {/* Step 5: Ticket Details */}
            {step === 5 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Ticket Details</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Inspector Name"
                  value={newTicket.inspectorName}
                  onChangeText={text =>
                    setNewTicket({ ...newTicket, inspectorName: text })
                  }
                />
                <TextInput
                  style={[styles.inputField, { height: 100 }]}
                  placeholder="Reason for visit"
                  value={newTicket.reason}
                  onChangeText={text =>
                    setNewTicket({ ...newTicket, reason: text })
                  }
                  multiline
                />
                <TextInput
                  style={[styles.inputField, { height: 80 }]}
                  placeholder="Add a note for this ticket..."
                  value={newNote}
                  onChangeText={setNewNote}
                  multiline
                  numberOfLines={4}
                />
                <TouchableOpacity
                  onPress={handleTogglePicker}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>
                    {jobType ? jobType : 'Select Job Type'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleToggleVacancyPicker}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>
                    {vacancy === 'occupied'
                      ? 'Occupied'
                      : vacancy === 'unoccupied'
                      ? 'Unoccupied'
                      : 'Select Occupancy'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Job Type Modal */}
            <Modal
              visible={jobTypeModalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={handleTogglePicker}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={jobType}
                    onValueChange={handleJobTypeChange}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select job type" value="" />
                    <Picker.Item
                      label="Leak Detection"
                      value="leak detection"
                    />
                    <Picker.Item label="Inspection" value="inspection" />
                    <Picker.Item label="Containment" value="containment" />
                    <Picker.Item label="Flood" value="flood" />
                    <Picker.Item label="Mold Job" value="mold job" />
                    <Picker.Item label="Wipe Down" value="wipe down" />
                  </Picker>
                  <View style={styles.modalCloseContainer}>
                    <TouchableOpacity onPress={handleTogglePicker}>
                      <Text style={styles.modalCloseText}>Close</Text>
                    </TouchableOpacity>
                  </View>
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
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={vacancy}
                    onValueChange={handleVacancyChange}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select occupancy" value="" />
                    <Picker.Item label="Occupied" value="occupied" />
                    <Picker.Item label="Unoccupied" value="unoccupied" />
                  </Picker>
                  <View style={styles.modalCloseContainer}>
                    <TouchableOpacity onPress={handleToggleVacancyPicker}>
                      <Text style={styles.modalCloseText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {/* Photo Gallery and Add Photo (only on Step 5) */}
            {step === 5 && (
              <>
                {newTicket.ticketPhotos.length > 0 && (
                  <PhotoGallery
                    photos={newTicket.ticketPhotos}
                    onRemovePhoto={handleRemovePhoto}
                  />
                )}
                <TouchableOpacity
                  onPress={handleAddPhoto}
                  style={styles.addPhotoButton}
                >
                  <Text style={styles.addPhotoButtonText}>Add Photo</Text>
                </TouchableOpacity>
              </>
            )}

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
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  )
}

export default CreateTicketScreen

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  scrollView: {
    paddingHorizontal: 5,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#F5F8FA',
    borderColor: '#E1E8ED',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  dateTimeSection: {
    marginBottom: 10,
  },
  dateTimeButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginVertical: 5,
  },
  dateTimeText: {
    fontSize: 16,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 8,
    color: '#2c3e50',
  },
  label: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  inputField: {
    backgroundColor: '#f9f9f9',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    fontSize: 16,
    padding: 10,
    marginBottom: 10,
    color: '#333',
  },
  selectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#eee',
    marginBottom: 10,
  },
  selectionText: {
    flex: 1,
    fontSize: 16,
    color: '#555',
  },
  selectButton: {
    backgroundColor: '#2980b9',
    borderRadius: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectButtonText: {
    color: 'white',
    fontSize: 14,
  },
  plusButton: {
    backgroundColor: '#2980b9',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
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
  addPhotoButton: {
    backgroundColor: '#2ecc71',
    borderRadius: 5,
    padding: 12,
    alignItems: 'center',
    marginVertical: 6,
  },
  addPhotoButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  actionButton: {
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
  previousButton: {
    backgroundColor: '#7f8c8d',
  },
  nextButton: {
    backgroundColor: '#2980b9',
  },
  createButton: {
    backgroundColor: '#2c3e50',
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    width: '90%',
    elevation: 5,
  },
  picker: {
    width: '100%',
  },
  modalCloseContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  modalCloseText: {
    color: '#2980b9',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
    textAlign: 'center',
  },
  // Styles from AddressModal
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
  // Styles from BuilderModal
  modalInput: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  modalList: {
    maxHeight: 200,
    marginBottom: 10,
  },
  modalItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  modalItemText: {
    fontSize: 16,
    color: '#555',
  },
  addNewText: {
    fontSize: 16,
    color: '#2980b9',
    textAlign: 'center',
    marginVertical: 10,
  },
})
