import React from 'react'

import { PlatformPressable } from '@react-navigation/elements'
import * as Haptics from 'expo-haptics'

export default function HapticTab(props) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={ev => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        }
        if (props.onPressIn) {
          props.onPressIn(ev)
        }
      }}
    />
  )
}
