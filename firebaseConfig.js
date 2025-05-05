'use client'

// firebaseConfig.js
import { initializeApp, getApps, getApp } from 'firebase/app'
import { Platform } from 'react-native'

// Your Firebase config object
const firebaseConfig = {
  // apiKey: "AIzaSyC2zvMF_Hh8_cPT2RT0Mfrb1NJYduOvHkI",
  apiKey: 'AIzaSyCnyLTERgNd1i4Y3Y2kR-ETJu2f545wwsg',
  authDomain: 'coastal-cce38.firebaseapp.com',
  projectId: 'coastal-cce38',
  storageBucket: 'coastal-cce38.firebasestorage.app',
  messagingSenderId: '867908177885',
  appId: '1:867908177885:ios:6d44768272781a78577034',
  measurementId: 'G-FBNV0BV0T7',
}

// Initialize the app only once.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

let auth
if (Platform.OS === 'web') {
  // For web, simply use getAuth.
  const { getAuth } = require('firebase/auth')
  auth = getAuth(app)
} else {
  try {
    // For native, attempt to initialize Auth with native persistence.
    const {
      initializeAuth,
      getReactNativePersistence,
    } = require('firebase/auth')
    const AsyncStorage =
      require('@react-native-async-storage/async-storage').default
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  } catch (error) {
    // If already initialized, fallback to getAuth.
    if (error.message && error.message.includes('already-initialized')) {
      const { getAuth } = require('firebase/auth')
      auth = getAuth(app)
    } else {
      throw error
    }
  }
}

// For Firestore, simply import and call getFirestore:
import { getFirestore } from 'firebase/firestore'
const firestore = getFirestore(app)

// For Storage, do the same:
import { getStorage } from 'firebase/storage'
const storage = getStorage(app)

export { auth, firestore, storage }
