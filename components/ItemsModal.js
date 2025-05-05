import React from 'react'
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { Picker } from '@react-native-picker/picker'

const ItemsModal = ({
  visible,
  onClose,
  itemSearchQuery,
  setItemSearchQuery,
  loadingItemsModal,
  allItems,
  selectedItemId,
  setSelectedItemId,
  onConfirm,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.itemsModalContainer}>
          <Text style={styles.modalTitle}>Select an Item</Text>
          <TextInput
            style={styles.itemSearchInput}
            placeholder="Search items..."
            value={itemSearchQuery}
            onChangeText={setItemSearchQuery}
          />
          {loadingItemsModal ? (
            <ActivityIndicator size="small" color="#1DA1F2" />
          ) : (
            <Picker
              selectedValue={selectedItemId}
              onValueChange={itemId => setSelectedItemId(itemId)}
            >
              {allItems
                .filter(item =>
                  (item.name || '')
                    .toLowerCase()
                    .includes(itemSearchQuery.toLowerCase())
                )
                .map(item => (
                  <Picker.Item
                    key={item.id}
                    label={`${item.name} - $${item.unitPrice}`}
                    value={item.id}
                  />
                ))}
            </Picker>
          )}
          <View style={styles.modalButtonsRow}>
            <TouchableOpacity
              onPress={onConfirm}
              style={styles.modalConfirmButton}
            >
              <Text style={styles.modalConfirmButtonText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

export default ItemsModal

const styles = StyleSheet.create({
  itemSearchInput: {
    backgroundColor: '#F5F8FA',
    borderColor: '#E1E8ED',
    borderRadius: 4,
    borderWidth: 1,
    color: '#14171A',
    fontSize: 14,
    marginBottom: 10,
    padding: 8,
  },
  itemsModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 16,
    width: '80%',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  modalCloseButton: {
    backgroundColor: '#ECECEC',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalCloseButtonText: { color: '#14171A', fontSize: 14, fontWeight: '600' },
  modalConfirmButton: {
    backgroundColor: '#17BF63',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalConfirmButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    flex: 1,
    justifyContent: 'center',
  },
  modalTitle: {
    color: '#14171A',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
})
