import { Alert } from 'react-native'
import { router } from 'expo-router'
import {
  addDoc,
  updateDoc,
  collection,
  serverTimestamp,
  increment,
} from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, firestore } from '@/firebaseConfig'

export const createTicket = async (
  ticketData,
  resetForm,
  setIsSubmitting,
  user,
  newNote
) => {
  try {
    // Prepare the initial history entry
    const initialHistory = [
      {
        status: 'Open',
        timestamp: new Date().toISOString(),
      },
    ]

    // Explicitly remove history from ticketData if it exists
    const { history, ...cleanedTicketData } = ticketData

    // Construct the ticket payload
    const ticketPayload = {
      ...cleanedTicketData, // Use cleaned data without history
      createdAt: serverTimestamp(),
      status: 'Open',
      history: initialHistory, // Set history explicitly
    }

    // Log the payload before saving

    // Save to Firestore
    const docRef = await addDoc(collection(firestore, 'tickets'), ticketPayload)

    // Log the document ID and payload after creation
    console.log('Ticket created with ID:', docRef.id)
    console.log('Payload sent to Firestore:', ticketPayload)

    // Update with projectId and ticketNumber
    const docId = docRef.id
    const lastSix = docId.slice(-6)
    const ticketNumber = `CR-${lastSix}`
    await updateDoc(docRef, {
      projectId: docId,
      ticketNumber,
    })

    // Handle notes if provided
    if (newNote.trim()) {
      await addDoc(collection(firestore, 'ticketNotes'), {
        projectId: docRef.id,
        userId: auth.currentUser.uid,
        userName: user?.displayName || auth.currentUser.email,
        message: newNote,
        timestamp: serverTimestamp(),
      })
      await updateDoc(docRef, { messageCount: increment(1) })
    }

    Alert.alert('Success', 'Ticket created successfully.')
    router.push('/(tabs)')
    resetForm()
  } catch (error) {
    console.error('Error creating ticket:', error)
    Alert.alert('Error', 'Failed to create the ticket. Please try again.')
  } finally {
    setIsSubmitting(false)
  }
}

export const handleCreateTicket = async (
  newTicket,
  selectedDate,
  startTime,
  endTime,
  resetForm,
  setIsSubmitting,
  isSubmitting,
  newNote,
  user
) => {
  if (isSubmitting) return
  setIsSubmitting(true)

  try {
    // Enhanced validation
    const missingFields = []
    if (!newTicket.street) missingFields.push('Street')
    if (!newTicket.city) missingFields.push('City')
    if (!newTicket.state) missingFields.push('State')
    if (!newTicket.zip) missingFields.push('ZIP')
    if (!newTicket.customerId) missingFields.push('Builder')

    if (missingFields.length > 0) {
      Alert.alert(
        'Validation Error',
        `Please fill out the following required fields: ${missingFields.join(
          ', '
        )}.`
      )
      setIsSubmitting(false)
      return
    }

    const composedAddress = `${newTicket.street}${
      newTicket.lotNumber ? ' Lot ' + newTicket.lotNumber : ''
    }${
      newTicket.apt ? ' Apt ' + newTicket.apt : ''
    }, ${newTicket.city}, ${newTicket.state} ${newTicket.zip}`

    const ticketData = {
      ...newTicket,
      address: composedAddress,
      startDate: selectedDate.toISOString(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    }

    // Upload photos with error handling (skip already-uploaded objects)
    const storage = getStorage()
    const uploadPromises = newTicket.ticketPhotos.map(async photo => {
      // If already uploaded (has downloadURL and storagePath), reuse it
      if (
        photo &&
        typeof photo === 'object' &&
        photo.downloadURL &&
        photo.storagePath
      ) {
        return photo
      }
      // Otherwise, photo is a local URI string
      const uri = photo
      const response = await fetch(uri)
      const blob = await response.blob()
      const fileName = uri.split('/').pop() || `${Date.now()}.jpg`
      const storagePath = `ticketPhotos/${Date.now()}_${fileName}`
      const storageRef = ref(storage, storagePath)
      await uploadBytes(storageRef, blob)
      const downloadURL = await getDownloadURL(storageRef)
      return { storagePath, downloadURL }
    })
    let photoObjects
    try {
      photoObjects = await Promise.all(uploadPromises)
      ticketData.ticketPhotos = photoObjects
    } catch (error) {
      console.error('Error uploading photos:', error)
      Alert.alert('Error', 'Failed to upload one or more photos.')
      setIsSubmitting(false)
      return
    }

    // Call the createTicket function
    await createTicket(ticketData, resetForm, setIsSubmitting, user, newNote)
  } catch (error) {
    console.error('Error creating the ticket:', error)
    Alert.alert('Error', 'Failed to create the ticket. Please try again.')
  } finally {
    setIsSubmitting(false)
  }
}
