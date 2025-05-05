import React from 'react'
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native'
import { IconSymbol } from '@/components/ui/IconSymbol' // or your preferred icon component

const ETAButton = ({ eta, onPress, status }) => {
  // Choose a background color based on status
  const backgroundColor = status === 'delayed' ? '#F39C12' : '#17BF63'

  return (
    <TouchableOpacity
      style={[styles.etaButton, { backgroundColor }]}
      onPress={onPress}
    >
      <View style={styles.leftGroup}>
        <IconSymbol name="clock" size={16} color="#fff" />
        <Text style={styles.timeText}>{eta || 'N/A'}</Text>
      </View>
      <Text style={styles.rightText}>ETA</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  etaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Distributes the left group and right text evenly
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 2,
    elevation: 2,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    marginLeft: 4,
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  rightText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
})

export { ETAButton }
