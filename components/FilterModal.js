import React, { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native'
import CheckBox from '@react-native-community/checkbox'
import { Picker } from '@react-native-picker/picker'

const FilterModal = ({
  visible,
  onClose,
  onApplyFilters,
  initialFilters = {},
}) => {
  // Sorting options state
  const [sortOptions, setSortOptions] = useState({
    siteComplete: false,
    remediationRequired: false,
    equipmentOnSite: false,
    inspectorName: false,
  })

  const [inspectorName, setInspectorName] = useState('') // For inspector selection
  const [showInspectorPicker, setShowInspectorPicker] = useState(false) // Show/hide inspector picker

  const toggleSortOption = option => {
    setSortOptions(prev => ({
      ...prev,
      [option]: !prev[option],
      inspectorName: option === 'inspectorName' ? !prev[option] : false, // Reset inspectorName if not selected
    }))
    if (option !== 'inspectorName') setInspectorName('') // Clear inspector name if not inspectorName option
    setShowInspectorPicker(option === 'inspectorName')
  }

  const applyFilters = () => {
    if (sortOptions.inspectorName && !inspectorName) {
      alert('Please select an inspector.')
      return
    }
    const sortField =
      Object.keys(sortOptions).find(key => sortOptions[key]) || 'siteComplete' // Default to siteComplete
    onApplyFilters({
      sortField,
      sortDirection: 'asc', // Default to ascending
      inspectorName: sortField === 'inspectorName' ? inspectorName : undefined,
    })
    onClose()
  }

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Sort Options</Text>
            <TouchableOpacity
              onPress={() =>
                setSortOptions({
                  siteComplete: false,
                  remediationRequired: false,
                  equipmentOnSite: false,
                  inspectorName: false,
                })
              }
            >
              <Text style={styles.resetButton}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView>
            <View style={styles.section}>
              {[
                'siteComplete',
                'remediationRequired',
                'equipmentOnSite',
                'inspectorName',
              ].map(option => (
                <View key={option} style={styles.sortOption}>
                  <CheckBox
                    value={sortOptions[option]}
                    onValueChange={() => toggleSortOption(option)}
                    disabled={
                      sortOptions.inspectorName && option !== 'inspectorName'
                    } // Disable other options if inspectorName is selected
                  />
                  <Text style={styles.sortLabel}>
                    {option
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, str => str.toUpperCase())}
                  </Text>
                </View>
              ))}
            </View>

            {showInspectorPicker && (
              <View style={styles.inspectorPickerContainer}>
                <Text style={styles.sectionTitle}>Select Inspector</Text>
                <Picker
                  selectedValue={inspectorName}
                  onValueChange={itemValue => setInspectorName(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select an inspector" value="" />
                  <Picker.Item label="John Bucaria" value="John Bucaria" />
                  <Picker.Item label="Dave Sprott" value="Dave Sprott" />
                </Picker>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity onPress={applyFilters} style={styles.applyButton}>
            <Text style={styles.applyButtonText}>Apply Sort</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export { FilterModal }

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cancelButton: {
    color: 'blue',
  },
  resetButton: {
    color: 'red',
  },
  section: {
    marginBottom: 20,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sortLabel: {
    marginLeft: 10,
    fontSize: 16,
  },
  inspectorPickerContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  applyButton: {
    backgroundColor: '#3498db',
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
  },
})
