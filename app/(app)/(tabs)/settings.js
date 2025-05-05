'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  signOut,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth'
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore'
import { auth, firestore } from '@/firebaseConfig'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { useUserStore } from '@/store/useUserStore'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import { pickAndUploadPhotos } from '@/utils/photoUpload'

const Settings = () => {
  const router = useRouter()
  const { user, setUser } = useUserStore()

  // Profile fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    full: '',
  })

  // Editing states
  const [editing, setEditing] = useState(false)
  const [editingPassword, setEditingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

  // Logo upload and preview states
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoURL, setLogoURL] = useState('') // State for logo URL

  // Fetch user data and logo URL on mount
  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser
      if (currentUser) {
        const userDoc = await getDoc(doc(firestore, 'users', currentUser.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setName(userData.name || '')
          setEmail(userData.email || currentUser.email || '')
          setPhone(userData.phone || '')
          setAddress(
            userData.address || {
              street: '',
              city: '',
              state: '',
              zip: '',
              full: '',
            }
          )
        } else {
          setEmail(currentUser.email || '')
        }
      }
    }

    const fetchLogoURL = async () => {
      try {
        const companyDoc = await getDoc(
          doc(firestore, 'companyInfo', 'Vj0FigLyhZCyprQ8iGGV')
        )
        if (companyDoc.exists()) {
          const companyData = companyDoc.data()
          setLogoURL(companyData.logo || '') // Changed from logoURL to logo
        }
      } catch (error) {
        console.error('Error fetching logo URL:', error)
      }
    }

    fetchUserData()
    fetchLogoURL()
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.replace('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleSaveInfo = async () => {
    const currentUser = auth.currentUser
    if (currentUser) {
      try {
        if (email !== currentUser.email) {
          await updateEmail(currentUser, email)
        }
        await updateDoc(doc(firestore, 'users', currentUser.uid), {
          name: name,
          email: email,
          phone: phone,
          address: address,
        })
        Alert.alert('Success', 'Your information has been updated.')
        setUser({ ...user, name, email, phone, address })
        setEditing(false)
      } catch (error) {
        console.error('Error updating user info:', error)
        Alert.alert(
          'Error',
          'Failed to update user information. Please try again.'
        )
      }
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setName(user.name || '')
    setEmail(user.email || '')
    setPhone(user.phone || '')
    setAddress(
      user.address || {
        street: '',
        city: '',
        state: '',
        zip: '',
        full: '',
      }
    )
  }

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Error', 'Please provide your current password.')
      return
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'New passwords do not match.')
      return
    }
    const currentUser = auth.currentUser
    if (currentUser) {
      try {
        const credential = EmailAuthProvider.credential(
          currentUser.email,
          currentPassword
        )
        await reauthenticateWithCredential(currentUser, credential)
        await updatePassword(currentUser, newPassword)
        Alert.alert('Success', 'Password updated successfully.')
        setEditingPassword(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmNewPassword('')
      } catch (error) {
        console.error('Error updating password:', error)
        Alert.alert(
          'Error',
          'Failed to update password. You may need to reauthenticate.'
        )
      }
    }
  }

  const handleUploadLogo = async () => {
    setUploadingLogo(true)
    try {
      const folder = 'assets/images'
      const photosArray = await pickAndUploadPhotos({ folder, quality: 0.5 })
      if (photosArray.length > 0) {
        const logo = photosArray[0]
        // Save the logo's downloadURL to Firestore
        await setDoc(
          doc(firestore, 'companyInfo', 'Vj0FigLyhZCyprQ8iGGV'),
          {
            logo: logo.downloadURL, // Changed from logoURL to logo
          },
          { merge: true }
        )
        setLogoURL(logo.downloadURL) // Update the preview
        Alert.alert('Success', 'Logo uploaded successfully.')
      } else {
        Alert.alert('No photo selected')
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      Alert.alert('Error', 'Failed to upload logo. Please try again.')
    }
    setUploadingLogo(false)
  }

  const headerOptions = editing
    ? [
        {
          label: 'Cancel',
          onPress: () => {
            setEditing(false)
            setName(user.name || '')
            setEmail(user.email || '')
            setPhone(user.phone || '')
            setAddress(
              user.address || {
                street: '',
                city: '',
                state: '',
                zip: '',
                full: '',
              }
            )
          },
        },
        { label: 'Save', onPress: handleSaveInfo },
      ]
    : [
        { label: 'Edit Profile', onPress: () => setEditing(true) },
        { label: 'Change Password', onPress: () => setEditingPassword(true) },
        // Removed 'Upload Logo' since the touchable handles it
        { label: 'Logout', onPress: () => handleLogout() },
      ]

  const HEADER_HEIGHT = 60

  return (
    <SafeAreaView style={styles.container}>
      <HeaderWithOptions
        title="Settings"
        onBack={() => router.back()}
        options={headerOptions}
        showHome={false}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={{
            paddingBottom: 120,
            paddingTop: HEADER_HEIGHT,
          }}
        >
          <View style={styles.container}>
            <View style={styles.userInfoContainer}>
              <Text style={styles.userInfoText}>
                Welcome, {user.displayName || user.email}!
              </Text>
            </View>
            {/* Logo Preview Section */}
            <View style={styles.logoPreviewContainer}>
              <Text style={styles.label}>Company Logo</Text>
              <TouchableOpacity
                onPress={handleUploadLogo}
                disabled={uploadingLogo}
              >
                {logoURL ? (
                  <Image
                    source={{ uri: logoURL }}
                    style={styles.logoPreview}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Text style={styles.logoPlaceholderText}>
                      Tap to upload logo
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            {editing ? (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Name</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your Name"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="Enter your email"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="Enter your phone number"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Street</Text>
                  <TextInput
                    style={styles.input}
                    value={address.street}
                    onChangeText={text =>
                      setAddress(prev => ({ ...prev, street: text }))
                    }
                    placeholder="Enter your street"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>City</Text>
                  <TextInput
                    style={styles.input}
                    value={address.city}
                    onChangeText={text =>
                      setAddress(prev => ({ ...prev, city: text }))
                    }
                    placeholder="Enter your city"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>State</Text>
                  <TextInput
                    style={styles.input}
                    value={address.state}
                    onChangeText={text =>
                      setAddress(prev => ({ ...prev, state: text }))
                    }
                    placeholder="Enter your state"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>ZIP</Text>
                  <TextInput
                    style={styles.input}
                    value={address.zip}
                    onChangeText={text =>
                      setAddress(prev => ({ ...prev, zip: text }))
                    }
                    placeholder="Enter your zip code"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Full Address</Text>
                  <TextInput
                    style={styles.input}
                    value={address.full}
                    onChangeText={text =>
                      setAddress(prev => ({ ...prev, full: text }))
                    }
                    placeholder="Enter your full address"
                  />
                </View>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    onPress={handleSaveInfo}
                    style={styles.button}
                  >
                    <Text style={styles.buttonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCancel}
                    style={[styles.button, styles.cancelButton]}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.infoDisplayContainer}>
                <Text style={styles.infoDisplayText}>Name: {name}</Text>
                <Text style={styles.infoDisplayText}>Email: {email}</Text>
                <Text style={styles.infoDisplayText}>Phone: {phone}</Text>
                {address.full ? (
                  <Text style={styles.infoDisplayText}>
                    Address: {address.full}
                  </Text>
                ) : null}
              </View>
            )}
            {editingPassword ? (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Current Password</Text>
                  <TextInput
                    style={styles.input}
                    secureTextEntry
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter your current password"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>New Password</Text>
                  <TextInput
                    style={styles.input}
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                  />
                </View>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    secureTextEntry
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    placeholder="Confirm new password"
                  />
                </View>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    onPress={handleUpdatePassword}
                    style={styles.button}
                  >
                    <Text style={styles.buttonText}>Update Password</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setEditingPassword(false)}
                    style={[styles.button, styles.cancelButton]}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
            {uploadingLogo && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="large" color="#2C3E50" />
                <Text style={styles.uploadingText}>Uploading Logo...</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default Settings

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#2C3E50',
    borderRadius: 25,
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  changePasswordButton: {
    backgroundColor: '#8e44ad',
    borderRadius: 25,
    marginBottom: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  changePasswordButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  container: {
    backgroundColor: '#f3f3f3',
    flex: 1,
    padding: 16,
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: '#2980B9',
    borderRadius: 25,
    marginBottom: 16,
    paddingVertical: 12,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  infoDisplayContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
  },
  infoDisplayText: {
    color: '#333',
    fontSize: 16,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  label: {
    color: '#555',
    fontSize: 16,
    marginBottom: 4,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 25,
  },
  logoutText: {
    color: '#fff',
    fontSize: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  userInfoContainer: {
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
  },
  userInfoText: {
    color: '#333',
    fontSize: 18,
  },
  uploadingContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  uploadingText: {
    color: '#333',
    fontSize: 16,
    marginTop: 8,
  },
  logoPreviewContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
    alignItems: 'center',
  },
  logoPreview: {
    width: 150,
    height: 50,
    marginTop: 8,
  },
  logoPlaceholder: {
    width: 150,
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  logoPlaceholderText: {
    color: '#666',
    fontSize: 14,
  },
})
