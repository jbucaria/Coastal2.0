// TicketDetailsScreen.js
'use client'

import React, { useRef, useEffect, useState } from 'react'
import {
  Animated,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native'
import { useRouter } from 'expo-router'
import { updateDoc, doc, arrayUnion } from 'firebase/firestore'
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
import { IconSymbol } from '@/components/ui/IconSymbol' // <<--- ADD THIS IMPORT

// Corrected openGoogleMapsWithETA function
const openGoogleMapsWithETA = address => {
  if (!address || typeof address !== 'string' || !address.trim()) {
    Alert.alert('Error', 'A valid address is required to open maps.')
    return
  }
  const encodedAddress = encodeURIComponent(address)
  let url = ''

  if (Platform.OS === 'ios') {
    url = `http://maps.apple.com/?q=${encodedAddress}`
    const googleMapsUrl = `comgooglemaps://?daddr=${encodedAddress}&directionsmode=driving`
    Linking.canOpenURL(googleMapsUrl)
      .then(supported => {
        if (supported) {
          Linking.openURL(googleMapsUrl)
        } else {
          Linking.openURL(url)
        }
      })
      .catch(() => Linking.openURL(url))
    return
  } else {
    url = `geo:0,0?q=${encodedAddress}`
  }

  Linking.openURL(url).catch(err => {
    console.error('Error opening maps via intent:', err)
    const webUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
    Alert.alert(
      'Map App Issue',
      'Could not open map application directly. Attempting to open in browser.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: () =>
            Linking.openURL(webUrl).catch(webErr => {
              console.error('Error opening web maps:', webErr)
              Alert.alert('Error', 'Could not open maps.')
            }),
        },
      ]
    )
  })
}

const ACCENT_COLOR = '#1DA1F2'

