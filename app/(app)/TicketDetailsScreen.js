'use client'

import React, { useRef, useEffect, useState } from 'react'
import {
  Animated,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native'
import { useRouter } from 'expo-router'
import { updateDoc, doc, arrayUnion } from 'firebase/firestore' // Added arrayUnion
import { firestore } from '@/firebaseConfig'
import { getTravelTime } from '@/utils/getTravelTime'
import { EquipmentModal } from '@/components/EquipmentModal'
import { deleteTicket } from '@/utils/deleteTicket'
import { PhotoModal } from '@/components/PhotoModal'
import useProjectStore from '@/store/useProjectStore'
import { ETAButton } from '@/components/EtaButton'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import { formatPhoneNumber } from '@/utils/helpers'
import useTicket from '@/hooks/useTicket'

const openGoogleMapsWithETA = address => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    address
  )}`
  Linking.openURL(url).catch(err => console.error('Error opening maps:', err))
}

const ACCENT_COLOR = '#1DA1F2'
const TicketDetailsScreen = () => {
  const router = useRouter()
  const { projectId } = useProjectStore()
  const { ticket, error } = useTicket(projectId)
  const [eta, setEta] = useState(null)
  const [isEquipmentModalVisible, setIsEquipmentModalVisible] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [needsReturn, setNeedsReturn] = useState(false) // For marking return trip
  const [headerHeight, setHeaderHeight] = useState(0)
  const scrollY = useRef(new Animated.Value(0)).current

  const marginBelowHeader = 8

  useEffect(() => {
    if (error) {
      Alert.alert('Error', 'Unable to fetch ticket data.')
    }
  }, [error])

  useEffect(() => {
    if (ticket?.address) {
      getTravelTime(ticket.address)
        .then(info => setEta(info.durationText))
        .catch(error => {
          console.error('Error fetching travel time:', error)
          setEta('N/A')
        })
    } else {
      setEta(null)
    }
  }, [ticket])

  // Pre-fill needsReturn based on ticket data
  useEffect(() => {
    if (ticket) {
      setNeedsReturn(
        ticket.remediationRequired || ticket.status === 'Return Needed'
      )
    }
  }, [ticket])

  if (!ticket) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DA1F2" />
        <Text style={styles.loadingText}>Loading ticket details...</Text>
      </View>
    )
  }

  const {
    street,
    city,
    state,
    zip,
    address,
    customerName,
    customerEmail,
    customerNumber,
    homeOwnerName,
    homeOwnerNumber,
    inspectorName,
    reason,
    ticketPhotos,
    equipmentTotal,
    remediationRequired,
    remediationComplete,
    inspectionComplete,
    inspectionData,
    siteComplete,
    messageCount,
    status = 'Open', // Default to 'Open' if not set
    history = [], // Default to empty array
  } = ticket

  const handleInspection = () => {
    if (!ticket) {
      Alert.alert('Error', 'No ticket selected for inspection.')
      return
    }
    const route = inspectionComplete ? '/ViewReport' : '/InspectionScreen'
    router.push({ pathname: route, params: { projectId: ticket.projectId } })
  }

  const handleRemediation = () => {
    if (!ticket) {
      Alert.alert('Error', 'No ticket selected for remediation.')
      return
    }
    const route = remediationComplete
      ? '/ViewRemediationScreen'
      : '/RemediationScreen'
    router.push({ pathname: route, params: { projectId: ticket.projectId } })
  }

  const openNotes = () => {
    router.push({
      pathname: '/TicketNotesScreen',
      params: { projectId: ticket.id },
    })
  }

  const handleCall = phoneNumber => {
    Alert.alert('Contact Options', 'Would you like to call or text?', [
      {
        text: 'Call',
        onPress: () => {
          const phoneUrl =
            Platform.OS === 'android'
              ? `tel:${phoneNumber}`
              : `telprompt:${phoneNumber}`
          Linking.canOpenURL(phoneUrl)
            .then(supported => {
              if (!supported) {
                Alert.alert('Phone number is not available')
              } else {
                return Linking.openURL(phoneUrl)
              }
            })
            .catch(err => console.error('An error occurred', err))
        },
      },
      {
        text: 'Text',
        onPress: () => {
          const smsUrl = `sms:${phoneNumber}`
          Linking.canOpenURL(smsUrl)
            .then(supported => {
              if (!supported) {
                Alert.alert('SMS is not available')
              } else {
                return Linking.openURL(smsUrl)
              }
            })
            .catch(err => console.error('An error occurred', err))
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const handlePhotoPress = uri => setSelectedPhoto(uri)
  const closePhoto = () => setSelectedPhoto(null)

  const handleDeleteTicket = () => {
    deleteTicket(projectId, () => {
      router.push('/(tabs)')
    })
  }

  const completeTicket = async () => {
    const newStatus = needsReturn ? 'Return Needed' : 'Completed'
    Alert.alert('Confirm', `Mark this ticket as ${newStatus}?`, [
      {
        text: 'Yes',
        onPress: async () => {
          try {
            const ticketRef = doc(firestore, 'tickets', projectId)
            await updateDoc(ticketRef, {
              status: newStatus,
              history: arrayUnion({
                status: newStatus,
                timestamp: new Date().toISOString(),
              }),
            })
            Alert.alert('Success', `Ticket marked as ${newStatus}.`)
            router.push('/(tabs)')
          } catch (error) {
            console.error('Error updating ticket status:', error)
            Alert.alert('Error', 'Failed to update ticket status.')
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const remediationStatus = ticket?.remediationStatus ?? 'notStarted'

  const options = [
    { label: 'Delete Ticket', onPress: () => handleDeleteTicket() },
    {
      label: siteComplete ? 'Mark Incomplete' : 'Mark Complete',
      onPress: async () => {
        const newStatus = !siteComplete
        const actionText = newStatus ? 'complete' : 'incomplete'
        Alert.alert(
          'Confirm',
          `Are you sure you want to mark this site as ${actionText}?`,
          [
            {
              text: 'Yes',
              onPress: async () => {
                try {
                  const projectRef = doc(firestore, 'tickets', ticket.id)
                  await updateDoc(projectRef, { siteComplete: newStatus })
                  Alert.alert('Success', `Site marked as ${actionText}.`)
                  router.push('/(tabs)')
                } catch (error) {
                  console.error(`Error marking site as ${actionText}:`, error)
                  Alert.alert(
                    'Error',
                    `Failed to mark the site as ${actionText}.`
                  )
                }
              },
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        )
      },
    },
    {
      label: inspectionComplete
        ? 'View Inspection'
        : inspectionData?.rooms?.length > 0
        ? 'Continue Inspection'
        : 'Start Inspection',
      onPress: () => handleInspection(),
    },
    {
      label:
        remediationStatus === 'complete'
          ? 'View Remediation'
          : remediationStatus === 'inProgress'
          ? 'Continue Remediation'
          : 'Start Remediation',
      onPress: () => {
        if (remediationStatus === 'complete') {
          router.push({
            pathname: '/ViewRemediationScreen',
            params: { projectId },
          })
        } else {
          router.push({
            pathname: '/RemediationScreen',
            params: { projectId },
          })
        }
      },
    },
    {
      label: messageCount ? 'View Notes' : 'Add Note',
      onPress: () => openNotes(),
    },
  ]

  return (
    <View style={styles.fullScreenContainer}>
      <HeaderWithOptions
        title="Ticket Details"
        onBack={() => router.push('/(tabs)')}
        onOptions={() => {}}
        options={options}
        onHeightChange={height => setHeaderHeight(height)}
      />
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + marginBelowHeader },
        ]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Address</Text>
          <Text style={styles.addressMain}>{street}</Text>
          <Text style={styles.addressSub}>
            {city}, {state} {zip}
          </Text>
          <ETAButton
            eta={eta}
            onPress={() => openGoogleMapsWithETA(address)}
            status={eta === 'N/A' ? 'delayed' : 'normal'}
          />
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Info</Text>
          <View style={styles.contactSection}>
            <Text style={styles.cardTitle}>Builder:</Text>
            <Text style={styles.contactValue}>
              <Text style={styles.contactLabel}>Name: </Text>
              {customerName || 'N/A'}
            </Text>
            <Text style={styles.contactValue}>
              <Text style={styles.contactLabel}>Email: </Text>
              {customerEmail || 'N/A'}
            </Text>
            <Text
              style={[styles.contactValue, styles.link]}
              onPress={() => handleCall(customerNumber)}
            >
              <Text style={styles.contactLabel}>Phone: </Text>
              {customerNumber ? formatPhoneNumber(customerNumber) : 'N/A'}
            </Text>
          </View>
          {homeOwnerName && (
            <View style={styles.contactSection}>
              <Text style={styles.cardTitle}>Homeowner</Text>
              <Text style={styles.contactValue}>
                <Text style={styles.contactLabel}>Name: </Text>
                {homeOwnerName || 'N/A'}
              </Text>
              <Text
                style={[styles.contactValue, styles.link]}
                onPress={() => handleCall(homeOwnerNumber)}
              >
                <Text style={styles.contactLabel}>Phone: </Text>
                {homeOwnerNumber ? formatPhoneNumber(homeOwnerNumber) : 'N/A'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Inspector & Reason</Text>
          <View style={styles.inspectorSection}>
            <Text style={styles.inspectorLabel}>Inspector:</Text>
            <Text style={styles.inspectorValue}>{inspectorName || 'N/A'}</Text>
          </View>
          <View style={styles.inspectorSection}>
            <Text style={styles.inspectorLabel}>Reason for Visit:</Text>
            <Text style={styles.inspectorValue}>{reason || 'N/A'}</Text>
          </View>
        </View>
        <EquipmentModal
          visible={isEquipmentModalVisible}
          onClose={() => setIsEquipmentModalVisible(false)}
          projectId={ticket.id}
        />
        {ticketPhotos && ticketPhotos.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {ticketPhotos.map((photoUri, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handlePhotoPress(photoUri)}
                >
                  <Image source={{ uri: photoUri }} style={styles.photo} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Status:</Text>
            <Text style={styles.infoValue}>{status}</Text>
          </View>
          {history.length > 0 && (
            <>
              <Text style={styles.historyTitle}>History:</Text>
              {history.map((entry, index) => (
                <Text key={index} style={styles.historyEntry}>
                  {entry.status} - {new Date(entry.timestamp).toLocaleString()}
                </Text>
              ))}
            </>
          )}
          {/* Completion Controls */}
          {status !== 'Completed' && status !== 'Return Needed' && (
            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => setNeedsReturn(!needsReturn)}
              >
                <Text style={styles.toggleButtonText}>
                  Needs Return Trip? {needsReturn ? 'Yes' : 'No'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navButton}
                onPress={completeTicket}
              >
                <Text style={styles.navButtonText}>Complete Ticket</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.ScrollView>
      <PhotoModal
        visible={selectedPhoto !== null}
        photo={selectedPhoto}
        onClose={closePhoto}
      />
    </View>
  )
}

export default TicketDetailsScreen

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  addressText: {
    color: '#14171A',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#E1E8ED',
    borderLeftWidth: 5,
    borderLeftColor: ACCENT_COLOR,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardTitle: {
    color: '#14171A',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  contactLabel: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactSection: {
    borderTopWidth: 1,
    borderColor: '#ddd',
    marginVertical: 5,
    paddingVertical: 5,
  },
  contactValue: {
    color: '#555555',
    fontSize: 16,
    marginBottom: 4,
  },
  infoLabel: {
    color: '#14171A',
    fontSize: 14,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoValue: {
    color: '#14171A',
    fontSize: 14,
  },
  inspectorLabel: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  inspectorSection: {
    borderTopWidth: 1,
    borderColor: '#ddd',
    marginVertical: 5,
    paddingVertical: 5,
  },
  inspectorValue: {
    color: '#555555',
    fontSize: 16,
    marginBottom: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
  },
  photo: {
    borderRadius: 5,
    height: 100,
    margin: 5,
    width: 100,
  },
  historyTitle: {
    color: '#14171A',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 5,
  },
  historyEntry: {
    color: '#555555',
    fontSize: 12,
    marginBottom: 3,
  },
  controls: {
    marginTop: 10,
    gap: 10,
  },
  toggleButton: {
    alignItems: 'center',
    backgroundColor: '#2980b9',
    borderRadius: 5,
    padding: 12,
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  navButton: {
    backgroundColor: '#2980b9',
    borderRadius: 5,
    padding: 12,
    alignItems: 'center',
  },
  navButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    color: '#1DA1F2',
  },
  addressMain: {
    color: '#14171A',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressSub: {
    color: '#555555',
    fontSize: 14,
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
})
