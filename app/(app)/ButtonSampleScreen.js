import React from 'react'
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import CustomButton from '@/components/CustomButton' // Confirm this path is correct

const ButtonSampleScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Button Samples</Text>
        <View style={styles.buttonGroup}>
          <CustomButton
            title="Primary Button"
            onPress={() => console.log('Primary Button Pressed')}
            variant="primary"
          />
        </View>
        <View style={styles.buttonGroup}>
          <CustomButton
            title="Secondary Button"
            onPress={() => console.log('Secondary Button Pressed')}
            variant="secondary"
          />
        </View>
        <View style={styles.buttonGroup}>
          <CustomButton
            title="Disabled Button"
            onPress={() => console.log('Disabled Button Pressed')}
            variant="primary"
            disabled
          />
        </View>
        <View style={styles.buttonGroup}>
          <CustomButton
            title="Success Button"
            onPress={() => console.log('Success Button Pressed')}
            variant="custom"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 28,
  },
  buttonGroup: {
    marginBottom: 20,
    width: '80%',
  },
})

export default ButtonSampleScreen
