// pdfUploader.js
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export async function uploadPDFToFirestore(ticket, pdfUri) {
  // Fetch the file URI and convert to a Blob
  const response = await fetch(pdfUri)
  const blob = await response.blob()

  // Initialize Firebase Storage (make sure Firebase is already configured)
  const storage = getStorage()

  // Use the ticket street if available, otherwise fallback to ticket number or 'unknownAddress'
  const addressOrFallback =
    ticket.street || ticket.ticketNumber || 'unknownAddress'
  const sanitizedAddress = addressOrFallback.replace(/[\s,]+/g, '_')
  const fileName = `${sanitizedAddress}.pdf`
  const storageRef = ref(storage, `reports/${fileName}`)

  const metadata = {
    contentType: 'application/pdf',
  }

  // Upload the Blob using uploadBytes
  await uploadBytes(storageRef, blob, metadata)
  const downloadURL = await getDownloadURL(storageRef)
  return downloadURL
}
