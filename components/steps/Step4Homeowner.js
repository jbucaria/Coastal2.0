import React from 'react'
import { View, Text, TextInput } from 'react-native'
import { formatPhoneNumber } from '@/utils/helpers'
import { styles } from '../../styles'

const Step4Homeowner = ({ newTicket, setNewTicket }) => (
  <View style={styles.card}>
    <View
      style={[
        styles.selectionContainer,
        {
          flexDirection: 'row',
          justifyContent: 'space-between',
        },
      ]}
    >
      <Text style={styles.modalTitle}>Homeowner</Text>
    </View>
    <TextInput
      style={styles.inputField}
      placeholder="Homeowner Name"
      value={newTicket.homeOwnerName}
      onChangeText={text => setNewTicket({ ...newTicket, homeOwnerName: text })}
    />
    <TextInput
      style={styles.inputField}
      placeholder="Homeowner Number"
      value={newTicket.homeOwnerNumber}
      onChangeText={text => {
        const formatted = formatPhoneNumber(text)
        setNewTicket(prev => ({
          ...prev,
          homeOwnerNumber: formatted,
        }))
      }}
      keyboardType="phone-pad"
    />
  </View>
)

export default Step4Homeowner
