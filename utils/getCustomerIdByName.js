const getCustomerIdByName = async (customerName, accessToken, companyId) => {
  const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${companyId}/query?query=select * from Customer where DisplayName = '${customerName}'`

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    })

    const data = await response.json()

    if (
      !response.ok ||
      !data.QueryResponse.Customer ||
      data.QueryResponse.Customer.length === 0
    ) {
      throw new Error(`Customer '${customerName}' not found in QuickBooks`)
    }

    return data.QueryResponse.Customer[0].Id // ✅ Return the Customer ID
  } catch (error) {
    console.error('🚨 Error fetching Customer ID:', error.message)
    throw error
  }
}

export { getCustomerIdByName }
