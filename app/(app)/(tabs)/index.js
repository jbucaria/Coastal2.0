'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Animated,
  View,
  ImageBackground,
  Text,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { router } from 'expo-router'
import { TicketCard } from '@/components/TicketCard'
import { FloatingButton } from '@/components/FloatingButton'
import useProjectStore from '@/store/useProjectStore'
import { TicketsHeader } from '@/components/TicketHeader'
import { CustomCalendar } from '@/components/CustomCalander' // Assuming CustomCalander is the correct spelling

const TicketsScreen = () => {
  const { setProjectId } = useProjectStore()
  const [allTickets, setAllTickets] = useState([])
  const [displayedTickets, setDisplayedTickets] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCustomCalendarVisible, setIsCustomCalendarVisible] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0)

  const scrollY = useRef(new Animated.Value(0)).current
  const floatingOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  useEffect(() => {
    const baseQuery = query(
      collection(firestore, 'tickets'),
      orderBy('startTime', 'asc') // Or consider a more neutral default sort if needed
    )
    const unsubscribe = onSnapshot(
      baseQuery,
      snapshot => {
        const tickets = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        setAllTickets(tickets)
        setIsLoading(false)
      },
      error => {
        console.error('Error fetching tickets:', error)
        setIsLoading(false) // Ensure loading stops on error
      }
    )
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    let filtered = [...allTickets]
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase()
      filtered = filtered.filter(ticket => {
        // Ensure address and other searchable fields are checked
        const address = `${ticket.street || ''} ${ticket.city || ''} ${
          ticket.state || ''
        } ${ticket.zip || ''}`.toLowerCase()
        const clientName = ticket.clientName?.toLowerCase() || ''
        const ticketNumber = ticket.ticketNumber?.toLowerCase() || ''
        return (
          address.includes(queryLower) ||
          clientName.includes(queryLower) ||
          ticketNumber.includes(queryLower)
        )
      })
    } else {
      const startOfDay = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        0,
        0,
        0
      )
      const endOfDay = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        23,
        59,
        59,
        999
      )
      filtered = filtered.filter(ticket => {
        let matchesStartTime = false
        if (ticket.startTime) {
          const t = ticket.startTime.toDate
            ? ticket.startTime.toDate()
            : new Date(ticket.startTime)
          matchesStartTime = t >= startOfDay && t <= endOfDay
        }

        let matchesReturnDate = false
        if (ticket.returnDate) {
          const r = ticket.returnDate.toDate
            ? ticket.returnDate.toDate()
            : new Date(ticket.returnDate)
          matchesReturnDate = r >= startOfDay && r <= endOfDay
        }

        return matchesStartTime || matchesReturnDate
      })
    }

    // Updated sort logic with 'returnNeeded'
    if (sortOption === 'remediationRequired') {
      filtered = filtered.filter(t => t.remediationRequired === true)
    } else if (sortOption === 'equipmentOnSite') {
      filtered = filtered.filter(t => t.equipmentOnSite === true)
    } else if (sortOption === 'returnNeeded') {
      // This will further filter the date-matched or search-matched tickets
      filtered = filtered.filter(t => t.status === 'Return Needed')
    }
    // You might want to add a default sort here if no sortOption is active,
    // e.g., by startTime, after the primary filtering.
    // For example:
    // else {
    //   filtered.sort((a, b) => {
    //     const timeA = a.startTime?.toDate ? a.startTime.toDate() : new Date(a.startTime || 0);
    //     const timeB = b.startTime?.toDate ? b.startTime.toDate() : new Date(b.startTime || 0);
    //     return timeA - timeB;
    //   });
    // }

    setDisplayedTickets(filtered)
  }, [allTickets, searchQuery, selectedDate, sortOption])

  const clearFilter = () => {
    setSortOption(null)
    // Optionally, you might want to reset searchQuery or selectedDate here
    // depending on the desired UX for "Clear Filter"
  }

  const isClearDisabled =
    !sortOption &&
    !searchQuery &&
    selectedDate.toDateString() === new Date().toDateString()

  const handleDatePress = () => {
    setIsCustomCalendarVisible(true)
  }

  const handleCustomDateChange = date => {
    setSelectedDate(date)
    setSearchQuery('') // Clear search query when a new date is selected
    setIsCustomCalendarVisible(false)
  }

  const handleCloseCustomCalendar = () => {
    setIsCustomCalendarVisible(false)
  }

  return (
    <ImageBackground
      source={require('@/assets/images/bg-logo.png')}
      style={styles.backgroundImage}
      imageStyle={{
        resizeMode: 'cover',
        opacity: 0.1,
        transform: [{ scale: 1.8 }],
      }}
    >
      <View style={styles.fullScreenContainer}>
        <TicketsHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedDate={selectedDate}
          showDatePicker={false}
          setShowDatePicker={() => {}}
          onDatePickerChange={() => {}}
          sortOption={sortOption}
          setSortOption={setSortOption}
          clearFilter={clearFilter}
          isClearDisabled={isClearDisabled}
          onHeightChange={height => setHeaderHeight(height)}
          iconColor="#333"
          onDatePress={handleDatePress}
        />
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollViewContent,
            { paddingTop: headerHeight },
          ]}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled" // Good for scrollviews with inputs/buttons
        >
          {isLoading ? (
            <View style={styles.centeredMessageContainer}>
              <Text>Loading tickets...</Text>
            </View>
          ) : displayedTickets.length > 0 ? (
            displayedTickets.map((ticket, index) => {
              const ticketKey = ticket.id || `ticket-${index}`
              // Ensure TicketCard can handle potentially missing fields in ticket object
              return (
                <View key={ticketKey}>
                  <TicketCard
                    ticket={ticket}
                    onPress={() => {
                      setProjectId(ticket.id)
                      router.push('/TicketDetailsScreen')
                    }}
                    // backgroundColor and timeColor are hardcoded, TicketCard should handle defaults if needed
                  />
                </View>
              )
            })
          ) : (
            <View style={styles.centeredMessageContainer}>
              <Text style={styles.noTicketsText}>
                No tickets match your criteria.
              </Text>
            </View>
          )}
        </Animated.ScrollView>

        <Modal
          visible={isCustomCalendarVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCloseCustomCalendar}
        >
          <View style={styles.modalOverlay}>
            <CustomCalendar
              selectedDate={selectedDate}
              onDateChange={handleCustomDateChange}
              onClose={handleCloseCustomCalendar}
            />
          </View>
        </Modal>

        {/* Floating Action Button */}
        <Animated.View
          style={{
            position: 'absolute',
            right: 24,
            bottom: Platform.OS === 'ios' ? 80 : 60,
            opacity: floatingOpacity,
          }}
        >
          <FloatingButton
            onPress={() => router.push('/CreateTicketScreen')}
            title="Ticket"
            // animatedOpacity={floatingOpacity} // Pass opacity directly if FloatingButton supports it, or wrap it. Here it's on the parent View.
            iconName="plus.circle" // Ensure this icon name is valid for your Icon component
            size={32}
          />
        </Animated.View>
      </View>
    </ImageBackground>
  )
}

export default TicketsScreen

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundImage: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 120, // Increased padding for FAB
  },
  centeredMessageContainer: {
    // Added for centering loading/no tickets text
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50, // Give some space from the header
  },
  noTicketsText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Slightly darker overlay
  },
})
