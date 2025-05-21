// TicketCard.js
import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  // Platform, // Not used in this snippet directly
} from 'react-native'
import { router } from 'expo-router'
import { format } from 'date-fns'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { MessageIndicator } from '@/components/MessageIndicator'
import { updateDoc, doc, arrayUnion } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
// import useProjectStore from '@/store/useProjectStore'; // Not explicitly used in this component's logic

const TicketCard = ({
  ticket,
  onPress,
  // openEquipmentModal, // Not used in this component's direct rendering logic
  backgroundColor,
  timeColor,
}) => {
  let displayedStartTime = 'N/A'
  let displayedEndTime = 'N/A'

  // Safely access and format startTime
  if (ticket && ticket.startTime) {
    const startAt = ticket.startTime.toDate
      ? ticket.startTime.toDate()
      : new Date(ticket.startTime)
    if (startAt && !isNaN(startAt.getTime())) {
      displayedStartTime = format(startAt, 'h:mm a')
    }
  }

  // Safely access and format endTime
  if (ticket && ticket.endTime) {
    const endAt = ticket.endTime.toDate
      ? ticket.endTime.toDate()
      : new Date(ticket.endTime)
    if (endAt && !isNaN(endAt.getTime())) {
      displayedEndTime = format(endAt, 'h:mm a')
    }
  }

  const icons = []
  const isEmptyRemediation =
    !ticket.remediationData || Object.keys(ticket.remediationData).length === 0

  if (ticket.inspectionComplete) {
    icons.push(
      <IconSymbol
        key="inspectionComplete"
        name="text.document"
        size={30} // Adjusted size for better fit
        color="green"
      />
    )
  }
  if (ticket.remediationRequired && !ticket.isReturnVisit) {
    // Show hammer only if it's not a return visit itself needing remediation
    icons.push(
      <IconSymbol
        key="remediationRequired"
        name="hammer.circle.fill"
        size={30}
        color="orange" // Changed color for remediation required
      />
    )
  }
  if (!isEmptyRemediation) {
    icons.push(
      <IconSymbol
        key="remediationData"
        name="pencil.and.ruler.fill"
        size={30}
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
        size={30}
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
        size={30}
        color="green"
      />
    )
  }
  const hasIcons = icons.length > 0

  const handleArrivingOnSite = (projectId, currentOnSiteStatus) => {
    if (!projectId) {
      Alert.alert('Error', 'Ticket ID is missing.')
      return
    }
    let alertMessage = currentOnSiteStatus
      ? 'Do you want to mark the site complete (Off Site)?'
      : 'Do you want to start the clock (On Site)?'
    let alertAction = currentOnSiteStatus ? 'Stop' : 'Start'
    let newOnSiteStatusText = currentOnSiteStatus ? 'Off Site' : 'On Site' // For history

    Alert.alert(`${alertAction} Work`, alertMessage, [
      {
        text: 'Cancel',
        onPress: () => console.log('User canceled onSite update'),
        style: 'cancel',
      },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            const ticketRef = doc(firestore, 'tickets', projectId)
            await updateDoc(ticketRef, {
              onSite: !currentOnSiteStatus,
              history: arrayUnion({
                status: `Technician ${newOnSiteStatusText}`, // More descriptive history
                timestamp: new Date().toISOString(),
                reason: `User toggled onSite status via TicketCard.`,
              }),
            })
            // Navigation on marking "Off Site" was conditional, ensure this is desired.
            // if (currentOnSiteStatus) { // If user was "On Site" and is now "Off Site"
            //   router.push('/(tabs)');
            // }
          } catch (error) {
            console.error('Error updating onSite status:', error)
            Alert.alert('Error', 'Failed to update onSite status.')
          }
        },
      },
    ])
  }

  // Updated Status badge logic
  const getStatusStyle = () => {
    // isReturnVisit flag takes precedence for "Return Visit" badge
    if (
      ticket.isReturnVisit &&
      (ticket.status === 'Open' || ticket.status === 'Open - Return')
    ) {
      return styles.returnVisitBadge
    }
    switch (ticket.status) {
      case 'Open':
        return styles.openBadge
      case 'Completed':
        return styles.completedBadge
      case 'Return Needed':
        return styles.returnNeededBadge // Specific style for this
      case 'Return Scheduled':
        return styles.returnScheduledBadge // Specific style for this
      // 'Open - Return' is handled by isReturnVisit check above
      default:
        return styles.defaultBadge
    }
  }

  const getStatusText = () => {
    if (
      ticket.isReturnVisit &&
      (ticket.status === 'Open' || ticket.status === 'Open - Return')
    ) {
      return 'Return Visit'
    }
    return ticket.status || 'Unknown' // Fallback if status is somehow null/undefined
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.cardContainer,
        { backgroundColor: backgroundColor || '#FFFFFF' },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.inspectorInfo}>
          <Text
            style={styles.inspectorName}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {ticket.inspectorName || 'N/A'}
            {ticket.onSite && (
              <IconSymbol
                style={styles.onSiteIcon}
                name="figure.walk.motion" // More dynamic icon
                size={15}
                color="green"
              />
            )}
          </Text>
          <View style={getStatusStyle()}>
            <Text style={styles.badgeText}>{getStatusText()}</Text>
          </View>

          <Text
            style={styles.ticketNumber}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {ticket.ticketNumber || 'N/A'}
          </Text>
        </View>
        <View style={styles.timeInfo}>
          <View style={styles.timeRangeContainer}>
            <Text style={[styles.timeRange, { color: timeColor || '#333' }]}>
              {displayedStartTime} - {displayedEndTime}
            </Text>
          </View>
          <View style={styles.jobTypeContainer}>
            <View
              style={[
                styles.occupancyContainer,
                ticket.occupied
                  ? styles.occupiedBackground
                  : styles.unoccupiedBackground,
              ]}
            >
              <Text style={styles.occupancy}>
                {ticket.occupied ? 'O' : 'V'}
              </Text>
            </View>
            <Text style={styles.jobType} numberOfLines={1} ellipsizeMode="tail">
              {ticket.typeOfJob || 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.addressSection}>
        <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="tail">
          {ticket.street || 'N/A'}
        </Text>
        <Text
          style={styles.addressSubText}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {ticket.city || 'N/A'}, {ticket.state || ''} {ticket.zip || ''}
        </Text>
      </View>

      {hasIcons && (
        <View style={styles.iconsContainer}>
          {icons.map((iconComponent, index) => (
            <View key={index} style={styles.iconWrapper}>
              {iconComponent}
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  cardContainer: {
    minHeight: 190, // Adjusted for potentially more content
    marginHorizontal: 8, // Give some horizontal margin for a card feel
    marginVertical: 6,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  inspectorInfo: {
    flex: 1.5, // Give more space to inspector info
    marginRight: 8,
  },
  inspectorName: {
    fontSize: 17, // Slightly smaller
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  onSiteIcon: {
    marginLeft: 6,
    transform: [{ translateY: -1 }], // Fine-tune position
  },
  ticketNumber: {
    fontSize: 13,
    color: '#757575',
    marginTop: 4,
  },
  timeInfo: {
    flex: 1, // Allow time info to take adequate space
    alignItems: 'flex-end',
  },
  timeRangeContainer: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: '#f0f0f0', // Light background for time
    marginBottom: 5,
  },
  timeRange: {
    fontSize: 15,
    fontWeight: '600', // Semibold
    letterSpacing: -0.5,
  },
  jobTypeContainer: {
    flexDirection: 'row',

    width: 160,
    alignItems: 'center',
    marginTop: 4,
  },
  // Badge base style (applied to the View wrapping the Text)
  badgeBase: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12, // More rounded
    alignSelf: 'flex-start', // Important for width to fit content
    marginTop: 4,
    maxWidth: '100%', // Prevent overflow
  },
  badgeText: {
    color: 'white',
    fontSize: 11, // Smaller font for badges
    fontWeight: 'bold',
    textAlign: 'center',
  },
  openBadge: {
    backgroundColor: '#3498DB', // Calmer Blue
  },
  completedBadge: {
    backgroundColor: '#2ECC71', // Emerald Green
  },
  returnNeededBadge: {
    // For original ticket needing a return
    backgroundColor: '#F39C12', // Orange
  },
  returnScheduledBadge: {
    // For original ticket after its return is scheduled
    backgroundColor: '#1ABC9C', // Teal/Turquoise
  },
  returnVisitBadge: {
    // For the NEW ticket that IS the return visit
    backgroundColor: '#9B59B6', // Amethyst Purple
  },
  defaultBadge: {
    backgroundColor: '#95A5A6', // Asbestos Grey
  },
  occupancyContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    minWidth: 28, // Ensure 'O' or 'V' is visible
    alignItems: 'center',
    justifyContent: 'center',
  },
  occupiedBackground: {
    backgroundColor: '#E74C3C', // Red for Occupied
  },
  unoccupiedBackground: {
    backgroundColor: '#2ECC71', // Green for Vacant/Unoccupied
  },
  occupancy: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  jobType: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500', // Medium weight
    flexShrink: 1, // Allow text to shrink if necessary
  },
  addressSection: {
    marginTop: 8, // Reduced top margin slightly
    marginBottom: 10, // Space before icons if they appear
  },
  addressText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
    marginBottom: 2,
  },
  addressSubText: {
    fontSize: 13,
    color: '#666',
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'absolute', // Keep icons at bottom right
    bottom: 10,
    right: 10,
  },
  iconWrapper: {
    marginLeft: 8, // Space between icons
    padding: 2,
    // backgroundColor: 'rgba(0,0,0,0.03)', // Optional: very light background for touch area
    // borderRadius: 15,
  },
})

// Combine badge styles with base for direct use on the View
styles.openBadge = { ...styles.badgeBase, ...styles.openBadge }
styles.completedBadge = { ...styles.badgeBase, ...styles.completedBadge }
styles.returnNeededBadge = { ...styles.badgeBase, ...styles.returnNeededBadge }
styles.returnScheduledBadge = {
  ...styles.badgeBase,
  ...styles.returnScheduledBadge,
}
styles.returnVisitBadge = { ...styles.badgeBase, ...styles.returnVisitBadge }
styles.defaultBadge = { ...styles.badgeBase, ...styles.defaultBadge }

export { TicketCard }
