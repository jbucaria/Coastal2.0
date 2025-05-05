// creaeteProject.js
import { addDoc, updateDoc, collection } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'

/**
 * Upload images to Firebase Storage and return their download URLs.
 */
export async function uploadPhotos(assets) {
  const storage = getStorage()
  const uploadPromises = assets.map(async asset => {
    const response = await fetch(asset.uri)
    const blob = await response.blob()

    // Fallback fileName if asset.fileName is missing
    const fileName = asset.fileName || `${Date.now()}.jpg`

    const fileRef = ref(storage, `projectPhotos/${Date.now()}_${fileName}`)
    await uploadBytes(fileRef, blob)
    return getDownloadURL(fileRef)
  })

  return Promise.all(uploadPromises)
}

const formatPhoneNumber = phoneNumber => {
  return phoneNumber
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
}

const composeAddress = (street, apt, city, state, zip) => {
  return `${street}${apt ? ' Apt ' + apt : ''}, ${city}, ${state} ${zip}`
}

const createProject = async projectData => {
  try {
    const docRef = await addDoc(collection(firestore, 'projects'), {
      ...projectData,
      createdAt: new Date(),
    })

    await updateDoc(docRef, { projectId: docRef.id })

    return { success: true, message: 'Project created successfully.' }
  } catch (error) {
    console.error('Error creating project:', error)
    return {
      success: false,
      message: 'Failed to create the project. Please try again.',
    }
  }
}

export const saveProject = async ({
  street,
  apt,
  city,
  state,
  zip,
  customer,
  customerNumber,
  ...rest
}) => {
  const formattedNumber = formatPhoneNumber(customerNumber)
  const composedAddress = composeAddress(street, apt, city, state, zip)

  const projectData = {
    ...rest,
    contactNumber: formattedNumber,
    address: composedAddress,
    createdAt: new Date(),
  }

  return await createProject(projectData)
}

export const handleCreateProject = async (
  projectData,
  setSubmitting,
  resetForm,
  onClose
) => {
  setSubmitting(true)

  try {
    if (
      !projectData.street ||
      !projectData.city ||
      !projectData.state ||
      !projectData.zip ||
      !projectData.customer
    ) {
      return {
        success: false,
        message: 'Validation Error: Please fill out all required fields.',
        action: () => setSubmitting(false),
      }
    }

    const result = await saveProject(projectData)

    if (result.success) {
      resetForm()
      onClose()
    }

    return result
  } catch (error) {
    console.error('Error creating project:', error)
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again.',
      action: () => setSubmitting(false),
    }
  } finally {
    setSubmitting(false)
  }
}
