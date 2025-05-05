'use client'

import React, { useState, useEffect } from 'react'
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native'
import { router } from 'expo-router'
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'
import * as AuthSession from 'expo-auth-session'
import { sendInvoiceToQuickBooks } from '@/utils/sendInvoice'
import useAuthStore from '@/store/useAuthStore'
import useProjectStore from '@/store/useProjectStore'
import { useUserStore } from '@/store/useUserStore'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'

const redirectUri = 'https://coastalrestorationservice.com/oauth/callback'
const discovery = {
  authorizationEndpoint: 'https://appcenter.intuit.com/connect/oauth2',
  tokenEndpoint: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
}

const ViewInvoiceScreen = () => {
  const { projectId } = useProjectStore()
  const { user } = useUserStore()
  const {
    clientId,
    accessToken,
    tokenExpiresAt,
    refreshToken,
    setCredentials,
  } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date())
  const [groupedLineItems, setGroupedLineItems] = useState([])
  const [overrides, setOverrides] = useState({})
  const [isSending, setIsSending] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0)
  const marginBelowHeader = 8
  const [needsTokenRefresh, setNeedsTokenRefresh] = useState(false)

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      scopes: ['com.intuit.quickbooks.accounting'],
      redirectUri,
      responseType: 'code',
      state: projectId,
    },
    discovery
  )

  const refreshAccessToken = async () => {
    if (!refreshToken) {
      Alert.alert('Error', 'No refresh token available.')
      return false
    }

    try {
      console.log('Refreshing token with refreshToken:', refreshToken)
      const tokenUrl =
        'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: useAuthStore.getState().clientSecret,
      })

      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      })

      const data = await tokenResponse.json()
      console.log('Token refresh response:', data)

      if (data.access_token) {
        const expiresIn = Number(data.expires_in) || 3600 // Default to 1 hour if undefined
        const newAuthData = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token || refreshToken,
          tokenExpiresAt: Date.now() + expiresIn * 1000,
          clientId,
          clientSecret: useAuthStore.getState().clientSecret,
          quickBooksCompanyId: useAuthStore.getState().quickBooksCompanyId,
        }

        console.log('New auth data to save:', newAuthData)
        await setCredentials(newAuthData)
        console.log('setCredentials called in refreshAccessToken')
        return true
      } else {
        throw new Error('Failed to refresh token: ' + JSON.stringify(data))
      }
    } catch (error) {
      console.error('Failed to refresh token:', error)
      Alert.alert(
        'Error',
        'Failed to refresh QuickBooks token: ' + error.message
      )
      return false
    }
  }

  useEffect(() => {
    const now = Date.now()
    console.log('Current time:', now)
    console.log('Token expires at:', tokenExpiresAt)

    const timeUntilExpiry = tokenExpiresAt - now
    const refreshThreshold = 5 * 60 * 1000 // 5 minutes in milliseconds

    if (
      !accessToken ||
      (tokenExpiresAt &&
        (now > tokenExpiresAt || timeUntilExpiry < refreshThreshold))
    ) {
      const message =
        now > tokenExpiresAt
          ? 'Your access token has expired.'
          : 'Your access token will expire soon.'
      Alert.alert(
        'Token Action Required',
        `${message} Please refresh your token to continue.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Refresh Token', onPress: () => promptAsync() },
        ],
        { cancelable: true }
      )
    }
  }, [accessToken, tokenExpiresAt, promptAsync])

  useEffect(() => {
    if (response?.type === 'success') {
      console.log('OAuth process completed successfully:', response)
      const { code } = response.params
      console.log('Authorization code:', code)
      const { clientId, clientSecret } = useAuthStore.getState()

      const tokenUrl =
        'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      })

      fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: body.toString(),
      })
        .then(res => res.json())
        .then(async data => {
          console.log('Token exchange response:', data)
          if (data.access_token) {
            const companyRef = doc(
              firestore,
              'companyInfo',
              'Vj0FigLyhZCyprQ8iGGV'
            )
            const companySnap = await getDoc(companyRef)
            let updatedQuickBooksCompanyId =
              useAuthStore.getState().quickBooksCompanyId
            if (companySnap.exists()) {
              const companyData = companySnap.data()
              updatedQuickBooksCompanyId =
                companyData.quickBooksCompanyId || updatedQuickBooksCompanyId
            }

            const expiresIn = Number(data.expires_in) || 3600 // Default to 1 hour if undefined
            const newAuthData = {
              quickBooksCompanyId: updatedQuickBooksCompanyId,
              clientId,
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              tokenExpiresAt: Date.now() + expiresIn * 1000,
            }

            console.log('New auth data to save in useEffect:', newAuthData)
            await setCredentials(newAuthData)
            console.log('setCredentials called in useEffect')

            if (needsTokenRefresh) {
              setNeedsTokenRefresh(false)
              handleSendInvoice()
            }
          } else {
            console.error('Token exchange response:', data)
            Alert.alert('Error', 'Failed to obtain access token.')
            setIsSending(false)
          }
        })
        .catch(err => {
          console.error('Token exchange failed:', err)
          Alert.alert('Error', 'Token exchange failed: ' + err.message)
          setIsSending(false)
        })
    } else if (response?.type === 'error') {
      console.error('OAuth error:', response)
      Alert.alert(
        'Error',
        'Authentication failed: ' + (response.error || 'Unknown error')
      )
      setIsSending(false)
    } else if (response?.type === 'cancel') {
      console.log('OAuth flow canceled')
      setIsSending(false)
    }
  }, [response, needsTokenRefresh])

  useEffect(() => {
    const fetchInvoiceData = async () => {
      try {
        const docRef = doc(firestore, 'tickets', projectId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          setCustomerName(data.customerName || 'Unknown')
          setCustomerEmail(data.customerEmail || 'No Email Provided')
          setCustomerId(data.customerId || 'no-customer-id')
          setInvoiceDate(
            data.invoiceDate ? new Date(data.invoiceDate) : new Date()
          )

          if (data.remediationData?.rooms) {
            const grouped = data.remediationData.rooms
              .map(room => {
                const actualMeasurements = (room.measurements || []).filter(
                  m => !m.isRoomName
                )
                if (actualMeasurements.length === 0) return null

                return {
                  roomName: room.roomTitle || 'Room',
                  measurements: actualMeasurements.map(measurement => ({
                    id: measurement.id || `${room.id}-${Math.random()}`,
                    description: measurement.description || 'No description',
                    quantity: measurement.quantity || 0,
                    unitPrice: measurement.unitPrice || 0,
                    itemId: measurement.itemId || '1010000001',
                    name: measurement.name || 'item',
                  })),
                }
              })
              .filter(room => room !== null)
            setGroupedLineItems(grouped)
          }
        } else {
          Alert.alert('Error', 'No invoice data found.')
        }
      } catch (error) {
        console.error('Error fetching invoice data:', error)
        Alert.alert('Error', 'Failed to load data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchInvoiceData()
  }, [projectId])

  const totalCost = groupedLineItems.reduce((roomSum, room) => {
    const roomTotal = room.measurements.reduce((itemSum, item) => {
      const computed =
        (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
      const override = overrides[item.id]
      const finalAmount = override !== undefined ? override : computed
      return itemSum + finalAmount
    }, 0)
    return roomSum + roomTotal
  }, 0)

  const handleOverrideChange = (lineItemId, newValue) => {
    setOverrides(prev => ({
      ...prev,
      [lineItemId]: parseFloat(newValue) || 0,
    }))
  }

  const handleSendInvoice = async () => {
    setIsSending(true)
    if (!accessToken) {
      Alert.alert('Error', 'Missing QuickBooks authentication token.')
      setIsSending(false)
      return
    }
    console.log('creating invoice')
    const finalLineItems = []
    groupedLineItems.forEach(room => {
      const roomNameLineItem = {
        description: room.roomName,
        quantity: 0,
        amount: 0,
        itemId: '',
        unitPrice: 0,
        tax: true,
      }
      finalLineItems.push(roomNameLineItem)

      room.measurements.forEach(item => {
        const computed =
          (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
        const override = overrides[item.id]
        const finalAmount = override !== undefined ? override : computed

        finalLineItems.push({
          description: item.description,
          quantity: item.quantity,
          amount: finalAmount,
          itemId: item.itemId,
          unitPrice: item.unitPrice,
          room: room.roomName,
          name: item.name,
        })
      })
    })

    const invoiceData = {
      customerEmail: customerEmail,
      customerId: customerId,
      customerName: customerName,
      invoiceDate: invoiceDate.toISOString().split('T')[0],
      lineItems: finalLineItems,
    }
    console.log('Invoice data:', invoiceData)

    const result = await sendInvoiceToQuickBooks(
      invoiceData,
      accessToken,
      clientId
    )
    if (result) {
      console.log('Invoice successfully sent:', result)
      setIsSending(false)
      router.back()
    } else {
      if (result?.fault?.error?.some(err => err.code === '3200')) {
        const refreshed = await refreshAccessToken()
        if (refreshed) {
          handleSendInvoice()
        } else {
          setNeedsTokenRefresh(true)
          Alert.alert(
            'Authentication Failed',
            'Your QuickBooks session has expired. Please refresh your token to continue.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Refresh Token', onPress: () => promptAsync() },
            ],
            { cancelable: true }
          )
        }
      } else {
        setIsSending(false)
      }
    }
  }

  const handleSaveChanges = async () => {
    Alert.alert('Note', 'Currently not saving total overrides to Firestore.')
  }

  const headerOptions = [
    {
      label: 'Save Changes',
      onPress: handleSaveChanges,
    },
    {
      label: 'Send Invoice to QB',
      onPress: handleSendInvoice,
    },
  ]

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <HeaderWithOptions
        title="Invoice"
        onBack={() => router.back()}
        options={headerOptions}
        onHeightChange={height => setHeaderHeight(height)}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: headerHeight + marginBelowHeader },
        ]}
      >
        <Text style={styles.title}>Invoice</Text>

        {/* Customer Info */}
        <View style={styles.infoCard}>
          <Text style={styles.label}>Customer Name</Text>
          <Text style={styles.textValue}>{customerName}</Text>

          <Text style={styles.label}>Customer Email</Text>
          <Text style={styles.textValue}>{customerEmail}</Text>

          <Text style={styles.label}>Invoice Date</Text>
          <Text style={styles.textValue}>{invoiceDate.toDateString()}</Text>
        </View>

        {/* Grouped Line Items by Room */}
        <Text style={styles.sectionTitle}>Services & Costs</Text>
        {groupedLineItems.length > 0 ? (
          groupedLineItems.map((room, roomIndex) => (
            <View
              key={`${room.roomName}-${roomIndex}`}
              style={styles.roomGroup}
            >
              <Text style={styles.roomHeader}>{room.roomName} (Taxable)</Text>
              {room.measurements.map((item, itemIndex) => {
                const computedTotal =
                  (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
                const override = overrides[item.id]
                const finalAmount =
                  override !== undefined ? override : computedTotal

                return (
                  <View key={`${item.id}-${itemIndex}`} style={styles.lineItem}>
                    <Text style={styles.label}>Item Description</Text>
                    <Text style={styles.textValue}>{item.name}</Text>
                    {item.description && (
                      <Text style={styles.description}>{item.description}</Text>
                    )}

                    <Text style={styles.label}>Quantity</Text>
                    <Text style={styles.textValue}>
                      {String(item.quantity)}
                    </Text>

                    <Text style={styles.label}>Unit Price</Text>
                    <Text style={styles.textValue}>
                      ${Number(item.unitPrice).toFixed(2)}
                    </Text>

                    <Text style={styles.label}>Item Amount</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={String(finalAmount.toFixed(2))}
                      onChangeText={text => handleOverrideChange(item.id, text)}
                    />
                  </View>
                )
              })}
            </View>
          ))
        ) : (
          <Text style={styles.noItemsText}>No invoice line items found.</Text>
        )}

        {/* Overall Total */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Total: ${totalCost.toFixed(2)}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default ViewInvoiceScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F5F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    color: '#2C3E50',
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 10,
  },
  textValue: {
    fontSize: 16,
    color: '#34495E',
    backgroundColor: '#ECECEC',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    color: '#657786',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 10,
  },
  roomGroup: {
    marginBottom: 20,
    padding: 8,
    backgroundColor: '#FFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  roomHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 4,
  },
  lineItem: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  input: {
    backgroundColor: '#ECECEC',
    borderRadius: 6,
    padding: 8,
    fontSize: 16,
    color: '#2C3E50',
    marginTop: 4,
  },
  totalContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  totalText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: '#27AE60',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sendButton: {
    marginTop: 10,
    backgroundColor: '#2980B9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  noItemsText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
    fontSize: 16,
  },
})
