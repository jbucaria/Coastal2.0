// firestoreUtils.js
import { getFirestore, doc, updateDoc } from 'firebase/firestore'

export const updateTicketPdfUrl = async (ticketId, pdfUrl) => {
  const db = getFirestore()
  const ticketRef = doc(db, 'tickets', ticketId)
  await updateDoc(ticketRef, { pdfUrl })
}
