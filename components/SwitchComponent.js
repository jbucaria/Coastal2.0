import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native'
import { doc, updateDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'

const SwitchComponent = ({
  projectId,
  field,
  label,
  value,
  equipmentCount,
  onShowModal,
  onToggle,
}) => {
  const [switchValue, setSwitchValue] = useState(value)

  const handleToggle = async newValue => {
    setSwitchValue(newValue)
    try {
      // Update Firestore field
      const projectRef = doc(firestore, 'tickets', projectId)
      await updateDoc(projectRef, { [field]: newValue })

      if (typeof onToggle === 'function') {
        onToggle(newValue) // Call `onToggle` callback if provided
      }

      if (onShowModal && newValue) {
        onShowModal() // Show modal when toggled on and `onShowModal` is provided
      }
    } catch (error) {
      console.error(`Failed to update ${field}:`, error)
      Alert.alert('Error', 'Failed to update the ticket. Please try again.')
    }
  }

  useEffect(() => {
    setSwitchValue(value) // Update local state if the `value` prop changes
  }, [value])

  const renderSwitch = () => {
    if (equipmentCount > 0) {
      return (
        <TouchableOpacity
          onPress={() => handleToggle(true)}
          style={styles.plusButton}
        >
          <Text style={styles.plusText}>+</Text>
        </TouchableOpacity>
      )
    }

    return (
      <Switch
        value={switchValue}
        onValueChange={handleToggle}
        trackColor={{ false: '#ccc', true: '#2ecc71' }}
        thumbColor={switchValue ? '#2C3E50' : '#f4f3f4'}
      />
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {equipmentCount > 0 ? (
        <Text style={styles.editText}>Edit Equipment</Text>
      ) : null}
      {renderSwitch()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f7f7f7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  label: {
    fontSize: 16,
    color: '#2C3E50',
  },
  plusButton: {
    backgroundColor: '#2ecc71',
    borderRadius: 5,
    padding: 10,
    alignItems: 'center',
  },
  plusText: {
    fontSize: 20,
    color: 'white',
  },
  editText: {
    fontSize: 14,
    color: '#2C3E50',
    marginBottom: 8,
  },
})

export { SwitchComponent }
