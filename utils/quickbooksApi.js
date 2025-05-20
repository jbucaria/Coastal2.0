// utils/quickbooksApi.js
import { Alert } from 'react-native'
import useAuthStore from '@/store/useAuthStore'

// ---------------------------------------------------------------------
// 1. Create Invoice in QuickBooks (Save Invoice)
// ---------------------------------------------------------------------
export const createInvoiceInQuickBooks = async (
  invoiceData,
  accessToken,
  quickBooksCompanyId
) => {
  if (!quickBooksCompanyId || !accessToken) {
    console.error('Missing QuickBooks credentials:', {
      quickBooksCompanyId,
      accessToken,
    })
    Alert.alert('Error', 'Missing QuickBooks credentials.')
    return null
  }
  if (
    !invoiceData.customerEmail ||
    invoiceData.customerEmail === 'No Email Provided'
  ) {
    Alert.alert('Error', 'Customer email is required for sending invoices.')
    return null
  }
  const url = `https://quickbooks.api.intuit.com/v3/company/${quickBooksCompanyId}/invoice?minorversion=65`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  const lines = invoiceData.lineItems
    .filter(
      item =>
        !(
          item.tax &&
          item.amount === 0 &&
          item.quantity === 0 &&
          item.unitPrice === 0
        )
    )
    .map(item => {
      if (
        typeof item.amount === 'undefined' ||
        !item.itemId ||
        typeof item.unitPrice === 'undefined' ||
        typeof item.quantity === 'undefined'
      ) {
        console.warn('Skipping item due to missing required fields:', item)
        return null
      }
      return {
        DetailType: 'SalesItemLineDetail',
        Amount: item.amount,
        Description: item.description || '',
        SalesItemLineDetail: {
          ItemRef: { value: item.itemId },
          UnitPrice: item.unitPrice,
          Qty: item.quantity,
        },
      }
    })
    .filter(Boolean)
  const totalAmt = lines.reduce((sum, line) => sum + (line.Amount || 0), 0)
  const requestBody = {
    AutoDocNumber: true,
    CustomerRef: { value: invoiceData.customerId || '188' },
    BillEmail: { Address: invoiceData.customerEmail },

    TxnDate: invoiceData.invoiceDate,
    CurrencyRef: { value: 'USD' },
    Line: lines,
    TotalAmt: totalAmt,
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })
    const responseText = await response.text()
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch (error) {
      console.error('🛑 Failed to parse JSON response:', responseText)
      Alert.alert('Error', 'Invalid JSON response from QuickBooks.')
      return null
    }

    if (response.ok) {
      return responseData
    } else {
      const errorDetails = responseData.fault?.error || []
      let errorMessage = `QBO Create Invoice Error: ${response.status} ${response.statusText}`
      if (errorDetails.length > 0) {
        errorMessage += `\nDetails: ${
          errorDetails[0]?.message || 'Unknown Error'
        }`
      }
      Alert.alert('Error', errorMessage)
      console.error('QuickBooks Error Details:', errorDetails)
      return null
    }
  } catch (err) {
    Alert.alert(
      'Error',
      'Failed to connect to QuickBooks API while creating invoice.'
    )
    console.error('Network or Unexpected Error (create invoice):', err)
    return null
  }
}

// ---------------------------------------------------------------------
// 2. Send (Email) Invoice in QuickBooks
// ---------------------------------------------------------------------
export const sendInvoiceEmailToQuickBooks = async (
  invoiceId,
  email,
  accessToken
) => {
  const { quickBooksCompanyId } = useAuthStore.getState()
  if (!quickBooksCompanyId || !accessToken) {
    console.error('Missing QuickBooks credentials:', {
      quickBooksCompanyId,
      accessToken,
    })
    Alert.alert('Error', 'Missing QuickBooks credentials.')
    return null
  }
  const url = `https://quickbooks.api.intuit.com/v3/company/${quickBooksCompanyId}/invoice/${invoiceId}/send?sendTo=${encodeURIComponent(
    email
  )}`
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/octet-stream',
  }
  try {
    const response = await fetch(url, { method: 'POST', headers })
    const responseText = await response.text()
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch (error) {
      console.error(
        'Failed to parse JSON response from invoice send:',
        responseText
      )
      Alert.alert(
        'Error',
        'Invalid JSON from QuickBooks while sending invoice.'
      )
      return null
    }

    if (response.ok) {
      return responseData
    } else {
      const errorDetails = responseData.fault?.error || []
      let errorMessage = `QBO Email Invoice Error: ${response.status} ${response.statusText}`
      if (errorDetails.length > 0) {
        errorMessage += `\nDetails: ${
          errorDetails[0]?.message || 'Unknown Error'
        }`
      }
      Alert.alert('Error', errorMessage)
      console.error('QuickBooks Error Details:', errorDetails)
      return null
    }
  } catch (err) {
    Alert.alert(
      'Error',
      'Failed to connect to QuickBooks API while sending invoice.'
    )
    console.error('Network or Unexpected Error (send invoice):', err)
    return null
  }
}

// ---------------------------------------------------------------------
// 3. Convenience: Create and Immediately Send the Invoice
// ---------------------------------------------------------------------
export const createAndSendInvoiceInQuickBooks = async (
  invoiceData,
  accessToken
) => {
  const createResponse = await createInvoiceInQuickBooks(
    invoiceData,
    accessToken,
    useAuthStore.getState().quickBooksCompanyId
  )
  if (!createResponse || !createResponse.Invoice?.Id) {
    return null
  }
  const invoiceId = createResponse.Invoice.Id
  const sendResponse = await sendInvoiceEmailToQuickBooks(
    invoiceId,
    invoiceData.customerEmail,
    accessToken
  )
  if (!sendResponse) {
    return null
  }
  return { createdInvoice: createResponse, sendResponse }
}
