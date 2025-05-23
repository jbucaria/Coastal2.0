// ScheduleReturnDetailScreen.js
'use client'

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router' // useLocalSearchParams to get params
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import {
  doc,
  getDoc, // To fetch the specific ticket
  updateDoc,
  addDoc,
  collection,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { CustomCalendar } from '@/components/CustomCalander'
import { Picker } from '@react-native-picker/picker'
import { format } from 'date-fns'

const ACCENT_COLOR = '#007AFF'
const PLACEHOLDER_TEXT_COLOR = '#8E8E93'
const INPUT_BACKGROUND_COLOR = '#F0F0F0'

const ScheduleReturnDetailScreen = () => {
  const router = useRouter()
  const params = useLocalSearchParams() // Get navigation parameters
  const ticketId = params.ticketId // The ID of the original ticket
  const displayTicketNumber = params.ticketNumber
  const displayReturnNote = params.currentReturnNote

  const [schedulingTicket, setSchedulingTicket] = useState(null) // Full original ticket object
  const [loadingTicket, setLoadingTicket] = useState(true)
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false)

  const [selectedDatePart, setSelectedDatePart] = useState(new Date())
  const [selectedStartTimeFull, setSelectedStartTimeFull] = useState(null)
  const [selectedEndTimeFull, setSelectedEndTimeFull] = useState(null)

  const [customTimePickerModalVisible, setCustomTimePickerModalVisible] =
    useState(false)
  const [pickingTimeFor, setPickingTimeFor] = useState(null)
  const [tempHour, setTempHour] = useState('9')
  const [tempMinute, setTempMinute] = useState('00')
  const [tempPeriod, setTempPeriod] = useState('AM')

  const [headerHeight, setHeaderHeight] = useState(0)

  const hoursArray = Array.from({ length: 12 }, (_, i) => String(i + 1))
  const minutesArray = ['00', '15', '30', '45']
  const periodsArray = ['AM', 'PM']

  useEffect(() => {
    if (!ticketId) {
      Alert.alert('Error', 'No ticket ID provided for scheduling.', [
        { text: 'OK', onPress: () => router.back() },
      ])
      setLoadingTicket(false)
      return
    }

    const fetchTicket = async () => {
      setLoadingTicket(true)
      try {
        const ticketRef = doc(firestore, 'tickets', ticketId)
        const ticketSnap = await getDoc(ticketRef)
        if (ticketSnap.exists()) {
          setSchedulingTicket({ id: ticketSnap.id, ...ticketSnap.data() })
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          tomorrow.setHours(9, 0, 0, 0)
          setSelectedDatePart(
            ticketSnap.data().returnDate
              ? ticketSnap.data().returnDate.toDate()
              : tomorrow
          )
        } else {
          Alert.alert('Error', 'Ticket not found.', [
            { text: 'OK', onPress: () => router.back() },
          ])
        }
      } catch (error) {
        console.error('Error fetching ticket for scheduling: ', error)
        Alert.alert('Error', 'Could not load ticket details.', [
          { text: 'OK', onPress: () => router.back() },
        ])
      }
      setLoadingTicket(false)
    }
    fetchTicket()
  }, [ticketId, router])

  const getTimeForPicker = date => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      const defaultDate = new Date(selectedDatePart || Date.now())
      defaultDate.setHours(pickingTimeFor === 'start' ? 9 : 11, 0, 0, 0)
      date = defaultDate
    }
    let hours = date.getHours()
    const minutes = date.getMinutes()
    const period = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12
    const formattedHours = String(hours)
    let formattedMinutes = '00'
    if (minutes < 15) formattedMinutes = '00'
    else if (minutes < 30) formattedMinutes = '15'
    else if (minutes < 45) formattedMinutes = '30'
    else formattedMinutes = '45'
    return { hour: formattedHours, minute: formattedMinutes, period: period }
  }

  const handleOpenCustomTimePicker = type => {
    setPickingTimeFor(type)
    const dateToPreFillFrom =
      type === 'start' ? selectedStartTimeFull : selectedEndTimeFull
    let initialTimeForPicker
    if (dateToPreFillFrom) {
      initialTimeForPicker = dateToPreFillFrom
    } else {
      initialTimeForPicker = new Date(selectedDatePart || Date.now())
      initialTimeForPicker.setHours(type === 'start' ? 9 : 11, 0, 0, 0)
    }
    const { hour, minute, period } = getTimeForPicker(initialTimeForPicker)
    setTempHour(hour)
    setTempMinute(minute)
    setTempPeriod(period)
    setCustomTimePickerModalVisible(true)
  }

  const handleSetCustomTime = () => {
    if (!selectedDatePart) {
      Alert.alert(
        'Date not selected',
        'Please select a date first from the calendar.'
      )
      setCustomTimePickerModalVisible(false)
      return
    }
    const selectedHours24 =
      tempPeriod === 'PM' && parseInt(tempHour, 10) !== 12
        ? parseInt(tempHour, 10) + 12
        : tempPeriod === 'AM' && parseInt(tempHour, 10) === 12
        ? 0
        : parseInt(tempHour, 10)

    const newTimeFull = new Date(selectedDatePart)
    newTimeFull.setHours(selectedHours24, parseInt(tempMinute, 10), 0, 0)

    if (pickingTimeFor === 'start') {
      setSelectedStartTimeFull(newTimeFull)
      if (!selectedEndTimeFull || selectedEndTimeFull <= newTimeFull) {
        const adjustedEndTime = new Date(newTimeFull)
        adjustedEndTime.setHours(adjustedEndTime.getHours() + 2)
        const endMinutes = adjustedEndTime.getMinutes()
        const remainder = endMinutes % 15
        if (remainder !== 0)
          adjustedEndTime.setMinutes(endMinutes + (15 - remainder))
        setSelectedEndTimeFull(adjustedEndTime)
      }
    } else if (pickingTimeFor === 'end') {
      if (!selectedStartTimeFull || newTimeFull <= selectedStartTimeFull) {
        Alert.alert('Invalid End Time', 'End time must be after start time.')
        return
      }
      setSelectedEndTimeFull(newTimeFull)
    }
    setCustomTimePickerModalVisible(false)
  }

  const handleConfirmScheduleReturn = async () => {
    if (
      !schedulingTicket ||
      !selectedDatePart ||
      !selectedStartTimeFull ||
      !selectedEndTimeFull
    ) {
      Alert.alert(
        'Missing Information',
        'Please select a valid date, start time, and end time.'
      )
      return
    }
    if (selectedEndTimeFull <= selectedStartTimeFull) {
      Alert.alert('Invalid Time', 'End time must be after start time.')
      return
    }

    setIsSubmittingSchedule(true)

    const newStartTimeTimestamp = Timestamp.fromDate(selectedStartTimeFull)
    const newEndTimeTimestamp = Timestamp.fromDate(selectedEndTimeFull)
    const newTicketPrimaryDateTimestamp = Timestamp.fromDate(selectedDatePart)

    try {
      const originalTicketRef = doc(firestore, 'tickets', schedulingTicket.id)
      await updateDoc(originalTicketRef, {
        returnDate: newTicketPrimaryDateTimestamp,
        status: 'Return Scheduled',
        history: arrayUnion({
          status: 'Return Scheduled',
          timestamp: new Date().toISOString(),
          reason: `Return visit scheduled for ${format(
            selectedStartTimeFull,
            'MM/dd/yyyy h:mm a'
          )} - ${format(selectedEndTimeFull, 'h:mm a')}.`,
        }),
      })

      const returnTicketNumber = `${
        schedulingTicket.ticketNumber || 'TICKET'
      }-R${(schedulingTicket.returnCount || 0) + 1}`
      const newReturnTicketData = {
        address: schedulingTicket.address || '',
        street: schedulingTicket.street || '',
        city: schedulingTicket.city || '',
        state: schedulingTicket.state || '',
        zip: schedulingTicket.zip || '',
        typeOfJob: schedulingTicket.typeOfJob || 'Return Visit',
        occupied:
          schedulingTicket.occupied !== undefined
            ? schedulingTicket.occupied
            : true,
        inspectorName: schedulingTicket.inspectorName || 'Unassigned',
        customerName: schedulingTicket.customerName || '',
        customerEmail: schedulingTicket.customerEmail || '',
        customerNumber: schedulingTicket.customerNumber || '',
        homeOwnerName: schedulingTicket.homeOwnerName || '',
        homeOwnerNumber: schedulingTicket.homeOwnerNumber || '',
        originalTicketId: schedulingTicket.id,
        ticketNumber: returnTicketNumber,
        date: newTicketPrimaryDateTimestamp,
        startTime: newStartTimeTimestamp,
        endTime: newEndTimeTimestamp,
        status: 'Open - Return',
        isReturnVisit: true,
        reason: schedulingTicket.returnNote || 'Scheduled return visit.',
        inspectionComplete: false,
        remediationRequired: false,
        remediationComplete: false,
        remediationData: {},
        equipmentTotal: 0,
        messageCount: 0,
        onSite: false,
        siteComplete: false,
        returnDate: null,
        returnNote: '',
        returnCount: 0,
        history: [
          {
            status: 'Open - Return',
            timestamp: new Date().toISOString(),
            reason: `Return visit created from ticket ${
              schedulingTicket.ticketNumber
            }. Original reason: ${schedulingTicket.returnNote || 'N/A'}.`,
          },
        ],
      }
      await addDoc(collection(firestore, 'tickets'), newReturnTicketData)
      await updateDoc(originalTicketRef, {
        returnCount: (schedulingTicket.returnCount || 0) + 1,
      })

      Alert.alert(
        'Success',
        `Return trip scheduled for ${
          displayTicketNumber || schedulingTicket.ticketNumber
        } and new ticket created.`,
        [{ text: 'OK', onPress: () => router.back() }] // Navigate back after success
      )
    } catch (err) {
      console.error('Error scheduling return:', err)
      Alert.alert('Error', 'Failed to schedule return. Please try again.')
    } finally {
      setIsSubmittingSchedule(false)
    }
  }

  if (loadingTicket) {
    return (
      <View style={styles.loaderCenter}>
        <ActivityIndicator size="large" color={ACCENT_COLOR} />
        <Text style={styles.loadingText}>Loading Ticket Details...</Text>
      </View>
    )
  }

  if (!schedulingTicket) {
    // If ticket couldn't be loaded
    return (
      <View style={styles.loaderCenter}>
        <Text style={styles.emptyMessage}>
          Could not load ticket information.
        </Text>
        <TouchableOpacity
          style={styles.cancelButtonScreen}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonScreenText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <HeaderWithOptions
        title={`Schedule: #${
          displayTicketNumber || schedulingTicket.ticketNumber
        }`}
        onBack={() => router.back()}
        options={[]}
        onHeightChange={setHeaderHeight}
      />
      <ScrollView
        style={{ flex: 1, paddingTop: headerHeight }}
        contentContainerStyle={styles.scrollContentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Return for Ticket #
            {displayTicketNumber || schedulingTicket.ticketNumber}
          </Text>
          {displayReturnNote && (
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Reason for Return: </Text>
              {displayReturnNote}
            </Text>
          )}
          <Text style={styles.infoText}>
            <Text style={styles.infoLabel}>Address: </Text>
            {schedulingTicket.street}, {schedulingTicket.city}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.inputLabelLarge}>
            Select Date for Return Visit:
          </Text>
          <CustomCalendar
            selectedDate={selectedDatePart}
            onDateChange={newDate => {
              setSelectedDatePart(newDate)
              if (selectedStartTimeFull) {
                const updated = new Date(selectedStartTimeFull)
                updated.setFullYear(
                  newDate.getFullYear(),
                  newDate.getMonth(),
                  newDate.getDate()
                )
                setSelectedStartTimeFull(updated)
              }
              if (selectedEndTimeFull) {
                const updated = new Date(selectedEndTimeFull)
                updated.setFullYear(
                  newDate.getFullYear(),
                  newDate.getMonth(),
                  newDate.getDate()
                )
                setSelectedEndTimeFull(updated)
              }
            }}
            minDate={new Date()}
            showExplicitCloseButton={false}
            autoCloseOnDateSelect={false}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.inputLabelLarge}>Select Time:</Text>
          <View style={styles.timeSelectionRow}>
            <View style={styles.timeSelectionBox}>
              <Text style={styles.inputLabel}>Start Time:</Text>
              <TouchableOpacity
                style={styles.timePickerTrigger}
                onPress={() => handleOpenCustomTimePicker('start')}
              >
                <Text
                  style={
                    selectedStartTimeFull
                      ? styles.timePickerText
                      : styles.timePickerPlaceholderText
                  }
                >
                  {selectedStartTimeFull
                    ? format(selectedStartTimeFull, 'h:mm a')
                    : 'Select Start'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.timeSelectionBox}>
              <Text style={styles.inputLabel}>End Time:</Text>
              <TouchableOpacity
                style={styles.timePickerTrigger}
                onPress={() => handleOpenCustomTimePicker('end')}
              >
                <Text
                  style={
                    selectedEndTimeFull
                      ? styles.timePickerText
                      : styles.timePickerPlaceholderText
                  }
                >
                  {selectedEndTimeFull
                    ? format(selectedEndTimeFull, 'h:mm a')
                    : 'Select End'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.confirmScheduleButtonScreen,
            isSubmittingSchedule && styles.disabledButton,
          ]}
          onPress={handleConfirmScheduleReturn}
          disabled={isSubmittingSchedule}
        >
          {isSubmittingSchedule ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.confirmScheduleButtonTextScreen}>
              Confirm & Create Return Ticket
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelButtonScreen}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonScreenText}>Cancel Scheduling</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Custom Time Picker Modal */}
      <Modal
        visible={customTimePickerModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCustomTimePickerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.customTimePickerModalCard}>
            <Text style={styles.modalTitle}>
              Select {pickingTimeFor === 'start' ? 'Start' : 'End'} Time
            </Text>
            <View style={styles.pickerRowContainer}>
              <Picker
                selectedValue={tempHour}
                onValueChange={setTempHour}
                style={styles.pickerColumn}
                itemStyle={styles.pickerItem}
              >
                {hoursArray.map(h => (
                  <Picker.Item key={`h-${h}`} label={h} value={h} />
                ))}
              </Picker>
              <Text style={styles.pickerSeparator}>:</Text>
              <Picker
                selectedValue={tempMinute}
                onValueChange={setTempMinute}
                style={styles.pickerColumn}
                itemStyle={styles.pickerItem}
              >
                {minutesArray.map(m => (
                  <Picker.Item key={`m-${m}`} label={m} value={m} />
                ))}
              </Picker>
              <Picker
                selectedValue={tempPeriod}
                onValueChange={setTempPeriod}
                style={styles.pickerPeriodColumn}
                itemStyle={styles.pickerItem}
              >
                {periodsArray.map(p => (
                  <Picker.Item key={`p-${p}`} label={p} value={p} />
                ))}
              </Picker>
            </View>
            <TouchableOpacity
              onPress={handleSetCustomTime}
              style={styles.timePickerSetButton}
            >
              <Text style={styles.timePickerSetButtonText}>Set Time</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCustomTimePickerModalVisible(false)}
              style={styles.timePickerCancelButton}
            >
              <Text style={styles.timePickerCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

export default ScheduleReturnDetailScreen

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  scrollContentContainer: { padding: 16, paddingBottom: 100 },
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f6f8',
  },
  loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoLabel: { fontWeight: '600', color: '#455A64' },
  infoText: { fontSize: 15, color: '#37474F', marginBottom: 5, lineHeight: 22 },
  inputLabelLarge: {
    fontSize: 16,
    fontWeight: '600',
    color: '#455A64',
    marginBottom: 8,
    marginTop: 5,
  },
  inputLabel: {
    fontSize: 14,
    color: '#455A64',
    marginBottom: 4,
    marginTop: 8,
    fontWeight: '500',
  },
  timeSelectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  timeSelectionBox: { flex: 1, marginHorizontal: 5 },
  timePickerTrigger: {
    backgroundColor: INPUT_BACKGROUND_COLOR,
    borderColor: '#B0BEC5',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center', // Centered text
  },
  timePickerText: { fontSize: 15, color: '#37474F' },
  timePickerPlaceholderText: { fontSize: 15, color: PLACEHOLDER_TEXT_COLOR },

  confirmScheduleButtonScreen: {
    // For main screen button
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginHorizontal: 10,
  },
  confirmScheduleButtonTextScreen: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButtonScreen: {
    // For main screen button
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    marginHorizontal: 10,
    marginBottom: 20,
  },
  cancelButtonScreenText: { color: 'white', fontWeight: '500', fontSize: 15 },
  disabledButton: { opacity: 0.5 },
  emptyMessage: {
    textAlign: 'center',
    marginTop: 30,
    color: '#777',
    fontSize: 16,
  },

  // Modal Styles (shared for both modal types where applicable)
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },

  // Styles for the Custom Time Picker Modal
  customTimePickerModalCard: {
    width: Platform.OS === 'ios' ? '85%' : '90%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 10,
  },
  pickerRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    height: Platform.OS === 'ios' ? 180 : 160,
    marginBottom: 15,
  },
  pickerColumn: {
    width: Platform.OS === 'ios' ? '30%' : undefined,
    flex: Platform.OS === 'android' ? 0.3 : undefined, // Adjusted flex for Android
    height: Platform.OS === 'ios' ? 180 : 160,
  },
  pickerPeriodColumn: {
    width: Platform.OS === 'ios' ? '25%' : undefined,
    flex: Platform.OS === 'android' ? 0.25 : undefined, // Adjusted flex for Android
    height: Platform.OS === 'ios' ? 180 : 160,
  },
  pickerItem: {
    // itemStyle for Pickers in time modal
    fontSize: Platform.OS === 'ios' ? 20 : 15,
    height: Platform.OS === 'ios' ? 180 : 160,
    color: '#333',
  },
  pickerSeparator: {
    fontSize: Platform.OS === 'ios' ? 22 : 18,
    fontWeight: 'bold',
    color: '#333',
    textAlignVertical: 'center',
    marginHorizontal: 5, // Added horizontal margin
    paddingBottom:
      Platform.OS === 'ios' ? 0 : Platform.OS === 'android' ? 10 : 0,
  },
  timePickerSetButton: {
    backgroundColor: ACCENT_COLOR,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  timePickerSetButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  timePickerCancelButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 10,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  timePickerCancelButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
  },
})
