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
} from 'react-native'
import { useRouter } from 'expo-router'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { CustomCalendar } from '@/components/CustomCalander' // Assuming correct spelling
import { format } from 'date-fns'

const ReturnScheduleScreen = () => {
  const [allTickets, setAllTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [schedulingTicket, setSchedulingTicket] = useState(null)
  const router = useRouter()
  const [headerHeight, setHeaderHeight] = useState(0)

  // Subscribe only to tickets needing return
  useEffect(() => {
    const unsub = onSnapshot(
      collection(firestore, 'tickets'),
      snapshot => {
        const toSchedule = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(t => t.status === 'Return Needed' && !t.returnDate) // Tickets that are "Return Needed" AND don't have a returnDate yet
        setAllTickets(toSchedule)
        setLoading(false)
      },
      error => {
        console.error('Error loading tickets:', error)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  const onSchedulePress = ticket => {
    setSchedulingTicket(ticket)
  }

  const onScheduleDate = async date => {
    if (!schedulingTicket) return
    try {
      const ticketRef = doc(firestore, 'tickets', schedulingTicket.id)
      await updateDoc(ticketRef, {
        returnDate: date,
        status: 'Return Scheduled', // <--- UPDATE THE STATUS HERE
        history: arrayUnion({
          status: 'Return Scheduled', // History entry
          timestamp: new Date().toISOString(),
          reason: 'Return visit scheduled via ReturnScheduleScreen.', // Optional: add more context
        }),
      })
      Alert.alert(
        'Success',
        `Return trip scheduled for ${format(
          date,
          'MM/dd/yyyy'
        )}. Status updated to "Return Scheduled".`
      )
    } catch (err) {
      console.error('Error scheduling return:', err)
      Alert.alert('Error', 'Failed to schedule return trip.')
    } finally {
      setSchedulingTicket(null)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <HeaderWithOptions
        title="Return Trips"
        onBack={() => router.push('/(tabs)')} // Adjust as per your navigation stack
        options={[]}
        onHeightChange={setHeaderHeight}
      />
      <ScrollView
        style={{ flex: 1, paddingTop: headerHeight }}
        contentContainerStyle={{ paddingBottom: 20 }} // Added padding at the bottom
      >
        <Text style={styles.sectionHeader}>Return Trips to Schedule</Text>
        {allTickets.length > 0 ? (
          allTickets.map(ticket => (
            <View key={ticket.id} style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.address}>
                  {ticket.street || 'N/A'}, {ticket.city || 'N/A'},{' '}
                  {ticket.state || 'N/A'} {ticket.zip || ''}
                </Text>
                {/* Displaying returnNote as the primary reason here as per component structure */}
                {ticket.returnNote && (
                  <Text style={styles.returnNoteLabel}>
                    Note:{' '}
                    <Text style={styles.returnNoteText}>
                      {ticket.returnNote}
                    </Text>
                  </Text>
                )}
                {/* If you have a general 'reason' field distinct from 'returnNote', you can add it here */}
                {ticket.reason && !ticket.returnNote && (
                  <Text style={styles.reason}>Reason: {ticket.reason}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.scheduleBtn}
                onPress={() => onSchedulePress(ticket)}
              >
                <Text style={styles.scheduleText}>Schedule</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>
            No return trips to schedule at this time.
          </Text>
        )}
      </ScrollView>
      <Modal
        transparent
        visible={!!schedulingTicket}
        animationType="slide"
        onRequestClose={() => setSchedulingTicket(null)}
      >
        <View style={styles.modalOverlay}>
          <CustomCalendar
            selectedDate={
              schedulingTicket?.returnDate
                ? new Date(schedulingTicket.returnDate.seconds * 1000)
                : new Date()
            } // Pre-select existing or current date
            onDateChange={onScheduleDate}
            onClose={() => setSchedulingTicket(null)}
          />
        </View>
      </Modal>
    </View>
  )
}

export default ReturnScheduleScreen

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' }, // Lightened background
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  // datePicker: { padding: 12, alignItems: 'center' }, // Not used directly
  // dateText: { fontSize: 18, fontWeight: '600' }, // Not used directly
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 16, // Added horizontal margin
    fontSize: 18, // Slightly larger
    fontWeight: '700',
    color: '#343a40', // Darker grey
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16, // Increased padding
    paddingHorizontal: 16, // Added horizontal padding
    borderBottomWidth: 1,
    borderColor: '#dee2e6', // Lighter border
    backgroundColor: '#fff', // White background for rows
    marginHorizontal: 8, // Card-like appearance
    borderRadius: 6, // Rounded corners
    marginBottom: 8, // Space between cards
    elevation: 1, // Subtle shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  info: { flex: 1, paddingRight: 12 }, // Increased paddingRight
  address: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  }, // Darker address
  reason: { fontSize: 13, color: '#495057', marginTop: 4 }, // Standard grey for reason
  returnNoteLabel: {
    fontSize: 13,
    color: '#007bff', // Blue to highlight it's a specific note
    marginTop: 4,
    fontWeight: '500',
  },
  returnNoteText: {
    fontWeight: 'normal',
    color: '#495057', // Standard grey for the note text
    fontStyle: 'italic',
  },
  // actions: { minWidth: 80, alignItems: 'flex-end' }, // Not directly used
  scheduleBtn: {
    backgroundColor: '#007bff', // Primary blue
    paddingHorizontal: 12, // More padding
    paddingVertical: 8,
    borderRadius: 5,
  },
  scheduleText: { color: '#fff', fontSize: 13, fontWeight: '500' }, // Slightly bolder
  // badge: { // Not used in this screen directly
  //   backgroundColor: '#FF9800',
  //   color: '#fff',
  //   paddingHorizontal: 6,
  //   paddingVertical: 2,
  //   borderRadius: 4,
  //   fontSize: 12,
  //   overflow: 'hidden',
  // },
  empty: { textAlign: 'center', marginTop: 24, color: '#6c757d', fontSize: 15 }, // More prominent empty message
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', // Darker overlay
  },
})
