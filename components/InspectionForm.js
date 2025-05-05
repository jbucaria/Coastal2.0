// components/InspectionForm.js

import React, { useState, useCallback, useEffect } from 'react'
import { router } from 'expo-router'
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Image,
  Button,
  ActivityIndicator,
  Switch,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { doc, updateDoc } from 'firebase/firestore'

import { firestore } from '@/firebaseConfig'
import { ThemedView } from '@/components/ui/ThemedView'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { rephraseText } from '@/utils/rephraseText'
import { ThemedText } from '@/components/ui/ThemedText'
import { handleGenerateReport } from '@/utils/generateReport'
import { EquipmentModal } from './EquipmentModal'

const InspectionForm = ({ project, setProject, projectId }) => {
  const [showEquipmentModal, setShowEquipmentModal] = useState(false)
  const [customer, setCustomer] = useState(project.customer || '')
  const [customerName, setCustomerName] = useState(project.customerName || '')
  const [address, setAddress] = useState(project.address || '')
  const [date, setDate] = useState(new Date(project.date || Date.now()))
  const [reason, setReason] = useState(project.reason || '')
  const [hours, setHours] = useState(project.hours || '')
  const [inspectionResults, setInspectionResults] = useState('')
  const [recommendedActions, setRecommendedActions] = useState('')
  const [photos, setPhotos] = useState(project.photos || [])
  const [isSaving, setIsSaving] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isThinkingRemediation, setIsThinkingRemediation] = useState(false)
  const [customerNumber, setCustomerNumber] = useState(
    project.customerNumber || ''
  )
  const [homeOwnerName, setHomeOwnerName] = useState(
    project.homeOwnerName || ''
  )
  const [homeOwnerNumber, setHomeOwnerNumber] = useState(
    project.homeOwnerNumber || ''
  )
  const [inspectorName, setInspectorName] = useState(
    project.inspectorName || ''
  )
  const [localRemediationRequired, setLocalRemediationRequired] = useState(
    project?.remediationRequired || false
  )
  const [localEquipmentOnSite, setLocalEquipmentOnSite] = useState(
    project?.equipmentOnSite || false
  )
  const [localSiteComplete, setLocalSiteComplete] = useState(
    project?.siteComplete || false
  )
  const [equipmentOnSite, setEquipmentOnSite] = useState(
    project.equipmentOnSite || false
  )
  const [siteComplete, setSiteComplete] = useState(
    project.siteComplete || false
  )

  useEffect(() => {
    // Load project details into state, including `siteComplete`
    setSiteComplete(project.siteComplete || false)
    // Other details loading...
  }, [project])

  const handleRemediationToggle = value => {
    if (value) {
      Alert.alert(
        'Input Measurements',
        'Would you like to input measurements now?',
        [
          {
            text: 'Yes',
            onPress: () => {
              router.push({
                pathname: '/RemediationScreen',
                params: { projectId: project.id },
              })
            },
          },
          {
            text: 'No',
            onPress: () => {
              updateProjectRemediationRequired(true)
            },
            style: 'cancel',
          },
        ],
        { cancelable: true }
      )
    } else {
      updateProjectRemediationRequired(false)
    }
  }

  const updateProjectRemediationRequired = value => {
    setProject(prev => ({ ...prev, remediationRequired: value }))
    updateTicket(project.id, 'remediationRequired', value)
  }

  useEffect(() => {
    if (project) {
      setIsSaving(true)
      setCustomer(project.customer || '')
      setCustomerName(project.customerName || '')
      setCustomerNumber(project.customerNumber || '')
      setHomeOwnerName(project.homeOwnerName || '')
      setHomeOwnerNumber(project.homeOwnerNumber || '')
      setAddress(project.address || '')
      setDate(project.date || new Date())
      setReason(project.reason || '')
      // setHours(project.hours || '')
      // setPhotos(project.photos || [])
      setInspectorName(project.inspectorName || '')
      setLocalRemediationRequired(project.remediationRequired || false)
      setLocalEquipmentOnSite(project.equipmentOnSite || false)
      setLocalSiteComplete(project.siteComplete || false)

      setTimeout(() => {
        setIsSaving(false)
      }, 1000)
    }
  }, [project])

  const validateForm = () => {
    const requiredFields = {
      Customer: customer,
      Address: address,
      Reason: reason,
      Inspector: inspectorName,
      Hours: hours,
      Results: inspectionResults,
      Actions: recommendedActions,
    }

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key)

    if (missingFields.length > 0) {
      Alert.alert(
        'Form Incomplete',
        'Please complete the following fields:\n' + missingFields.join('\n')
      )
      return false
    }

    return true
  }

  const handleSaveReport = async () => {
    // if (!validateForm()) return

    const formData = {
      projectId,
      customer,
      address,
      date: date.toLocaleDateString(),
      reason,
      inspectorName,
      customerName,
      customerNumber,
      homeOwnerName,
      homeOwnerNumber,
      hours,
      inspectionResults,
      recommendedActions,
      photos: photos,
      onSite: false,
    }

    try {
      await handleGenerateReport(formData, setIsSaving)
    } catch (error) {
      console.error('Error saving report:', error)
      Alert.alert('Error', 'Failed to save the report. Please try again.')
    }
  }

  // Handler for rephrasing inspection results using OpenAI’s API
  const handleRephraseInspectionResults = async () => {
    setIsThinking(true)
    try {
      const newText = await rephraseText(inspectionResults)
      setInspectionResults(newText)
      setIsThinking(false)
    } catch (error) {
      Alert.alert('Error', 'Failed to rephrase inspection results.')
    }
  }

  // Handler for rephrasing recommended actions using OpenAI’s API
  const handleRephraseRecommendedActions = async () => {
    setIsThinkingRemediation(true)
    try {
      const newText = await rephraseText(recommendedActions)
      setRecommendedActions(newText)
      setIsThinkingRemediation(false)
    } catch (error) {
      Alert.alert('Error', 'Failed to rephrase recommended actions.')
    }
  }

  const updateTicket = useCallback(async (projectId, field, value) => {
    try {
      await updateDoc(doc(firestore, 'tickets', projectId), { [field]: value })
    } catch (error) {
      console.error('Error updating project:', error)
      Alert.alert('Error', 'Failed to update the project. Please try again.')
    }
  }, [])

  const handleSwitchChange = async value => {
    setEquipmentOnSite(value)
    if (!value) {
      try {
        await updateDoc(doc(firestore, 'tickets', project.id), {
          equipmentTotal: 0,
          equipmentOnSite: false,
          equipment: {},
        })
        Alert.alert(
          'Equipment cleared',
          'All equipment has been cleared from the site.'
        )
      } catch (error) {
        console.error('Error clearing equipment:', error)
        Alert.alert('Error', 'Failed to update the project. Please try again.')
      }
    } else {
      setShowEquipmentModal(true)
    }
  }

  const handleEquipmentSave = equipment => {
    setShowEquipmentModal(false)
  }

  const handlePhotoLabelChange = (text, index) => {
    const updatedPhotos = [...photos]
    updatedPhotos[index].label = text
    setPhotos(updatedPhotos)
  }

  const handleRemovePhoto = index => {
    const updatedPhotos = [...photos]
    updatedPhotos.splice(index, 1)
    setPhotos(updatedPhotos)
  }

  const pickImageAsync = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Permission to access camera roll is required!'
        )
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.5,
      })
      if (!result.canceled) {
        const selectedAssets = await Promise.all(
          result.assets.map(async asset => {
            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            })
            return { uri: asset.uri, label: '', base64 }
          })
        )
        setPhotos([...photos, ...selectedAssets])
      } else {
        Alert.alert('No Selection', 'You did not select any image.')
      }
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert('Error', 'Failed to pick images.')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={40}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topFormSection}>
            <Text style={styles.title}>Create Inspection Report</Text>

            <Text style={styles.addressText}>{address}</Text>
          </View>
          <ThemedText style={styles.label}>
            Hours to Complete Inspection:
          </ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Enter hours"
            value={hours}
            onChangeText={setHours}
            keyboardType="numeric"
          />

          <ThemedText style={styles.label}>Inspection Results:</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter inspection results"
            value={inspectionResults}
            onChangeText={setInspectionResults}
            multiline
          />
          <TouchableOpacity
            style={styles.rephraseButton}
            onPress={handleRephraseInspectionResults}
          >
            <Text style={styles.rephraseButtonText}>
              {!isThinking ? 'Rephrase Inspection Results' : 'Thinking...'}
            </Text>
          </TouchableOpacity>

          <ThemedText style={styles.label}>Recommended Actions:</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter recommended actions"
            value={recommendedActions}
            onChangeText={setRecommendedActions}
            multiline
          />
          <TouchableOpacity
            style={styles.rephraseButton}
            onPress={handleRephraseRecommendedActions}
          >
            <Text style={styles.rephraseButtonText}>
              {isThinkingRemediation
                ? 'Thinking....'
                : 'Rephrase Recommended Actions'}
            </Text>
          </TouchableOpacity>

          {/* Project-level Switches */}

          <View style={styles.checkboxContainer}>
            {project.remediationComplete ? (
              <>
                <Text style={styles.checkboxLabel}>Remediation Complete</Text>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/ViewRemediationScreen',
                      params: { projectId: project.projectId },
                    })
                  }
                  style={styles.viewButton}
                >
                  <Text style={styles.viewButtonText}>View Details</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Switch
                  value={project?.remediationRequired || false}
                  onValueChange={handleRemediationToggle}
                />
                <Text style={styles.checkboxLabel}>Remediation Required</Text>
              </>
            )}
          </View>
          <View style={styles.container}>
            <Text>Equipment</Text>
            <Switch
              value={equipmentOnSite}
              onValueChange={handleSwitchChange}
            />
            {equipmentOnSite && (
              <TouchableOpacity onPress={() => setShowEquipmentModal(true)}>
                <Text>View/Edit Equipment</Text>
              </TouchableOpacity>
            )}

            <EquipmentModal
              visible={showEquipmentModal}
              onClose={() => setShowEquipmentModal(false)}
              projectId={project.id}
              initialQuantities={project.equipment}
              equipmentOnSite={equipmentOnSite}
              onSave={handleEquipmentSave}
            />
          </View>
          <View style={styles.checkboxContainer}>
            <Switch
              value={project?.siteComplete || false}
              onValueChange={value => handleSwitchChange('siteComplete', value)}
            />
            <Text style={styles.checkboxLabel}>Site Complete</Text>
          </View>

          <ThemedView style={styles.photoSection}>
            <View style={styles.photosHeader}>
              <ThemedText style={styles.subtitle} type="subtitle">
                Inspection Photos
              </ThemedText>
              <TouchableOpacity onPress={pickImageAsync}>
                <IconSymbol name="photo.badge.plus" size={30} color="#008000" />
              </TouchableOpacity>
            </View>

            {photos.length === 0 ? (
              /* Show a "no photos" message or an empty state */
              <ThemedText style={{ color: '#888' }}>
                No photos have been added yet.
              </ThemedText>
            ) : (
              /* Map over the existing photos */
              photos.map((photo, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.photoImage}
                  />
                  <TextInput
                    style={styles.photoLabelInput}
                    value={photo.label}
                    onChangeText={text => handlePhotoLabelChange(text, index)}
                    placeholder="Label this photo"
                  />
                  <TouchableOpacity onPress={() => handleRemovePhoto(index)}>
                    <ThemedText style={styles.removeText}>Remove</ThemedText>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ThemedView>

          {/* Button for generating PDF */}
          <ThemedView style={styles.buttonContainer}>
            {isSaving ? (
              <ActivityIndicator size="large" color="#0000ff" />
            ) : (
              <Button title="Save Report" onPress={handleSaveReport} />
            )}
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export { InspectionForm }

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  scrollContainer: {
    padding: 8,
    paddingBottom: 100,
  },
  container: {
    flex: 1,
  },
  // topFormSection: {
  //   backgroundColor: '#f7f7f7',
  //   padding: 16,
  //   borderRadius: 8,
  //   marginBottom: 20,
  //   shadowColor: '#000',
  //   shadowOpacity: 0.1,
  //   shadowOffset: { width: 0, height: 2 },
  //   shadowRadius: 2,
  //   elevation: 2,
  // },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#2C3E50',
  },
  addressText: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: '#2C3E50',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: 'white',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 16,
    color: '#2C3E50',
  },
  photoSection: {
    marginBottom: 16,
    padding: 5,
    borderRadius: 8,
  },
  photosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  photoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoImage: {
    width: 48,
    height: 48,
    borderRadius: 4,
    marginRight: 8,
  },
  photoLabelInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 8,
    backgroundColor: 'white',
    fontSize: 14,
  },
  removeText: {
    color: 'red',
    marginLeft: 8,
    padding: 4,
  },
  buttonContainer: {
    marginTop: 16,
  },
  rephraseButton: {
    backgroundColor: '#95a5a6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  rephraseButtonText: {
    color: 'white',
    fontSize: 14,
  },
})
