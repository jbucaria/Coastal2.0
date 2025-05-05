import { firestore } from '@/firebaseConfig'

export const sendNotification = async (formData, reportId) => {
  // Assuming you have some way to get user tokens or topic subscriptions
  const userTokens = await getNotificationTokens() // Implement this function

  const message = {
    to: userTokens, // or use 'topic' if using topic messaging
    title: 'New Inspection Report',
    body: `New report added for ${formData.address}`,
    data: {
      reportId: reportId,
      address: formData.address,
    },
  }

  try {
    // Here, you would make an API call to Firebase to send the notification
    console.log('Sending notification:', message)
    // await sendPushNotification(message); // Implement this function
  } catch (error) {
    console.error('Failed to send notification:', error)
  }
}

// Placeholder function for getting user tokens, you need to implement this based on your system
const getNotificationTokens = async () => {
  // Logic to get all user tokens or topic name
  // For example, you might query a 'users' collection in Firestore for their FCM tokens
  const usersSnapshot = await firestore.collection('users').get()
  let tokens = []
  usersSnapshot.forEach(doc => {
    const userData = doc.data()
    if (userData.fcmToken) {
      tokens.push(userData.fcmToken)
    }
  })
  return tokens
}
