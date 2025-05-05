// src/utils/createCSVReport.js
import Papa from 'papaparse'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Alert } from 'react-native'

/**
 * Converts remediation data into a CSV string.
 *
 * @param {Object} remediationData - The remediation data.
 * @returns {string} - The CSV string.
 */
const convertRemediationDataToCSV = remediationData => {
  const { rooms } = remediationData

  // Flatten data to have one CSV row per measurement with room context.
  const csvData = rooms.flatMap(room =>
    room.measurements.map(measurement => ({
      Room: room.name,
      Description: measurement.description,
      Quantity: measurement.quantity,
      // You can adjust these fields based on QuickBooks requirements.
      'Unit Price': '',
      Total: '',
    }))
  )

  const headers = ['Room', 'Description', 'Quantity', 'Unit Price', 'Total']

  // Generate the CSV string using PapaParse.
  const csv = Papa.unparse({ fields: headers, data: csvData })
  return csv
}

/**
 * Generates a CSV report from remediationData and opens a native sharing dialog.
 *
 * @param {Object} remediationData - Your remediation data object.
 * @param {string} projectId - The current project ID.
 */
const exportCSVReport = async (remediationData, projectId) => {
  if (!remediationData) {
    Alert.alert('Error', 'No remediation data to export.')
    return
  }

  try {
    // Convert the data to a CSV string.
    const csvString = convertRemediationDataToCSV(remediationData)
    const fileName = `Remediation_Report_${projectId}.csv`
    const fileUri = FileSystem.documentDirectory + fileName

    // Write CSV string to file.
    await FileSystem.writeAsStringAsync(fileUri, csvString, {
      encoding: FileSystem.EncodingType.UTF8,
    })

    // Check whether sharing is available on the device.
    const isAvailable = await Sharing.isAvailableAsync()
    if (!isAvailable) {
      Alert.alert('Error', 'Sharing is not available on this device.')
      return
    }

    // Open the sharing dialog.
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Share Remediation Report',
      UTI: 'public.comma-separated-values-text',
    })
  } catch (error) {
    console.error('Error exporting CSV:', error)
    Alert.alert('Error', 'Failed to export CSV. Please try again.')
  }
}

export { exportCSVReport }
