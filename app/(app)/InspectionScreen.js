'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  ScrollView,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { v4 as uuidv4 } from 'uuid'
import { doc, updateDoc } from 'firebase/firestore'
import { firestore, storage } from '@/firebaseConfig'
import useTicket from '@/hooks/useTicket'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import { FloatingButton } from '@/components/FloatingButton'
import { rephraseText } from '@/utils/rephraseText'
import { pickAndUploadPhotos } from '@/utils/photoUpload'
import AddRoomModal from '@/components/AddRoomModal'
import PhotoGallery from '@/components/PhotoGallery'
import useProjectStore from '@/store/useProjectStore'
import { ro } from 'date-fns/locale'

const InspectionScreen = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const projectIdFromParams = params.projectId
  const { projectId: storeProjectId } = useProjectStore()
  const projectId = projectIdFromParams ?? storeProjectId

  // Fetch ticket and existing inspection data
  const { ticket, error } = useTicket(projectId)
  const [rooms, setRooms] = useState([])
  // Street view photo upload state
  const [streetPhoto, setStreetPhoto] = useState(null)
  const [showStreetPhotoModal, setShowStreetPhotoModal] = useState(false)
  const [uploadingStreetPhoto, setUploadingStreetPhoto] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0)
  const marginBelowHeader = 20 // Margin for spacing below the header

  // Modal state for adding a room
  const [showAddRoomModal, setShowAddRoomModal] = useState(false)
  const [selectedRoomType, setSelectedRoomType] = useState('')
  const [customRoomName, setCustomRoomName] = useState('')

  // State for per-room rephrase modal
  const [rephrasing, setRephrasing] = useState(false)
  const [showRephraseModal, setShowRephraseModal] = useState(false)
  const [rephraseTextModal, setRephraseTextModal] = useState('')
  const [rephraseRoomId, setRephraseRoomId] = useState(null)

  const scrollY = useRef(new Animated.Value(0)).current
  const floatingOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  // Initialize rooms from ticket.inspectionData when loaded
  useEffect(() => {
    if (ticket?.inspectionData?.rooms) {
      setRooms(ticket.inspectionData.rooms)
    }
  }, [ticket?.inspectionData?.rooms])

  // On first load, prompt for street view photo if none exists
  useEffect(() => {
    if (ticket) {
      const existing = ticket.streetPhoto
      console.log('Street Photo from ticket:', existing) // Debug log
      if (existing && existing.downloadURL) {
        setStreetPhoto(existing)
      } else {
        setShowStreetPhotoModal(true)
      }
    }
  }, [ticket])

  useEffect(() => {
    if (error) {
      Alert.alert('Error', 'Unable to fetch inspection data.')
    }
  }, [error])

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
      reasonForInspection: '',
      inspectionFindings: '',
      photos: [],
    }
    setRooms(prev => [...prev, newRoom])
    setShowAddRoomModal(false)
  }

  const handleDeleteRoom = roomId => {
    setRooms(prev => prev.filter(room => room.id !== roomId))
  }

  const handleRoomFieldChange = (roomId, field, value) => {
    setRooms(prev =>
      prev.map(room =>
        room.id === roomId ? { ...room, [field]: value } : room
      )
    )
  }

  const handleAddPhoto = async (roomId, projectId) => {
    const folder = `inspectionPhotos/${projectId}`
    const photosArray = await pickAndUploadPhotos({ folder, quality: 0.5 })
    if (photosArray.length > 0) {
      // Initialize comments for each new photo
      const photosWithComments = photosArray.map(photo => ({
        ...photo,
        comment: '',
      }))
      setRooms(prev =>
        prev.map(room =>
          room.id === roomId
            ? { ...room, photos: [...room.photos, ...photosWithComments] }
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

  // -------------------- Photo Comment Logic --------------------
  const handlePhotoCommentChange = (roomId, photoIndex, comment) => {
    setRooms(prev =>
      prev.map(room =>
        room.id === roomId
          ? {
              ...room,
              photos: room.photos.map((p, i) =>
                i === photoIndex ? { ...p, comment } : p
              ),
            }
          : room
      )
    )
  }

  // -------------------- Street Photo Upload Logic --------------------
  const handleUploadStreetPhoto = async () => {
    setUploadingStreetPhoto(true)
    try {
      const folder = `streetPhotos/${projectId}`
      const photosArray = await pickAndUploadPhotos({ folder, quality: 0.5 })
      if (photosArray.length > 0) {
        const photo = photosArray[0]
        // Save to Firestore under inspectionData.streetPhoto
        await updateDoc(doc(firestore, 'tickets', projectId), {
          streetPhoto: photo,
        })
        setStreetPhoto(photo)
        setShowStreetPhotoModal(false)
      } else {
        Alert.alert('No photo selected')
      }
    } catch (error) {
      console.error('Error uploading street photo:', error)
      Alert.alert('Error', 'Failed to upload street photo')
    }
    setUploadingStreetPhoto(false)
  }

  // -------------------- Per-Room Rephrase Logic --------------------
  const handleRephrase = async roomId => {
    const room = rooms.find(r => r.id === roomId)
    if (!room || !room.inspectionFindings.trim()) {
      Alert.alert('Enter findings before rephrasing.')
      return
    }
    setRephrasing(true)
    try {
      const generated = await rephraseText(room.inspectionFindings)
      setRephraseTextModal(generated)
      setRephraseRoomId(roomId)
      setShowRephraseModal(true)
    } catch (error) {
      console.error('Error rephrasing findings:', error)
      Alert.alert('Error', 'Failed to rephrase. Please try again.')
    }
    setRephrasing(false)
  }

  const handleApproveRephrase = () => {
    if (rephraseRoomId != null) {
      handleRoomFieldChange(
        rephraseRoomId,
        'inspectionFindings',
        rephraseTextModal
      )
    }
    setShowRephraseModal(false)
    setRephraseTextModal('')
    setRephraseRoomId(null)
  }

  // -------------------- Save Inspection Data --------------------
  const handleSaveInspectionData = async (finalize = true) => {
    try {
      const inspectionData = {
        rooms,
        updatedAt: new Date(),
      }
      await updateDoc(doc(firestore, 'tickets', projectId), {
        inspectionData,
        inspectionComplete: finalize,
      })
      Alert.alert('Success', 'Inspection data saved successfully.')
      router.back()
    } catch (error) {
      console.error('Error saving inspection data:', error)
      Alert.alert('Error', 'Failed to save data. Please try again.')
    }
  }

  // -------------------- Header Save Options --------------------
  const headerOptions = [
    {
      label: 'Save & Continue',
      onPress: () => handleSaveInspectionData(false),
    },
    { label: 'Save & Finalize', onPress: () => handleSaveInspectionData(true) },
  ]

  return (
    <View style={styles.fullScreenContainer}>
      {/* Prompt for street view photo on first load */}
      {showStreetPhotoModal && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.reportModalContainer}>
              <Text style={styles.modalTitle}>Upload Street View Photo</Text>
              {uploadingStreetPhoto ? (
                <ActivityIndicator size="large" color="#0073BC" />
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.addPhotoButton}
                    onPress={handleUploadStreetPhoto}
                  >
                    <Text style={styles.addPhotoButtonText}>Upload Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.addPhotoButton,
                      { backgroundColor: '#E0245E' },
                    ]}
                    onPress={router.back}
                  >
                    <Text style={styles.addPhotoButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      )}
      {rephrasing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0073BC" />
        </View>
      )}
      <HeaderWithOptions
        title="Inspection"
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
            {/* Display uploaded street view photo if available */}
            // Display uploaded street view photo if available
            {streetPhoto && streetPhoto.downloadURL ? (
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Text style={styles.sectionTitle}>Street View Photo</Text>
                <TouchableOpacity
                  onPress={handleUploadStreetPhoto}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: streetPhoto.downloadURL }}
                    style={{
                      width: '100%',
                      height: 200,
                      borderRadius: 8,
                      marginBottom: 16,
                    }}
                    onError={error =>
                      console.log('Image load error:', error.nativeEvent.error)
                    } // Debug log for image errors
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Text style={styles.sectionTitle}>Street View Photo</Text>
                <Text style={styles.noPhotoText}>
                  No street view photo available.
                </Text>
              </View>
            )}
            {rooms.map(room => (
              <View key={room.id} style={styles.roomCard}>
                {/* Room Header */}
                <View style={styles.roomHeader}>
                  <Text style={styles.roomName}>{room.roomTitle}</Text>
                  <TouchableOpacity onPress={() => handleDeleteRoom(room.id)}>
                    <Text style={styles.deleteRoomText}>Delete</Text>
                  </TouchableOpacity>
                </View>
                {/* Inspection Input Fields */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Inspection Findings</Text>
                  <TextInput
                    style={[styles.inspectionInput, { height: 100 }]}
                    placeholder="Enter inspection findings"
                    value={room.inspectionFindings}
                    onChangeText={text =>
                      handleRoomFieldChange(room.id, 'inspectionFindings', text)
                    }
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.rephraseButton}
                    onPress={() => handleRephrase(room.id)}
                  >
                    <Text style={styles.rephraseButtonText}>Rephrase</Text>
                  </TouchableOpacity>
                </View>
                {/* Photos Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Photos</Text>
                  {room.photos && room.photos.length > 0 ? (
                    <PhotoGallery
                      photos={room.photos}
                      onRemovePhoto={index => {
                        const photoToRemove = room.photos[index]
                        handleDeletePhoto(room.id, photoToRemove.storagePath)
                      }}
                      onCommentChange={(index, text) =>
                        handlePhotoCommentChange(room.id, index, text)
                      }
                    />
                  ) : (
                    <Text style={styles.noPhotoText}>No photos added.</Text>
                  )}
                  <TouchableOpacity
                    onPress={() => handleAddPhoto(room.id, projectId)}
                    style={styles.addPhotoButton}
                  >
                    <Text style={styles.addPhotoButtonText}>+ Photo</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      <View style={{ position: 'absolute', right: 25, bottom: 50 }}>
        <FloatingButton
          onPress={openAddRoomModal}
          title="Add Room"
          animatedOpacity={floatingOpacity}
          iconName="plus.circle"
          size={28}
        />
      </View>
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
      {/* Rephrase Modal */}
      {showRephraseModal && (
        <Modal
          visible={showRephraseModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowRephraseModal(false)}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={40}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalOverlay}>
                <View style={styles.reportModalContainer}>
                  <ScrollView
                    contentContainerStyle={styles.modalScrollContent}
                    keyboardShouldPersistTaps="handled"
                  >
                    <TextInput
                      style={[styles.inspectionInput, { height: 200 }]}
                      multiline
                      value={rephraseTextModal}
                      onChangeText={setRephraseTextModal}
                    />
                  </ScrollView>
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      onPress={handleApproveRephrase}
                      style={styles.approveButton}
                    >
                      <Text style={styles.buttonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setShowRephraseModal(false)}
                      style={styles.cancelButton}
                    >
                      <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  )
}

export default InspectionScreen

const styles = StyleSheet.create({
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
    marginBottom: 8,
  },
  inspectionInput: {
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#14171A',
    borderWidth: 1,
    borderColor: '#E1E8ED',
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
    backgroundColor: '#0073BC',
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
    backgroundColor: '#0073BC',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#0073BC',
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
    backgroundColor: '#0073BC',
    borderColor: '#0073BC',
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
  loadingIndicator: {
    marginTop: 20,
  },
  reportModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '90%',
    maxHeight: '80%',
    padding: 16,
  },
  modalScrollContent: {
    paddingBottom: 16,
  },
  generatedText: {
    fontSize: 16,
    color: '#14171A',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  approveButton: {
    backgroundColor: '#0073BC',
    padding: 12,
    borderRadius: 6,
    width: '40%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E0245E',
    padding: 12,
    borderRadius: 6,
    width: '40%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  rephraseButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#0073BC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  rephraseButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
