import React from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native'
import { BlurView } from 'expo-blur'

const roomOptions = [
  'Bedroom',
  'Kitchen',
  'Garage',
  'Living Room',
  'Bathroom',
  'Foyer',
  'Office',
]

const AddRoomModal = ({
  visible,
  onClose,
  selectedRoomType,
  setSelectedRoomType,
  customRoomName,
  setCustomRoomName,
  onConfirm,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <BlurView intensity={500} style={styles.absoulteFill}>
        <View style={styles.modalOverlay}>
          <View style={styles.addRoomModalContainer}>
            <Text style={styles.modalTitle}>Add Room</Text>
            <ScrollView horizontal style={styles.roomOptionsRow}>
              {roomOptions.map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.roomTypeOption,
                    selectedRoomType === option &&
                      styles.roomTypeOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedRoomType(option)
                    setCustomRoomName('')
                  }}
                >
                  <Text
                    style={[
                      styles.roomTypeOptionText,
                      selectedRoomType === option && { color: '#FFF' },
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.modalSubtitle}>Or type custom name:</Text>
            <TextInput
              style={styles.itemSearchInput}
              placeholder="e.g. Office, Studio"
              value={customRoomName}
              onChangeText={val => {
                setCustomRoomName(val)
                if (selectedRoomType) setSelectedRoomType('')
              }}
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                onPress={onConfirm}
                style={styles.modalConfirmButton}
              >
                <Text style={styles.modalConfirmButtonText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </BlurView>
    </Modal>
  )
}

export default AddRoomModal

const styles = StyleSheet.create({
  absoulteFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  addRoomModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 16,
    width: '80%',
  },
  itemSearchInput: {
    backgroundColor: '#F5F8FA',
    borderColor: '#E1E8ED',
    borderRadius: 4,
    borderWidth: 1,
    color: '#14171A',
    fontSize: 14,
    marginBottom: 10,
    padding: 8,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  modalCloseButton: {
    backgroundColor: '#ECECEC',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalCloseButtonText: { color: '#14171A', fontSize: 14, fontWeight: '600' },
  modalConfirmButton: {
    backgroundColor: '#0073BC',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalConfirmButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    flex: 1,
    justifyContent: 'center',
  },
  modalSubtitle: {
    color: '#14171A',
    fontWeight: '600',
    marginVertical: 8,
    textAlign: 'center',
  },
  modalTitle: {
    color: '#14171A',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  roomOptionsRow: { flexDirection: 'row', marginVertical: 8 },
  roomTypeOption: {
    backgroundColor: '#F5F8FA',
    borderColor: '#E1E8ED',
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  roomTypeOptionSelected: {
    backgroundColor: '#1DA1F2',
    borderColor: '#1DA1F2',
  },
  roomTypeOptionText: { color: '#14171A', fontSize: 14 },
})
