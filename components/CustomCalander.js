import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { enUS } from 'date-fns/locale'

import Ionicons from '@expo/vector-icons/Ionicons'

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const CustomCalendar = ({ selectedDate, onDateChange, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate))

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
    onClose() // Close the calendar after selecting a date
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
          {format(currentMonth, 'MMMM yyyy', { locale: enUS })}
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
          const isSelected =
            format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
          const isToday =
            format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
          return (
            <TouchableOpacity
              key={format(day, 'yyyy-MM-dd')}
              style={[
                styles.dayContainer,
                isSelected && styles.selectedDayContainer,
                isToday && styles.todayContainer,
              ]}
              onPress={() => handleDayPress(day)}
            >
              <Text
                style={[
                  styles.dayText,
                  isSelected && styles.selectedDayText,
                  isToday && styles.todayText,
                ]}
              >
                {format(day, 'd')}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  daysOfWeek: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  dayOfWeekText: {
    fontSize: 14,
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayContainer: {
    width: '14.28%', // To fit 7 days in a row
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  dayText: {
    fontSize: 16,
    color: '#333',
  },
  selectedDayContainer: {
    backgroundColor: '#0073BC',
    borderRadius: 8,
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  todayContainer: {
    borderWidth: 1,
    borderColor: '#F39C12',
    borderRadius: 8,
  },
  todayText: {
    color: '#F39C12',
  },
  closeButton: {
    backgroundColor: '#F39C12',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
})

export { CustomCalendar }
