// screens/TicketsMapScreen.js (or relevant path)
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native'
import MapView, { Marker, Polyline } from 'react-native-maps'
import * as Location from 'expo-location'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { useSelectedDate } from '@/store/useSelectedDate'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import Constants from 'expo-constants' // Import Constants

// Retrieve the Google Maps API key from Expo config
const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey

// Check if the key is loaded
if (!GOOGLE_MAPS_API_KEY) {
  const errorMsg =
    'Missing Google Maps API key. Ensure GOOGLE_MAPS_API_KEY is set in .env and loaded in app.config.js under extra.googleMapsApiKey. Restart server (-c).'
  console.error(errorMsg)
  // Optionally alert in dev, but Maps might not work without a key
  if (__DEV__) {
    Alert.alert('Configuration Error', errorMsg)
  }
  // You might want to handle this more gracefully than throwing an error
  // depending on whether the map is critical or optional.
  // For now, we'll proceed, but API calls will likely fail.
} else {
  console.log('[TicketsMapScreen.js] Google Maps API Key Loaded.')
}

const TicketsMapScreen = () => {
  const { selectedDate } = useSelectedDate()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [location, setLocation] = useState(null)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [routeCoords, setRouteCoords] = useState([])
  const [orderedTickets, setOrderedTickets] = useState([])
  const [showDetailsSheet, setShowDetailsSheet] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0)

  const mapRef = useRef(null)
  const [optimizeRoute, setOptimizeRoute] = useState(true)

  // Get user location
  const getUserLocation = async () => {
    setLoading(true) // Start loading indicator
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location access is required to show your position on the map.'
        )
        // Set a default location if permission denied, e.g., center of service area
        setLocation({
          latitude: 28.18, // Approx Trinity, FL
          longitude: -82.67,
          latitudeDelta: 1.5,
          longitudeDelta: 1.5,
        })
        setLoading(false) // Stop loading even if permission denied
        return // Exit function
      }
      const userLocation = await Location.getCurrentPositionAsync({})
      setLocation({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 1.5, // Start zoomed out
        longitudeDelta: 1.5,
      })
      console.log('User location set:', userLocation.coords)
    } catch (error) {
      console.error('Error fetching location:', error)
      Alert.alert('Location Error', 'Could not fetch your current location.')
      // Set a default location on error
      setLocation({
        latitude: 28.18, // Approx Trinity, FL
        longitude: -82.67,
        latitudeDelta: 1.5,
        longitudeDelta: 1.5,
      })
    } finally {
      // Loading state for tickets fetching will handle the final loading stop
      // setLoading(false); // Don't stop loading here yet
    }
  }

  // Fetch tickets for selected date with proper UTC date comparison
  const fetchTicketsForDate = async date => {
    if (!date) {
      console.warn('fetchTicketsForDate called with invalid date')
      setLoading(false)
      return
    }
    setLoading(true) // Ensure loading is true when fetching starts
   
    try {
      // Calculate start and end of the day in UTC
      const startOfDayUTC = new Date(
        Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate(),
          0,
          0,
          0,
          0 // Start at 00:00:00.000 UTC
        )
      )
      const endOfDayUTC = new Date(
        Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate(),
          23,
          59,
          59,
          999 // End at 23:59:59.999 UTC
        )
      )

      // Convert Timestamps to ISO strings for Firestore query
      // Note: Ensure 'startDate' in Firestore is actually stored as a Timestamp or ISO String
      // If 'startDate' is just 'YYYY-MM-DD', this query needs adjustment.
      // Assuming 'startDate' is a Timestamp or ISO String:
      const startTimestamp = startOfDayUTC // Use Date object directly if field is Timestamp
      const endTimestamp = endOfDayUTC // Use Date object directly if field is Timestamp

 

      const ticketsQuery = query(
        collection(firestore, 'tickets'),
        where('startDate', '>=', startTimestamp),
        where('startDate', '<=', endTimestamp)
        // Add other filters if needed, e.g., where('status', '==', 'scheduled')
      )

      const snapshot = await getDocs(ticketsQuery)
   

      const ticketData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Geocode tickets after fetching
     
      const ticketLocations = await Promise.all(
        ticketData.map(async ticket => {
          // Ensure address exists before geocoding
          if (
            !ticket.address ||
            typeof ticket.address !== 'string' ||
            ticket.address.trim() === ''
          ) {
            console.warn(`Ticket ${ticket.id} has missing or invalid address.`)
            return { ...ticket, coordinates: null }
          }
          const coordinates = await getGeocode(ticket) // Pass the whole ticket object
          return { ...ticket, coordinates }
        })
      )

      const validTickets = ticketLocations.filter(
        ticket => ticket.coordinates !== null
      )
    
      setTickets(validTickets)
    } catch (error) {
    
      Alert.alert('Error', 'Failed to fetch tickets: ' + error.message)
      setTickets([]) // Clear tickets on error
    } finally {
      setLoading(false) // Stop loading indicator
    }
  }

  // Geocode address using Google Geocoding API
  const getGeocode = async ticket => {
    // Check if API key is available
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Geocoding skipped: Google Maps API Key is missing.')
      return null
    }
    if (!ticket || !ticket.address) {
      console.warn('Geocoding skipped: Invalid ticket or address provided.')
      return null
    }

    try {
      // Construct a more complete address string for better accuracy
      const addressParts = [
        ticket.address,
        ticket.city,
        ticket.state,
        ticket.zip,
      ]
        .filter(part => part && typeof part === 'string' && part.trim() !== '')
        .join(', ') // Filter out empty/invalid parts

      if (!addressParts) {
        console.warn(
          `Geocoding skipped for ticket ${ticket.id}: Address parts are empty.`
        )
        return null
      }

    
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          addressParts // Use the constructed address
        )}&key=${GOOGLE_MAPS_API_KEY}`
      )
      const data = await response.json()

      if (data.status === 'OK' && data.results.length > 0) {
        const loc = data.results[0].geometry.location
       
        return { latitude: loc.lat, longitude: loc.lng }
      } else {
        console.warn(
          `Geocoding failed for ${addressParts}. Status: ${data.status}`,
          data.error_message || ''
        )
        return null
      }
    } catch (error) {
      console.error(`Error getting geocode for ${ticket.address}:`, error)
      return null
    }
  }

  // Decode polyline from directions API response
  const decodePolyline = encoded => {
    // (Keep existing decodePolyline function - it's standard)
    let points = []
    let index = 0,
      lat = 0,
      lng = 0
    while (index < encoded.length) {
      let b,
        shift = 0,
        result = 0
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      let dlat = result & 1 ? ~(result >> 1) : result >> 1
      lat += dlat
      shift = 0
      result = 0
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      let dlng = result & 1 ? ~(result >> 1) : result >> 1
      lng += dlng
      points.push({ latitude: lat / 1e5, longitude: lng / 1e5 })
    }
    return points
  }

  // Fetch driving route using Google Directions API
  useEffect(() => {
    const fetchRoute = async () => {
      // Ensure API key, location, and at least one ticket coordinate exist
      if (
        !GOOGLE_MAPS_API_KEY ||
        !location ||
        tickets.length === 0 ||
        !tickets.some(t => t.coordinates)
      ) {
       
        setRouteCoords([]) // Clear existing route if conditions not met
        // Set ordered tickets based on schedule if not optimizing
        if (!optimizeRoute) {
          const scheduled = [...tickets].sort(
            (a, b) => new Date(a.startDate) - new Date(b.startDate) // Ensure startDate is valid Date object or parseable
          )
          setOrderedTickets(scheduled)
        } else {
          setOrderedTickets(tickets) // Default to original order if optimization skipped
        }
        return
      }

      const validTicketCoords = tickets.filter(t => t.coordinates)
      if (validTicketCoords.length === 0) {
     
        setRouteCoords([])
        setOrderedTickets(tickets)
        return
      }

      const origin = `${location.latitude},${location.longitude}`
      // Use only valid coordinates for waypoints
      const waypointsStr = validTicketCoords
        .map(
          ticket =>
            `${ticket.coordinates.latitude},${ticket.coordinates.longitude}`
        )
        .join('|')

      // Conditionally add optimize parameter
      const waypointsParam = optimizeRoute
        ? `optimize:true|${waypointsStr}`
        : waypointsStr

      const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${origin}&waypoints=${waypointsParam}&key=${GOOGLE_MAPS_API_KEY}`


      try {
        const response = await fetch(directionsUrl)
        const data = await response.json()

        if (data.status === 'OK' && data.routes && data.routes.length > 0) {
          const route = data.routes[0]
          const encodedPolyline = route.overview_polyline.points
          const coords = decodePolyline(encodedPolyline)
          setRouteCoords(coords)

          // Handle waypoint order
          if (
            optimizeRoute &&
            route.waypoint_order?.length === validTicketCoords.length
          ) {
            const order = route.waypoint_order
            const optimized = order.map(idx => validTicketCoords[idx])
            setOrderedTickets(optimized)
          } else {
            // If not optimizing or order doesn't match, use scheduled order
            const scheduled = [...validTicketCoords].sort((a, b) => {
              // Robust date comparison
              const dateA = a.startDate?.toDate
                ? a.startDate.toDate()
                : new Date(a.startDate)
              const dateB = b.startDate?.toDate
                ? b.startDate.toDate()
                : new Date(b.startDate)
              if (!isNaN(dateA) && !isNaN(dateB)) {
                return dateA - dateB
              }
              return 0 // Keep original order if dates are invalid
            })
            setOrderedTickets(scheduled)
          }
        } else {
          console.warn(
            'Failed to fetch directions:',
            data.status,
            data.error_message || ''
          )
          Alert.alert(
            'Route Error',
            `Could not calculate route: ${data.error_message || data.status}`
          )
          setRouteCoords([]) // Clear route on error
          // Fallback to scheduled order on error
          const scheduled = [...validTicketCoords].sort(
            (a, b) => new Date(a.startDate) - new Date(b.startDate)
          )
          setOrderedTickets(scheduled)
        }
      } catch (error) {
        console.error('Error fetching directions:', error)
        Alert.alert('Network Error', 'Failed to fetch route directions.')
        setRouteCoords([])
        // Fallback to scheduled order on error
        const scheduled = [...validTicketCoords].sort(
          (a, b) => new Date(a.startDate) - new Date(b.startDate)
        )
        setOrderedTickets(scheduled)
      }
    }
    fetchRoute()
  }, [tickets, location, optimizeRoute, GOOGLE_MAPS_API_KEY]) // Add key as dependency

  // Fit map to markers when tickets change
  useEffect(() => {
    if (tickets.length > 0 && mapRef.current) {
      const coordinatesToFit = tickets
        .map(ticket => ticket.coordinates)
        .filter(coord => coord !== null) // Filter out null coordinates

      // Include user's location if available
      if (location && location.latitude && location.longitude) {
        coordinatesToFit.push({
          latitude: location.latitude,
          longitude: location.longitude,
        })
      }

      if (coordinatesToFit.length > 0) {
        mapRef.current.fitToCoordinates(coordinatesToFit, {
          edgePadding: {
            top: headerHeight + 20,
            right: 60,
            bottom: 100,
            left: 60,
          }, // Adjust padding dynamically
          animated: true,
        })
      } else if (location) {
        // If only user location is available, center on it
        mapRef.current.animateToRegion(
          {
            ...location,
            latitudeDelta: 0.1, // Zoom in a bit more
            longitudeDelta: 0.1,
          },
          1000
        )
      }
    }
  }, [tickets, location, headerHeight]) // Re-fit when headerHeight changes too

  // Build order map for marker numbering based on the current order
  const orderMap = {}
  orderedTickets.forEach((ticket, index) => {
    if (ticket?.id) {
      // Check if ticket and id exist
      orderMap[ticket.id] = index + 1
    }
  })

  // Initialization effect
  useEffect(() => {
    getUserLocation() // Fetch location first
    // Fetching tickets now happens after location is potentially set
  }, []) // Run only once on mount

  // Effect to fetch tickets when selectedDate changes OR after initial location is set
  useEffect(() => {
    if (location) {
      // Only fetch tickets once we have a location (even default)
      const dateToUse = selectedDate ? new Date(selectedDate) : new Date()
      fetchTicketsForDate(dateToUse)
    }
  }, [selectedDate, location]) // Trigger fetch when date or location changes

  return (
    <View style={styles.container}>
      <HeaderWithOptions
        title="Daily Route Map" // More descriptive title
        onBack={() => router.back()}
        options={[]} // Add options if needed later (e.g., refresh)
        onHeightChange={height => setHeaderHeight(height)}
      />
      {/* Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={
          location || {
            // Default initial region if location is still null
            latitude: 28.18, // Approx Trinity, FL
            longitude: -82.67,
            latitudeDelta: 1.5,
            longitudeDelta: 1.5,
          }
        }
        showsUserLocation={true} // Show the device's blue dot
        showsMyLocationButton={false} // Hide default button, manage zoom manually
      >
        {/* Don't need a separate marker for user location if showsUserLocation is true */}
        {/* {location && (
              <Marker coordinate={location} title="Your Location" pinColor="blue" />
            )} */}

        {/* Ticket Markers */}
        {tickets.map(ticket => {
          // Ensure coordinates exist before rendering marker
          if (!ticket.coordinates) return null
          const markerIndex = orderMap[ticket.id]
          return (
            <Marker
              key={ticket.id}
              coordinate={ticket.coordinates}
              title={ticket.customerName || 'Ticket Location'}
              description={ticket.address}
              pinColor={markerIndex ? '#1DA1F2' : '#FF5733'} // Different color if not in ordered route?
              onCalloutPress={() => {
                /* Optional: Navigate to ticket details */
              }}
            >
              {/* Custom marker view with number */}
              {markerIndex && (
                <View style={styles.customMarker}>
                  <Text style={styles.markerNumber}>{markerIndex}</Text>
                </View>
              )}
              {/* Default pin is used if no custom view or index */}
            </Marker>
          )
        })}

        {/* Route Polyline */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#007BFF" // Blue route line
            strokeWidth={4} // Slightly thicker line
          />
        )}
      </MapView>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading Map Data...</Text>
        </View>
      )}

      {/* No Tickets Message */}
      {tickets.length === 0 && !loading && (
        <View style={styles.noTicketsContainer}>
          <Text style={styles.noTicketsText}>
            No scheduled tickets found for{' '}
            {selectedDate
              ? new Date(selectedDate).toLocaleDateString()
              : 'this date'}
            .
          </Text>
        </View>
      )}

      {/* Details Bottom Sheet Button */}
      {tickets.length > 0 && ( // Only show button if there are tickets
        <View style={[styles.buttonContainer, { bottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => setShowDetailsSheet(true)}
          >
            <Text style={styles.detailsButtonText}>Route Details</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Toggle Route Order Button */}
      {tickets.length > 1 && ( // Only show toggle if more than 1 ticket
        <View style={[styles.switchContainer, { top: headerHeight + 15 }]}>
          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setOptimizeRoute(!optimizeRoute)}
          >
            <Text style={styles.switchButtonText}>
              {optimizeRoute ? 'Show Scheduled Order' : 'Optimize Route'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.switchLabel}>
            (Currently: {optimizeRoute ? 'Optimized' : 'Scheduled'})
          </Text>
        </View>
      )}

      {/* Redesigned Bottom Sheet for Details */}
      <Modal
        visible={showDetailsSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDetailsSheet(false)}
      >
        <TouchableOpacity // Make overlay dismissable
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPressOut={() => setShowDetailsSheet(false)} // Dismiss on press outside sheet
        >
          <View
            style={styles.sheetContainer}
            onStartShouldSetResponder={() => true}
          >
            {' '}
            // Prevent taps inside sheet from closing it
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                Route Order ({optimizeRoute ? 'Optimized' : 'Scheduled'})
              </Text>
              <TouchableOpacity
                onPress={() => setShowDetailsSheet(false)}
                style={styles.sheetCloseButton}
              >
                <Text style={styles.sheetCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.sheetContent}>
              {orderedTickets.length > 0 ? (
                orderedTickets.map((ticket, index) => (
                  <TouchableOpacity
                    key={ticket.id}
                    style={styles.ticketDetail}
                    onPress={() => {
                      // Optional: Navigate to ticket details screen
                      // router.push(`/ticket/${ticket.id}`);
                      setShowDetailsSheet(false) // Close sheet on press
                    }}
                  >
                    <View style={styles.ticketIndexContainer}>
                      <Text style={styles.ticketIndex}>{index + 1}</Text>
                    </View>
                    <View style={styles.ticketInfo}>
                      <Text style={styles.ticketName} numberOfLines={1}>
                        {ticket.customerName || 'Unknown Customer'}
                      </Text>
                      <Text style={styles.ticketAddress} numberOfLines={1}>
                        {ticket.address || 'No Address'}
                      </Text>
                      {/* Optional: Add time if available */}
                      {/* <Text style={styles.ticketTime}>{ticket.startTime || ''}</Text> */}
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noTicketsText}>
                  No tickets to display in the route.
                </Text>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

export default TicketsMapScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5', // Background for areas outside map
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10, // Ensure it's above the map
  },
  loadingText: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 16,
  },
  customMarker: {
    backgroundColor: '#007BFF', // Primary color
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 12, // More rounded
    borderColor: '#FFFFFF',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerNumber: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  noTicketsContainer: {
    position: 'absolute',
    top: '50%',
    left: '10%',
    right: '10%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // Semi-transparent white
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  noTicketsText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonContainer: {
    position: 'absolute',
    alignSelf: 'center', // Center the button horizontally
    // bottom: 30, // Adjusted based on insets
  },
  detailsButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25, // Pill shape
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  detailsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchContainer: {
    position: 'absolute',
    left: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20, // Rounded corners
    padding: 5,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  switchButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginRight: 5,
  },
  switchButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  switchLabel: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    paddingHorizontal: 5,
  },
  // Bottom Sheet Styles
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)', // Darker overlay
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20, // More pronounced radius
    borderTopRightRadius: 20,
    maxHeight: '60%', // Max height constraint
    paddingBottom: 10, // Padding at the very bottom
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 }, // Shadow for depth
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA', // Lighter border
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold', // Bolder title
    color: '#14171A',
  },
  sheetCloseButton: {
    // Removed background, use text/icon button
    padding: 8, // Padding for touch area
  },
  sheetCloseButtonText: {
    color: '#007BFF', // Use theme color for text
    fontSize: 16,
    fontWeight: '600',
  },
  sheetContent: {
    paddingHorizontal: 10, // Horizontal padding for content
    paddingTop: 10,
  },
  ticketDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8', // Slightly off-white background
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  ticketIndexContainer: {
    backgroundColor: '#007BFF',
    borderRadius: 15, // Circular background for index
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ticketIndex: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text on blue background
  },
  ticketInfo: {
    flex: 1, // Take remaining space
  },
  ticketName: {
    fontSize: 15,
    fontWeight: '600', // Semi-bold name
    color: '#333333',
    marginBottom: 2,
  },
  ticketAddress: {
    fontSize: 13,
    color: '#666666', // Lighter color for address
  },
  // ticketTime: { // Optional styling for time
  //   fontSize: 12,
  //   color: '#888888',
  //   marginTop: 2,
  // },
})
