import React from 'react'
import { View, Text, TouchableOpacity, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { styles } from '../../styles'

const Step1DateTime = ({
  selectedDate,
  startTime,
  endTime,
  showDatePicker,
  showStartTimePicker,
  showEndTimePicker,
  handleDateChange,
  handleStartTimeChange,
  handleEndTimeChange,
  setShowDatePicker,
  setShowStartTimePicker,
  setShowEndTimePicker,
  formatDate,
  formatTime,
}) => (
  <View style={styles.card}>
    <Text style={styles.sectionTitle}>Date & Time</Text>
    <View style={styles.dateTimeSection}>
      <Text style={styles.label}>Date:</Text>
      <TouchableOpacity
        onPress={() => setShowDatePicker(true)}
        style={styles.dateTimeButton}
      >
        <Text style={styles.dateTimeText}>{formatDate(selectedDate)}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleDateChange}
        />
      )}

      <Text style={styles.label}>Start Time:</Text>
      <TouchableOpacity
        onPress={() => setShowStartTimePicker(true)}
        style={styles.dateTimeButton}
      >
        <Text style={styles.dateTimeText}>{formatTime(startTime)}</Text>
      </TouchableOpacity>
      {showStartTimePicker && (
        <DateTimePicker
          value={startTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleStartTimeChange}
          minuteInterval={15}
        />
      )}

      <Text style={styles.label}>End Time:</Text>
      <TouchableOpacity
        onPress={() => setShowEndTimePicker(true)}
        style={styles.dateTimeButton}
      >
        <Text style={styles.dateTimeText}>{formatTime(endTime)}</Text>
      </TouchableOpacity>
      {showEndTimePicker && (
        <DateTimePicker
          value={endTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleEndTimeChange}
          minuteInterval={15}
        />
      )}
    </View>
  </View>
)

export default Step1DateTime
