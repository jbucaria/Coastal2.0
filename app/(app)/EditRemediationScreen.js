'use client'

import React, { useState, useEffect } from 'react'
import {
  View,
  ScrollView,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'

const EditRemediationScreen = () => {
  const { projectId } = useLocalSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [remediationData, setRemediationData] = useState(null)

  useEffect(() => {
    const fetchRemediationData = async () => {
      try {
        const docRef = doc(firestore, 'tickets', projectId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setRemediationData(docSnap.data().remediationData || { rooms: [] })
        } else {
          Alert.alert('Error', 'No remediation data found.')
        }
      } catch (error) {
        console.error('Error fetching remediation data:', error)
        Alert.alert('Error', 'Failed to load data.')
      } finally {
        setLoading(false)
      }
    }
    fetchRemediationData()
  }, [projectId])

  const handleSave = async () => {
    try {
      const ticketRef = doc(firestore, 'tickets', projectId)
      await updateDoc(ticketRef, { remediationData })
      Alert.alert('Success', 'Remediation data updated.')
      router.back()
    } catch (error) {
      console.error('Error updating remediation:', error)
      Alert.alert('Error', 'Failed to update remediation.')
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <HeaderWithOptions
        title="Edit Remediation"
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Example editing field */}
        <Text style={styles.label}>Notes</Text>
        <TextInput
          multiline
          style={styles.input}
          value={remediationData.notes || ''}
          onChangeText={text =>
            setRemediationData({ ...remediationData, notes: text })
          }
        />
        {/* Add additional editable fields as needed */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

export default EditRemediationScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5F7',
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#2C3E50',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#0073BC',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
