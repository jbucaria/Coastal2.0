'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal, // Re-added for item picker
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Image,
  Animated,
} from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { Picker } from '@react-native-picker/picker' // Re-added
import { v4 as uuidv4 } from 'uuid'
import { doc, updateDoc, collection, getDocs, getDoc } from 'firebase/firestore' // Re-added collection, getDocs
import { firestore } from '@/firebaseConfig'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { FloatingButton } from '@/components/FloatingButton'
import { IconSymbol } from '@/components/ui/IconSymbol'
import useProjectStore from '@/store/useProjectStore'
import { pickAndUploadPhotos } from '@/utils/photoUpload'
import AddRoomModal from '@/components/AddRoomModal'
import { BlurView } from 'expo-blur' // Re-added
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { generatePdf } from '@/utils/pdfGenerator'

const RemediationScreen = () => {
  const params = useLocalSearchParams()
  const projectIdFromParams = params.projectId
  const { projectId: storeProjectId } = useProjectStore()

  const projectId = projectIdFromParams ?? storeProjectId

  const [rooms, setRooms] = useState([])
  const [headerHeight, setHeaderHeight] = useState(0)
  const marginBelowHeader = 8

  // States for Item Picker Modal (Re-added)
  const [showItemsModal, setShowItemsModal] = useState(false)
  const [currentRoomIdForModal, setCurrentRoomIdForModal] = useState(null)
  const [currentMeasurementIdForModal, setCurrentMeasurementIdForModal] =
    useState(null)
  const [allItems, setAllItems] = useState([])
  const [itemSearchQuery, setItemSearchQuery] = useState('')
  const [loadingItemsModal, setLoadingItemsModal] = useState(false)
  const [selectedItemIdInPicker, setSelectedItemIdInPicker] = useState(null)

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
  const [isSharingInProgress, setIsSharingInProgress] = useState(false)

  useEffect(() => {
    const cleanupOldPdfs = async () => {
      try {
        const cacheDir = FileSystem.cacheDirectory
        if (!cacheDir) return
        const printDir = cacheDir + 'Print/'
        const dirInfo = await FileSystem.getInfoAsync(printDir)
        if (!dirInfo.exists) {
          return
        }
        const files = await FileSystem.readDirectoryAsync(printDir)
        for (const file of files) {
          if (file.endsWith('.pdf')) {
            await FileSystem.deleteAsync(printDir + file, { idempotent: true })
          }
        }
      } catch (e) {
        if (!e.message.includes('Directory does not exist')) {
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
        return
      }
      try {
        const docRef = doc(firestore, 'tickets', projectId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const data = docSnap.data()
          const remediationData = data.remediationData || { rooms: [] }
          const remediationStatus = data.remediationStatus || 'notStarted'
          setTicket({ ...data, remediationData, remediationStatus })
          const updatedRooms = (remediationData.rooms || []).map(room => ({
            ...room,
            id: room.id || uuidv4(),
            notes: room.notes || '',
            numberOfFans: room.numberOfFans || 0,
            measurements: (room.measurements || []).map(m => ({
              ...m,
              id: m.id || uuidv4(),
            })),
            photos: (room.photos || []).map(photo => ({
              ...photo,
              label: photo.label || '',
              id: photo.id || uuidv4(),
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
          onPress: () =>
            setRooms(prev => prev.filter(room => room.id !== roomId)),
        },
      ]
    )
  }

  const handleNotesChange = (roomId, value) => {
    if (value.length > 1000) {
      Alert.alert('Limit Reached', 'Notes cannot exceed 1000 characters.')
      return
    }
    setRooms(prev =>
      prev.map(room => (room.id === roomId ? { ...room, notes: value } : room))
    )
  }

  const handleAddPhoto = async roomId => {
    if (!projectId) {
      Alert.alert('Error', 'Project ID is not available for photo upload.')
      return
    }
    const folder = `remediationPhotos/${projectId}/${roomId}`
    const photosArray = await pickAndUploadPhotos({ folder, quality: 0.5 })
    if (photosArray.length > 0) {
      const photosWithLabels = photosArray.map(photo => ({
        ...photo,
        id: uuidv4(),
        label: '',
      }))
      setRooms(prev =>
        prev.map(room =>
          room.id === roomId
            ? { ...room, photos: [...(room.photos || []), ...photosWithLabels] }
            : room
        )
      )
    }
  }

  const handleDeletePhoto = (roomId, photoIdOrStoragePath) => {
    setRooms(prev =>
      prev.map(room =>
        room.id === roomId
          ? {
              ...room,
              photos: room.photos.filter(
                p => (p.id || p.storagePath) !== photoIdOrStoragePath
              ),
            }
          : room
      )
    )
  }

  const handlePhotoLabelChange = (roomId, photoIdOrStoragePath, value) => {
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
                (photo.id || photo.storagePath) === photoIdOrStoragePath
                  ? { ...photo, label: value }
                  : photo
              ),
            }
          : room
      )
    )
  }

  const handleNumberOfFansChange = (roomId, value) => {
    const numericValue = parseInt(value) || 0
    if (numericValue < 0) {
      Alert.alert('Invalid Input', 'Number of fans cannot be negative.')
      return
    }
    if (numericValue > 20) {
      Alert.alert('Limit Reached', 'Number of fans cannot exceed 20 per room.')
      return
    }
    setRooms(prev =>
      prev.map(room =>
        room.id === roomId ? { ...room, numberOfFans: numericValue } : room
      )
    )
  }

  const handleCreateMeasurement = roomId => {
    const newMeasurementId = uuidv4()
    const room = rooms.find(r => r.id === roomId)
    const newMeasurement = {
      id: newMeasurementId,
      name: '',
      description: '',
      quantity: 1,
      unitPrice: 0.0,
      itemId: '',
      roomName: room?.roomTitle || '',
    }
    setRooms(prev =>
      prev.map(r =>
        r.id === roomId
          ? { ...r, measurements: [...(r.measurements || []), newMeasurement] }
          : r
      )
    )
  }

  const handleDeleteMeasurement = (roomId, measurementId) => {
    setRooms(prev =>
      prev.map(room =>
        room.id === roomId
          ? {
              ...room,
              measurements: (room.measurements || []).filter(
                m => m.id !== measurementId
              ),
            }
          : room
      )
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

  // Item Picker Modal Logic (Re-added)
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

  const openItemPickerModal = (roomId, measurementId) => {
    setCurrentRoomIdForModal(roomId)
    setCurrentMeasurementIdForModal(measurementId)
    // Find the current measurement to potentially pre-select its itemId in the picker
    const room = rooms.find(r => r.id === roomId)
    const measurement = room?.measurements.find(m => m.id === measurementId)
    setSelectedItemIdInPicker(measurement?.itemId || null) // Pre-select if itemId exists

    setShowItemsModal(true)
    if (allItems.length === 0) {
      setLoadingItemsModal(true)
      fetchItemsFromFirestore().finally(() => setLoadingItemsModal(false))
    }
  }

  const handleSelectItem = itemFromPicker => {
    // itemFromPicker is the full item object from allItems, or null if modal is cancelled
    if (
      itemFromPicker &&
      currentRoomIdForModal &&
      currentMeasurementIdForModal
    ) {
      setRooms(prevRooms =>
        prevRooms.map(room => {
          if (room.id !== currentRoomIdForModal) return room
          const updatedMeasurements = (room.measurements || []).map(m =>
            m.id === currentMeasurementIdForModal
              ? {
                  ...m, // Keep existing quantity, roomName etc.
                  name: itemFromPicker.name,
                  description: itemFromPicker.description || '', // Ensure description is at least an empty string
                  itemId: itemFromPicker.id,
                  unitPrice: itemFromPicker.unitPrice || 0, // Ensure unitPrice is a number
                }
              : m
          )
          return { ...room, measurements: updatedMeasurements }
        })
      )
    }
    // Close modal and reset states
    setShowItemsModal(false)
    setItemSearchQuery('')
    setCurrentRoomIdForModal(null)
    setCurrentMeasurementIdForModal(null)
    setSelectedItemIdInPicker(null) // Important to reset picker's direct selection state
  }

  const handleSaveRemediationData = async complete => {
    if (isSharingInProgress) return
    try {
      if (complete) {
        const roomsWithoutPhotos = rooms.filter(
          room => !room.photos || room.photos.length === 0
        )
        if (roomsWithoutPhotos.length > 0) {
          const roomNames = roomsWithoutPhotos
            .map(room => room.roomTitle)
            .join(', ')
          Alert.alert(
            'Photos Required for Completion',
            `To mark as complete, please add at least one photo to the following rooms: ${roomNames}. You can still "Save & Continue".`
          )
          return
        }
      }
      const remediationData = {
        rooms: rooms.map(room => ({
          ...room,
          measurements: (room.measurements || []).map(m => ({
            ...m,
            quantity: parseFloat(m.quantity?.toString().replace(',', '.')) || 0, // Sanitize and parse
            unitPrice:
              parseFloat(m.unitPrice?.toString().replace(',', '.')) || 0, // Sanitize and parse
          })),
        })),
        updatedAt: new Date().toISOString(),
      }
      await updateDoc(doc(firestore, 'tickets', projectId), {
        remediationData,
        remediationRequired: rooms.length > 0 ? true : false,
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
        params: { projectId: projectId, timestamp: Date.now() },
      })
    } catch (error) {
      console.error('Error saving remediation data:', error)
      Alert.alert('Error', 'Failed to save data. Please try again.')
    }
  }

  const handleShareRemediationReport = async () => {
    if (!ticket || !projectId) {
      Alert.alert('Error', 'Ticket data is not fully loaded.')
      return
    }
    if (isSharingInProgress) return
    setIsSharingInProgress(true)
    try {
      const ticketObjectForPdf = {
        ...(ticket || {}),
        ticketNumber: ticket.ticketNumber || projectId,
        reason: 'Remediation Report',
        remediationData: {
          rooms: rooms.map(room => ({
            roomTitle: room.roomTitle,
            notes: room.notes || 'N/A',
            numberOfFans: room.numberOfFans || 0,
            photos: (room.photos || []).map(p => ({
              downloadURL: p.downloadURL,
              comment: p.label || '',
            })),
            measurements: (room.measurements || []).map(m => ({
              name: m.name || 'Custom Item',
              quantity:
                parseFloat(m.quantity?.toString().replace(',', '.')) || 0,
              unitPrice:
                parseFloat(m.unitPrice?.toString().replace(',', '.')) || 0,
              description: m.description || '',
            })),
          })),
        },
        street: ticket?.street || 'N/A',
        city: ticket?.city || 'N/A',
        inspectorName: ticket?.inspectorName || 'N/A',
        createdAt: ticket?.createdAt?.toDate
          ? ticket.createdAt.toDate()
          : ticket?.createdAt
          ? new Date(ticket.createdAt)
          : new Date(),
      }
      let firebasePdfUrl
      if (typeof generatePdf !== 'function') {
        Alert.alert('Developer Error', 'generatePdf function is not available.')
        setIsSharingInProgress(false)
        return
      }
      try {
        firebasePdfUrl = await generatePdf(ticketObjectForPdf)
      } catch (pdfError) {
        console.error('Error from generatePdf:', pdfError)
        Alert.alert(
          'PDF Generation Failed',
          `${pdfError.message || 'Unknown error'}`
        )
        setIsSharingInProgress(false)
        return
      }
      if (
        !firebasePdfUrl ||
        typeof firebasePdfUrl !== 'string' ||
        !firebasePdfUrl.startsWith('https://')
      ) {
        Alert.alert('PDF Link Error', 'Invalid PDF link received.')
        setIsSharingInProgress(false)
        return
      }
      const fileName = `RemediationReport_${projectId}_${Date.now()}.pdf`
      const localDir = FileSystem.cacheDirectory || FileSystem.documentDirectory
      if (!localDir) {
        Alert.alert('Error', 'Cache directory not available.')
        setIsSharingInProgress(false)
        return
      }
      const localPdfUri =
        localDir + (localDir.endsWith('/') ? '' : '/') + fileName
      await FileSystem.downloadAsync(firebasePdfUrl, localPdfUri)
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing Not Available', 'Sharing is not available.')
        setIsSharingInProgress(false)
        return
      }
      await Sharing.shareAsync(localPdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Remediation Report',
        UTI: 'com.adobe.pdf',
      })
    } catch (error) {
      console.error('Sharing process error:', error)
      Alert.alert('Sharing Error', `${error.message || 'Unknown error'}`)
    } finally {
      setIsSharingInProgress(false)
    }
  }

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

  if (!projectId) {
    return (
      <View style={styles.fullScreenContainerCenter}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading Project ID...</Text>
      </View>
    )
  }
  if (!ticket) {
    return (
      <View style={styles.fullScreenContainer}>
        <HeaderWithOptions
          title="Remediation"
          onBack={() => router.back()}
          options={[]}
        />
        <View style={styles.fullScreenContainerCenterContent}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading ticket data...</Text>
        </View>
      </View>
    )
  }

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
        }
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContainer}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
          >
            {rooms.map(room => (
              <View key={room.id} style={styles.roomCard}>
                <View style={styles.roomHeader}>
                  <Text style={styles.roomName}>{room.roomTitle}</Text>
                  <TouchableOpacity onPress={() => handleDeleteRoom(room.id)}>
                    <IconSymbol name="trash.fill" size={20} color="#E0245E" />
                  </TouchableOpacity>
                </View>
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
                <View style={styles.section}>
                  <View style={styles.fansRow}>
                    <Icon
                      name="fan"
                      size={24}
                      color="#17BF63"
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
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Line Items</Text>
                    <TouchableOpacity
                      onPress={() => handleCreateMeasurement(room.id)}
                    >
                      <IconSymbol
                        name="plus.circle.fill"
                        size={26}
                        color="#17BF63"
                      />
                    </TouchableOpacity>
                  </View>
                  {(room.measurements || []).map(measurement => (
                    <View key={measurement.id} style={styles.measurementCard}>
                      <View style={styles.measurementInputRow}>
                        <TextInput
                          style={[
                            styles.measurementTextInput,
                            styles.itemNameInput,
                          ]}
                          placeholder="Item Name"
                          value={measurement.name}
                          onChangeText={val =>
                            handleMeasurementChange(
                              room.id,
                              measurement.id,
                              'name',
                              val
                            )
                          }
                        />
                        <TouchableOpacity
                          onPress={() =>
                            openItemPickerModal(room.id, measurement.id)
                          }
                          style={styles.pickItemButton}
                        >
                          <IconSymbol
                            name="magnifyingglass"
                            size={20}
                            color="#007AFF"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() =>
                            handleDeleteMeasurement(room.id, measurement.id)
                          }
                          style={styles.deleteMeasurementButton}
                        >
                          <IconSymbol
                            name="trash.fill"
                            size={20}
                            color="#E0245E"
                          />
                        </TouchableOpacity>
                      </View>
                      <TextInput
                        style={[
                          styles.measurementTextInput,
                          styles.itemDescriptionInput,
                        ]}
                        placeholder="Description (optional)"
                        value={measurement.description}
                        onChangeText={val =>
                          handleMeasurementChange(
                            room.id,
                            measurement.id,
                            'description',
                            val
                          )
                        }
                        multiline
                      />
                      <View style={styles.measurementInputRow}>
                        <View style={styles.quantityPriceContainer}>
                          <Text style={styles.inputLabel}>Qty:</Text>
                          <TextInput
                            style={[
                              styles.measurementTextInput,
                              styles.itemNumericInput,
                            ]}
                            placeholder="1"
                            keyboardType="numeric"
                            value={measurement.quantity?.toString()}
                            onChangeText={val =>
                              handleMeasurementChange(
                                room.id,
                                measurement.id,
                                'quantity',
                                val
                              )
                            }
                          />
                        </View>
                        <View style={styles.quantityPriceContainer}>
                          <Text style={styles.inputLabel}>Price ($):</Text>
                          <TextInput
                            style={[
                              styles.measurementTextInput,
                              styles.itemNumericInput,
                            ]}
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                            value={measurement.unitPrice?.toString()}
                            onChangeText={val =>
                              handleMeasurementChange(
                                room.id,
                                measurement.id,
                                'unitPrice',
                                val
                              )
                            }
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                  {(!room.measurements || room.measurements.length === 0) && (
                    <Text style={styles.noItemsText}>
                      No line items added yet.
                    </Text>
                  )}
                </View>
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
                      {(room.photos || []).map(photo => (
                        <View
                          key={photo.id || photo.storagePath}
                          style={styles.photoItem}
                        >
                          <Image
                            source={{ uri: photo.downloadURL }}
                            style={styles.photoImage}
                          />
                          <TouchableOpacity
                            onPress={() =>
                              handleDeletePhoto(
                                room.id,
                                photo.id || photo.storagePath
                              )
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
                                photo.id || photo.storagePath,
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
            <View style={{ height: 80 }} />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      <Animated.View
        style={{
          position: 'absolute',
          right: 25,
          bottom: Platform.OS === 'ios' ? 40 : 30,
          opacity: floatingOpacity,
        }}
      >
        <FloatingButton
          onPress={openAddRoomModal}
          title="Room"
          iconName="plus"
          size={28}
        />
      </Animated.View>

      {showItemsModal && (
        <Modal
          visible={showItemsModal}
          transparent
          animationType="slide"
          onRequestClose={
            () => handleSelectItem(null) /* Treat closing modal as cancel */
          }
        >
          <BlurView
            intensity={Platform.OS === 'ios' ? 80 : 5}
            style={styles.absoluteFill}
            tint="light"
          >
            <TouchableWithoutFeedback onPress={() => handleSelectItem(null)}>
              <View style={styles.modalParentContainer}>
                <TouchableWithoutFeedback>
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
                          selectedValue={selectedItemIdInPicker}
                          onValueChange={itemIdValue =>
                            setSelectedItemIdInPicker(itemIdValue)
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
                        onPress={() => handleSelectItem(null)}
                        style={[styles.modalButton, styles.modalCloseButton]}
                      >
                        <Text style={styles.modalButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          const item = allItems.find(
                            i => i.id === selectedItemIdInPicker
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
                        disabled={!selectedItemIdInPicker}
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
  absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  fullScreenContainer: { flex: 1, backgroundColor: '#F0F2F5' },
  fullScreenContainerCenter: {
    flex: 1,
    backgroundColor: '#F0F2F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenContainerCenterContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
    color: '#444',
  },
  scrollView: { flex: 1 },
  scrollContainer: { padding: 16, paddingBottom: 120 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
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
  roomName: { fontSize: 18, fontWeight: '600', color: '#2C3E50' },
  section: { marginTop: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495E',
    marginBottom: 8,
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
  fansRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
  fanIcon: { marginRight: 8 },
  numberOfFansInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#D5DBDB',
    width: 70,
    textAlign: 'center',
  },

  measurementCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  measurementInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  measurementTextInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#D5DBDB',
  },
  itemNameInput: { flex: 1, fontWeight: '500', marginRight: 8 }, // Added marginRight
  itemDescriptionInput: {
    minHeight: 40,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  quantityPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.48 /* Adjust flex to fit side by side */,
  },
  inputLabel: { fontSize: 14, color: '#34495E', marginRight: 5 },
  itemNumericInput: { flex: 1, textAlign: 'right' },
  pickItemButton: {
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  }, // Adjusted padding
  deleteMeasurementButton: {
    paddingLeft: 5,
    justifyContent: 'center',
    alignItems: 'center',
  }, // Adjusted padding
  noItemsText: {
    color: '#7F8C8D',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },

  photoRowScrollView: {},
  photoItem: { marginRight: 12, alignItems: 'center', position: 'relative' },
  photoImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D5DBDB',
    backgroundColor: '#ECF0F1',
  },
  photoLabelInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
    color: '#2C3E50',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#D5DBDB',
    width: 80,
    textAlign: 'center',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 2,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  noPhotoText: {
    color: '#7F8C8D',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },

  // Modal styles for Item Picker
  modalParentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }, // Renamed from modalOverlay to avoid conflict if AddRoomModal uses it
  itemsModalContainer: {
    width: '90%',
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
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#2C3E50',
  },
  itemSearchInput: {
    backgroundColor: '#F8F9F9',
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
    height: Platform.OS === 'ios' ? 150 : 60,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pickerStyle: {},
  pickerItemStyle: {},
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 120,
    alignItems: 'center',
  },
  modalConfirmButton: { backgroundColor: '#17BF63' },
  modalCloseButton: { backgroundColor: '#BDC3C7' },
  modalButtonText: { color: '#2C3E50', fontWeight: '600', fontSize: 15 },
  modalButtonTextWhite: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },

  sharingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  sharingOverlayText: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
})
