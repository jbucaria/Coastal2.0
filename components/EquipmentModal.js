import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native'
import { doc, updateDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'

const EquipmentModal = ({
  visible,
  onClose,
  projectId,
  initialQuantities,
  equipmentOnSite,
}) => {
  const [equipment, setEquipment] = useState({
    airMover: 0,
    dehumidifier: 0,
    airScrubber: 0,
    containmentPoles: 0,
    ozone: 0,
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (visible) {
      setEquipment({
        airMover: initialQuantities?.airMover || 0,
        dehumidifier: initialQuantities?.dehumidifier || 0,
        airScrubber: initialQuantities?.airScrubber || 0,
        containmentPoles: initialQuantities?.containmentPoles || 0,
        ozone: initialQuantities?.ozone || 0,
      })
    }
  }, [visible, initialQuantities])

  const handleQuantityChange = (key, value) => {
    const numericValue = parseInt(value, 10)
    setEquipment(prev => ({
      ...prev,
      [key]: isNaN(numericValue) ? 0 : numericValue,
    }))
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)

      // Calculate total equipment quantity
      const total = Object.values(equipment).reduce((sum, qty) => sum + qty, 0)

      // Reference to the Firestore document
      const projectRef = doc(firestore, 'tickets', projectId)

      // Update Firestore with new equipment data
      await updateDoc(projectRef, {
        equipment,
        equipmentTotal: total, // Update total equipment
        equipmentOnSite: total > 0, // Set equipmentOnSite to false if total is 0
      })

      Alert.alert('Success', 'Equipment data updated successfully.')
      onClose()
    } catch (error) {
      console.error('Error updating equipment data:', error)
      Alert.alert('Error', 'Failed to update equipment data. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePickUpAll = async () => {
    Alert.alert(
      'Confirm Pick Up',
      'Are you sure you want to pick up all equipment? This will reset all quantities to 0.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setIsSaving(true)
              const zeroedEquipment = Object.keys(equipment).reduce(
                (acc, key) => ({ ...acc, [key]: 0 }),
                {}
              )

              const projectRef = doc(firestore, 'tickets', projectId)
              await updateDoc(projectRef, {
                equipment: zeroedEquipment,
                equipmentTotal: 0,
                equipmentOnSite: false,
              })

              setEquipment(zeroedEquipment)
              Alert.alert('Success', 'All equipment has been picked up.')
              onClose()
            } catch (error) {
              console.error('Error picking up all equipment:', error)
              Alert.alert(
                'Error',
                'Failed to pick up all equipment. Please try again.'
              )
            } finally {
              setIsSaving(false)
            }
          },
        },
      ]
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.modalContent}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {equipmentOnSite ? 'Edit Equipment' : 'Add Equipment'}
              </Text>
              <FlatList
                data={Object.keys(equipment)}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                  <View style={styles.inputRow}>
                    <Text style={styles.inputLabel}>
                      {item.replace(/([A-Z])/g, ' $1')}
                    </Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={equipment[item].toString()}
                      onChangeText={value => handleQuantityChange(item, value)}
                    />
                  </View>
                )}
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  style={styles.saveButton}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
              {equipmentOnSite && (
                <TouchableOpacity
                  onPress={handlePickUpAll}
                  style={styles.pickUpAllButton}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Pick Up All</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

export { EquipmentModal }

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    flex: 1,
    fontSize: 16,
  },
  input: {
    width: 60,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveButton: {
    backgroundColor: '#2ecc71',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  pickUpAllButton: {
    marginTop: 15,
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
})
