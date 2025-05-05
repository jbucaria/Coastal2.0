// utils/getTravelTime.js
import { getCurrentLocation } from './getCurrentLocation'

const apiKey = 'AIzaSyCaaprXbVDmKz6W5rn3s6W4HhF4S1K2-zs'

export const getTravelTime = async destination => {
  try {
    // Get user's current location
    const currentLocation = await getCurrentLocation()
    const origin = `${currentLocation.latitude},${currentLocation.longitude}`

    // Replace with your API key (load this securely in production)
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
      origin
    )}&destination=${encodeURIComponent(destination)}&key=${apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status === 'OK') {
      const leg = data.routes[0].legs[0]
      return {
        durationText: leg.duration.text,
        durationValue: leg.duration.value,
        distanceText: leg.distance.text,
        distanceValue: leg.distance.value,
      }
    } else {
      // Log detailed error response
      console.error('Directions API Response:', JSON.stringify(data, null, 2))

      // Throw a more detailed error
      throw new Error(
        `Directions request failed: ${data.status}. Error message: ${
          data.error_message || 'No detailed error message provided.'
        }`
      )
    }
  } catch (error) {
    console.error('Error fetching travel time:', error)
    throw error
  }
}
