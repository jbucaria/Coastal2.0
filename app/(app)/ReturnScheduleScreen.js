// ReturnScheduleScreen.js
'use client'

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import {
  collection,
  onSnapshot,
  // doc, // No longer updating docs directly here
  // updateDoc,
  // addDoc,
  // arrayUnion,
  // Timestamp,
} from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
// import { CustomCalendar } from '@/components/CustomCalander'; // No longer needed here
// import { format } from 'date-fns'; // No longer needed here

const ACCENT_COLOR = '#007AFF'

const ReturnScheduleScreen = () => {
  const [allTickets, setAllTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [headerHeight, setHeaderHeight] = useState(0)
  const router = useRouter()

  useEffect(() => {
    setLoading(true)
    const q = collection(firestore, 'tickets') // Define q before using it
    const unsub = onSnapshot(
      q, // Use the defined query object 'q'
      snapshot => {
        const toSchedule = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(t => t.status === 'Return Needed' && !t.returnDate) // Tickets that are "Return Needed" AND don't have a returnDate yet
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

  const handleSchedulePress = ticket => {
    // Navigate to the new dedicated scheduling screen
    // Pass necessary info, at least the ticket ID.
    // You can also pass ticketNumber and returnNote for display convenience on the next screen.
    router.push({
      pathname: '/ScheduleReturnDetailsScreen', // Ensure this route is set up in your app's routing
      params: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        currentReturnNote: ticket.returnNote,
      },
    })
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
        onBack={() => router.push('/(tabs)')} // Adjust as per your navigation stack
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
                onPress={() => handleSchedulePress(ticket)}
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
      {/* All modal logic has been removed from this screen */}
    </View>
  )
}

export default ReturnScheduleScreen

// Styles remain largely the same for the list display
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
  // Modal related styles are no longer needed here
})
