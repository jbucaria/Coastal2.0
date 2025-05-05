// PhotoGallery.js
import React from 'react'
import {
  ScrollView,
  View,
  Image,
  TouchableOpacity,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native'

const PhotoGallery = ({ photos, onRemovePhoto, onCommentChange }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.photosContainer}
  >
    {photos.map((photo, index) => (
      <View key={`${photo.downloadURL}-${index}`} style={styles.photoWrapper}>
        <Image source={{ uri: photo.downloadURL }} style={styles.photo} />
        <TouchableOpacity
          style={styles.removePhotoButton}
          onPress={() => onRemovePhoto(index)}
        >
          <Text style={styles.removePhotoText}>X</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.commentInput}
          placeholder="Add comment"
          value={photo.comment}
          onChangeText={text => onCommentChange && onCommentChange(index, text)}
          multiline
        />
      </View>
    ))}
  </ScrollView>
)

const styles = StyleSheet.create({
  photosContainer: {
    marginVertical: 5,
  },
  photoWrapper: {
    marginRight: 5,
    position: 'relative',
  },
  photo: {
    borderRadius: 5,
    height: 100,
    width: 100,
    marginBottom: 5,
  },
  removePhotoButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    height: 24,
    width: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 5,
    top: 5,
  },
  removePhotoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'red',
  },
  commentInput: {
    width: 100,
    minHeight: 40,
    borderColor: '#E1E8ED',
    borderWidth: 1,
    borderRadius: 4,
    padding: 4,
    fontSize: 12,
    marginTop: 4,
    color: '#14171A',
    backgroundColor: '#FFFFFF',
  },
})

export default PhotoGallery
