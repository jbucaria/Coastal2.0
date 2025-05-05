import React from 'react'
import { TouchableOpacity, Text } from 'react-native'
import useEquipmentStore from '@/store/useEquipmentStore'

const EquipmentButton = ({ onPress }) => {
  // Access Zustand state
  const { equipmentOnSite } = useEquipmentStore(state => ({
    equipmentOnSite: state.equipmentOnSite,
  }))

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ padding: 10, backgroundColor: '#3498db', borderRadius: 8 }}
    >
      <Text style={{ color: '#fff', fontWeight: 'bold' }}>
        {equipmentOnSite ? 'Edit Equipment' : 'Add Equipment'}
      </Text>
    </TouchableOpacity>
  )
}

export { EquipmentButton }
