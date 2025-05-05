// FeedbackScreen.jsx
'use client'

import React, { useState } from 'react'
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native'
import { useRouter } from 'expo-router'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import * as ImagePicker from 'expo-image-picker'
import { firestore } from '@/firebaseConfig'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import { useUserStore } from '@/store/useUserStore'

const FeedbackScreen = () => {
  const router = useRouter()
  const { user } = useUserStore()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [imageUri, setImageUri] = useState(null)
  const [loading, setLoading] = useState(false)

  const HEADER_HEIGHT = 80

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need permission to access your photos.'
        )
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      })
      if (!result.canceled) {
        setImageUri(result.assets[0].uri)
      }
    } catch (error) {
      console.error('Error picking image:', error)
    }
  }

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Error', 'Please fill in both the subject and your message.')
      return
    }
    setLoading(true)
    try {
      // In this example, we're simply saving text feedback.
      // To handle image uploads, you could first upload the imageUri to Firebase Storage,
      // then include the download URL in your feedback document.
      await addDoc(collection(firestore, 'feedback'), {
        userId: user?.uid || null,
        subject: subject.trim(),
        message: message.trim(),
        screenshot: imageUri || null, // You can store the URL after uploading
        timestamp: serverTimestamp(),
      })
      Alert.alert('Thank you!', 'Your feedback has been submitted.')
      setSubject('')
      setMessage('')
      setImageUri(null)
      router.back()
    } catch (error) {
      console.error('Error submitting feedback:', error)
      Alert.alert('Error', 'Failed to submit feedback. Please try again.')
    }
    setLoading(false)
  }

  return (
    <SafeAreaView style={styles.container}>
      <HeaderWithOptions
        title="Feedback"
        onBack={() => router.back()}
        options={[]}
        showHome={false}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardContainer}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            { paddingTop: HEADER_HEIGHT },
          ]}
        >
          <Text style={styles.title}>We Value Your Feedback!</Text>
          <Text style={styles.description}>
            Let us know if you encounter any issues or have suggestions for
            improvements.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Subject"
            value={subject}
            onChangeText={setSubject}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Your Message"
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
          />
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <Text style={styles.uploadButtonText}>Upload Screenshot</Text>
          </TouchableOpacity>
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          )}
          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default FeedbackScreen

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007BFF',
    alignItems: 'center',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  container: { flex: 1, backgroundColor: '#fff' },
  description: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
  },
  keyboardContainer: { flex: 1 },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  scrollContainer: { padding: 16, paddingBottom: 40 },
  textArea: { height: 150, textAlignVertical: 'top' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  uploadButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
