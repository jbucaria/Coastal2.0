import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'

export const pickImageAsync = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (status !== 'granted') {
    alert('Permission to access camera roll is required!')
    return null
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: false,
    allowsEditing: true,
    quality: 1,
  })

  if (!result.canceled) {
    const selectedPhotos = await Promise.all(
      (result.assets || [result]).map(async asset => {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        })
        return {
          uri: asset.uri,
          base64,
          label: '', // Add a label if required
        }
      })
    )
    return selectedPhotos
  } else {
    alert('You did not select any image.')
    return null
  }
}
