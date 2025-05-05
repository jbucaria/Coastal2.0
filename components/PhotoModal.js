import React, { useState, useEffect } from 'react'
import {
  Modal,
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Text,
  Image,
} from 'react-native'
import PinchZoomImage from './PinchZoomImage' // adjust the path as needed

const PhotoModal = ({ visible, photo, onClose }) => {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (visible && photo) {
      setIsLoading(true)
      Image.getSize(
        photo,
        (width, height) => {
          setIsLoading(false)
        },
        error => {
          setIsLoading(false)
        }
      )
    }
  }, [visible, photo])

  const onImageLoad = event => {
    console.log('Image loaded successfully', event.nativeEvent)
  }

  const onImageLoadError = error => {
    setIsLoading(false)
    console.error('Image failed to load:', error)
  }

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.photoModalBackground}>
        <TouchableOpacity
          style={styles.photoModalTouchable}
          onPress={onClose}
          activeOpacity={1}
        >
          <View style={styles.photoModalContent}>
            {isLoading && (
              <ActivityIndicator
                size="large"
                color="#0000ff"
                style={styles.loadingIndicator}
              />
            )}
            {photo ? (
              <PinchZoomImage
                photo={photo}
                onLoad={onImageLoad}
                onError={onImageLoadError}
              />
            ) : (
              <Text style={styles.photoLoadingText}>No Photo Available</Text>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

export { PhotoModal }

const styles = StyleSheet.create({
  photoModalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  photoModalTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalContent: {
    width: '90%',
    height: '90%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoLoadingText: {
    color: 'white',
    fontSize: 18,
  },
  loadingIndicator: {
    position: 'absolute',
    zIndex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
  },
})
