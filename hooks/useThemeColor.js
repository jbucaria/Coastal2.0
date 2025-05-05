/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/Colors'
import { useColorScheme } from '@/hooks/useColorScheme'

export function useThemeColor(props, colorName) {
  const theme = useColorScheme() || 'light' // Default to 'light' if no theme is set
  const colorFromProps = props?.[theme] // Use optional chaining to safely access props

  return colorFromProps || Colors[theme][colorName]
}
