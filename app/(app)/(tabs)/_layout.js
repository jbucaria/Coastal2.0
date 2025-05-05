import { Tabs } from 'expo-router'
import React from 'react'
import Ionicons from '@expo/vector-icons/Ionicons'
import { SafeAreaProvider } from 'react-native-safe-area-context'

export default function TabLayout() {
  return (
    <SafeAreaProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => (
              <Ionicons name="home" size={28} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="quickBooks"
          options={{
            title: 'Acct.',
            tabBarIcon: ({ color }) => (
              <Ionicons name="cash-outline" size={28} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="maps"
          options={{
            title: 'Map',
            tabBarIcon: ({ color }) => (
              <Ionicons name="map-outline" size={28} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => (
              <Ionicons name="settings-outline" size={28} color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaProvider>
  )
}
