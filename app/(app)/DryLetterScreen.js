'use client'

import React, { useState, useEffect } from 'react'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useRouter, useLocalSearchParams } from 'expo-router'
import useTicket from '@/hooks/useTicket'
import { dryLetterTemplates } from '@/utils/dryLetterTemplates'
import { firestore } from '@/firebaseConfig'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { Share } from 'react-native'
import * as Print from 'expo-print'
import { Asset } from 'expo-asset'
import coastalLogo from '../../assets/images/CoastalRestorationServicesLogo-FinalTransparentBG.jpg'
import * as FileSystem from 'expo-file-system'
import { formatDateWithOrdinal } from '@/utils/helpers'

const ACCENT_COLOR = '#1DA1F2'

const DryLetterScreen = () => {
  const params = useLocalSearchParams()
  const { projectId } = params
  const router = useRouter()
  const { ticket, error } = useTicket(projectId)

  const [headerHeight, setHeaderHeight] = useState(0)
  const [callDate, setCallDate] = useState(new Date())
  const [completionDate, setCompletionDate] = useState(new Date())
  const [showCallPicker, setShowCallPicker] = useState(false)
  const [showCompletionPicker, setShowCompletionPicker] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState(null)
  const [step, setStep] = useState(1)
  const [generatedContent, setGeneratedContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (error) {
      Alert.alert('Error', 'Unable to load ticket data.')
    }
  }, [error])

  if (!ticket) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT_COLOR} />
        <Text style={styles.loadingText}>Loading ticket...</Text>
      </View>
    )
  }

  const onCallDateChange = (event, date) => {
    setShowCallPicker(Platform.OS === 'ios')
    if (date) setCallDate(date)
  }

  const onCompletionDateChange = (event, date) => {
    setShowCompletionPicker(Platform.OS === 'ios')
    if (date) setCompletionDate(date)
  }

  const handleNext = () => {
    if (!selectedTemplateId) {
      Alert.alert('Please select a template.')
      return
    }
    const template = dryLetterTemplates.find(t => t.id === selectedTemplateId)
    if (template) {
      const content = template.generate({ ticket, callDate, completionDate })
      setGeneratedContent(content)
      setStep(2)
    }
  }

  const handleShare = async () => {
    try {
      // Ensure logo asset is downloaded
      const asset = Asset.fromModule(coastalLogo)
      await asset.downloadAsync()
      const fileUri = asset.localUri
      // Read logo file as base64
      const base64Logo = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 })
      // Build HTML with styling and embedded base64 logo
      const html = `
        <html>
          <head>
            <meta charset="utf-8"/>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .header { text-align: center; margin-bottom: 40px; }
              .header img { max-width: 200px; height: auto; }
              .content { white-space: pre-wrap; font-size: 12px; line-height: 1.5; }
            </style>
          </head>
          <body>
            <div class="header"><img src="data:image/jpeg;base64,${base64Logo}" /></div>
            <div class="content">${generatedContent}</div>
          </body>
        </html>
      `
      const { uri } = await Print.printToFileAsync({ html })
      await Share.share({ url: uri, title: 'Dry Letter' })
    } catch (err) {
      console.error('Error sharing PDF:', err)
      Alert.alert('Error', 'Failed to generate PDF for sharing.')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const lettersRef = collection(
        firestore,
        'tickets',
        projectId,
        'dryLetters'
      )
      await addDoc(lettersRef, {
        templateId: selectedTemplateId,
        content: generatedContent,
        callDate: callDate.toISOString(),
        completionDate: completionDate.toISOString(),
        createdAt: serverTimestamp(),
      })
      Alert.alert('Success', 'Dry letter saved.')
      router.back()
    } catch (err) {
      console.error('Error saving dry letter:', err)
      Alert.alert('Error', 'Failed to save dry letter.')
    } finally {
      setSaving(false)
    }
  }

  const headerOptions = [
    {
      label: 'View Saved Letters',
      onPress: () => {
        router.push({ pathname: '/DryLetterListScreen', params: { projectId } })
      },
    },
  ]
  return (
    <View style={styles.container}>
      <HeaderWithOptions
        title="Dry Letter"
        onBack={() => router.back()}
        onOptions={() => {}}
        options={headerOptions}
        onHeightChange={height => setHeaderHeight(height)}
      />
      {step === 1 ? (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: headerHeight + 8 },
          ]}
        >
          <Text style={styles.sectionTitle}>Select Template</Text>
          {dryLetterTemplates.map(template => (
            <TouchableOpacity
              key={template.id}
              style={[
                styles.option,
                selectedTemplateId === template.id && styles.selectedOption,
              ]}
              onPress={() => setSelectedTemplateId(template.id)}
            >
              <Text style={styles.optionText}>{template.name}</Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.sectionTitle}>Inspection Call Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowCallPicker(true)}
          >
            <Text style={styles.dateText}>
              {formatDateWithOrdinal(callDate)}
            </Text>
          </TouchableOpacity>
          {showCallPicker && (
            <DateTimePicker
              value={callDate}
              mode="date"
              display="default"
              onChange={onCallDateChange}
            />
          )}
          <Text style={styles.sectionTitle}>Dry Completion Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowCompletionPicker(true)}
          >
            <Text style={styles.dateText}>
              {formatDateWithOrdinal(completionDate)}
            </Text>
          </TouchableOpacity>
          {showCompletionPicker && (
            <DateTimePicker
              value={completionDate}
              mode="date"
              display="default"
              onChange={onCompletionDateChange}
            />
          )}
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Generate Letter</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View
          style={[styles.previewContainer, { paddingTop: headerHeight + 8 }]}
        >
          <ScrollView contentContainerStyle={styles.previewContent}>
            <Text style={styles.previewText}>{generatedContent}</Text>
          </ScrollView>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Text style={styles.buttonText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save & Close</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  )
}

export default DryLetterScreen

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  option: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 8,
  },
  selectedOption: { borderColor: ACCENT_COLOR, backgroundColor: '#e8f5fd' },
  optionText: { fontSize: 16, color: '#14171A' },
  dateButton: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 8,
  },
  dateText: { fontSize: 16, color: '#14171A' },
  nextButton: {
    marginTop: 24,
    backgroundColor: ACCENT_COLOR,
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  previewContainer: { flex: 1, padding: 16 },
  previewContent: { paddingBottom: 80 },
  previewText: { fontSize: 14, color: '#14171A', lineHeight: 22 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#6c757d',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: ACCENT_COLOR,
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginLeft: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
