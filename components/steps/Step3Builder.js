import React from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { styles } from '../../styles'

const Step3Builder = ({
  isAddingNew,
  setIsAddingNew,
  searchQuery,
  setSearchQuery,
  suggestions,
  newName,
  setNewName,
  newEmail,
  setNewEmail,
  newPhone,
  setNewPhone,
  newCompanyName,
  setNewCompanyName,
  newCompanyAddress,
  setNewCompanyAddress,
  loading,
  handleSelectCustomer,
  handleSaveNewCustomer,
  setNewTicket,
}) => (
  <View style={styles.card}>
    <Text style={styles.sectionTitle}>Builder</Text>
    {isAddingNew ? (
      <View>
        <TextInput
          style={styles.modalInput}
          placeholder="Name"
          value={newName}
          onChangeText={setNewName}
        />
        <TextInput
          style={styles.modalInput}
          placeholder="Email"
          value={newEmail}
          onChangeText={setNewEmail}
        />
        <TextInput
          style={styles.modalInput}
          placeholder="Phone Number"
          value={newPhone}
          onChangeText={setNewPhone}
          keyboardType="phone-pad"
        />
        <TextInput
          style={styles.modalInput}
          placeholder="Company Name"
          value={newCompanyName}
          onChangeText={setNewCompanyName}
        />
        <TextInput
          style={styles.modalInput}
          placeholder="Company Address"
          value={newCompanyAddress}
          onChangeText={setNewCompanyAddress}
        />
        {loading ? (
          <ActivityIndicator size="small" color="#2980b9" />
        ) : (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveNewCustomer}
          >
            <Text style={styles.saveButtonText}>Save Customer</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setIsAddingNew(false)}>
          <Text style={styles.modalClose}>Back to Search</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <View>
        <TextInput
          style={styles.modalInput}
          placeholder="Search builder by name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <ScrollView style={styles.modalList}>
          {suggestions.map(cust => (
            <TouchableOpacity
              key={cust.id}
              onPress={() => handleSelectCustomer(cust, setNewTicket)}
              style={styles.modalItem}
            >
              <Text style={styles.modalItemText}>{cust.displayName}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity onPress={() => setIsAddingNew(true)}>
          <Text style={styles.addNewText}>+ Add New Customer</Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
)

export default Step3Builder
