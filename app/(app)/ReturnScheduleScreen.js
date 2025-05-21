// ReturnScheduleScreen.js
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
  // TextInput, // Not used for time input in this version
} from 'react-native'
import { useRouter } from 'expo-router'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { CustomCalendar } from '@/components/CustomCalander' // Ensure path is correct
import { format } from 'date-fns'

const ACCENT_COLOR = '#007AFF'
const PLACEHOLDER_TEXT_COLOR = '#8E8E93'
const INPUT_BACKGROUND_COLOR = '#F0F0F0' // A light grey for picker triggers

const ReturnScheduleScreen = () => {
  const [allTickets, setAllTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [isScheduling, setIsScheduling] = useState(false)
  const [schedulingTicket, setSchedulingTicket] = useState(null)

  const [isScheduleModalVisible, setIsScheduleModalVisible] = useState(false)

  // State for the pickers/inputs
  const [selectedDatePart, setSelectedDatePart] = useState(new Date())
  const [selectedStartTimeFull, setSelectedStartTimeFull] = useState(null)
  const [selectedEndTimeFull, setSelectedEndTimeFull] = useState(null)

  const router = useRouter()
  const [headerHeight, setHeaderHeight] = useState(0)

  useEffect(() => {
    setLoading(true)
    const unsub = onSnapshot(
      collection(firestore, 'tickets'),
      snapshot => {
        const toSchedule = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(t => t.status === 'Return Needed' && !t.returnDate)
        setAllTickets(toSchedule)
        setLoading(false)
      },
      error => {
        console.error('Error loading tickets for return scheduling:', error)
        Alert.alert('Error', 'Failed to load tickets needing return.')
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  const handleOpenScheduler = ticket => {
    setSchedulingTicket(ticket)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0) // Default to 9 AM tomorrow for calendar
    setSelectedDatePart(
      ticket.returnDate ? ticket.returnDate.toDate() : tomorrow
    )
    setSelectedStartTimeFull(null)
    setSelectedEndTimeFull(null)
    setIsScheduleModalVisible(true)
  }

  const closeAndResetSchedulerModals = () => {
    setSchedulingTicket(null)
    setIsScheduleModalVisible(false)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    setSelectedDatePart(tomorrow)
    setSelectedStartTimeFull(null)
    setSelectedEndTimeFull(null)
    setIsScheduling(false)
  }

  // Helper to combine a date part with a time object (if your picker gives separate time)
  // or to ensure the date part of a full Date object from a picker is correct.
  const applyTimeToDate = (dateBase, timeSource) => {
    if (!dateBase || !timeSource) return null
    const newFullDate = new Date(dateBase) // Start with the selected date part
    newFullDate.setHours(
      timeSource.getHours(), // Get hours from the time picker's result
      timeSource.getMinutes(), // Get minutes from the time picker's result
      0,
      0 // Reset seconds and milliseconds
    )
    return newFullDate
  }

  // --- Example functions you would call from your time pickers ---
  // Replace these with the actual logic from your time picker components.
  const handleStartTimeSelected = timeObjectFromPicker => {
    // Assuming timeObjectFromPicker is a Date object with the selected time
    // (its date part might be today or epoch, we'll correct it)
    if (selectedDatePart && timeObjectFromPicker) {
      const fullStartTime = applyTimeToDate(
        selectedDatePart,
        timeObjectFromPicker
      )
      setSelectedStartTimeFull(fullStartTime)
    } else {
      Alert.alert(
        'Select Date First',
        'Please select a date before setting the start time.'
      )
    }
  }

  const handleEndTimeSelected = timeObjectFromPicker => {
    if (selectedDatePart && timeObjectFromPicker) {
      const fullEndTime = applyTimeToDate(
        selectedDatePart,
        timeObjectFromPicker
      )
      setSelectedEndTimeFull(fullEndTime)
    } else {
      Alert.alert(
        'Select Date First',
        'Please select a date before setting the end time.'
      )
    }
  }
  // --- End of example functions ---

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

    setIsScheduling(true)

    const newStartTimeTimestamp = Timestamp.fromDate(selectedStartTimeFull)
    const newEndTimeTimestamp = Timestamp.fromDate(selectedEndTimeFull)
    const newTicketPrimaryDate = new Date(selectedStartTimeFull) // Date part is from start time
    newTicketPrimaryDate.setHours(0, 0, 0, 0)
    const newTicketPrimaryDateTimestamp =
      Timestamp.fromDate(newTicketPrimaryDate)

    try {
      const originalTicketRef = doc(firestore, 'tickets', schedulingTicket.id)
      await updateDoc(originalTicketRef, {
        returnDate: newTicketPrimaryDateTimestamp,
        status: 'Return Scheduled',
        history: arrayUnion({
          status: 'Return Scheduled',
          timestamp: new Date().toISOString(),
          reason: `Return visit scheduled for ${format(
            selectedStartTimeFull, // Use full start time for detailed reason
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
            }. Original reason for return: ${
              schedulingTicket.returnNote || 'N/A'
            }.`,
          },
        ],
      }

      await addDoc(collection(firestore, 'tickets'), newReturnTicketData)

      await updateDoc(originalTicketRef, {
        returnCount: (schedulingTicket.returnCount || 0) + 1,
      })

      Alert.alert(
        'Success',
        `Return trip scheduled for ${schedulingTicket.ticketNumber} on ${format(
          selectedStartTimeFull,
          'MM/dd/yyyy'
        )} (${format(selectedStartTimeFull, 'h:mm a')} - ${format(
          selectedEndTimeFull,
          'h:mm a'
        )}). A new return ticket created.`
      )
      closeAndResetSchedulerModals()
    } catch (err) {
      console.error('Error scheduling return and creating new ticket:', err)
      Alert.alert(
        'Error',
        'Failed to schedule return. Please check details and try again.'
      )
      setIsScheduling(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loaderCenter}>
        <ActivityIndicator size="large" color={ACCENT_COLOR} />
        <Text style={styles.loadingText}>Loading tickets...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <HeaderWithOptions
        title="Schedule Returns"
        onBack={() => router.push('/(tabs)')}
        options={[]}
        onHeightChange={setHeaderHeight}
      />
      <ScrollView
        style={{ flex: 1, paddingTop: headerHeight }}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <Text style={styles.sectionHeader}>
          Tickets Awaiting Return Schedule
        </Text>
        {allTickets.length > 0 ? (
          allTickets.map(ticket => (
            <View key={ticket.id} style={styles.ticketRow}>
              <View style={styles.ticketInfo}>
                <Text style={styles.ticketAddress} numberOfLines={1}>
                  {ticket.street || 'N/A Address'}, {ticket.city || 'N/A City'}
                </Text>
                <Text style={styles.ticketNumberText}>
                  #{ticket.ticketNumber || 'N/A'}
                </Text>
                {ticket.returnNote && (
                  <Text style={styles.returnNoteLabel}>
                    Reason:{' '}
                    <Text style={styles.returnNoteText}>
                      {ticket.returnNote}
                    </Text>
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.scheduleButton}
                onPress={() => handleOpenScheduler(ticket)}
              >
                <Text style={styles.scheduleButtonText}>Schedule</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.emptyMessage}>
            No return trips currently need scheduling.
          </Text>
        )}
      </ScrollView>

      {/* Unified Modal for Date and Time Selection */}
      {schedulingTicket && (
        <Modal
          transparent
          visible={isScheduleModalVisible}
          animationType="slide"
          onRequestClose={closeAndResetSchedulerModals}
        >
          <View style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={styles.modalScrollViewContent}>
              <View style={styles.dateTimeModalView}>
                <CustomCalendar
                  showExplicitCloseButton={false} // Hide the calendar's own close button
                  selectedDate={selectedDatePart}
                  onDateChange={setSelectedDatePart} // This updates selectedDatePart
                  minDate={new Date()} // Optional: prevent selecting past dates
                />

                {/* Placeholder/Trigger for your Start Time Picker */}
                <Text style={styles.inputLabel}>Start Time:</Text>
                <TouchableOpacity
                  style={styles.timePickerTrigger}
                  onPress={() => {
                    // HERE YOU WOULD TRIGGER YOUR TIME PICKER COMPONENT for Start Time
                    // For example, if it's a modal: setIsStartTimePickerVisible(true)
                    // Its onConfirm/onSelect should call handleStartTimeSelected(timeObject)
                    Alert.alert(
                      'Time Picker',
                      'Integrate your Start Time Picker here.'
                    )
                  }}
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
                      : 'Select Start Time'}
                  </Text>
                </TouchableOpacity>

                {/* Placeholder/Trigger for your End Time Picker */}
                <Text style={styles.inputLabel}>End Time:</Text>
                <TouchableOpacity
                  style={styles.timePickerTrigger}
                  onPress={() => {
                    // HERE YOU WOULD TRIGGER YOUR TIME PICKER COMPONENT for End Time
                    // Its onConfirm/onSelect should call handleEndTimeSelected(timeObject)
                    Alert.alert(
                      'Time Picker',
                      'Integrate your End Time Picker here.'
                    )
                  }}
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
                      : 'Select End Time'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmScheduleButton,
                    isScheduling && styles.disabledButton,
                  ]}
                  onPress={handleConfirmScheduleReturn}
                  disabled={isScheduling}
                >
                  {isScheduling ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.confirmScheduleButtonText}>
                      Confirm & Create Return Ticket
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.cancelButtonModal,
                    isScheduling && styles.disabledButton,
                  ]}
                  onPress={closeAndResetSchedulerModals}
                  disabled={isScheduling}
                >
                  <Text style={styles.cancelButtonModalText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  )
}

export default ReturnScheduleScreen

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f6f8',
  },
  loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  ticketInfo: { flex: 1, marginRight: 10 },
  ticketAddress: {
    fontSize: 15,
    fontWeight: '500',
    color: '#37474F',
    marginBottom: 3,
  },
  ticketNumberText: { fontSize: 12, color: '#78909C', marginBottom: 4 },
  returnNoteLabel: {
    fontSize: 13,
    color: ACCENT_COLOR,
    fontWeight: '500',
    marginTop: 4,
  },
  returnNoteText: {
    fontWeight: 'normal',
    color: '#546E7A',
    fontStyle: 'italic',
  },
  scheduleButton: {
    backgroundColor: ACCENT_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  scheduleButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  emptyMessage: {
    textAlign: 'center',
    marginTop: 30,
    color: '#777',
    fontSize: 16,
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalScrollViewContent: {
    // Ensure modal content can scroll if needed
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  dateTimeModalView: {
    marginVertical: 20, // Add vertical margin for scrollability
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20, // Adjusted padding
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxWidth: 450,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center', // Adjusted margin
  },
  modalSubText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 15,
    textAlign: 'center', // Adjusted margin
  },
  inputLabel: {
    // Style for labels above pickers/calendar
    fontSize: 15,
    color: '#455A64',
    marginBottom: 6,
    marginTop: 12,
    fontWeight: '500',
  },
  timePickerTrigger: {
    // Style for the TouchableOpacity that triggers your time picker
    backgroundColor: INPUT_BACKGROUND_COLOR,
    borderColor: '#B0BEC5',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12, // Make it look like an input
    paddingHorizontal: 12,
    marginBottom: 15,
    alignItems: 'flex-start', // Align text to left
  },
  timePickerText: {
    fontSize: 16,
    color: '#37474F',
  },
  timePickerPlaceholderText: {
    fontSize: 16,
    color: PLACEHOLDER_TEXT_COLOR,
  },
  confirmScheduleButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20, // More space before confirm
  },
  confirmScheduleButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButtonModal: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonModalText: { color: 'white', fontWeight: '500', fontSize: 15 },
  disabledButton: { opacity: 0.5 },
})
