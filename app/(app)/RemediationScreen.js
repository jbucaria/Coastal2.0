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
import { FloatingButton } from '@/components/FloatingButton'
import { IconSymbol } from '@/components/ui/IconSymbol'
import useProjectStore from '@/store/useProjectStore'
import { pickAndUploadPhotos } from '@/utils/photoUpload'
import PhotoGallery from '@/components/PhotoGallery'
import AddRoomModal from '@/components/AddRoomModal'
import { BlurView } from 'expo-blur'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons' // For the fan icon

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

  useEffect(() => {
    const fetchTicket = async () => {
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
            notes: room.notes || '', // Ensure notes field exists
            numberOfFans: room.numberOfFans || 0, // Ensure numberOfFans field exists
            photos: (room.photos || []).map(photo => ({
              ...photo,
              label: photo.label || '', // Ensure label field exists
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
    setRooms(prev => prev.filter(room => room.id !== roomId))
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
  const handleAddPhoto = async (roomId, projectId) => {
    const folder = `remediationPhotos/${projectId}`
    const photosArray = await pickAndUploadPhotos({ folder, quality: 0.5 })
    if (photosArray.length > 0) {
      const photosWithLabels = photosArray.map(photo => ({
        ...photo,
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

  const handleDeletePhoto = (roomId, storagePath) => {
    setRooms(prev =>
      prev.map(room =>
        room.id === roomId
          ? {
              ...room,
              photos: room.photos.filter(p => p.storagePath !== storagePath),
            }
          : room
      )
    )
  }

  const handlePhotoLabelChange = (roomId, storagePath, value) => {
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
                photo.storagePath === storagePath
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
      Alert.alert('Limit Reached', 'Number of fans cannot exceed 20 per room.')
      return
    }

    setRooms(prev =>
      prev.map(room => {
        if (room.id !== roomId) return room

        let updatedMeasurements = [...room.measurements]

        const airMoverIndex = updatedMeasurements.findIndex(
          m => m.id === '1010000001'
        )

        if (numericValue > 0) {
          const airMoverItem = {
            description: 'Price per day',
            id: '1010000001',
            incomeAccount: {
              name: 'Services',
              value: '5',
            },
            name: 'Air mover',
            qtyOnHand: 0,
            type: 'Service',
            unitPrice: 35,
            quantity: numericValue,
            itemId: '1010000001', // Use the correct QuickBooks ItemId
          }

          if (airMoverIndex !== -1) {
            updatedMeasurements[airMoverIndex] = {
              ...updatedMeasurements[airMoverIndex],
              quantity: numericValue,
            }
          } else {
            updatedMeasurements.push(airMoverItem)
          }
        } else {
          if (airMoverIndex !== -1) {
            updatedMeasurements = updatedMeasurements.filter(
              m => m.id !== '1010000001'
            )
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
      quantity: 0,
      itemId: '',
      unitPrice: 0,
      roomName: rooms.find(room => room.id === roomId).roomTitle,
    }
    setRooms(prev =>
      prev.map(room =>
        room.id === roomId
          ? { ...room, measurements: [...room.measurements, newMeasurement] }
          : room
      )
    )
    setCurrentRoomId(roomId)
    setCurrentMeasurementId(newMeasurementId)
    openItemsModal()
  }

  const currentStatus = ticket?.remediationStatus ?? 'notStarted'

  const headerOptions = [
    {
      label: 'Save & Complete',
      onPress: () => handleSaveRemediationData(true),
    },
    {
      label: 'Save & Continue',
      onPress: () => handleSaveRemediationData(false),
    },
  ]

  const handleDeleteMeasurement = (roomId, measurementId) => {
    setRooms(prev =>
      prev.map(room =>
        room.id === roomId
          ? {
              ...room,
              measurements: room.measurements.filter(
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
        const updatedMeasurements = room.measurements.map(m =>
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
    setRooms(prev =>
      prev.map(room => {
        if (room.id !== currentRoomId) return room
        const updatedMeasurements = room.measurements.map(m =>
          m.id === currentMeasurementId
            ? {
                ...m,
                name: item.name,
                description: item.description,
                itemId: item.id,
                unitPrice: item.unitPrice,
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
    try {
      // Validate that each room has at least one photo
      const roomsWithoutPhotos = rooms.filter(room => room.photos.length === 0)
      if (roomsWithoutPhotos.length > 0) {
        const roomNames = roomsWithoutPhotos
          .map(room => room.roomTitle)
          .join(', ')
        Alert.alert(
          'Photos Required',
          `Please add at least one photo to the following rooms: ${roomNames}.`
        )
        return
      }

      // Prepare measurements with room name line items
      const updatedRooms = rooms.map(room => {
        const roomNameLineItem = {
          id: `room-name-${room.id}`,
          name: room.roomTitle,
          isRoomName: true,
          tax: true,
        }
        const measurementsWithRoomName = [
          roomNameLineItem,
          ...room.measurements,
        ]
        return {
          ...room,
          measurements: measurementsWithRoomName,
        }
      })

      const remediationData = {
        rooms: updatedRooms,
        updatedAt: new Date(),
      }

      await updateDoc(doc(firestore, 'tickets', projectId), {
        remediationData,
        remediationRequired: false,
        remediationStatus: complete ? 'complete' : 'inProgress',
      })

      Alert.alert(
        'Success',
        complete
          ? 'Remediation complete and saved successfully.'
          : 'Remediation saved. You can continue later.'
      )

      router.push({
        pathname: '/TicketDetailsScreen',
        params: { projectId: projectId },
      })
    } catch (error) {
      console.error('Error saving remediation data:', error)
      Alert.alert('Error', 'Failed to save data. Please try again.')
    }
  }

  // -------------------- Render --------------------
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
        keyboardVerticalOffset={40}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContainer,
              { paddingTop: headerHeight + marginBelowHeader },
            ]}
          >
            {rooms.map(room => (
              <View key={room.id} style={styles.roomCard}>
                {/* Room Header */}
                <View style={styles.roomHeader}>
                  <Text style={styles.roomName}>{room.roomTitle}</Text>
                  <TouchableOpacity onPress={() => handleDeleteRoom(room.id)}>
                    <Text style={styles.deleteRoomText}>Delete</Text>
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
                    numberOfLines={3}
                  />
                </View>

                {/* Number of Fans Section */}
                <View style={styles.section}>
                  <View style={styles.fansRow}>
                    <Icon
                      name="fan"
                      size={24}
                      color="#17BF63"
                      style={styles.fanIcon}
                    />
                    <Text style={styles.sectionTitle}>Number of Fans</Text>
                  </View>
                  <TextInput
                    style={styles.numberOfFansInput}
                    placeholder="0"
                    keyboardType="numeric"
                    value={room.numberOfFans.toString()}
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
                        name="plus.circle"
                        size={26}
                        color="#17BF63"
                      />
                    </TouchableOpacity>
                  </View>
                  {room.measurements.map(measurement => (
                    <View key={measurement.id} style={styles.measurementRow}>
                      <TextInput
                        style={[styles.measurementInput, { flex: 1 }]}
                        placeholder="Item Name"
                        value={measurement.name}
                        onFocus={() => {
                          if (measurement.id === '1010000001') return // Prevent editing "Air mover"
                          setCurrentRoomId(room.id)
                          setCurrentMeasurementId(measurement.id)
                          openItemsModal()
                        }}
                        editable={measurement.id !== '1010000001'}
                      />
                      {measurement.description && (
                        <Text style={styles.measurementDescription}>
                          {measurement.description}
                        </Text>
                      )}
                      <TextInput
                        style={[styles.measurementInput, { width: 70 }]}
                        placeholder="Qty"
                        keyboardType="numeric"
                        value={
                          measurement.quantity !== undefined
                            ? measurement.quantity.toString()
                            : ''
                        }
                        onChangeText={val => {
                          if (measurement.id === '1010000001') return // Prevent editing "Air mover" quantity
                          const numericValue = parseFloat(val) || 0
                          handleMeasurementChange(
                            room.id,
                            measurement.id,
                            'quantity',
                            numericValue
                          )
                        }}
                        editable={measurement.id !== '1010000001'}
                      />
                      <TouchableOpacity
                        onPress={() =>
                          handleDeleteMeasurement(room.id, measurement.id)
                        }
                      >
                        <IconSymbol name="trash" size={26} color="red" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* Photos Section */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Photos</Text>
                    <TouchableOpacity
                      onPress={() => handleAddPhoto(room.id, projectId)}
                    >
                      <IconSymbol
                        name="plus.circle"
                        size={26}
                        color="#17BF63"
                      />
                    </TouchableOpacity>
                  </View>
                  {room.photos.length > 0 ? (
                    <ScrollView horizontal style={styles.photoRow}>
                      {room.photos.map((photo, index) => (
                        <View key={index} style={styles.photoItem}>
                          <Image
                            source={{ uri: photo.downloadURL }}
                            style={styles.photoImage}
                          />
                          <TextInput
                            style={styles.photoLabelInput}
                            placeholder="Add label (optional)..."
                            value={photo.label}
                            onChangeText={text =>
                              handlePhotoLabelChange(
                                room.id,
                                photo.storagePath,
                                text
                              )
                            }
                          />
                          <TouchableOpacity
                            onPress={() =>
                              handleDeletePhoto(room.id, photo.storagePath)
                            }
                            style={styles.deletePhotoButton}
                          >
                            <Text style={styles.deletePhotoButtonText}>X</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    <Text style={styles.noPhotoText}>No photos added.</Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Floating Button */}
      <View style={{ position: 'absolute', right: 25, bottom: 50 }}>
        <FloatingButton
          onPress={openAddRoomModal}
          title="Room"
          animatedOpacity={floatingOpacity}
          iconName="plus.circle"
          size={30}
        />
      </View>

      {/* Items Modal */}
      {showItemsModal && (
        <Modal
          visible={showItemsModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowItemsModal(false)}
        >
          <BlurView intensity={100} style={styles.absoulteFill}>
            <View style={styles.modalOverlay}>
              <View style={styles.itemsModalContainer}>
                <Text style={styles.modalTitle}>Select an Item</Text>
                <TextInput
                  style={styles.itemSearchInput}
                  placeholder="Search items..."
                  value={itemSearchQuery}
                  onChangeText={setItemSearchQuery}
                />
                {loadingItemsModal ? (
                  <ActivityIndicator size="small" color="#1DA1F2" />
                ) : (
                  <Picker
                    selectedValue={selectedItemId}
                    onValueChange={(itemId, itemIndex) =>
                      setSelectedItemId(itemId)
                    }
                  >
                    {allItems
                      .filter(item =>
                        (item.name || '')
                          .toLowerCase()
                          .includes(itemSearchQuery.toLowerCase())
                      )
                      .map(item => (
                        <Picker.Item
                          key={item.id}
                          label={`${item.name} - $${item.unitPrice}`}
                          value={item.id}
                        />
                      ))}
                  </Picker>
                )}
                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    onPress={() => {
                      const item = allItems.find(i => i.id === selectedItemId)
                      if (item) {
                        handleSelectItem(item)
                      } else {
                        Alert.alert(
                          'Select an item',
                          'Please select an item from the list.'
                        )
                      }
                    }}
                    style={styles.modalConfirmButton}
                  >
                    <Text style={styles.modalConfirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowItemsModal(false)}
                    style={styles.modalCloseButton}
                  >
                    <Text style={styles.modalCloseButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </BlurView>
        </Modal>
      )}

      {/* Add Room Modal */}
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
    </View>
  )
}

export default RemediationScreen

const styles = StyleSheet.create({
  absoulteFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1DA1F2',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  roomCard: {
    backgroundColor: '#F5F8FA',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#14171A',
  },
  deleteRoomText: {
    color: '#E0245E',
    fontWeight: '600',
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#14171A',
    marginRight: 6,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#14171A',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  fansRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fanIcon: {
    marginRight: 8,
  },
  numberOfFansInput: {
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#14171A',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    width: 60,
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  measurementInput: {
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#14171A',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  measurementDescription: {
    fontSize: 12,
    color: '#657786',
    marginRight: 8,
  },
  deleteMeasurementButton: {
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  deleteMeasurementButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  addMeasurementButton: {
    backgroundColor: '#17BF63',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  addMeasurementButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  selectItemButton: {
    backgroundColor: '#1DA1F2',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectItemButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  photoRow: {
    flexDirection: 'row',
  },
  noPhotoText: {
    color: '#657786',
    fontSize: 14,
    marginBottom: 4,
  },
  photoItem: {
    marginRight: 10,
    position: 'relative',
  },
  photoImage: {
    width: 70,
    height: 70,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  photoLabelInput: {
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 12,
    color: '#14171A',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    width: 70,
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deletePhotoButtonText: {
    color: '#fff',
    fontSize: 10,
  },
  addPhotoButton: {
    backgroundColor: '#1DA1F2',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  addPhotoButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#1DA1F2',
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
    alignSelf: 'center',
    width: '60%',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  floatingAddRoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1DA1F2',
    borderRadius: 24,
    padding: 16,
  },
  floatingAddRoomButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsModalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 16,
  },
  addRoomModalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    color: '#14171A',
  },
  itemSearchInput: {
    backgroundColor: '#F5F8FA',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    color: '#14171A',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  modalConfirmButton: {
    backgroundColor: '#17BF63',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalConfirmButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalCloseButton: {
    backgroundColor: '#ECECEC',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalCloseButtonText: {
    color: '#14171A',
    fontWeight: '600',
    fontSize: 14,
  },
  roomOptionsRow: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  roomTypeOption: {
    backgroundColor: '#F5F8FA',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  roomTypeOptionSelected: {
    backgroundColor: '#1DA1F2',
    borderColor: '#1DA1F2',
  },
  roomTypeOptionText: {
    fontSize: 14,
    color: '#14171A',
  },
  modalSubtitle: {
    fontWeight: '600',
    marginVertical: 8,
    color: '#14171A',
    textAlign: 'center',
  },
})
