import React from 'react'
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native'
import { IconSymbol } from '@/components/ui/IconSymbol'
import * as Haptics from 'expo-haptics'

const FloatingButton = ({
  onPress,
  title,
  animatedOpacity,
  iconName,
  size,
}) => {
  const handlePressIn = event => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)
  }
  return (
    <Animated.View style={[styles.container, { opacity: animatedOpacity }]}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPress={onPress}
        style={styles.button}
      >
        <IconSymbol name={iconName} size={size || 24} color="#fff" />
        <Text style={styles.title}>{title}</Text>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    // This container wraps the button and applies the animated opacity
  },
  button: {
    backgroundColor: '#0073BC', // Change to your desired color
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    // You can add shadow or elevation here if needed
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
})

export { FloatingButton }
