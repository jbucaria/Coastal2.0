'use client'

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { firestore } from '@/firebaseConfig'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import useTicket from '@/hooks/useTicket'
import { formatDateWithOrdinal } from '@/utils/helpers'
import { Share } from 'react-native'
import * as Print from 'expo-print'
import { Asset } from 'expo-asset'
import coastalLogo from '../../assets/images/CoastalRestorationServicesLogo-FinalTransparentBG.jpg'
import * as FileSystem from 'expo-file-system'

const DryLetterListScreen = () => {
  const params = useLocalSearchParams()
  const { projectId } = params
  const router = useRouter()
  const [letters, setLetters] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLetter, setSelectedLetter] = useState(null)
  const [headerHeight, setHeaderHeight] = useState(0)
  // Fetch ticket data for naming
  const { ticket } = useTicket(projectId)

  useEffect(() => {
    const fetchLetters = async () => {
      try {
        const col = collection(firestore, 'tickets', projectId, 'dryLetters')
        const snapshot = await getDocs(col)
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setLetters(docs)
      } catch (err) {
        console.error('Error fetching dry letters:', err)
        Alert.alert('Error', 'Failed to load saved letters.')
      } finally {
        setLoading(false)
      }
    }
    if (projectId) fetchLetters()
  }, [projectId])

  const toDate = ts => {
    if (!ts) return null
    if (ts.toDate) return ts.toDate()
    if (ts.seconds) return new Date(ts.seconds * 1000)
    return new Date(ts)
  }

  const handleShare = async content => {
    try {
      // Ensure logo asset is downloaded
      const asset = Asset.fromModule(coastalLogo)
      await asset.downloadAsync()
      const fileUri = asset.localUri
      // Read logo file as base64
      const base64Logo = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 })
      // Build HTML with styling and embedded base64 logo
      const html = `
        <html>
          <head>
            <meta charset="utf-8"/>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .header { text-align: center; margin-bottom: 40px; }
              .header img { max-width: 200px; height: auto; }
              .content { white-space: pre-wrap; font-size: 12px; line-height: 1.5; }
            </style>
          </head>
          <body>
            <div class="header"><img src="data:image/jpeg;base64,${base64Logo}" /></div>
            <div class="content">${content}</div>
          </body>
        </html>
      `
      // Generate PDF and rename file to include property street and 'Dry Letter'
      const { uri } = await Print.printToFileAsync({ html })
      const rawStreet = ticket?.street || 'DryLetter'
      const safeName = rawStreet.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_')
      const fileName = `${safeName}_Dry_Letter.pdf`
      const destUri = `${FileSystem.documentDirectory}${fileName}`
      try { await FileSystem.deleteAsync(destUri, { idempotent: true }) } catch {}
      await FileSystem.moveAsync({ from: uri, to: destUri })
      await Share.share({ url: destUri, title: fileName })
    } catch (err) {
      console.error('Error sharing PDF:', err)
      Alert.alert('Error', 'Failed to generate PDF for sharing.')
    }
  }
  
  const handleDelete = async () => {
    try {
      await deleteDoc(doc(firestore, 'tickets', projectId, 'dryLetters', selectedLetter.id))
      Alert.alert('Deleted', 'Dry letter deleted.')
      // Remove from list and go back to list view
      setLetters(prev => prev.filter(l => l.id !== selectedLetter.id))
      setSelectedLetter(null)
    } catch (err) {
      console.error('Error deleting dry letter:', err)
      Alert.alert('Error', 'Failed to delete dry letter.')
    }
  }

  const headerOptions = []

  return (
    <View style={styles.container}>
      <HeaderWithOptions
        title={selectedLetter ? 'Letter Preview' : 'Saved Letters'}
        onBack={() => {
          if (selectedLetter) setSelectedLetter(null)
          else router.back()
        }}
        onOptions={() => {}}
        options={headerOptions}
        onHeightChange={h => setHeaderHeight(h)}
      />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1DA1F2" />
        </View>
      ) : selectedLetter ? (
        <View style={[styles.previewContainer, { paddingTop: headerHeight + 8 }]}>  
          <ScrollView contentContainerStyle={styles.previewContent}>
            <Text style={styles.previewText}>{selectedLetter.content}</Text>
          </ScrollView>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => handleShare(selectedLetter.content)}
            >
              <Text style={styles.buttonText}>Share PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <Text style={styles.buttonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.listContainer, { paddingTop: headerHeight + 8 }]}>  
          {letters.length === 0 ? (
            <Text style={styles.emptyText}>No letters saved yet.</Text>
          ) : (
            <FlatList
              data={letters}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const date = toDate(item.createdAt)
                return (
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => setSelectedLetter(item)}
                  >
                    <Text style={styles.listItemText}>
                      {item.templateId} - {date ? formatDateWithOrdinal(date) : ''}
                    </Text>
                  </TouchableOpacity>
                )
              }}
            />
          )}
        </View>
      )}
    </View>
  )
}

export default DryLetterListScreen

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { flex: 1, paddingHorizontal: 16 },
  listItem: { padding: 12, borderBottomWidth: 1, borderColor: '#ddd' },
  listItemText: { fontSize: 16, color: '#14171A' },
  emptyText: { marginTop: 32, textAlign: 'center', color: '#555' },
  previewContainer: { flex: 1, paddingHorizontal: 16 },
  previewContent: { paddingBottom: 80 },
  previewText: { fontSize: 14, color: '#14171A', lineHeight: 22 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  shareButton: { flex: 1, backgroundColor: '#1DA1F2', padding: 14, borderRadius: 6, alignItems: 'center', marginRight: 8 },
  deleteButton: { flex: 1, backgroundColor: '#dc3545', padding: 14, borderRadius: 6, alignItems: 'center', marginLeft: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})