const TicketDetailsScreen = () => {
  const router = useRouter()
  const { projectId } = useProjectStore()
  const {
    ticket,
    error: ticketError,
    loading: ticketLoading,
  } = useTicket(projectId)

  const [eta, setEta] = useState(null)
  const [isEquipmentModalVisible, setIsEquipmentModalVisible] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [needsReturn, setNeedsReturn] = useState(false)
  const [returnNote, setReturnNote] = useState('')
  const [headerHeight, setHeaderHeight] = useState(0)
  const scrollY = useRef(new Animated.Value(0)).current

  const marginBelowHeader = 8

  useEffect(() => {
    if (ticketError) {
      Alert.alert('Error', 'Unable to fetch ticket data. Please try again.')
    }
  }, [ticketError, router])

  useEffect(() => {
    if (ticket?.address) {
      getTravelTime(ticket.address)
        .then(info => setEta(info.durationText))
        .catch(err => {
          console.error('Error fetching travel time:', err)
          setEta('N/A')
        })
    } else {
      setEta(null)
    }
  }, [ticket?.address])

  useEffect(() => {
    if (ticket) {
      const shouldNeedReturnInitially =
        ticket.remediationRequired || ticket.status === 'Return Needed'
      setNeedsReturn(shouldNeedReturnInitially)

      if (ticket.status === 'Return Needed' && ticket.returnNote) {
        setReturnNote(ticket.returnNote)
      } else if (ticket.status !== 'Return Needed') {
        setReturnNote('')
      }
    } else {
      setNeedsReturn(false)
      setReturnNote('')
    }
  }, [ticket])

  if (ticketLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT_COLOR} />
        <Text style={styles.loadingText}>Loading ticket details...</Text>
      </View>
    )
  }

  if (!ticket) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Ticket not found or error loading details.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)')}
          style={styles.navButton}
        >
          <Text style={styles.navButtonText}>Go to Dashboard</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const {
    id: currentTicketId,
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
    remediationComplete,
    inspectionComplete,
    inspectionData,
    siteComplete,
    messageCount,
    status = 'Open',
    history = [],
  } = ticket

  const handleInspection = () => {
    const route = inspectionComplete ? '/ViewReport' : '/InspectionScreen'
    router.push({ pathname: route, params: { projectId: currentTicketId } })
  }

  const handleRemediation = () => {
    const remediationStatus = ticket?.remediationStatus ?? 'notStarted'
    const route =
      remediationStatus === 'complete'
        ? '/ViewRemediationScreen'
        : '/RemediationScreen'
    router.push({ pathname: route, params: { projectId: currentTicketId } })
  }

  const openNotes = () => {
    router.push({
      pathname: '/TicketNotesScreen',
      params: { projectId: currentTicketId },
    })
  }

  const handleCall = phoneNumber => {
    if (!phoneNumber) {
      Alert.alert(
        'No Phone Number',
        'No phone number is available for this contact.'
      )
      return
    }
    Alert.alert('Contact Options', 'Would you like to call or text?', [
      {
        text: 'Call',
        onPress: () => {
          const phoneUrl =
            Platform.OS === 'android'
              ? `tel:${phoneNumber}`
              : `telprompt:${phoneNumber}`
          Linking.openURL(phoneUrl).catch(err =>
            console.error('An error occurred trying to call', err)
          )
        },
      },
      {
        text: 'Text',
        onPress: () => {
          const smsUrl = `sms:${phoneNumber}`
          Linking.openURL(smsUrl).catch(err =>
            console.error('An error occurred trying to text', err)
          )
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const handlePhotoPress = uri => setSelectedPhoto(uri)
  const closePhoto = () => setSelectedPhoto(null)

  const handleDeleteTicket = () => {
    deleteTicket(currentTicketId, () => {
      router.push('/(tabs)')
    })
  }

  const completeTicket = async () => {
    let newStatusToSet = 'Completed'
    let historyReason = 'Ticket completed.'
    const updatePayload = {}

    if (status === 'Return Scheduled') {
      newStatusToSet = 'Completed'
      historyReason =
        'Original ticket finalized after return visit was scheduled.'
    } else {
      newStatusToSet = needsReturn ? 'Return Needed' : 'Completed'
      if (needsReturn) {
        if (!returnNote?.trim()) {
          Alert.alert(
            'Note Required',
            'Please enter a brief reason for the return trip.'
          )
          return
        }
        updatePayload.returnNote = returnNote.trim()
        historyReason = `Marked for return: ${returnNote.trim()}`
      } else {
        historyReason = 'Ticket completed by user.'
      }
    }

    Alert.alert('Confirm Update', `Mark this ticket as ${newStatusToSet}?`, [
      {
        text: 'Yes',
        onPress: async () => {
          try {
            const ticketRef = doc(firestore, 'tickets', currentTicketId)
            updatePayload.status = newStatusToSet
            updatePayload.history = arrayUnion({
              status: newStatusToSet,
              timestamp: new Date().toISOString(),
              reason: historyReason,
            })

            await updateDoc(ticketRef, updatePayload)
            Alert.alert(
              'Success',
              `Ticket status updated to ${newStatusToSet}.`
            )
            router.push('/(tabs)')
          } catch (err) {
            console.error('Error updating ticket status:', err)
            Alert.alert('Error', 'Failed to update ticket status.')
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const remediationStatus = ticket?.remediationStatus ?? 'notStarted'
  const options = [
    { label: 'Delete Ticket', onPress: handleDeleteTicket },
    {
      label: siteComplete ? 'Mark Incomplete' : 'Mark Site Active',
      onPress: async () => {
        const newSiteStatusValue = !siteComplete
        const actionText = newSiteStatusValue ? 'complete' : 'active'
        Alert.alert('Confirm Site Status', `Mark site as ${actionText}?`, [
          {
            text: 'Yes',
            onPress: async () => {
              try {
                const ticketRef = doc(firestore, 'tickets', currentTicketId)
                await updateDoc(ticketRef, { siteComplete: newSiteStatusValue })
                Alert.alert('Success', `Site marked as ${actionText}.`)
              } catch (err) {
                console.error(`Error marking site as ${actionText}:`, err)
                Alert.alert('Error', `Failed to mark site as ${actionText}.`)
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ])
      },
    },
    {
      label: inspectionComplete
        ? 'View Inspection'
        : inspectionData?.rooms?.length > 0
        ? 'Continue Inspection'
        : 'Start Inspection',
      onPress: handleInspection,
    },
    {
      label:
        remediationStatus === 'complete'
          ? 'View Remediation'
          : remediationStatus === 'inProgress'
          ? 'Continue Remediation'
          : 'Start Remediation',
      onPress: handleRemediation,
    },
    {
      label: messageCount > 0 ? `View Notes (${messageCount})` : 'Add Note',
      onPress: openNotes,
    },
  ]

  return (
    <View style={styles.fullScreenContainer}>
      <HeaderWithOptions
        title="Ticket Details"
        onBack={() => router.push('/(tabs)')}
        options={options}
        onHeightChange={setHeaderHeight}
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
          <Text style={styles.cardTitle}>Location Address</Text>
          <Text style={styles.addressMain}>{street || 'N/A'}</Text>
          <Text style={styles.addressSub}>
            {city || 'N/A'}, {state || 'N/A'} {zip || ''}
          </Text>
          <ETAButton
            eta={eta}
            onPress={() => openGoogleMapsWithETA(address)}
            status={eta === 'N/A' ? 'delayed' : 'normal'}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Information</Text>
          <View style={styles.contactSection}>
            <Text style={styles.sectionSubTitle}>Builder Contact</Text>
            <Text style={styles.contactValue}>
              <Text style={styles.contactLabel}>Name: </Text>
              {customerName || 'N/A'}
            </Text>
            <Text style={styles.contactValue}>
              <Text style={styles.contactLabel}>Email: </Text>
              {customerEmail || 'N/A'}
            </Text>
            <TouchableOpacity onPress={() => handleCall(customerNumber)}>
              <Text style={[styles.contactValue, styles.link]}>
                <Text style={styles.contactLabel}>Phone: </Text>
                {customerNumber ? formatPhoneNumber(customerNumber) : 'N/A'}
              </Text>
            </TouchableOpacity>
          </View>
          {(homeOwnerName || homeOwnerNumber) && (
            <View style={styles.contactSection}>
              <Text style={styles.sectionSubTitle}>Homeowner Contact</Text>
              {homeOwnerName && (
                <Text style={styles.contactValue}>
                  <Text style={styles.contactLabel}>Name: </Text>
                  {homeOwnerName}
                </Text>
              )}
              {homeOwnerNumber && (
                <TouchableOpacity onPress={() => handleCall(homeOwnerNumber)}>
                  <Text style={[styles.contactValue, styles.link]}>
                    <Text style={styles.contactLabel}>Phone: </Text>
                    {formatPhoneNumber(homeOwnerNumber)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assignment Details</Text>
          <View style={styles.inspectorSection}>
            <Text style={styles.inspectorLabel}>Assigned Inspector:</Text>
            <Text style={styles.inspectorValue}>{inspectorName || 'N/A'}</Text>
          </View>
          <View style={styles.inspectorSection}>
            <Text style={styles.inspectorLabel}>Reason for Visit:</Text>
            <Text style={styles.inspectorValue}>{reason || 'N/A'}</Text>
          </View>
        </View>

        {ticketPhotos && ticketPhotos.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Site Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {ticketPhotos.map((photoObj, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handlePhotoPress(photoObj.downloadURL)}
                >
                  <Image
                    source={{ uri: photoObj.downloadURL }}
                    style={styles.photo}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        <EquipmentModal
          visible={isEquipmentModalVisible}
          onClose={() => setIsEquipmentModalVisible(false)}
          projectId={currentTicketId}
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ticket Progress</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Status:</Text>
            <Text style={styles.infoValue}>{status}</Text>
          </View>
          {history && history.length > 0 && (
            <>
              <Text style={styles.historyTitle}>Status History:</Text>
              {history
                .slice()
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .map((entry, index) => (
                  <Text key={index} style={styles.historyEntry}>
                    <Text style={{ fontWeight: 'bold' }}>{entry.status}</Text> -{' '}
                    {new Date(entry.timestamp).toLocaleString()}
                    {entry.reason ? (
                      <Text style={styles.historyReason}>
                        {' '}
                        ({entry.reason})
                      </Text>
                    ) : (
                      ''
                    )}
                  </Text>
                ))}
            </>
          )}
          {status !== 'Completed' && status !== 'Return Needed' && (
            <View style={styles.controls}>
              {status !== 'Return Scheduled' && (
                <>
                  <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={() => setNeedsReturn(!needsReturn)}
                  >
                    <Text style={styles.toggleButtonText}>
                      Needs Return Trip? {needsReturn ? 'YES' : 'NO'}
                    </Text>
                  </TouchableOpacity>
                  {needsReturn && (
                    <TextInput
                      style={styles.returnNoteInput}
                      placeholder="Brief reason for return (e.g., part needed, further assessment)"
                      value={returnNote}
                      onChangeText={setReturnNote}
                      multiline
                      placeholderTextColor="#888"
                    />
                  )}
                </>
              )}
              <TouchableOpacity
                style={styles.navButton}
                onPress={completeTicket}
              >
                <Text style={styles.navButtonText}>
                  {status === 'Return Scheduled'
                    ? 'Finalize Original Ticket'
                    : 'Submit Status Update'}
                </Text>
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
      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          router.push({
            pathname: '/DryLetterScreen',
            params: { projectId: currentTicketId },
          })
        }
      >
        <IconSymbol name="newspaper.fill" size={30} color="white" />
      </TouchableOpacity>
    </View>
  )
}

export default TicketDetailsScreen

const styles = StyleSheet.create({
  fullScreenContainer: { flex: 1, backgroundColor: '#f4f6f8' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#37474F',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF1',
  },
  sectionSubTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#455A64',
    marginBottom: 8,
    marginTop: 5,
  },
  addressMain: {
    fontSize: 17,
    fontWeight: '600',
    color: '#37474F',
    marginBottom: 3,
  },
  addressSub: { fontSize: 15, color: '#546E7A', marginBottom: 12 },
  contactSection: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
    marginTop: 10,
  },
  contactSectionFirst: { paddingVertical: 10 },
  contactLabel: { fontWeight: 'bold', color: '#455A64' },
  contactValue: {
    fontSize: 15,
    color: '#37474F',
    marginBottom: 8,
    lineHeight: 22,
  },
  link: { color: ACCENT_COLOR, textDecorationLine: 'underline' },
  inspectorSection: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
    marginTop: 10,
  },
  inspectorLabel: { fontSize: 15, fontWeight: 'bold', color: '#455A64' },
  inspectorValue: { fontSize: 15, color: '#37474F', marginTop: 3 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF1',
  },
  infoLabel: { fontSize: 15, fontWeight: 'bold', color: '#455A64' },
  infoValue: { fontSize: 15, color: '#37474F', fontWeight: '500' },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#455A64',
    marginTop: 15,
    marginBottom: 8,
  },
  historyEntry: {
    fontSize: 13,
    color: '#546E7A',
    marginBottom: 5,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT_COLOR,
    lineHeight: 18,
  },
  historyReason: { fontStyle: 'italic', color: '#78909C' },
  photo: {
    width: 110,
    height: 110,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#CFD8DC',
  },
  controls: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
  },
  toggleButton: {
    backgroundColor: '#5DADE2',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  returnNoteInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#B0BEC5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 70,
    marginBottom: 12,
    textAlignVertical: 'top',
    color: '#37474F',
  },
  navButton: {
    backgroundColor: ACCENT_COLOR,
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  navButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  fab: {
    position: 'absolute',
    margin: 20,
    right: 0,
    bottom: 0,
    backgroundColor: ACCENT_COLOR,
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
})
