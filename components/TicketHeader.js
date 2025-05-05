'use client'

import React, { useState, useEffect } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { BlurView } from 'expo-blur'
import Constants from 'expo-constants'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { format } from 'date-fns'

const TicketsHeader = ({
  searchQuery,
  setSearchQuery,
  selectedDate,
  showDatePicker,
  setShowDatePicker,
  onDatePickerChange,
  sortOption,
  setSortOption,
  clearFilter,
  isClearDisabled,
  onHeightChange,
  onDatePress, // New prop to handle date press
}) => {
  const [isSortModalVisible, setSortModalVisible] = useState(false)
  const insets = useSafeAreaInsets()
  const baseHeaderHeight = 120
  const headerHeight = insets.top + baseHeaderHeight + 8

  useEffect(() => {
    if (onHeightChange) {
      onHeightChange(headerHeight)
    }
  }, [headerHeight, onHeightChange])

  const openSortModal = () => {
    setSortModalVisible(true)
  }

  const closeSortModal = () => {
    setSortModalVisible(false)
  }

  const renderSortOption = (optionValue, label) => {
    const isSelected = sortOption === optionValue
    return (
      <TouchableOpacity
        style={[styles.optionButton, isSelected && styles.selectedOption]}
        onPress={() => {
          setSortOption(optionValue)
          closeSortModal()
        }}
      >
        <Text
          style={[styles.optionText, isSelected && styles.selectedOptionText]}
        >
          {label}
        </Text>
        {isSelected && (
          <IconSymbol
            name="checkmark"
            size={18}
            color="green"
            style={{ marginLeft: 8 }}
          />
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View style={[styles.absoluteHeader, { height: headerHeight }]}>
      <BlurView
        intensity={20} // Subtle blur (optional change)
        tint="default"
        style={styles.headerBlur}
      >
        <View style={[styles.headerContent, { paddingTop: insets.top + 8 }]}>
          {/* Search Bar */}
          <View style={styles.searchBarContainer}>
            <View style={styles.searchBar}>
              <IconSymbol name="magnifyingglass" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search address (all tickets)"
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
          {/* Top Row: Date Picker & Sort Controls */}
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.datePicker}
              onPress={onDatePress} // Use the passed onDatePress handler
            >
              <IconSymbol name="calendar" size={20} color="#999" />
              <Text style={styles.dateText}>
                {searchQuery
                  ? 'Date ignored (search active)'
                  : format(selectedDate, 'MM/dd/yyyy')}
              </Text>
            </TouchableOpacity>
            <View style={styles.sortControls}>
              <TouchableOpacity
                style={styles.sortButton}
                onPress={openSortModal}
              >
                <IconSymbol name="slider.horizontal.3" size={24} color="#333" />
                {sortOption && (
                  <Text style={styles.sortIndicator}>
                    {sortOption === 'remediationRequired'
                      ? 'Remediation'
                      : sortOption === 'equipmentOnSite'
                      ? 'Equipment'
                      : sortOption === 'returnNeeded'
                      ? 'Return'
                      : ''}
                  </Text>
                )}
              </TouchableOpacity>
              {!isClearDisabled && (
                <TouchableOpacity
                  style={styles.clearSortButton}
                  onPress={clearFilter}
                  disabled={isClearDisabled}
                >
                  <IconSymbol name="xmark.circle" size={24} color="#333" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </BlurView>

      {/* Sort Modal */}
      <Modal
        visible={isSortModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeSortModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Filter / Sort Criteria</Text>
            {renderSortOption(
              'remediationRequired',
              'Show Only Remediation Required'
            )}
            {renderSortOption('equipmentOnSite', 'Show Only Equipment On Site')}
            {renderSortOption('returnNeeded', 'Show Only Return Needed')}
            {/* Added */}
            {renderSortOption(null, 'Show All (No Filter)')}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeSortModal}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

BlurView.defaultProps = {
  tint: 'dark',
  intensity: 100,
}

const styles = StyleSheet.create({
  absoluteHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  headerBlur: {
    flex: 1,
    backgroundColor: '#0073BC',
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBarContainer: {
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flex: 1,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dateText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  sortControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sortIndicator: {
    fontSize: 12,
    color: '#333',
    marginLeft: 4,
    fontWeight: '600',
  },
  clearSortButton: {
    marginLeft: 6,
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 25,
    width: '80%',
    borderRadius: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOption: {
    backgroundColor: '#e6f4ea',
  },
  selectedOptionText: {
    fontWeight: '600',
    color: '#2B7E2C',
  },
  closeButton: {
    backgroundColor: '#F39C12',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
})

export { TicketsHeader }
