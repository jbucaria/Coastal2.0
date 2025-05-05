import * as ImagePicker from 'expo-image-picker'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '@/firebaseConfig' // adjust path to your firebase config

async function pickAndUploadImage() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== 'granted') {
    alert('We need camera roll permissions!')
    return
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 1,
  })

  if (result.canceled) {
    console.log('User canceled image picker')
    return
  }

  const uri = result.assets[0].uri
  console.log('Selected image URI:', uri)

  let blob
  try {
    const response = await fetch(uri)
    blob = await response.blob()
  } catch (fetchError) {
    console.error('Error fetching image file:', fetchError)
    return
  }

  const fileName = `images/${Date.now()}-photo.jpg`
  const imageRef = ref(storage, fileName)

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(imageRef, blob)

    uploadTask.on(
      'state_changed',
      snapshot => {
        // Track progress if needed
      },
      error => {
        console.error('Full upload error:', error)
        reject(error)
      },
      async () => {
        const downloadURL = await getDownloadURL(imageRef)
        console.log('File uploaded successfully:', downloadURL)
        resolve(downloadURL)
      }
    )
  })
}

export default pickAndUploadImage
