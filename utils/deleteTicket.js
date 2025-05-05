import { Alert } from 'react-native'
import {
  deleteDoc,
  doc,
  collection,
  getDocs,
  getDoc,
  query,
  where,
} from 'firebase/firestore'
import { ref, deleteObject } from 'firebase/storage'
import { firestore, storage } from '@/firebaseConfig'

const deleteTicket = async (ticketId, onTicketDeleted) => {
  try {
    Alert.alert(
      'Delete Ticket',
      'Are you sure you want to delete this ticket and all associated notes, photos, and data?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await performDelete(ticketId, onTicketDeleted)
          },
        },
      ],
      { cancelable: true }
    )
  } catch (error) {
    console.error('Error showing delete confirmation:', error)
    Alert.alert(
      'Error',
      'Failed to show delete confirmation. Please try again.'
    )
  }
}

const performDelete = async (ticketId, onTicketDeleted) => {
  try {
    // 1. Delete any ticketNotes that have projectId == ticketId
    const notesQuery = query(
      collection(firestore, 'ticketNotes'),
      where('projectId', '==', ticketId)
    )
    const notesSnapshot = await getDocs(notesQuery)
    await Promise.all(notesSnapshot.docs.map(noteDoc => deleteDoc(noteDoc.ref)))

    // 2. Grab the ticket document
    const ticketRef = doc(firestore, 'tickets', ticketId)
    const ticketDocSnap = await getDoc(ticketRef)

    if (!ticketDocSnap.exists()) {
      Alert.alert('Error', 'Ticket does not exist.')
      return
    }

    const ticketData = ticketDocSnap.data()

    // 2a. If you have "mainPhotos" stored as an array of objects:
    // Example format: [ { storagePath: 'remediationPhotos/...', downloadURL: '...' }, ... ]
    const mainPhotos = ticketData.photos || []
    if (Array.isArray(mainPhotos) && mainPhotos.length > 0) {
      await Promise.all(
        mainPhotos.map(async photoObj => {
          // Directly delete using storagePath
          if (photoObj.storagePath) {
            await deleteObject(ref(storage, photoObj.storagePath))
          }
        })
      )
    }

    // 2b. Delete remediation photos in `ticketData.remediationData.rooms`
    const remediationData = ticketData.remediationData || {}
    const rooms = remediationData.rooms || []

    for (const room of rooms) {
      if (!room.photos) continue
      // If room.photos is also array of objects with {storagePath, downloadURL}
      const deletePromises = room.photos.map(async photoObj => {
        if (photoObj?.storagePath) {
          await deleteObject(ref(storage, photoObj.storagePath))
        }
      })
      await Promise.all(deletePromises)
    }

    // 3. Finally, delete the ticket doc itself
    await deleteDoc(ticketRef)
    Alert.alert('Success', 'Ticket deleted successfully.')

    if (typeof onTicketDeleted === 'function') {
      onTicketDeleted()
    }
  } catch (error) {
    console.error('Error deleting ticket:', error)
    Alert.alert('Error', 'Failed to delete the ticket. Please try again.')
  }
}

export { deleteTicket }
