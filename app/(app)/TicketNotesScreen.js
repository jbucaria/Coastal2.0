'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Keyboard,
} from 'react-native'
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
} from 'firebase/firestore'
import { auth, firestore } from '@/firebaseConfig'
import { useUserStore } from '@/store/useUserStore'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'

const MessageItem = React.memo(({ item }) => {
  const initials = item.userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const isMyMessage = item.userId === auth.currentUser.uid

  return (
    <View
      style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.otherMessage,
      ]}
    >
      <View
        style={[
          styles.profileImage,
          { backgroundColor: isMyMessage ? '#007AFF' : '#C7C7CC' },
        ]}
      >
        <Text style={styles.initialsText}>{initials}</Text>
      </View>
      <View
        style={[
          styles.messageContent,
          isMyMessage ? styles.myMessageContent : styles.otherMessageContent,
        ]}
      >
        <Text style={styles.messageText}>{item.message}</Text>
      </View>
    </View>
  )
})

const TicketNotesScreen = () => {
  const params = useLocalSearchParams()
  const { projectId } = params
  const router = useRouter()

  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [headerHeight, setHeaderHeight] = useState(0)
  const flatListRef = useRef(null)

  const { user } = useUserStore()

  useEffect(() => {
    if (!projectId) {
      console.log('No projectId provided')
      setLoading(false)
      return
    }

    const q = query(
      collection(firestore, 'ticketNotes'),
      where('projectId', '==', projectId),
      orderBy('timestamp', 'asc')
    )
    const unsubscribe = onSnapshot(
      q,
      snapshot => {
        const chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        setMessages(chats)
        setLoading(false)
        flatListRef.current?.scrollToEnd({ animated: true })
      },
      error => {
        console.error('Error fetching chat messages:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [projectId])

  useEffect(() => {
    const handleKeyboardShow = () => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }

    const keyboardShowListener = Keyboard.addListener(
      'keyboardDidShow',
      handleKeyboardShow
    )

    return () => {
      keyboardShowListener.remove()
    }
  }, [])

  const handleSend = useCallback(async () => {
    if (newMessage.trim() === '') return

    try {
      await addDoc(collection(firestore, 'ticketNotes'), {
        projectId: projectId,
        userId: auth.currentUser.uid,
        userName: user?.displayName || user?.email || auth.currentUser.email,
        message: newMessage,
        timestamp: serverTimestamp(),
      })

      const projectRef = doc(firestore, 'tickets', projectId)
      await updateDoc(projectRef, {
        messageCount: increment(1),
      })

      setNewMessage('')
      flatListRef.current?.scrollToEnd({ animated: true })
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }, [newMessage, projectId, user])

  const handleBack = () => {
    router.back()
  }

  const headerOptions = [
    // Add any options here if needed, e.g., { label: 'Option', onPress: () => {} }
  ]

  if (loading) {
    return (
      <View style={styles.container}>
        <HeaderWithOptions
          title="Notes"
          onBack={handleBack}
          options={headerOptions}
          showHome={true}
          onHeightChange={height => setHeaderHeight(height)}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <HeaderWithOptions
        title="Notes"
        onBack={handleBack}
        options={headerOptions}
        showHome={true}
        onHeightChange={height => setHeaderHeight(height)}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={headerHeight + 10}
      >
        <FlatList
          data={messages}
          renderItem={({ item }) => <MessageItem item={item} />}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.chatList,
            { paddingTop: headerHeight },
          ]}
          ref={flatListRef}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            value={newMessage}
            onChangeText={setNewMessage}
          />
          <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

export default TicketNotesScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chatList: {
    padding: 10,
    paddingBottom: 80,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  profileImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageContent: {
    padding: 10,
    borderRadius: 10,
    maxWidth: '80%',
    marginRight: 5,
    marginBottom: 2,
  },
  myMessageContent: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 0,
  },
  otherMessageContent: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 0,
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sendButton: {
    marginLeft: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#2C3E50',
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
