import React from 'react'
import { ScrollView, Image, Dimensions, StyleSheet } from 'react-native'

const { width, height } = Dimensions.get('window')

const PinchZoomImage = ({ photo, onLoad, onError }) => {
  return (
    <ScrollView
      style={styles.container}
      maximumZoomScale={3}
      minimumZoomScale={1}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      <Image
        source={{ uri: photo }}
        style={styles.image}
        resizeMode="contain"
        onLoad={onLoad}
        onError={onError}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: width * 0.8, // 80% of screen width
    height: height * 0.8, // 80% of screen height
  },
})

export default PinchZoomImage
