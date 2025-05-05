import * as FileSystem from 'expo-file-system'
import * as MediaLibrary from 'expo-media-library'
import { Alert } from 'react-native'

export const handleDownloadPhotos = async (
  selectedReport,
  setIsDownloading,
  setDownloadProgress
) => {
  if (
    !selectedReport ||
    !selectedReport.photos ||
    selectedReport.photos.length === 0
  ) {
    Alert.alert('Error', 'No photos available for this report')
    return
  }

  const { status } = await MediaLibrary.requestPermissionsAsync()
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'App needs photo library permission to save images.'
    )
    return
  }

  setIsDownloading(true)
  setDownloadProgress(0)
  try {
    let downloadedPhotos = 0
    const updateProgress = setInterval(() => {
      setDownloadProgress(
        Math.min(
          100,
          (downloadedPhotos / selectedReport.photos.length) * 100 +
            Math.random() * 10
        )
      )
    }, 500)

    for (let i = 0; i < selectedReport.photos.length; i++) {
      const photo = selectedReport.photos[i]
      const localFileName = `${photo.label || 'photo'}_${i}.jpg`
      const localUri = FileSystem.documentDirectory + localFileName

      const downloadResult = await FileSystem.downloadAsync(photo.uri, localUri)
      console.log('Downloaded photo:', downloadResult.uri)

      await MediaLibrary.createAssetAsync(downloadResult.uri)
      downloadedPhotos++
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    clearInterval(updateProgress)
    setDownloadProgress(100)
    Alert.alert(
      'Saved to Library',
      `All ${selectedReport.photos.length} photo(s) have been saved to your photo library.`,
      [{ text: 'OK' }]
    )
  } catch (error) {
    console.error('Error saving photos:', error)
    Alert.alert('Error', 'Failed to save photos. Please try again.')
  } finally {
    setIsDownloading(false)
  }
}
