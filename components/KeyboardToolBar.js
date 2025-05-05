import React from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'

const KeyboardToolBar = ({ onPrevious, onNext, onDone }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onPrevious} style={styles.button}>
        <Text style={styles.text}>Previous</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onNext} style={styles.button}>
        <Text style={styles.text}>Next</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDone} style={styles.button}>
        <Text style={styles.text}>Done</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EEE',
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
  button: {
    padding: 8,
  },
  text: {
    fontSize: 16,
    color: '#2980b9',
  },
})

export default KeyboardToolBar
