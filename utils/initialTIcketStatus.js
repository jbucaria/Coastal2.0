// ticketConstants.js
'use client'

export const initialTicketStatus = {
  street: '',
  apt: '',
  city: '',
  state: '',
  zip: '',
  date: '',
  // Builder fields
  customer: '',
  customerName: '',
  customerNumber: '',
  customerEmail: '',
  customerId: '',
  homeOwnerName: '',
  homeOwnerNumber: '',
  inspectorName: 'John Bucaria',
  reason:
    'Homeowner found wet carpet in the living room. Need to inspect for leaks and water damage.',
  jobType: 'inspection',
  hours: '2',
  typeOfJob: 'inspection',
  recommendedActions: '',
  messageCount: 0,
  reportPhotos: [],
  ticketPhotos: [],
  onSite: false,
  inspectionComplete: false,
  remediationRequired: false,
  remediationStatus: 'notStarted',
  equipmentOnSite: false,
  siteComplete: false,
  measurementsRequired: false,
}
