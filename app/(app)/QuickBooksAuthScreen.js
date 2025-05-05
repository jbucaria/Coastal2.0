'use client'

import React, { useEffect } from 'react'
import { Button, View, Text } from 'react-native'
import * as AuthSession from 'expo-auth-session'
import { useLocalSearchParams } from 'expo-router'

// Define your QuickBooks app's redirect URI
const redirectUri = 'https://coastalrestorationservice.com/oauth/callback'
const clientId = 'ABtSFRJhZ5sNYErUyLl0Lwqrqb5QJfQ76b8jwUSDbKstvWRmA8'

const discovery = {
  authorizationEndpoint: 'https://appcenter.intuit.com/connect/oauth2',
}

export default function QuickBooksAuthScreen() {
  const { projectId } = useLocalSearchParams()

  // Create an auth request
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      scopes: ['com.intuitss.quickbooks.accounting'],
      redirectUri, // Use the HTTPS redirect URI for QuickBooks
      responseType: 'code',
      state: projectId, // Pass projectId as state
    },
    discovery
  )

  useEffect(() => {
    if (response?.type === 'success') {
      console.log('OAuth process completed successfully.')
      // The Cloud Function will handle the rest (token exchange and redirect to app)
    }
  }, [response])

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {projectId && <Text>Project ID: {projectId}</Text>}
      <Text>Connect your QuickBooks Account</Text>
      <Button
        disabled={!request}
        title="Connect to QuickBooks"
        color="#0070f3"
        onPress={() => promptAsync()}
      />
    </View>
  )
}
