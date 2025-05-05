import React, { useState } from 'react'
import { router } from 'expo-router'
import {
  Modal,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'

import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { IconSymbol } from '@/components/ui/IconSymbol'

const ReportModal = ({
  modalVisible,
  setModalVisible,
  selectedReport,
  isDeleting,
  setIsDeleting,
  setIsDownloading,
  setDownloadProgress,
}) => {
  const [deleting, setDeleting] = useState(false)

  const handleViewReport = () => {
    if (!selectedReport) {
      Alert.alert('Error', 'No report selected to view.')
      return
    }
    router.push({
      pathname: '/viewReport',
      params: { projectId: selectedReport.id },
    })
    setModalVisible(false)
  }

  const handleDownloadReport = async () => {
    if (!selectedReport || !selectedReport.pdfDownloadURL) return
    try {
      const fileUri = `${FileSystem.documentDirectory}${selectedReport.pdfFileName}`
      await FileSystem.downloadAsync(selectedReport.pdfDownloadURL, fileUri)
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Report',
      })
    } catch (error) {
      console.error('Error downloading report:', error)
      Alert.alert('Error', 'Failed to download the report')
    }
  }

  const handleEditReport = () => {
    if (!selectedReport) {
      Alert.alert('Error', 'No report selected to edit.')
      return
    }
    router.push({
      pathname: '/editReportScreen',
      params: { projectId: selectedReport.id },
    })
    setModalVisible(false)
  }

  const onDeleteReport = () => {
    setDeleting(true)
    // Here you'd call your actual delete function
    setTimeout(() => {
      setDeleting(false)
      setModalVisible(false)
      setIsDeleting(false) // Reset the deleting state in parent component
    }, 2000) // simulate deletion time
  }

  const onDownloadPhotos = () => {
    setIsDownloading(true)
    setDownloadProgress(0) // Reset progress
    // Here you'd call your actual download function
    setTimeout(() => {
      setIsDownloading(false)
    }, 2000) // simulate download time
  }

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(!modalVisible)}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.optionContainer}>
            <View style={styles.iconRow}>
              <TouchableOpacity
                onPress={handleViewReport}
                style={styles.iconOption}
              >
                <IconSymbol name="eye" size={50} color="#2C3E50" />
                <ThemedText style={styles.iconLabel}>View Report</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.iconRow}>
              <TouchableOpacity
                onPress={handleEditReport}
                style={styles.iconOption}
              >
                <IconSymbol name="pencil" size={50} color="#2C3E50" />
                <ThemedText style={styles.iconLabel}>Edit</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onDeleteReport}
                style={styles.iconOption}
              >
                <IconSymbol name="trash" size={50} color="#2C3E50" />
                <ThemedText style={styles.iconLabel}>Delete</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.iconRow}>
              <TouchableOpacity
                onPress={onDownloadPhotos}
                style={styles.iconOption}
              >
                <IconSymbol name="photo" size={50} color="#2C3E50" />
                <ThemedText style={styles.iconLabel}>Save Photos</ThemedText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <ThemedText style={styles.closeButtonText}>Close</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}
const styles = {
  // Include modal-related styles from your existing styles object
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalView: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
  },
  optionContainer: {
    padding: 20,
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  iconOption: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLabel: {
    marginTop: 8,
    color: '#2C3E50',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
}

export { ReportModal }
