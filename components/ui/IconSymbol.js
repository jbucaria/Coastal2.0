import React from 'react'
import { Platform } from 'react-native'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { SymbolView } from 'expo-symbols'

// Mapping from SF Symbol names to MaterialIcons names for non-iOS platforms
const MAPPING = {
  plus: 'add',
  home: 'home',
  'dollarsign.circle': 'attach-money',
  map: 'map',
  gear: 'settings',
  checkmark: 'check',
  magnifyingglass: 'search',
  calendar: 'calendar-today',
  'xmark.circle': 'cancel',
  'arrow.left.square': 'arrow-back',
  'arrow.backward.circle': 'arrow-back',
  'house.circle': 'home',
  ellipsis: 'more-vert',
  'slider.horizontal.3': 'sort',
  'plus.circle': 'add-circle',
  'house.fill': 'home',
  'map.circle': 'map',
  trash: 'delete', // Added previously
  clock: 'schedule', // Added previously
  'text.document': 'description', // For inspection complete
  'hammer.circle.fill': 'build', // For remediation required (no exact circle fill match)
  'pencil.and.ruler.fill': 'edit', // For remediation data (approximation)
  'fan.fill': 'toys', // For equipment total (fan approximation)
  'bubble.left.and.text.bubble.right.fill': 'chat', // For message count
  'person.crop.square': 'person',
  'arrow-back-circle': 'arrow-back',
  'home-circle': 'home',
  'ellipsis-horizontal': 'more-vert', // For on-site status (approximation)
}

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}) {
  if (Platform.OS === 'ios') {
    // Use SF Symbols on iOS
    return (
      <SymbolView
        name={name}
        size={size}
        tintColor={color}
        weight={weight}
        style={style}
        resizeMode="scaleAspectFit"
      />
    )
  } else {
    // Use MaterialIcons on Android and web
    const mappedName = MAPPING[name] || 'help-outline'
    return (
      <MaterialIcons
        name={mappedName}
        size={size}
        color={color}
        style={style}
      />
    )
  }
}
