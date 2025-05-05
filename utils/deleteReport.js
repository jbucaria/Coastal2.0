import { doc, deleteDoc } from 'firebase/firestore'
import { getStorage, ref, deleteObject } from 'firebase/storage'
import { firestore } from '@/firebaseConfig'
import { Alert } from 'react-native'

export const handleDeleteReport = async (
  selectedReport,
  setIsDeleting,
  setModalVisible
) => {
  if (!selectedReport) return

  Alert.alert(
    'Confirm Deletion',
    'Are you sure you want to delete this report and all its photos?',
    [
      {
        text: 'Cancel',
        onPress: () => console.log('Deletion cancelled'),
        style: 'cancel',
      },
      {
        text: 'OK',
        onPress: async () => {
          try {
            setIsDeleting(true)
            const storage = getStorage()
            const deletePromises = []
            if (selectedReport.photos && selectedReport.photos.length > 0) {
              for (let photo of selectedReport.photos) {
                if (photo.uri) {
                  let url = new URL(photo.uri)
                  let path = decodeURIComponent(
                    url.pathname.substring(url.pathname.indexOf('/o/') + 3)
                  )
                  path = path.split('?')[0]
                  const photoRef = ref(storage, path)
                  deletePromises.push(deleteObject(photoRef))
                }
              }
            }
            if (selectedReport.pdfDownloadURL) {
              const pdfUrl = new URL(selectedReport.pdfDownloadURL)
              let pdfPath = decodeURIComponent(
                pdfUrl.pathname.substring(pdfUrl.pathname.indexOf('/o/') + 3)
              )
              pdfPath = pdfPath.split('?')[0]
              const pdfRef = ref(storage, pdfPath)
              deletePromises.push(deleteObject(pdfRef))
            }
            await Promise.all(deletePromises)
            console.log('All files deleted successfully')

            const reportDocRef = doc(
              firestore,
              'projects',
              selectedReport.projectId
            )
            await deleteDoc(reportDocRef)
            console.log('Report document deleted successfully')

            Alert.alert(
              'Success',
              'The report and all associated files have been deleted.'
            )
            setModalVisible(false)
          } catch (error) {
            Alert.alert(
              'Error',
              'Failed to delete the report or its photos: ' + error.message
            )
            console.error('Deletion error:', error)
          } finally {
            setIsDeleting(false)
          }
        },
      },
    ],
    { cancelable: false }
  )
}
