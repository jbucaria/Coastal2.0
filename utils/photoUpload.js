// src/utils/photoUpload.js
import * as ImagePicker from 'expo-image-picker'
import { Alert } from 'react-native'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/firebaseConfig'
import { v4 as uuidv4 } from 'uuid'

export async function pickAndUploadPhotos({ folder, quality = 0.5 }) {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera roll permission is needed.')
      return []
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: 'images',
      quality,
    })
    if (result.canceled) return []
    if (result.assets && result.assets.length > 0) {
      const uploadPromises = result.assets.map(async asset => {
        const response = await fetch(asset.uri)
        const blob = await response.blob()
        const fileName = asset.fileName || `${uuidv4()}.jpg`
        const storagePath = `${folder}/${fileName}`
        const storageRef = ref(storage, storagePath)
        await uploadBytes(storageRef, blob)
        const downloadURL = await getDownloadURL(storageRef)
        return { storagePath, downloadURL }
      })
      return await Promise.all(uploadPromises)
    }
    return []
  } catch (error) {
    console.error('Error uploading photos:', error)
    Alert.alert('Error', 'Could not upload photos. Please try again.')
    return []
  }
}
