import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { IconSymbol } from '@/components/ui/IconSymbol'

const MessageIndicator = ({ count, color, name, size }) => {
  return (
    <View style={styles.badgeContainer}>
      <IconSymbol name={name} size={size} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  badgeContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
})

export { MessageIndicator }
