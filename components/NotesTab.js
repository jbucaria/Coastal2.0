import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

const NotesTab = () => {
  return (
    <View style={styles.tabContainer}>
      <Text style={styles.tabText}>Notes</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  tabContainer: {
    position: 'absolute', // Keeps the tab fixed in place
    top: '50%', // Centers the tab vertically in the middle of the screen
    right: 0, // Places the tab on the right edge of the screen
    transform: [{ translateY: -25 }, { rotate: '90deg' }], // Rotates the text vertically and adjusts for centering
    backgroundColor: '#3498db', // Tab background color
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    elevation: 5, // Optional: Adds shadow for floating effect
  },
  tabText: {
    fontSize: 16,
    color: '#fff', // Text color
    fontWeight: 'bold',
    textAlign: 'center', // Centers the text in the rotated box
  },
})
export { NotesTab }
