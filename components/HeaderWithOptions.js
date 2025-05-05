'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'expo-router'
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  View,
  Platform,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { BlurView } from 'expo-blur'

const HeaderWithOptions = ({
  title,
  onBack,
  options,
  showHome,
  onHeightChange,
}) => {
  const [modalVisible, setModalVisible] = useState(false)
  const insets = useSafeAreaInsets()
  const baseHeaderHeight = 40 // Reduced header height to make the header less tall
  const headerHeight = insets.top + baseHeaderHeight + 8 // Dynamic height
  const router = useRouter()

  const scrollY = useRef(new Animated.Value(0)).current
  const translateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -100],
    extrapolate: 'clamp',
  })

  // Pass the calculated height to the parent
  useEffect(() => {
    if (onHeightChange) {
      onHeightChange(headerHeight)
    }
  }, [headerHeight, onHeightChange])

  const handleOptionPress = option => {
    setModalVisible(false)
    if (option.onPress) {
      option.onPress()
    }
  }

  return (
    <>
      <Animated.View
        style={[
          styles.headerContainer,
          { height: headerHeight, transform: [{ translateY }] },
        ]}
      >
        <BlurView
          intensity={90}
          tint="default"
          style={styles.blurBackground}
          experimentalBlurMethod={
            Platform.OS === 'android' ? 'dither' : undefined
          }
        >
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <View style={styles.leftContainer}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                  onBack()
                }}
                style={styles.headerButton}
              >
                <Ionicons name="arrow-back-circle" size={28} color="black" />
              </TouchableOpacity>
              {showHome && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                    router.push('/(tabs)')
                  }}
                  style={styles.headerButton}
                >
                  <Ionicons name="home" size={28} color="black" />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.centerContainer}>
              <Text style={styles.topBarTitle}>{title}</Text>
            </View>
            <View style={styles.rightContainer}>
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={styles.headerButton}
              >
                <Ionicons name="ellipsis-horizontal" size={28} color="black" />
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Animated.View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.optionsModal}>
              {options &&
                options.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.optionItem}
                    onPress={() => handleOptionPress(option)}
                  >
                    <Text style={styles.optionText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              <TouchableOpacity
                style={[styles.optionItem, styles.optionCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.optionText, styles.optionCancelText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerButton: {
    marginRight: 10,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'black',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  optionsModal: {
    width: 240,
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingVertical: 8,
    elevation: 5,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  optionText: {
    fontSize: 16,
    color: '#14171A',
  },
  optionCancel: {
    borderBottomWidth: 0,
  },
  optionCancelText: {
    fontWeight: '700',
    color: '#E0245E',
  },
})

export { HeaderWithOptions }
