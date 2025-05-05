import { StatusBar } from 'expo-status-bar'
import { StyleSheet, Text, View } from 'react-native'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function App() {
  const { expoPushToken, notification } = usePushNotifications()
  const data = JSON.stringify(notification, null, 2)

  return (
    <View style={styles.container}>
      <Text>
        Token: {expoPushToken && expoPushToken.data ? expoPushToken.data : ''}
      </Text>
      <Text>Notification: {data}</Text>
      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
