'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator, // Added for loading indication
  Alert,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Image,
  Animated,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Picker } from '@react-native-picker/picker'
import { v4 as uuidv4 } from 'uuid'
import { doc, updateDoc, collection, getDocs, getDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing' // Added for sharing functionality
import { FloatingButton } from '@/components/FloatingButton'
import { IconSymbol } from '@/components/ui/IconSymbol'
import useProjectStore from '@/store/useProjectStore'
import { pickAndUploadPhotos } from '@/utils/photoUpload'
// import PhotoGallery from '@/components/PhotoGallery'; // This was commented out, assuming not used or replaced
import AddRoomModal from '@/components/AddRoomModal'
import { BlurView } from 'expo-blur'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

// IMPORTANT: Ensure this path is correct and generatePdf is adapted for remediation reports
import { generatePdf } from '@/utils/pdfGenerator' // Or your actual path to the generatePdf function

const RemediationScreen = () => {
  const params = useLocalSearchParams()
  const projectIdFromParams = params.projectId
  const { projectId: storeProjectId } = useProjectStore()

  const projectId = projectIdFromParams ?? storeProjectId

  const [rooms, setRooms] = useState([])
  const [headerHeight, setHeaderHeight] = useState(0)
  const marginBelowHeader = 8

  const [showItemsModal, setShowItemsModal] = useState(false)
  const [currentRoomId, setCurrentRoomId] = useState(null)
  const [currentMeasurementId, setCurrentMeasurementId] = useState(null)
  const [allItems, setAllItems] = useState([])
  const [itemSearchQuery, setItemSearchQuery] = useState('')
  const [loadingItemsModal, setLoadingItemsModal] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState(null)

  const [showAddRoomModal, setShowAddRoomModal] = useState(false)
  const [selectedRoomType, setSelectedRoomType] = useState('')
  const [customRoomName, setCustomRoomName] = useState('')

  const scrollY = useRef(new Animated.Value(0)).current
  const floatingOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  const [ticket, setTicket] = useState(null)
  const [isSharingInProgress, setIsSharingInProgress] = useState(false) // Added for PDF sharing loading state

  // Cleanup any existing generated PDF files from expo-print
  useEffect(() => {
    const cleanupOldPdfs = async () => {
      try {
        const cacheDir = FileSystem.cacheDirectory
        if (!cacheDir) return
        const printDir = cacheDir + 'Print/' // expo-print specific cache subfolder
        // Check if directory exists before trying to read
        const dirInfo = await FileSystem.getInfoAsync(printDir)
        if (!dirInfo.exists) {
          // console.log("Print cache directory does not exist, no cleanup needed.");
          return
        }

        const files = await FileSystem.readDirectoryAsync(printDir)
        for (const file of files) {
          if (file.endsWith('.pdf')) {
            const fileUri = printDir + file
            // console.log(`Deleting old PDF: ${fileUri}`);
            await FileSystem.deleteAsync(fileUri, { idempotent: true })
          }
        }
      } catch (e) {
        // Silently catch if directory doesn't exist or other minor errors during cleanup
        if (e.message.includes('Directory does not exist')) {
          // Expected if no PDFs were ever printed
        } else {
          console.warn(
            'Warning during old PDF cleanup:',
            e.message.substring(0, 100)
          )
        }
      }
    }
    cleanupOldPdfs()
  }, [])

  useEffect(() => {
    const fetchTicket = async () => {
      if (!projectId) {
        Alert.alert('Error', 'Project ID is missing.')
        return
      }
      try {
        const docRef = doc(firestore, 'tickets', projectId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const data = docSnap.data()
          const remediationData = data.remediationData || { rooms: [] }
          const remediationStatus = data.remediationStatus || 'notStarted'
          setTicket({ ...data, remediationData, remediationStatus }) // Ensure all base ticket data is here
          const updatedRooms = (remediationData.rooms || []).map(room => ({
            ...room,
            id: room.id || uuidv4(), // Ensure ID exists
            notes: room.notes || '',
            numberOfFans: room.numberOfFans || 0,
            measurements: room.measurements || [],
            photos: (room.photos || []).map(photo => ({
              ...photo,
              label: photo.label || '',
            })),
          }))
          setRooms(updatedRooms)
        } else {
          Alert.alert('Error', 'Ticket not found.')
        }
      } catch (error) {
        console.error('Error fetching ticket:', error)
        Alert.alert('Error', 'Failed to load ticket data.')
      }
    }
    fetchTicket()
  }, [projectId])

  // -------------------- Add Room Logic --------------------
  const openAddRoomModal = () => {
    setSelectedRoomType('')
    setCustomRoomName('')
    setShowAddRoomModal(true)
  }

  const handleConfirmAddRoom = () => {
    let roomName = ''
    if (selectedRoomType) {
      roomName = selectedRoomType
    } else if (customRoomName.trim()) {
      roomName = customRoomName.trim()
    } else {
      roomName = `Room ${rooms.length + 1}`
    }
    const newRoom = {
      id: uuidv4(),
      roomTitle: roomName,
      notes: '',
      numberOfFans: 0,
      measurements: [],
      photos: [],
    }
    setRooms(prev => [...prev, newRoom])
    setShowAddRoomModal(false)
  }

  const handleDeleteRoom = roomId => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this room and all its data?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setRooms(prev => prev.filter(room => room.id !== roomId))
          },
        },
      ]
    )
  }

  // -------------------- Notes Logic --------------------
  const handleNotesChange = (roomId, value) => {
    if (value.length > 1000) {
      Alert.alert('Limit Reached', 'Notes cannot exceed 1000 characters.')
      return
    }
    setRooms(prev =>
      prev.map(room => (room.id === roomId ? { ...room, notes: value } : room))
    )
  }

  // -------------------- Photo Logic --------------------
  const handleAddPhoto = async roomId => {
    // Removed projectId from params, use component's projectId
    if (!projectId) {
      Alert.alert('Error', 'Project ID is not available for photo upload.')
      return
    }
    const folder = `remediationPhotos/${projectId}/${roomId}` // More specific folder per room
    const photosArray = await pickAndUploadPhotos({ folder, quality: 0.5 })
    if (photosArray.length > 0) {
      const photosWithLabels = photosArray.map(photo => ({
        ...photo, // contains downloadURL, storagePath
        id: uuidv4(), // Add a unique ID for key prop if needed
        label: '',
      }))
      setRooms(prev =>
        prev.map(room =>
          room.id === roomId
            ? { ...room, photos: [...room.photos, ...photosWithLabels] }
            : room
        )
      )
    }
  }

  const handleDeletePhoto = (roomId, photoStoragePath) => {
    setRooms(prev =>
      prev.map(room =>
        room.id === roomId
          ? {
              ...room,
              photos: room.photos.filter(
                p => p.storagePath !== photoStoragePath
              ),
            }
          : room
      )
    )
  }

  const handlePhotoLabelChange = (roomId, photoStoragePath, value) => {
    if (value.length > 100) {
      Alert.alert('Limit Reached', 'Photo labels cannot exceed 100 characters.')
      return
    }
    setRooms(prev =>
      prev.map(room =>
        room.id === roomId
          ? {
              ...room,
              photos: room.photos.map(photo =>
                photo.storagePath === photoStoragePath
                  ? { ...photo, label: value }
                  : photo
              ),
            }
          : room
      )
    )
  }

  // -------------------- Number of Fans Logic --------------------
  const handleNumberOfFansChange = (roomId, value) => {
    const numericValue = parseInt(value) || 0
    if (numericValue < 0) {
      Alert.alert('Invalid Input', 'Number of fans cannot be negative.')
      return
    }
    if (numericValue > 20) {
      // Example limit
      Alert.alert('Limit Reached', 'Number of fans cannot exceed 20 per room.')
      return
    }

    setRooms(prev =>
      prev.map(room => {
        if (room.id !== roomId) return room

        let updatedMeasurements = [...(room.measurements || [])]
        const airMoverItemId = '1010000001' // Assuming this is the constant ID for Air Movers

        const airMoverIndex = updatedMeasurements.findIndex(
          m => m.itemId === airMoverItemId
        )

        if (numericValue > 0) {
          const airMoverItemDetails = allItems.find(
            item => item.id === airMoverItemId
          ) || {
            name: 'Air mover',
            description: 'Price per day',
            unitPrice: 35, // Default if not found in allItems
          }

          const airMoverMeasurement = {
            id:
              airMoverIndex !== -1
                ? updatedMeasurements[airMoverIndex].id
                : uuidv4(),
            itemId: airMoverItemId,
            name: airMoverItemDetails.name,
            description: airMoverItemDetails.description,
            unitPrice: airMoverItemDetails.unitPrice,
            quantity: numericValue,
            roomName: room.roomTitle,
          }

          if (airMoverIndex !== -1) {
            updatedMeasurements[airMoverIndex] = airMoverMeasurement
          } else {
            updatedMeasurements.push(airMoverMeasurement)
          }
        } else {
          if (airMoverIndex !== -1) {
            updatedMeasurements.splice(airMoverIndex, 1)
          }
        }
        return {
          ...room,
          numberOfFans: numericValue,
          measurements: updatedMeasurements,
        }
      })
    )
  }

  // -------------------- Measurement Logic --------------------
  const handleCreateMeasurement = roomId => {
    const newMeasurementId = uuidv4()
    const newMeasurement = {
      id: newMeasurementId,
      name: '',
      description: '',
      quantity: 1, // Default quantity to 1
      itemId: '',
      unitPrice: 0,
      roomName: rooms.find(room => room.id === roomId)?.roomTitle || '',
    }
    setRooms(prev =>
      prev.map(room =>
        room.id === roomId
          ? {
              ...room,
              measurements: [...(room.measurements || []), newMeasurement],
            }
          : room
      )
    )
    setCurrentRoomId(roomId)
    setCurrentMeasurementId(newMeasurementId)
    setSelectedItemId(null) // Reset picker selection
    openItemsModal()
  }

  const handleDeleteMeasurement = (roomId, measurementId) => {
    setRooms(prev =>
      prev.map(room => {
        if (room.id !== roomId) return room
        const updatedMeasurements = (room.measurements || []).filter(
          m => m.id !== measurementId
        )
        // If the deleted measurement was an air mover, update numberOfFans
        const deletedMeasurement = (room.measurements || []).find(
          m => m.id === measurementId
        )
        if (deletedMeasurement && deletedMeasurement.itemId === '1010000001') {
          return { ...room, measurements: updatedMeasurements, numberOfFans: 0 }
        }
        return { ...room, measurements: updatedMeasurements }
      })
    )
  }

  const handleMeasurementChange = (roomId, measurementId, field, value) => {
    setRooms(prev =>
      prev.map(room => {
        if (room.id !== roomId) return room
        const updatedMeasurements = (room.measurements || []).map(m =>
          m.id === measurementId ? { ...m, [field]: value } : m
        )
        return { ...room, measurements: updatedMeasurements }
      })
    )
  }

  // -------------------- Item Picker Modal --------------------
  const fetchItemsFromFirestore = async () => {
    try {
      const querySnapshot = await getDocs(collection(firestore, 'items'))
      const itemsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))
      setAllItems(itemsData)
    } catch (error) {
      console.error('Error fetching items:', error)
      Alert.alert('Error', 'Failed to load items from database.')
    }
  }

  const openItemsModal = () => {
    setShowItemsModal(true)
    if (allItems.length === 0) {
      setLoadingItemsModal(true)
      fetchItemsFromFirestore().finally(() => setLoadingItemsModal(false))
    }
  }

  const handleSelectItem = item => {
    if (!item) {
      setShowItemsModal(false)
      setItemSearchQuery('')
      // If no item is selected, and it was a new measurement, remove it or handle as needed
      if (currentRoomId && currentMeasurementId) {
        const roomToUpdate = rooms.find(r => r.id === currentRoomId)
        const measurementExists = roomToUpdate?.measurements.find(
          m => m.id === currentMeasurementId && m.itemId
        )
        if (roomToUpdate && !measurementExists) {
          // Optionally remove the blank measurement if user cancels without selecting
          // For now, we leave it, user can delete manually
        }
      }
      setCurrentRoomId(null)
      setCurrentMeasurementId(null)
      return
    }
    setRooms(prev =>
      prev.map(room => {
        if (room.id !== currentRoomId) return room
        const updatedMeasurements = (room.measurements || []).map(m =>
          m.id === currentMeasurementId
            ? {
                ...m,
                name: item.name,
                description: item.description,
                itemId: item.id, // This is the QuickBooks Item ID
                unitPrice: item.unitPrice,
                quantity: m.quantity || 1, // Ensure quantity has a value
                roomName: room.roomTitle,
              }
            : m
        )
        return { ...room, measurements: updatedMeasurements }
      })
    )
    setShowItemsModal(false)
    setItemSearchQuery('')
    setCurrentRoomId(null)
    setCurrentMeasurementId(null)
  }

  // -------------------- Save Data to Firestore --------------------
  const handleSaveRemediationData = async complete => {
    if (isSharingInProgress) return // Don't save if sharing is happening
    try {
      const roomsWithoutPhotos = rooms.filter(
        room => !room.photos || room.photos.length === 0
      )
      if (roomsWithoutPhotos.length > 0 && complete) {
        // Only mandate photos if completing
        const roomNames = roomsWithoutPhotos
          .map(room => room.roomTitle)
          .join(', ')
        Alert.alert(
          'Photos Required for Completion',
          `To mark as complete, please add at least one photo to the following rooms: ${roomNames}. You can still "Save & Continue".`
        )
        return
      }

      const remediationData = {
        rooms: rooms, // Contains all details including measurements with itemIds
        updatedAt: new Date().toISOString(),
      }

      await updateDoc(doc(firestore, 'tickets', projectId), {
        remediationData,
        remediationRequired: rooms.length > 0 ? true : false, // Update based on if rooms exist
        remediationStatus: complete
          ? 'complete'
          : rooms.length > 0
          ? 'inProgress'
          : 'notStarted',
      })

      Alert.alert(
        'Success',
        complete
          ? 'Remediation marked complete and saved.'
          : 'Remediation progress saved.'
      )

      router.push({
        pathname: '/TicketDetailsScreen',
        params: { projectId: projectId, timestamp: Date.now() }, // Added timestamp to force refresh
      })
    } catch (error) {
      console.error('Error saving remediation data:', error)
      Alert.alert('Error', 'Failed to save data. Please try again.')
    }
  }

  // -------------------- PDF Sharing Logic --------------------
  const handleShareRemediationReport = async () => {
    if (!ticket || !projectId) {
      Alert.alert(
        'Error',
        'Ticket data is not fully loaded. Cannot generate report.'
      )
      return
    }
    if (isSharingInProgress) return

    setIsSharingInProgress(true)
    try {
      const ticketObjectForPdf = {
        // Base ticket data (address, client info, etc.)
        ...(ticket || {}), // Ensure ticket is not null
        ticketNumber: projectId,
        reason: 'Remediation Report',

        // Remediation specific data. Your generatePdf's HTML part needs to be adapted for this.
        // This structure is a suggestion; adapt it to what generatePdf's HTML expects.
        remediationData: {
          rooms: rooms.map(room => ({
            roomTitle: room.roomTitle,
            notes: room.notes || 'N/A', // Or 'inspectionFindings' if generatePdf expects that
            numberOfFans: room.numberOfFans || 0,
            photos: (room.photos || []).map(p => ({
              downloadURL: p.downloadURL,
              comment: p.label || '', // Or 'label' if your PDF template uses that
            })),
            measurements: (room.measurements || []).map(m => ({
              name: m.name,
              quantity: m.quantity,
              unitPrice: m.unitPrice,
              description: m.description,
            })),
            // If your PDF needs a general findings section per room:
            // inspectionFindings: room.notes || `Details: ${room.measurements.length} line items, ${room.photos.length} photos.`,
          })),
        },
        // Ensure other fields potentially used by the generic generatePdf are present,
        // possibly from the main `ticket` state.
        // street: ticket?.street || 'N/A',
        // city: ticket?.city || 'N/A',
        // inspectorName: ticket?.inspectorName || 'Coastal Team',
        // createdAt: ticket?.createdAt ? (ticket.createdAt.toDate ? ticket.createdAt.toDate() : new Date(ticket.createdAt)) : new Date(),
        // streetPhoto: ticket?.streetPhoto || null,
      }

      // Validate critical data needed by generatePdf
      if (!ticketObjectForPdf.street || !ticketObjectForPdf.city) {
        console.warn(
          'PDF Generation Warning: Address details (street/city) might be missing from ticket data.',
          ticketObjectForPdf
        )
        // Alert.alert("Missing Data", "Property address details are missing for the PDF report. Please ensure the ticket has full address info.");
        // setIsSharingInProgress(false);
        // return; // Or proceed with missing data if generatePdf can handle it
      }

      console.log(
        'Attempting to generate PDF with data snippet:',
        JSON.stringify(ticketObjectForPdf, null, 2).substring(0, 500) + '...'
      )

      let firebasePdfUrl
      if (typeof generatePdf !== 'function') {
        Alert.alert(
          'Developer Error',
          'generatePdf function is not available. Please check import.'
        )
        setIsSharingInProgress(false)
        return
      }
      try {
        firebasePdfUrl = await generatePdf(ticketObjectForPdf)
      } catch (pdfError) {
        console.error('Error directly from generatePdf:', pdfError)
        Alert.alert(
          'PDF Generation Failed',
          `Details: ${pdfError.message || 'Unknown error during PDF creation.'}`
        )
        setIsSharingInProgress(false)
        return
      }

      if (
        !firebasePdfUrl ||
        typeof firebasePdfUrl !== 'string' ||
        !firebasePdfUrl.startsWith('https://')
      ) {
        Alert.alert(
          'PDF Link Error',
          'Failed to get a valid PDF link after generation. The link might be missing or malformed.'
        )
        setIsSharingInProgress(false)
        return
      }
      console.log('PDF generated. Firebase URL:', firebasePdfUrl)

      const fileName = `RemediationReport_${projectId}_${Date.now()}.pdf`
      const localDir = FileSystem.cacheDirectory || FileSystem.documentDirectory
      const localPdfUri =
        localDir + (localDir.endsWith('/') ? '' : '/') + fileName

      console.log(`Downloading PDF from ${firebasePdfUrl} to ${localPdfUri}`)
      await FileSystem.downloadAsync(firebasePdfUrl, localPdfUri)
      console.log('PDF downloaded to local URI:', localPdfUri)

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          'Sharing Not Available',
          'Sharing is not available on this device.'
        )
        setIsSharingInProgress(false)
        return
      }

      await Sharing.shareAsync(localPdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Remediation Report',
        UTI: 'com.adobe.pdf',
      })
    } catch (error) {
      console.error('Error during sharing process in RemediationScreen:', error)
      Alert.alert(
        'Sharing Error',
        `An error occurred: ${error.message || 'Unknown error'}`
      )
    } finally {
      setIsSharingInProgress(false)
    }
  }

  // -------------------- Header Options --------------------
  const headerOptions = [
    {
      label: 'Save & Complete',
      onPress: () => handleSaveRemediationData(true),
      disabled: isSharingInProgress,
    },
    {
      label: 'Save & Continue',
      onPress: () => handleSaveRemediationData(false),
      disabled: isSharingInProgress,
    },
    {
      label: isSharingInProgress ? 'Processing...' : 'Share Report',
      onPress: handleShareRemediationReport,
      disabled: isSharingInProgress,
    },
  ]

  // -------------------- Render --------------------
  if (!ticket && !projectId) {
    // Initial state before projectId is confirmed
    return (
      <View style={styles.fullScreenContainer}>
        <ActivityIndicator style={{ marginTop: 50 }} size="large" />
      </View>
    )
  }
  if (!ticket && projectId) {
    // ProjectId available, but ticket still fetching or failed
    return (
      <View style={styles.fullScreenContainer}>
        <HeaderWithOptions
          title="Remediation"
          onBack={() => router.back()}
          options={[]}
        />
        <ActivityIndicator style={{ marginTop: 50 }} size="large" />
        <Text style={{ textAlign: 'center', marginTop: 10 }}>
          Loading ticket data...
        </Text>
      </View>
    )
  }
  // Ticket is loaded
  return (
    <View style={styles.fullScreenContainer}>
      <HeaderWithOptions
        title="Remediation"
        onBack={() => router.back()}
        options={headerOptions}
        onHeightChange={height => setHeaderHeight(height)}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={
          headerHeight + marginBelowHeader + (Platform.OS === 'ios' ? 20 : 0)
        } // Adjusted offset
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContainer,
              // Removed paddingTop here as KAV should handle it with offset
            ]}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false } // Set to false if using onScroll for layout-dependent animations
            )}
            scrollEventThrottle={16}
          >
            {rooms.map(room => (
              <View key={room.id} style={styles.roomCard}>
                {/* Room Header */}
                <View style={styles.roomHeader}>
                  <Text style={styles.roomName}>{room.roomTitle}</Text>
                  <TouchableOpacity onPress={() => handleDeleteRoom(room.id)}>
                    <IconSymbol name="trash.fill" size={20} color="#E0245E" />
                  </TouchableOpacity>
                </View>

                {/* Notes Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Notes</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Add notes (optional)..."
                    value={room.notes}
                    onChangeText={text => handleNotesChange(room.id, text)}
                    multiline
                  />
                </View>

                {/* Number of Fans Section */}
                <View style={styles.section}>
                  <View style={styles.fansRow}>
                    <Icon
                      name="fan"
                      size={24}
                      color="#17BF63" // Choose a suitable color
                      style={styles.fanIcon}
                    />
                    <Text style={styles.sectionTitle}>
                      Number of Air Movers
                    </Text>
                  </View>
                  <TextInput
                    style={styles.numberOfFansInput}
                    placeholder="0"
                    keyboardType="numeric"
                    value={room.numberOfFans?.toString() || '0'}
                    onChangeText={text =>
                      handleNumberOfFansChange(room.id, text)
                    }
                  />
                </View>

                {/* Line Items Section */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Line Items</Text>
                    <TouchableOpacity
                      onPress={() => handleCreateMeasurement(room.id)}
                    >
                      <IconSymbol
                        name="plus.circle.fill" // Filled icon
                        size={26}
                        color="#17BF63" // Green color for add
                      />
                    </TouchableOpacity>
                  </View>
                  {(room.measurements || []).map(measurement => (
                    <View key={measurement.id} style={styles.measurementRow}>
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => {
                          if (measurement.itemId === '1010000001') return // Air mover name not editable via picker
                          setCurrentRoomId(room.id)
                          setCurrentMeasurementId(measurement.id)
                          setSelectedItemId(measurement.itemId || null) // Pre-select if an item was already chosen
                          openItemsModal()
                        }}
                        disabled={measurement.itemId === '1010000001'} // Disable if Air Mover
                      >
                        <TextInput
                          style={[
                            styles.measurementInput,
                            {
                              flex: 1,
                              backgroundColor:
                                measurement.itemId === '1010000001'
                                  ? '#f0f0f0'
                                  : '#fff',
                            },
                          ]}
                          placeholder="Select Item"
                          value={measurement.name || ''}
                          editable={false} // Not directly editable, use picker
                        />
                      </TouchableOpacity>
                      {measurement.description &&
                        measurement.itemId !== '1010000001' && ( // Don't show for air mover if name is enough
                          <Text style={styles.measurementDescription}>
                            {measurement.description.substring(0, 25)}
                            {measurement.description.length > 25 ? '...' : ''}
                          </Text>
                        )}
                      <TextInput
                        style={[
                          styles.measurementInput,
                          {
                            width: 60,
                            textAlign: 'center',
                            backgroundColor:
                              measurement.itemId === '1010000001'
                                ? '#f0f0f0'
                                : '#fff',
                          },
                        ]}
                        placeholder="Qty"
                        keyboardType="numeric"
                        value={
                          measurement.quantity !== undefined
                            ? measurement.quantity.toString()
                            : '1'
                        }
                        onChangeText={val => {
                          if (measurement.itemId === '1010000001') return
                          const numericValue = parseFloat(val) || 0
                          handleMeasurementChange(
                            room.id,
                            measurement.id,
                            'quantity',
                            numericValue
                          )
                        }}
                        editable={measurement.itemId !== '1010000001'} // Quantity of Air Mover is handled by Number of Fans
                      />
                      {measurement.itemId !== '1010000001' && ( // Don't allow deleting Air Mover item here
                        <TouchableOpacity
                          onPress={() =>
                            handleDeleteMeasurement(room.id, measurement.id)
                          }
                        >
                          <IconSymbol
                            name="trash.fill"
                            size={20}
                            color="#E0245E"
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  {(!room.measurements || room.measurements.length === 0) && (
                    <Text style={styles.noItemsText}>
                      No line items added yet.
                    </Text>
                  )}
                </View>

                {/* Photos Section */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Photos</Text>
                    <TouchableOpacity onPress={() => handleAddPhoto(room.id)}>
                      <IconSymbol
                        name="plus.circle.fill"
                        size={26}
                        color="#17BF63"
                      />
                    </TouchableOpacity>
                  </View>
                  {(room.photos || []).length > 0 ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.photoRowScrollView}
                    >
                      {(room.photos || []).map((photo, index) => (
                        <View key={photo.id || index} style={styles.photoItem}>
                          <Image
                            source={{ uri: photo.downloadURL }}
                            style={styles.photoImage}
                          />
                          <TouchableOpacity
                            onPress={() =>
                              handleDeletePhoto(room.id, photo.storagePath)
                            }
                            style={styles.deletePhotoButton}
                          >
                            <IconSymbol
                              name="xmark.circle.fill"
                              size={20}
                              color="rgba(0,0,0,0.7)"
                            />
                          </TouchableOpacity>
                          <TextInput
                            style={styles.photoLabelInput}
                            placeholder="Label (optional)"
                            value={photo.label}
                            onChangeText={text =>
                              handlePhotoLabelChange(
                                room.id,
                                photo.storagePath,
                                text
                              )
                            }
                            maxLength={50}
                          />
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text style={styles.noPhotoText}>
                      No photos added for this room.
                    </Text>
                  )}
                </View>
              </View>
            ))}
            <View style={{ height: 50 }} /> {/* Spacer for floating button */}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <Animated.View
        style={{
          position: 'absolute',
          right: 25,
          bottom: 50,
          opacity: floatingOpacity,
        }}
      >
        <FloatingButton
          onPress={openAddRoomModal}
          title="Room"
          iconName="plus" // Simpler icon name for some libraries
          size={28}
        />
      </Animated.View>

      {showItemsModal && (
        <Modal
          visible={showItemsModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowItemsModal(false)
            handleSelectItem(null) // Treat closing modal without confirm as cancel
          }}
        >
          <BlurView
            intensity={Platform.OS === 'ios' ? 80 : 5}
            style={styles.absoluteFill}
            tint="light"
          >
            <TouchableWithoutFeedback
              onPress={() => {
                setShowItemsModal(false)
                handleSelectItem(null)
              }}
            >
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback>
                  {' '}
                  {/* To prevent modal close when tapping inside container */}
                  <View style={styles.itemsModalContainer}>
                    <Text style={styles.modalTitle}>Select Line Item</Text>
                    <TextInput
                      style={styles.itemSearchInput}
                      placeholder="Search items..."
                      value={itemSearchQuery}
                      onChangeText={setItemSearchQuery}
                    />
                    {loadingItemsModal ? (
                      <ActivityIndicator
                        size="large"
                        color="#1DA1F2"
                        style={{ marginVertical: 20 }}
                      />
                    ) : (
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={selectedItemId}
                          onVualueChange={itemIdValue =>
                            setSelectedItemId(itemIdValue)
                          }
                          style={styles.pickerStyle}
                          itemStyle={styles.pickerItemStyle}
                        >
                          <Picker.Item
                            label="-- Select an Item --"
                            value={null}
                          />
                          {allItems
                            .filter(
                              item =>
                                item.name &&
                                item.name
                                  .toLowerCase()
                                  .includes(itemSearchQuery.toLowerCase())
                            )
                            .map(item => (
                              <Picker.Item
                                key={item.id}
                                label={`${
                                  item.name
                                } ($${item.unitPrice?.toFixed(2)})`}
                                value={item.id}
                              />
                            ))}
                        </Picker>
                      </View>
                    )}
                    <View style={styles.modalButtonsRow}>
                      <TouchableOpacity
                        onPress={() => {
                          setShowItemsModal(false)
                          handleSelectItem(null)
                        }} // Explicit cancel
                        style={[styles.modalButton, styles.modalCloseButton]}
                      >
                        <Text style={styles.modalButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          const item = allItems.find(
                            i => i.id === selectedItemId
                          )
                          if (item) {
                            handleSelectItem(item)
                          } else {
                            Alert.alert(
                              'No Item Selected',
                              'Please choose an item from the list or cancel.'
                            )
                          }
                        }}
                        style={[styles.modalButton, styles.modalConfirmButton]}
                        disabled={!selectedItemId}
                      >
                        <Text style={styles.modalButtonTextWhite}>Confirm</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </BlurView>
        </Modal>
      )}

      {showAddRoomModal && (
        <AddRoomModal
          visible={showAddRoomModal}
          onClose={() => setShowAddRoomModal(false)}
          selectedRoomType={selectedRoomType}
          setSelectedRoomType={setSelectedRoomType}
          customRoomName={customRoomName}
          setCustomRoomName={setCustomRoomName}
          onConfirm={handleConfirmAddRoom}
        />
      )}

      {isSharingInProgress && (
        <View style={[styles.absoluteFill, styles.sharingOverlay]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.sharingOverlayText}>Preparing Report...</Text>
        </View>
      )}
    </View>
  )
}

export default RemediationScreen

const styles = StyleSheet.create({
  absoluteFill: {
    // Renamed from absoulteFill
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#F0F2F5', // Lighter background
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 120, // More space for floating button and last card
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Align title left, button right
    alignItems: 'center',
    marginBottom: 12,
  },
  roomCard: {
    backgroundColor: '#FFFFFF', // White cards
    borderRadius: 12, // Softer corners
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000', // Basic shadow for depth
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EAECEE',
  },
  roomName: {
    fontSize: 18, // Larger room name
    fontWeight: '600', // Bolder
    color: '#2C3E50', // Darker blue-grey
  },
  // deleteRoomText: { // Replaced by Icon
  //   color: '#E74C3C', // Red for delete
  //   fontWeight: '500',
  //   fontSize: 14,
  // },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16, // Consistent section title size
    fontWeight: '600',
    color: '#34495E', // Another shade of blue-grey
    marginBottom: 8, // Space below title before input
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#D5DBDB',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  fansRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0, // Removed bottom margin here, sectionTitle has it
  },
  fanIcon: {
    marginRight: 8,
  },
  numberOfFansInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#D5DBDB',
    width: 70, // Slightly wider
    textAlign: 'center',
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8, // Use gap for spacing
  },
  measurementInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#D5DBDB',
    // flex: 1, // Let parent TouchableOpacity handle flex for name
  },
  measurementDescription: {
    fontSize: 12,
    color: '#7F8C8D', // Lighter grey for description
    flexShrink: 1, // Allow description to shrink if needed
  },
  noItemsText: {
    color: '#7F8C8D',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  photoRowScrollView: {
    // New style for the horizontal scroll view
    // No specific styles needed here unless you want padding/margin for the scrollview itself
  },
  photoItem: {
    marginRight: 12, // Space between photos
    alignItems: 'center', // Center label below photo
    position: 'relative',
  },
  photoImage: {
    width: 80, // Slightly larger photos
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D5DBDB',
    backgroundColor: '#ECF0F1', // Placeholder color
  },
  photoLabelInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11, // Smaller label font
    color: '#2C3E50',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#D5DBDB',
    width: 80, // Match photo width
    textAlign: 'center',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: -5, // Adjust for better positioning over the photo corner
    right: -5, // Adjust
    backgroundColor: 'white', // Make background opaque
    borderRadius: 12, // Make it circular
    padding: 2,
    zIndex: 1, // Ensure it's above the image
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  // deletePhotoButtonText: { // Replaced by Icon
  //   color: '#FFFFFF',
  //   fontSize: 12,
  //   fontWeight: 'bold',
  // },
  noPhotoText: {
    color: '#7F8C8D',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor applied by BlurView or directly if not using BlurView
  },
  itemsModalContainer: {
    width: '90%', // Wider modal
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20, // Larger modal title
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#2C3E50',
  },
  itemSearchInput: {
    backgroundColor: '#F8F9F9', // Slightly off-white
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#2C3E50',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D5DBDB',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D5DBDB',
    borderRadius: 8,
    marginBottom: 16,
    height: Platform.OS === 'ios' ? 150 : 60, // Adjust height for platforms
    justifyContent: 'center',
    overflow: 'hidden', // Needed for Android to respect border radius
  },
  pickerStyle: {
    // On Android, styling the Picker itself is limited.
    // On iOS, you might not need specific styles here if itemStyle is used.
    // width: '100%', // Ensure it fills the container
  },
  pickerItemStyle: {
    // For iOS picker items
    // fontSize: 16,
    // height: 120, // Example height for iOS item list
    // color: '#2C3E50',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Space out buttons
    marginTop: 16,
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 120, // Ensure buttons have a decent width
    alignItems: 'center',
  },
  modalConfirmButton: {
    backgroundColor: '#17BF63', // Green for confirm
  },
  modalCloseButton: {
    backgroundColor: '#BDC3C7', // Grey for cancel/close
  },
  modalButtonText: {
    color: '#2C3E50', // Dark text for light buttons
    fontWeight: '600',
    fontSize: 15,
  },
  modalButtonTextWhite: {
    color: '#FFFFFF', // White text for dark buttons
    fontWeight: '600',
    fontSize: 15,
  },
  sharingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', // Darker overlay
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, // Ensure it's on top of everything
  },
  sharingOverlayText: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  // Styles for AddRoomModal (if they were previously in this file, otherwise keep them in AddRoomModal.js)
  // ... (AddRoomModal specific styles if needed)
})
