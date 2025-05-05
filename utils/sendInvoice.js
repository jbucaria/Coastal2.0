import { Alert } from 'react-native'
import useAuthStore from '@/store/useAuthStore'

const sendInvoiceToQuickBooks = async (invoiceData, accessToken) => {
  const { quickBooksCompanyId } = useAuthStore.getState()

  if (!quickBooksCompanyId || !accessToken) {
    Alert.alert('Error', 'Missing QuickBooks credentials.')
    console.error('QuickBooks Error: Missing access token or company ID')
    return null
  }

  const url = `https://quickbooks.api.intuit.com/v3/company/${quickBooksCompanyId}/invoice?minorversion=65`

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  // Group line items by room, excluding tax-only lines
  const rooms = []
  const grouped = {}
  invoiceData.lineItems.forEach(item => {
    if (
      item.tax &&
      item.amount === 0 &&
      item.quantity === 0 &&
      item.unitPrice === 0
    ) {
      return
    }
    const roomName = item.room || 'Default Room'
    if (!grouped[roomName]) {
      grouped[roomName] = []
    }
    grouped[roomName].push(item)
  })

  // Convert grouped items into a rooms array (skip empty Default Room)
  Object.keys(grouped).forEach(roomName => {
    if (roomName === 'Default Room' && grouped[roomName].length === 0) return
    rooms.push({
      roomTitle: roomName,
      items: grouped[roomName],
    })
  })

  // (Removed the description-only lines for tax items)

  // Build the Line array without description-only line items
  const lines = []
  rooms.forEach(room => {
    room.items.forEach(item => {
      if (
        typeof item.amount === 'undefined' ||
        !item.itemId ||
        typeof item.unitPrice === 'undefined' ||
        typeof item.quantity === 'undefined'
      ) {
        console.warn(
          'Skipping item due to missing required fields:',
          item,
          'in room:',
          room.roomTitle
        )
        return
      }
      lines.push({
        DetailType: 'SalesItemLineDetail',
        Amount: item.amount,
        Description: item.description || '',
        SalesItemLineDetail: {
          ItemRef: { value: item.itemId },
          UnitPrice: item.unitPrice,
          Qty: item.quantity,
        },
      })
    })
  })

  const totalAmt = lines
    .filter(line => line.DetailType === 'SalesItemLineDetail')
    .reduce((sum, line) => sum + (line.Amount || 0), 0)

  const requestBody = {
    AutoDocNumber: true,
    CustomerRef: { value: invoiceData.customerId },
    BillEmail: { Address: invoiceData.customerEmail },
    TxnDate: invoiceData.invoiceDate,
    CurrencyRef: { value: 'USD' },
    ShipAddr: {
      Line1: invoiceData.shipAddress?.line1 || '',
      City: invoiceData.shipAddress?.city || '',
      Country: invoiceData.shipAddress?.country || '',
      PostalCode: invoiceData.shipAddress?.postalCode || '',
    },
    Line: lines,
    TotalAmt: totalAmt,
  }

  console.log('🚀 Sending Invoice Data:', JSON.stringify(requestBody, null, 2))

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

    console.log(
      '🔍 QuickBooks Response:',
      JSON.stringify(responseData, null, 2)
    )

    if (response.ok) {
      Alert.alert('Success', 'Invoice sent to QuickBooks!')
      console.log('✅ Invoice Created:', responseData)
      return responseData
    } else {
      const errorDetails = responseData.Fault?.Error || []
      let errorMessage = `QuickBooks API Error: ${response.status} ${response.statusText}`
      if (errorDetails.length > 0) {
        errorMessage += `\nDetails: ${
          errorDetails[0]?.Message || 'Unknown Error'
        }`
      }
      Alert.alert('Error', errorMessage)
      console.error('❌ QuickBooks Error Details:', errorDetails)
      return responseData
    }
  } catch (networkError) {
    Alert.alert('Error', 'Failed to connect to QuickBooks API.')
    console.error('❌ Network or Unexpected Error:', networkError)
    return null
  }
}

export { sendInvoiceToQuickBooks }
