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
import { CustomCalendar } from '@/components/CustomCalander'

const TicketsScreen = () => {
  const { setProjectId } = useProjectStore()
  const [allTickets, setAllTickets] = useState([])
  const [displayedTickets, setDisplayedTickets] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCustomCalendarVisible, setIsCustomCalendarVisible] = useState(false) // State for custom calendar
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
      orderBy('startTime', 'asc')
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
      }
    )
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    let filtered = [...allTickets]
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase()
      filtered = filtered.filter(ticket => {
        const address = ticket.address?.toLowerCase() || ''
        return address.includes(queryLower)
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
        if (!ticket.startTime) return false
        const t = ticket.startTime.toDate
          ? ticket.startTime.toDate()
          : new Date(ticket.startTime)
        return t >= startOfDay && t <= endOfDay
      })
    }

    // Updated sort logic with 'returnNeeded'
    if (sortOption === 'remediationRequired') {
      filtered = filtered.filter(t => t.remediationRequired === true)
    } else if (sortOption === 'equipmentOnSite') {
      filtered = filtered.filter(t => t.equipmentOnSite === true)
    } else if (sortOption === 'returnNeeded') {
      filtered = filtered.filter(t => t.status === 'Return Needed')
    }

    setDisplayedTickets(filtered)
  }, [allTickets, searchQuery, selectedDate, sortOption])

  const clearFilter = () => {
    setSortOption(null)
  }

  const isClearDisabled = !sortOption

  const handleDatePress = () => {
    setIsCustomCalendarVisible(true)
  }

  const handleCustomDateChange = date => {
    setSelectedDate(date)
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
          showDatePicker={false} // No longer using the built-in picker directly
          setShowDatePicker={() => {}} // Dummy function
          onDatePickerChange={() => {}} // Dummy function
          sortOption={sortOption}
          setSortOption={setSortOption}
          clearFilter={clearFilter}
          isClearDisabled={isClearDisabled}
          onHeightChange={height => setHeaderHeight(height)}
          iconColor="#333"
          onDatePress={handleDatePress} // Pass the handler to show custom calendar
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
        >
          {isLoading ? (
            <Text>Loading tickets...</Text>
          ) : displayedTickets.length > 0 ? (
            displayedTickets.map((ticket, index) => {
              const ticketKey = ticket.id || `ticket-${index}`
              const containerStyle =
                index % 2 === 0
                  ? 'rgba(245,248,250,0.8)'
                  : 'rgba(255,255,255,0.8)'
              const timeColor = '#0D47A1'
              return (
                <View key={ticketKey}>
                  <TicketCard
                    ticket={ticket}
                    onPress={() => {
                      setProjectId(ticket.id)
                      router.push('/TicketDetailsScreen')
                    }}
                    backgroundColor={containerStyle}
                    timeColor={timeColor}
                  />
                </View>
              )
            })
          ) : (
            <Text style={styles.noTicketsText}>
              No tickets match your criteria.
            </Text>
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

        <View style={{ position: 'absolute', right: 24, bottom: 110 }}>
          <FloatingButton
            onPress={() => router.push('/CreateTicketScreen')}
            title="Ticket"
            animatedOpacity={floatingOpacity}
            iconName="plus.circle"
            size={32}
          />
        </View>
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
    paddingBottom: 100,
  },
  noTicketsText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
})
