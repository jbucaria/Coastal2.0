'use client'

import React, { useState, useEffect } from 'react'
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
  StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import { firestore } from '@/firebaseConfig'
import { collection, setDoc, doc, getDocs, getDoc } from 'firebase/firestore'
import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import useAuthStore from '@/store/useAuthStore'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'

const redirectUri = 'https://coastalrestorationservice.com/oauth/callback'
const discovery = {
  authorizationEndpoint: 'https://appcenter.intuit.com/connect/oauth2',
}

const QuickBooksManagementScreen = () => {
  const [activeTab, setActiveTab] = useState('customers')
  const [customers, setCustomers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [items, setItems] = useState([])
  const [itemSearchQuery, setItemSearchQuery] = useState('')
  const [loadingItems, setLoadingItems] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0)

  const router = useRouter()
  const {
    quickBooksCompanyId,
    clientId,
    accessToken,
    tokenExpiresAt,
    setCredentials,
  } = useAuthStore()

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      scopes: ['com.intuit.quickbooks.accounting'],
      redirectUri,
      responseType: 'code',
      state: 'quickbooks_auth',
      prompt: 'login select_account', // Force sign-in and account selection
    },
    discovery
  )

  // Refresh token function
  const refreshQuickBooksToken = async () => {
    const { clientId, clientSecret, refreshToken } = useAuthStore.getState()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    })

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    })

    const data = await response.json()
    if (data.access_token) {
      const companyRef = doc(firestore, 'companyInfo', 'Vj0FigLyhZCyprQ8iGGV')
      const companySnap = await getDoc(companyRef)
      let updatedQuickBooksCompanyId = quickBooksCompanyId
      if (companySnap.exists()) {
        const companyData = companySnap.data()
        updatedQuickBooksCompanyId =
          companyData.quickBooksCompanyId || quickBooksCompanyId
      }

      setCredentials({
        quickBooksCompanyId: updatedQuickBooksCompanyId,
        clientId,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenExpiresAt: Date.now() + data.expires_in * 1000,
      })
      return data.access_token
    } else {
      throw new Error('Failed to refresh token: ' + JSON.stringify(data))
    }
  }

  // Revoke QuickBooks token
  const revokeQuickBooksToken = async () => {
    const { clientId, clientSecret, refreshToken } = useAuthStore.getState()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/revoke'
    const authHeader = `Basic ${btoa(`${clientId}:${clientSecret}`)}`
    const body = new URLSearchParams({
      token: refreshToken,
    })

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: authHeader,
      },
      body: body.toString(),
    })

    if (response.ok) {
      useAuthStore.getState().clearCredentials()
      Alert.alert(
        'Success',
        'QuickBooks session revoked. Please sign in again.'
      )
    } else {
      throw new Error('Failed to revoke token')
    }
  }

  // Clear WebView cookies
  const clearQuickBooksSession = async () => {
    await WebBrowser.clearAll()
  }

  // Automatic token refresh
  useEffect(() => {
    const checkTokenExpiration = () => {
      const now = Date.now()
      if (accessToken && tokenExpiresAt && now > tokenExpiresAt - 300000) {
        refreshQuickBooksToken().catch(err => {
          console.error('Failed to refresh token:', err)
          Alert.alert('Error', 'Failed to refresh token: ' + err.message)
        })
      }
    }

    const interval = setInterval(checkTokenExpiration, 60000)
    checkTokenExpiration()

    return () => clearInterval(interval)
  }, [accessToken, tokenExpiresAt, quickBooksCompanyId, clientId])

  // Token exchange after OAuth redirect
  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params
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
          if (data.access_token) {
            const companyRef = doc(
              firestore,
              'companyInfo',
              'Vj0FigLyhZCyprQ8iGGV'
            )
            const companySnap = await getDoc(companyRef)
            let updatedQuickBooksCompanyId = quickBooksCompanyId
            if (companySnap.exists()) {
              const companyData = companySnap.data()
              updatedQuickBooksCompanyId =
                companyData.quickBooksCompanyId || quickBooksCompanyId
            }

            setCredentials({
              quickBooksCompanyId: updatedQuickBooksCompanyId,
              clientId,
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              tokenExpiresAt: Date.now() + data.expires_in * 1000,
            })
          } else {
            console.error('Token exchange response:', data)
            Alert.alert('Error', 'Failed to obtain access token.')
          }
        })
        .catch(err => {
          console.error('Token exchange failed:', err)
          Alert.alert('Error', 'Token exchange failed: ' + err.message)
        })
    } else if (response?.type === 'error') {
      console.error('Auth error:', response)
      Alert.alert('Error', 'Authentication failed: ' + response.error)
    } else if (response?.type === 'cancel') {
    }
  }, [response, setCredentials, quickBooksCompanyId, clientId])

  // Customers Functions
  const fetchCustomersFromFirestore = async () => {
    try {
      const querySnapshot = await getDocs(collection(firestore, 'customers'))
      setCustomers(
        querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      )
    } catch (error) {
      console.error('Firestore fetch error:', error)
      Alert.alert('Error', 'Failed to fetch customers from Firestore.')
    }
  }

  const fetchCustomersFromQuickBooks = async () => {
    if (!quickBooksCompanyId || !accessToken) {
      return Alert.alert('Error', 'Missing credentials')
    }
    setLoadingCustomers(true)
    const url = `https://quickbooks.api.intuit.com/v3/company/${quickBooksCompanyId}/query?query=${encodeURIComponent(
      'SELECT * FROM Customer STARTPOSITION 1 MAXRESULTS 100'
    )}&minorversion=4`
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    }

    try {
      let response = await fetch(url, { method: 'GET', headers })
      if (response.status === 401) {
        const newToken = await refreshQuickBooksToken()
        headers.Authorization = `Bearer ${newToken}`
        response = await fetch(url, { method: 'GET', headers })
      }
      if (!response.ok) throw new Error(await response.text())
      const data = await response.json()
      const customersData =
        data.QueryResponse?.Customer?.map(customer => ({
          id: customer.Id,
          displayName: customer.DisplayName,
          email: customer.PrimaryEmailAddr?.Address || 'No email',
          givenName: customer.GivenName || '',
          familyName: customer.FamilyName || '',
          companyName: customer.CompanyName || '',
          phone: customer.PrimaryPhone?.FreeFormNumber || '',
          address: customer.BillAddr || {},
        })) || []

      await saveCustomersToFirestore(customersData)
      fetchCustomersFromFirestore()
      Alert.alert('Success', 'Customers synced')
    } catch (error) {
      console.error('QuickBooks fetch error:', error)
      Alert.alert('Error', error.message)
    } finally {
      setLoadingCustomers(false)
    }
  }

  const saveCustomersToFirestore = async customersData => {
    try {
      await Promise.all(
        customersData.map(customer =>
          setDoc(doc(firestore, 'customers', customer.id), customer)
        )
      )
    } catch (error) {
      console.error('Firestore save error:', error)
      Alert.alert('Error', 'Failed to save customers')
    }
  }

  const filteredCustomers = customers.filter(c =>
    [c.id, c.displayName, c.email].some(f =>
      f?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  // Items Functions
  const fetchItemsFromQB = async () => {
    if (!quickBooksCompanyId || !accessToken) {
      return Alert.alert('Error', 'Missing credentials')
    }
    setLoadingItems(true)
    const url = `https://quickbooks.api.intuit.com/v3/company/${quickBooksCompanyId}/query?query=${encodeURIComponent(
      'SELECT * FROM Item STARTPOSITION 1 MAXRESULTS 100'
    )}&minorversion=4`
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    }
    try {
      let response = await fetch(url, { method: 'GET', headers })
      if (response.status === 401) {
        const newToken = await refreshQuickBooksToken()
        headers.Authorization = `Bearer ${newToken}`
        response = await fetch(url, { method: 'GET', headers })
      }
      if (!response.ok) throw new Error(await response.text())
      const data = await response.json()
      const itemsData =
        data.QueryResponse?.Item?.map(item => ({
          id: item.Id,
          name: item.Name,
          description: item.Description || '',
          unitPrice: item.UnitPrice || 0,
          type: item.Type || '',
          qtyOnHand: item.QtyOnHand || 0,
          incomeAccount: item.IncomeAccountRef || {},
        })) || []

      await saveItemsToFirestore(itemsData)
      setItems(itemsData)
      Alert.alert('Success', 'Items synced')
    } catch (error) {
      console.error('QuickBooks fetch error:', error)
      Alert.alert('Error', error.message)
    } finally {
      setLoadingItems(false)
    }
  }

  const saveItemsToFirestore = async itemsData => {
    try {
      await Promise.all(
        itemsData.map(item => setDoc(doc(firestore, 'items', item.id), item))
      )
    } catch (error) {
      console.error('Firestore save error:', error)
      Alert.alert('Error', 'Failed to save items')
    }
  }

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
  )

  // Options for the header menu
  const headerOptions = [
    {
      label: 'Refresh Token',
      onPress: async () => {
        try {
          const companyRef = doc(
            firestore,
            'companyInfo',
            'Vj0FigLyhZCyprQ8iGGV'
          )
          const companySnap = await getDoc(companyRef)
          if (companySnap.exists()) {
            const companyData = companySnap.data()
            const updatedQuickBooksCompanyId =
              companyData.quickBooksCompanyId || quickBooksCompanyId
            useAuthStore.getState().setCredentials({
              quickBooksCompanyId: updatedQuickBooksCompanyId,
              clientId,
              accessToken: null,
              refreshToken: null,
              tokenExpiresAt: null,
            })
          }
          promptAsync()
        } catch (error) {
          console.error('Error fetching company data:', error)
          Alert.alert('Error', 'Failed to fetch company data: ' + error.message)
        }
      },
    },
    {
      label: 'Sign Out',
      onPress: async () => {
        try {
          await revokeQuickBooksToken()
        } catch (error) {
          console.error('Error revoking token:', error)
          Alert.alert('Error', 'Failed to sign out: ' + error.message)
        }
      },
    },
    {
      label: 'Clear Session',
      onPress: async () => {
        try {
          await clearQuickBooksSession()
          Alert.alert(
            'Success',
            'QuickBooks session cleared. Please sign in again.'
          )
        } catch (error) {
          console.error('Error clearing session:', error)
          Alert.alert('Error', 'Failed to clear session: ' + error.message)
        }
      },
    },
    {
      label: 'Clear Credentials',
      onPress: () => {
        useAuthStore.getState().clearCredentials()
        Alert.alert('Success', 'QuickBooks credentials cleared.')
      },
    },
  ]

  // UI Components
  const renderSegmentedControl = () => (
    <View style={styles.segmentedControl}>
      {['customers', 'items'].map(tab => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.segmentButton,
            activeTab === tab && styles.activeSegment,
          ]}
          onPress={() => setActiveTab(tab)}
        >
          <Text
            style={[
              styles.segmentText,
              activeTab === tab && styles.activeSegmentText,
            ]}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )

  const renderCustomersUI = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Manage Customers</Text>
      <TouchableOpacity
        onPress={fetchCustomersFromQuickBooks}
        style={styles.syncButton}
      >
        <Text style={styles.syncButtonText}>
          {loadingCustomers ? 'Syncing...' : 'Sync Customers'}
        </Text>
      </TouchableOpacity>
      <TextInput
        style={styles.searchInput}
        placeholder="Search customer by name..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <ScrollView style={styles.listContainer}>
        {filteredCustomers.map(customer => (
          <View key={customer.id} style={styles.listItem}>
            <Text style={styles.listItemText}>
              {customer.id} - {customer.displayName} ({customer.email})
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )

  const renderItemsUI = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Manage Items</Text>
      <TouchableOpacity onPress={fetchItemsFromQB} style={styles.syncButton}>
        <Text style={styles.syncButtonText}>
          {loadingItems ? 'Loading...' : 'Sync Items'}
        </Text>
      </TouchableOpacity>
      <TextInput
        style={styles.searchInput}
        placeholder="Search item by name..."
        value={itemSearchQuery}
        onChangeText={setItemSearchQuery}
      />
      <ScrollView style={styles.listContainer}>
        {filteredItems.map(item => (
          <View key={item.id} style={styles.listItem}>
            <Text style={styles.listItemText}>
              {item.id} - {item.name} - Price: {item.unitPrice}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )

  const renderTokensUI = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Manage Tokens</Text>
      <TouchableOpacity
        onPress={() => promptAsync()}
        style={styles.oauthButton}
      >
        <Text style={styles.buttonText}>Get Auth Token</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={[styles.container, { margin: 5 }]}>
      <HeaderWithOptions
        title="QuickBooks Management"
        onBack={() => router.back()}
        options={headerOptions}
        showHome={false}
        onHeightChange={setHeaderHeight}
      />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: headerHeight },
        ]}
      >
        {renderSegmentedControl()}
        {activeTab === 'customers'
          ? renderCustomersUI()
          : activeTab === 'tokens'
          ? renderTokensUI()
          : renderItemsUI()}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  scrollContainer: { alignItems: 'center', paddingBottom: 20 },
  segmentedControl: {
    flexDirection: 'row',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
  },
  activeSegment: { backgroundColor: '#3498DB' },
  segmentText: { fontSize: 16, color: '#2c3e50' },
  activeSegmentText: { color: '#FFF', fontWeight: 'bold' },
  sectionContainer: { width: '100%', marginBottom: 30 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    color: '#2C3E50',
  },
  syncButton: {
    backgroundColor: '#27AE60',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  syncButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  searchInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: 'white',
  },
  listContainer: {
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  listItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  listItemText: { fontSize: 16, color: '#2c3e50' },
  oauthContainer: { width: '100%', alignItems: 'center', marginBottom: 20 },
  oauthButton: {
    width: '90%',
    backgroundColor: '#B9770E',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
})

export default QuickBooksManagementScreen
