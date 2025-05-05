import { Alert } from 'react-native'
import * as Location from 'expo-location'

export const getCurrentLocation = async () => {
  try {
    let { status } = await Location.getForegroundPermissionsAsync()

    if (status !== 'granted') {
      const { status: newStatus } =
        await Location.requestForegroundPermissionsAsync()

      if (newStatus !== 'granted') {
        // Alert the user to enable location services manually
        Alert.alert(
          'Location Permission Required',
          'Please enable location services in your device settings.',
          [{ text: 'OK', onPress: () => console.log('OK Pressed') }],
          { cancelable: false }
        )
        throw new Error('Location permission not granted')
      }
      status = newStatus
    }

    const location = await Location.getCurrentPositionAsync({})
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    }
  } catch (error) {
    console.error('Error getting current location:', error)
    throw error
  }
}
