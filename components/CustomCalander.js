// CustomCalendar.js
'use client'

import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isEqual,
  isToday as fnsIsToday,
} from 'date-fns' // Added isEqual
import { enUS } from 'date-fns/locale'

import Ionicons from '@expo/vector-icons/Ionicons'

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const CustomCalendar = ({
  selectedDate,
  onDateChange,
  onClose, // Prop for the action of the explicit "Close" button
  showExplicitCloseButton = true, // New prop to control visibility of the calendar's own "Close" button
  autoCloseOnDateSelect = true, // New prop to control if selecting a date calls onClose
}) => {
  const [currentMonth, setCurrentMonth] = useState(
    startOfMonth(selectedDate || new Date())
  ) // Ensure selectedDate has a fallback

  const prevMonth = () => {
    setCurrentMonth(
      startOfMonth(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
      )
    )
  }

  const nextMonth = () => {
    setCurrentMonth(
      startOfMonth(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
      )
    )
  }

  const handleDayPress = day => {
    onDateChange(day)
    if (autoCloseOnDateSelect && onClose) {
      // Only call onClose if configured
      onClose()
    }
  }

  const start = startOfMonth(currentMonth)
  const end = endOfMonth(currentMonth)
  const calendarDays = eachDayOfInterval({ start, end })

  const firstDayOfMonth = start.getDay()
  const emptyDaysAtStart = Array.from({ length: firstDayOfMonth }, (_, i) => i)

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={prevMonth}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {format(currentMonth, 'MMMM yyyy', { locale: enUS })}{' '}
          {/* Corrected format string */}
        </Text>
        <TouchableOpacity onPress={nextMonth}>
          <Ionicons name="arrow-forward" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.daysOfWeek}>
        {daysOfWeek.map(day => (
          <Text key={day} style={styles.dayOfWeekText}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {emptyDaysAtStart.map(i => (
          <View key={`empty-${i}`} style={styles.dayContainer} />
        ))}
        {calendarDays.map(day => {
          // More robust check for selected and today
          const dayFormatted = format(day, 'yyyy-MM-dd')
          const selectedDateFormatted = selectedDate
            ? format(selectedDate, 'yyyy-MM-dd')
            : null
          const todayFormatted = format(new Date(), 'yyyy-MM-dd')

          const isSelected =
            selectedDateFormatted && dayFormatted === selectedDateFormatted
          const isTodayDate = dayFormatted === todayFormatted

          return (
            <TouchableOpacity
              key={dayFormatted}
              style={[
                styles.dayContainer,
                isSelected && styles.selectedDayContainer,
                isTodayDate && !isSelected && styles.todayContainer, // Apply today style only if not selected
              ]}
              onPress={() => handleDayPress(day)}
            >
              <Text
                style={[
                  styles.dayText,
                  isSelected && styles.selectedDayText,
                  isTodayDate && !isSelected && styles.todayText, // Apply today style only if not selected
                ]}
              >
                {format(day, 'd')}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Conditionally render the calendar's own Close button */}
      {showExplicitCloseButton && onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close Calendar</Text>{' '}
          {/* More specific text */}
        </TouchableOpacity>
      )}
    </View>
  )
}

// Keep your existing styles, but here are some suggestions for compactness if needed:
const styles = StyleSheet.create({
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10, // Reduced padding
    // margin: 20, // Margin will be handled by the modal view using this calendar
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    width: '100%', // Make it take the width of its container in the modal
    maxWidth: 340, // Max width if needed
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10, // Reduced margin
  },
  monthText: {
    fontSize: 17, // Slightly smaller
    fontWeight: 'bold',
    color: '#333',
  },
  daysOfWeek: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6, // Reduced margin
  },
  dayOfWeekText: {
    fontSize: 12, // Smaller
    color: '#666',
    width: `${100 / 7}%`, // Ensure equal width
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayContainer: {
    width: `${100 / 7}%`,
    aspectRatio: 1.1, // Adjust aspect ratio for cell height
    justifyContent: 'center',
    alignItems: 'center',
    padding: 1, // Minimal padding
  },
  dayText: {
    fontSize: 14, // Slightly smaller
    color: '#333',
  },
  selectedDayContainer: {
    backgroundColor: '#0073BC', // Your selection color
    borderRadius: 20, // Make it circular or more rounded
    // Ensure the container size doesn't change drastically, or use a fixed size for day cells
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  todayContainer: {
    // Style for today, only if not selected
    // backgroundColor: '#FFF3E0', // A light highlight for today
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F39C12', // Your "today" color
  },
  todayText: {
    // Style for today's text, only if not selected
    color: '#F39C12', // Your "today" color
    // fontWeight: 'bold',
  },
  closeButton: {
    // This is the calendar's own explicit close button
    backgroundColor: '#6c757d', // Grey, less prominent than main actions
    paddingVertical: 10, // Smaller padding
    paddingHorizontal: 15,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12, // Reduced margin
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '500', // Medium weight
    fontSize: 14, // Smaller
  },
})

export { CustomCalendar }
