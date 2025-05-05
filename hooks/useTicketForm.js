import { useState, useCallback } from 'react'
import { Alert } from 'react-native'
import { pickAndUploadPhotos } from '@/utils/photoUpload'
import { formatPhoneNumber } from '@/utils/helpers'
import { handleCreateTicket } from '@/utils/generateTicket'

const initialTicketStatus = {
  street: '1111',
  apt: '',
  city: 'Trinity',
  state: 'Fl',
  zip: '34655',
  date: '',
  customer: 'DR Horton',
  customerName: 'Jakie Waller',
  customerNumber: '(727) 555-1234',
  customerEmail: 'jwaller@gmail.com',
  customerId: '191',
  homeOwnerName: 'John Smith',
  homeOwnerNumber: '(727) 555-5678',
  inspectorName: 'Dave Smith',
  reason: 'Leak in the bathroom',
  hours: '3',
  typeOfJob: 'Leak Detection',
  recommendedActions: '',
  startTime: new Date(),
  endTime: new Date(),
  messageCount: 0,
  reportPhotos: [],
  ticketPhotos: [],
  status: 'Open',
  onSite: false,
  inspectionComplete: false,
  remediationRequired: null,
  remediationStatus: '',
  equipmentOnSite: false,
  siteComplete: false,
  measurementsRequired: null,
}

export const useTicketForm = user => {
  const [newTicket, setNewTicket] = useState(initialTicketStatus)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [startTime, setStartTime] = useState(new Date())
  const [endTime, setEndTime] = useState(() => {
    const defaultEndTime = new Date()
    defaultEndTime.setHours(defaultEndTime.getHours() + 2)
    return defaultEndTime
  })
  const [step, setStep] = useState(1)
  const [newNote, setNewNote] = useState('')
  const [jobType, setJobType] = useState('')
  const [vacancy, setVacancy] = useState('')

  const resetForm = () => {
    setNewTicket(initialTicketStatus)
    setNewNote('')
    setStep(1)
    setSelectedDate(new Date())
    setStartTime(new Date())
    const defaultEndTime = new Date()
    defaultEndTime.setHours(defaultEndTime.getHours() + 2)
    setEndTime(defaultEndTime)
    setJobType('')
    setVacancy('')
  }

  const handleDateChange = (event, date) => {
    if (date) {
      setSelectedDate(date)
      const newStartTime = new Date(startTime)
      newStartTime.setFullYear(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      )
      const newEndTime = new Date(endTime)
      newEndTime.setFullYear(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      )
      setStartTime(newStartTime)
      setEndTime(newEndTime)
      setNewTicket(prev => ({
        ...prev,
        startTime: newStartTime,
        endTime: newEndTime,
      }))
    }
  }

  const handleStartTimeChange = (event, time) => {
    if (time) {
      const newStartTime = new Date(selectedDate)
      newStartTime.setHours(time.getHours(), time.getMinutes(), 0, 0)
      setStartTime(newStartTime)
      setNewTicket(prev => ({ ...prev, startTime: newStartTime }))

      const newEndTime = new Date(endTime)
      if (newEndTime <= newStartTime) {
        newEndTime.setTime(newStartTime.getTime() + 2 * 60 * 60 * 1000)
        setEndTime(newEndTime)
        setNewTicket(prev => ({ ...prev, endTime: newEndTime }))
      }
    }
  }

  const handleEndTimeChange = (event, time) => {
    if (time) {
      const newEndTime = new Date(selectedDate)
      newEndTime.setHours(time.getHours(), time.getMinutes(), 0, 0)
      if (newEndTime <= startTime) {
        newEndTime.setTime(startTime.getTime() + 2 * 60 * 60 * 1000)
        Alert.alert(
          'Adjusted End Time',
          'End time must be after start time. It has been set to 2 hours after the start time.'
        )
      }
      setEndTime(newEndTime)
      setNewTicket(prev => ({ ...prev, endTime: newEndTime }))
    }
  }

  const handleJobTypeChange = itemValue => {
    setJobType(itemValue)
    setNewTicket(prev => ({ ...prev, typeOfJob: itemValue }))
  }

  const handleVacancyChange = itemValue => {
    setVacancy(itemValue)
    setNewTicket(prev => ({ ...prev, occupied: itemValue === 'occupied' }))
  }

  const handleRemovePhoto = index => {
    setNewTicket(prev => ({
      ...prev,
      ticketPhotos: prev.ticketPhotos.filter((_, i) => i !== index),
    }))
  }

  const handleAddPhoto = useCallback(async () => {
    const folder = 'ticketPhotos'
    const photosArray = await pickAndUploadPhotos({ folder, quality: 0.7 })
    if (photosArray.length > 0) {
      const urls = photosArray.map(photo => photo.downloadURL)
      setNewTicket(prev => ({
        ...prev,
        ticketPhotos: [...prev.ticketPhotos, ...urls],
      }))
      Alert.alert('Success', 'Photos added successfully.')
    } else {
      Alert.alert('No Selection', 'You did not select any image.')
    }
  }, [])

  const handleCreate = () => {
    handleCreateTicket(
      newTicket,
      selectedDate,
      newTicket.startTime,
      newTicket.endTime,
      resetForm,
      setIsSubmitting,
      isSubmitting,
      newNote,
      user
    )
  }

  const handleNextStep = addressData => {
    if (step === 2 && addressData) {
      const { street, city, stateField, zip } = addressData
      setNewTicket(prev => ({
        ...prev,
        street,
        city,
        state: stateField,
        zip,
      }))
    }
    if (step === 5) {
      if (!newTicket.inspectorName) {
        Alert.alert('Error', 'Please select an inspector.')
        return
      }
      if (!jobType) {
        Alert.alert('Error', 'Please select a job type.')
        return
      }
      if (!vacancy) {
        Alert.alert('Error', 'Please select occupancy status.')
        return
      }
    }
    setStep(prev => Math.min(prev + 1, 5))
  }

  const handlePreviousStep = () => {
    setStep(prev => Math.max(prev - 1, 1))
  }

  const formatDate = date => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = time => {
    return time.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  return {
    newTicket,
    setNewTicket,
    isSubmitting,
    selectedDate,
    startTime,
    endTime,
    step,
    newNote,
    setNewNote,
    jobType,
    vacancy,
    resetForm,
    handleDateChange,
    handleStartTimeChange,
    handleEndTimeChange,
    handleJobTypeChange,
    handleVacancyChange,
    handleRemovePhoto,
    handleAddPhoto,
    handleCreate,
    handleNextStep,
    handlePreviousStep,
    formatDate,
    formatTime,
  }
}
