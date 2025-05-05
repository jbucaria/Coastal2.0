import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native'
import { IconSymbol } from '@/components/ui/IconSymbol'

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const AnimatedIconLegend = () => {
  const [expanded, setExpanded] = useState(false)

  const toggleExpand = () => {
    // Animate next layout change
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(prev => !prev)
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: expanded ? '#fff' : 'transparent' },
      ]}
    >
      <TouchableOpacity onPress={toggleExpand} style={styles.header}>
        <Text style={styles.headerText}>
          {expanded ? 'Hide' : 'Show Icon Legend'}
        </Text>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.legendContent}>
          <View style={styles.legendItem}>
            <IconSymbol name="text.document" size={30} color="green" />
            <Text style={styles.legendText}>
              Inspection Complete (View Report)
            </Text>
          </View>
          <View style={styles.legendItem}>
            <IconSymbol name="hammer" size={30} color="green" />
            <Text style={styles.legendText}>
              Remediation Required (Add Data)
            </Text>
          </View>
          <View style={styles.legendItem}>
            <IconSymbol name="pencil.and.ruler" size={30} color="green" />
            <Text style={styles.legendText}>View Remediation Report</Text>
          </View>
          <View style={styles.legendItem}>
            <IconSymbol name="person.crop.square" size={30} color="green" />
            <Text style={styles.legendText}>On Site (Leave Site)</Text>
          </View>
          <View style={styles.legendItem}>
            <IconSymbol name="fan" size={33} color="green" />
            <Text style={styles.legendText}>Equipment Count</Text>
          </View>
          <View style={styles.legendItem}>
            <IconSymbol
              name="bubble.left.and.exclamationmark.bubble.right"
              size={33}
              color="green"
            />
            <Text style={styles.legendText}>Notes</Text>
          </View>
        </View>
      )}
    </View>
  )
}

export { AnimatedIconLegend }

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    borderTopWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  header: {
    paddingVertical: 8,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  legendContent: {
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2C3E50',
  },
})
