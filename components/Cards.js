import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
  ScrollView,
} from 'react-native'

export const TicketDetailsCard = ({
  ticket,
  editable = false,
  onChangeField,
}) => {
  let createdAtStr = ''
  if (ticket.createdAt && ticket.createdAt.seconds) {
    createdAtStr = new Date(ticket.createdAt.seconds * 1000).toLocaleString()
  }
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Report Details</Text>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Ticket Number: </Text>
        {editable ? (
          <TextInput
            style={[styles.detailValue, styles.input]}
            value={ticket.ticketNumber}
            onChangeText={text => onChangeField('ticketNumber', text)}
          />
        ) : (
          <Text style={styles.detailValue}>{ticket.ticketNumber}</Text>
        )}
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Date: </Text>
        <Text style={styles.detailValue}>{createdAtStr}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Address:</Text>
      </View>
      <View style={styles.addressContainer}>
        <Text style={styles.detailValue}>
          {ticket.street}
          {ticket.apt ? `, Apt ${ticket.apt}` : ''}
        </Text>
        <Text style={styles.detailValue}>
          {ticket.city}, {ticket.state} {ticket.zip}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Inspector: </Text>
        {editable ? (
          <TextInput
            style={[styles.detailValue, styles.input]}
            value={ticket.inspectorName}
            onChangeText={text => onChangeField('inspectorName', text)}
          />
        ) : (
          <Text style={styles.detailValue}>{ticket.inspectorName}</Text>
        )}
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Reason for Visit: </Text>

        <Text style={styles.detailValue}>{ticket.reason}</Text>
      </View>
    </View>
  )
}

export const RoomCard = ({
  room,
  editable = false,
  onChangeField,
  onPhotoPress = () => {},
}) => {
  const { roomTitle, inspectionFindings, photos } = room
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{roomTitle}</Text>
      <Text style={styles.cardText}>Findings:</Text>
      <Text style={styles.cardText}>{inspectionFindings}</Text>

      <ScrollView horizontal style={styles.photosContainer}>
        {photos && photos.length > 0 ? (
          photos.map((photo, index) => (
            <View key={index} style={styles.photoWrapper}>
              <TouchableOpacity
                onPress={() => onPhotoPress(photo.downloadURL)}
              >
                <Image source={{ uri: photo.downloadURL }} style={styles.photo} />
              </TouchableOpacity>
              {photo.comment ? (
                <Text style={styles.photoComment}>{photo.comment}</Text>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.cardText}>No photos available.</Text>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F5F8FA',
    borderRadius: 8,
    borderColor: '#E1E8ED',
    borderWidth: 1,
    margin: 16,
    padding: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#14171A',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14171A',
  },
  detailValue: {
    fontSize: 16,
    color: '#14171A',
    flexShrink: 1,
  },
  cardText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#14171A',
  },
  addressContainer: {
    marginLeft: 16,
    marginBottom: 10,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  photo: {
    width: 100,
    height: 100,
    margin: 5,
    borderRadius: 5,
  },
  photoWrapper: {
    marginRight: 10,
    alignItems: 'center',
  },
  photoComment: {
    fontSize: 12,
    color: '#4b5563',
    marginTop: 4,
    maxWidth: 100,
    textAlign: 'center',
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 2,
    paddingHorizontal: 4,
    minWidth: 80,
  },
})
