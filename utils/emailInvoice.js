export const sendInvoiceEmailToQuickBooks = async (
  invoiceId,
  email,
  accessToken
) => {
  const { quickBooksCompanyId } = useAuthStore.getState()
  if (!quickBooksCompanyId || !accessToken) {
    Alert.alert('Error', 'Missing QuickBooks credentials.')
    return null
  }

  // Build the endpoint URL; if you want to override the default email, use sendTo:
  const url = `https://quickbooks.api.intuit.com/v3/company/${quickBooksCompanyId}/invoice/${invoiceId}/send?sendTo=${email}`

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/octet-stream',
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
    })

    const responseText = await response.text()
    let responseData

    try {
      responseData = JSON.parse(responseText)
    } catch (error) {
      console.error('Failed to parse JSON response:', responseText)
      Alert.alert('Error', 'Invalid JSON from QuickBooks (send).')
      return null
    }

    if (response.ok) {
      return responseData // This confirms the email was sent successfully.
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
    Alert.alert('Error', 'Failed to connect to QuickBooks API (send).')
    console.error('Network or Unexpected Error:', err)
    return null
  }
}
