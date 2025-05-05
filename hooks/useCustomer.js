import { useState, useEffect } from 'react'
import { Alert, collection, getDocs, addDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import { createCustomerInQuickBooks } from '@/utils/quickbooksApi'

export const useCustomer = (quickBooksCompanyId, accessToken) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [allCustomers, setAllCustomers] = useState([])
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanyAddress, setNewCompanyAddress] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const querySnapshot = await getDocs(collection(firestore, 'customers'))
        const customersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        setAllCustomers(customersData)
      } catch (error) {
        console.error('Error fetching customers:', error)
      }
    }
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([])
      return
    }
    const queryLower = searchQuery.toLowerCase()
    const filtered = allCustomers.filter(c =>
      c.displayName?.toLowerCase().includes(queryLower)
    )
    setSuggestions(filtered)
  }, [searchQuery, allCustomers])

  const handleSelectCustomer = (customer, setNewTicket) => {
    setNewTicket(prev => ({
      ...prev,
      customerId: customer.id,
      customerName: customer.displayName || '',
      customerEmail: customer.email || '',
      customerNumber: customer.phone || '',
    }))
    setSearchQuery(customer.displayName)
  }

  const handleSaveNewCustomer = async () => {
    setLoading(true)
    try {
      const newCustomer = {
        displayName: newName || '',
        email: newEmail || '',
        phone: newPhone || '',
        companyName: newCompanyName || '',
        companyAddress: newCompanyAddress || '',
      }

      const qbCustomerId = await createCustomerInQuickBooks(
        newCustomer,
        quickBooksCompanyId,
        accessToken
      )

      newCustomer.id = qbCustomerId

      await addDoc(collection(firestore, 'customers'), newCustomer)

      setAllCustomers(prev => [...prev, newCustomer])
      handleSelectCustomer(newCustomer)
      setNewName('')
      setNewEmail('')
      setNewPhone('')
      setNewCompanyName('')
      setNewCompanyAddress('')
      setIsAddingNew(false)
    } catch (error) {
      console.error('Error saving new customer:', error)
      Alert.alert('Error', 'Failed to save new customer.')
    } finally {
      setLoading(false)
    }
  }

  return {
    searchQuery,
    setSearchQuery,
    suggestions,
    allCustomers,
    isAddingNew,
    setIsAddingNew,
    newName,
    setNewName,
    newEmail,
    setNewEmail,
    newPhone,
    setNewPhone,
    newCompanyName,
    setNewCompanyName,
    newCompanyAddress,
    setNewCompanyAddress,
    loading,
    handleSelectCustomer,
    handleSaveNewCustomer,
  }
}
