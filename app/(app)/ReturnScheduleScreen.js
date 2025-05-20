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
import { CustomCalendar } from '@/components/CustomCalander'
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
          .filter(t => t.status === 'Return Needed' && !t.returnDate)
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
        history: arrayUnion({
          status: 'Return Scheduled',
          timestamp: new Date().toISOString(),
        }),
      })
      Alert.alert(
        'Success',
        `Return trip scheduled for ${format(date, 'MM/dd/yyyy')}`
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
        onBack={() => router.push('/(tabs)')}
        options={[]}
        onHeightChange={setHeaderHeight}
      />
      <ScrollView style={{ flex: 1, paddingTop: headerHeight }}>
        <Text style={styles.sectionHeader}>Return Trips to Schedule</Text>
        {allTickets.length > 0 ? (
          allTickets.map(ticket => (
            <View key={ticket.id} style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.address}>
                  {ticket.street}, {ticket.city}, {ticket.state} {ticket.zip}
                </Text>
                <Text style={styles.reason}>{ticket.reason || ''}</Text>
                {ticket.returnNote && (
                  <Text style={styles.returnNote}>{ticket.returnNote}</Text>
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
          <Text style={styles.empty}>No return trips to schedule.</Text>
        )}
      </ScrollView>
      <Modal transparent visible={!!schedulingTicket} animationType="slide">
        <View style={styles.modalOverlay}>
          <CustomCalendar
            selectedDate={new Date()}
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
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  datePicker: { padding: 12, alignItems: 'center' },
  dateText: { fontSize: 18, fontWeight: '600' },
  sectionHeader: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  info: { flex: 1, paddingRight: 8 },
  address: { fontSize: 14, fontWeight: '600', color: '#222' },
  reason: { fontSize: 13, color: '#555', marginTop: 4 },
  returnNote: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
    fontStyle: 'italic',
  },
  actions: { minWidth: 80, alignItems: 'flex-end' },
  scheduleBtn: { backgroundColor: '#2980b9', padding: 6, borderRadius: 4 },
  scheduleText: { color: '#fff', fontSize: 12 },
  badge: {
    backgroundColor: '#FF9800',
    color: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
    overflow: 'hidden',
  },
  empty: { textAlign: 'center', marginTop: 8, color: '#666' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
})
