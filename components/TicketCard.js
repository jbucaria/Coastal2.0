import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native'
import { router } from 'expo-router'
import { format } from 'date-fns'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { MessageIndicator } from '@/components/MessageIndicator'
import { updateDoc, doc, arrayUnion } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import useProjectStore from '@/store/useProjectStore'

const TicketCard = ({
  ticket,
  onPress,
  openEquipmentModal,
  backgroundColor,
  timeColor,
}) => {
  // Convert Firestore Timestamps or ISO strings to JS Dates
  const startAt = ticket.startTime?.toDate
    ? ticket.startTime.toDate()
    : new Date(ticket.startTime)
  const endAt = ticket.endTime?.toDate
    ? ticket.endTime.toDate()
    : new Date(ticket.endTime)

  let startTime = 'N/A'
  let endTime = 'N/A'

  if (startAt && !isNaN(startAt)) {
    startTime = format(startAt, 'h:mm a')
  }
  if (endAt && !isNaN(endAt)) {
    endTime = format(endAt, 'h:mm a')
  }

  // Icons to display based on ticket status
  const icons = []
  const isEmpty =
    !ticket.remediationData || Object.keys(ticket.remediationData).length === 0

  if (ticket.inspectionComplete) {
    icons.push(
      <IconSymbol
        key="inspectionComplete"
        name="text.document"
        size={40}
        color="green"
      />
    )
  }
  if (ticket.remediationRequired) {
    icons.push(
      <IconSymbol
        key="remediationRequired"
        name="hammer.circle.fill"
        size={40}
        color="green"
      />
    )
  }
  if (!isEmpty) {
    icons.push(
      <IconSymbol
        key="remediation"
        name="pencil.and.ruler.fill"
        size={40}
        color="green"
      />
    )
  }

  if (ticket.equipmentTotal > 0) {
    icons.push(
      <MessageIndicator
        key="equipment"
        count={ticket.equipmentTotal}
        name="fan.fill"
        size={40}
        color="green"
      />
    )
  }

  if (ticket.messageCount > 0) {
    icons.push(
      <MessageIndicator
        key="messages"
        count={ticket.messageCount}
        name="bubble.left.and.text.bubble.right.fill"
        size={40}
        color="green"
      />
    )
  }

  const hasIcons = icons.length > 0

  // Navigation handlers with history update
  const handleArrivingOnSite = (projectId, currentOnSiteStatus) => {
    let alertMessage = currentOnSiteStatus
      ? 'Do you want to mark the site complete?'
      : 'Do you want to start the clock?'
    let alertAction = currentOnSiteStatus ? 'Stop' : 'Start'
    let newStatus = currentOnSiteStatus ? 'Off Site' : 'On Site'

    Alert.alert(`${alertAction} Work`, alertMessage, [
      {
        text: 'Cancel',
        onPress: () => console.log('User canceled'),
        style: 'cancel',
      },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            const projectRef = doc(firestore, 'tickets', projectId)
            await updateDoc(projectRef, {
              onSite: !currentOnSiteStatus,
              history: arrayUnion({
                status: newStatus,
                timestamp: new Date().toISOString(),
              }),
            })
            if (currentOnSiteStatus) {
              router.push('/(tabs)')
            }
          } catch (error) {
            console.error('Error updating the ticket in the database:', error)
            Alert.alert('Error', 'Failed to update ticket status.')
          }
        },
      },
    ])
  }

  // Status badge color logic
  const getStatusStyle = status => {
    switch (status) {
      case 'Open':
        return styles.openBadge
      case 'Completed':
        return styles.completedBadge
      case 'Return Needed':
        return styles.returnBadge
      default:
        return styles.defaultBadge
    }
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.cardContainer,
        { backgroundColor: backgroundColor || '#FFFFFF' },
      ]}
    >
      {/* Header Row: Inspector + Time + Job Type */}
      <View style={styles.headerRow}>
        <View style={styles.inspectorInfo}>
          <TouchableOpacity
            onPress={() => handleArrivingOnSite(ticket.id, ticket.onSite)}
          >
            <Text style={styles.inspectorName}>
              {ticket.inspectorName || ''}
              {ticket.onSite && (
                <IconSymbol
                  style={styles.onSiteIcon}
                  name="person.crop.square"
                  size={15}
                  color="green"
                />
              )}
            </Text>
            <Text style={getStatusStyle(ticket.status)}>
              {ticket.status || 'Open'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.ticketNumber}>{ticket.ticketNumber}</Text>
        </View>
        <View style={styles.timeInfo}>
          <View style={styles.timeRangeContainer}>
            <Text style={[styles.timeRange, { color: timeColor || 'black' }]}>
              {startTime} - {endTime}
            </Text>
          </View>
          <View style={styles.jobTypeContainer}>
            <View style={styles.occupancyContainer}>
              <Text style={styles.occupancy}>
                {ticket.occupied ? 'O' : 'U'}
              </Text>
            </View>
            <Text style={styles.jobType}>{ticket.typeOfJob || ''}</Text>
          </View>
        </View>
      </View>

      {/* Address Section */}
      <View style={styles.addressSection}>
        <Text style={styles.addressText}>{ticket.street}</Text>
        <Text style={styles.addressSubText}>
          {ticket.city}, {ticket.state} {ticket.zip}
        </Text>
      </View>

      {/* Icons Section */}
      {hasIcons && (
        <View style={styles.iconsContainer}>
          {icons.map((icon, index) => (
            <View key={index} style={styles.iconWrapper}>
              {icon}
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  cardContainer: {
    height: 200,
    marginHorizontal: 0,
    padding: 5,
    borderBottomColor: '#eaeaea',
    borderBottomWidth: 1,
    // Add this to ensure content fits within the height
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  inspectorInfo: {
    flex: 1,
  },
  inspectorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  onSiteIcon: {
    marginLeft: 5,
    position: 'relative',
    top: -2,
  },
  ticketNumber: {
    fontSize: 14,
    color: '#757575',
  },
  timeInfo: {
    alignItems: 'flex-end',
  },
  timeRangeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  timeRange: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: -0.5,
  },
  jobTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignContent: 'space-between',
    marginTop: 4,
  },
  openBadge: {
    backgroundColor: '#2196F3', // Blue for Open
    color: 'white',
    padding: 5,
    borderRadius: 4,
    fontSize: 12,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  completedBadge: {
    backgroundColor: '#4CAF50', // Green for Completed
    color: 'white',
    padding: 5,
    borderRadius: 4,
    fontSize: 12,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  returnBadge: {
    backgroundColor: '#FF9800', // Orange for Return Needed
    color: 'white',
    padding: 5,
    borderRadius: 4,
    fontSize: 12,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  defaultBadge: {
    backgroundColor: '#757575', // Grey for unknown status
    color: 'white',
    padding: 5,
    borderRadius: 4,
    fontSize: 12,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  occupancyContainer: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    paddingHorizontal: 2,
    paddingVertical: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  occupancy: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'rgba(13, 71, 161, 1)',
  },
  jobType: {
    fontSize: 14,
    color: 'rgba(13, 71, 161, 1)',
    fontWeight: 'semibold',
    marginLeft: 12,
  },
  addressSection: {
    marginBottom: 16,
  },
  addressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  addressSubText: {
    fontSize: 14,
    color: '#212121',
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    // Ensure icons stay within the card bounds
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  iconWrapper: {
    borderRadius: 8,
    marginLeft: 8,
  },
})

export { TicketCard }
