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
  const ticketRef = doc(firestore, 'tickets', ticketId)
  try {
    // 1. Delete ticketNotes
    const notesQuery = query(
      collection(firestore, 'ticketNotes'),
      where('projectId', '==', ticketId)
    )
    const notesSnap = await getDocs(notesQuery)
    await Promise.all(notesSnap.docs.map(n => deleteDoc(n.ref)))

    // 2. Load ticket data
    const ticketDoc = await getDoc(ticketRef)
    if (!ticketDoc.exists()) throw new Error('Ticket not found')
    const data = ticketDoc.data()

    // 3. Delete remediation photos
    for (const room of data.remediationData?.rooms || []) {
      for (const p of room.photos || []) {
        if (p.storagePath) await deleteObject(ref(storage, p.storagePath))
      }
    }
    // 4. Delete inspection photos
    for (const room of data.inspectionData?.rooms || []) {
      for (const p of room.photos || []) {
        if (p.storagePath) await deleteObject(ref(storage, p.storagePath))
      }
    }
    // 5. Delete street photo
    if (data.streetPhoto?.storagePath) {
      await deleteObject(ref(storage, data.streetPhoto.storagePath))
    }
    // 6. Delete PDFs
    if (data.inspectionPdfStoragePath) {
      await deleteObject(ref(storage, data.inspectionPdfStoragePath))
    }
    if (data.remediationPdfStoragePath) {
      await deleteObject(ref(storage, data.remediationPdfStoragePath))
    }
    // 7. Delete dryLetters subcollection
    const dryCol = collection(firestore, 'tickets', ticketId, 'dryLetters')
    const drySnap = await getDocs(dryCol)
    await Promise.all(drySnap.docs.map(d => deleteDoc(d.ref)))
    // 8. Delete ticketPhotos (supports stored objects or URL strings)
    for (const photo of data.ticketPhotos || []) {
      let storagePathToDelete = null
      // If photo is an object with storagePath, use it directly
      if (photo && typeof photo === 'object' && photo.storagePath) {
        storagePathToDelete = photo.storagePath
      } else if (typeof photo === 'string') {
        // Fallback: derive storage path from URL string
        const parts = photo.split('/o/')
        if (parts.length > 1) {
          const enc = parts[1].split('?')[0]
          storagePathToDelete = decodeURIComponent(enc)
        }
      }
      if (storagePathToDelete) {
        await deleteObject(ref(storage, storagePathToDelete))
      }
    }

    // 9. Finally delete the ticket document
    await deleteDoc(ticketRef)
    Alert.alert('Success', 'Ticket deleted successfully.')
    if (typeof onTicketDeleted === 'function') onTicketDeleted()
  } catch (error) {
    console.error('Error deleting ticket and related data:', error)
    Alert.alert(
      'Error',
      'Could not delete ticket. Ensure all associated items are removed first.'
    )
  }
}

export { deleteTicket }
