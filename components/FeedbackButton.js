// FeedbackButton.jsx
import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'

const FeedbackButton = () => {
  const router = useRouter()
  return (
    <TouchableOpacity
      style={styles.feedbackButton}
      onPress={() => router.push('/ButtonSampleScreen')}
    >
      <Text style={styles.feedbackButtonText}>Feedback</Text>
    </TouchableOpacity>
  )
}

export default FeedbackButton

const styles = StyleSheet.create({
  feedbackButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    position: 'absolute',
    bottom: 200,
    right: 30,
    elevation: 5,
  },
  feedbackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
