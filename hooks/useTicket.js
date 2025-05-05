// hooks/useTicket.js
import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'

const useTicket = projectId => {
  const [ticket, setTicket] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!projectId) return

    const ticketRef = doc(firestore, 'tickets', projectId)
    const unsubscribe = onSnapshot(
      ticketRef,
      docSnap => {
        if (docSnap.exists()) {
          setTicket({ id: docSnap.id, ...docSnap.data() })
        } else {
          setTicket(null)
        }
      },
      err => {
        console.error('Error fetching ticket data:', err)
        setError(err)
      }
    )
    return () => unsubscribe()
  }, [projectId])

  return { ticket, error }
}

export default useTicket
