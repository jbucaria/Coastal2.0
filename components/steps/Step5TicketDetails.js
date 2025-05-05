import React from 'react'
import { View, Text, TextInput, TouchableOpacity, Modal } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { ScrollView as RNScrollView } from 'react-native'
import PhotoGallery from '@/components/PhotoGallery'
import { styles } from '../../styles'

const Step5TicketDetails = ({
  newTicket,
  setNewTicket,
  newNote,
  setNewNote,
  jobType,
  vacancy,
  inspectorModalVisible,
  jobTypeModalVisible,
  vacancyModalVisible,
  addPhotoModalVisible,
  handleToggleInspectorPicker,
  handleTogglePicker,
  handleToggleVacancyPicker,
  handleRemovePhoto,
  handleJobTypeChange,
  handleVacancyChange,
  handleAddPhoto,
  setInspectorModalVisible,
  setAddPhotoModalVisible,
}) => (
  <View style={styles.stepContainer}>
    {/* Ticket Details Section */}
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Ticket Details</Text>
      <View style={styles.inputGroup}>
        <TouchableOpacity
          onPress={handleToggleInspectorPicker}
          style={styles.pickerButton}
          accessibilityLabel="Select Inspector"
        >
          <Text style={styles.pickerButtonText}>
            {newTicket.inspectorName
              ? newTicket.inspectorName
              : 'Select Inspector'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.inputGroup}>
        <TextInput
          style={styles.inputField}
          placeholder="Reason for visit"
          value={newTicket.reason}
          onChangeText={text => setNewTicket({ ...newTicket, reason: text })}
          multiline
          numberOfLines={4}
          accessibilityLabel="Reason for visit"
        />
      </View>
      <View style={styles.inputGroup}>
        <TextInput
          style={styles.inputField}
          placeholder="Add a note for this ticket..."
          value={newNote}
          onChangeText={setNewNote}
          multiline
          numberOfLines={3}
          accessibilityLabel="Ticket note"
        />
      </View>
      <View style={styles.inputGroup}>
        <TouchableOpacity
          onPress={handleTogglePicker}
          style={styles.pickerButton}
          accessibilityLabel="Select Job Type"
        >
          <Text style={styles.pickerButtonText}>
            {jobType ? jobType : 'Select Job Type'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.inputGroup}>
        <TouchableOpacity
          onPress={handleToggleVacancyPicker}
          style={styles.pickerButton}
          accessibilityLabel="Select Occupancy"
        >
          <Text style={styles.pickerButtonText}>
            {vacancy === 'occupied'
              ? 'Occupied'
              : vacancy === 'unoccupied'
              ? 'Unoccupied'
              : 'Select Occupancy'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>

    {/* Photos Section */}
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Photos</Text>
      {newTicket.ticketPhotos.length > 0 ? (
        <RNScrollView horizontal style={styles.photoGallery}>
          {newTicket.ticketPhotos.map((photo, index) => (
            <View key={index} style={styles.photoContainer}>
              <PhotoGallery
                photos={[photo]}
                onRemovePhoto={() => handleRemovePhoto(index)}
              />
            </View>
          ))}
        </RNScrollView>
      ) : (
        <Text style={styles.noPhotosText}>No photos added yet.</Text>
      )}
      <TouchableOpacity
        onPress={() => setAddPhotoModalVisible(true)}
        style={styles.pickerButton}
        accessibilityLabel="Add Photo"
      >
        <Text style={styles.pickerButtonText}>Add Photo</Text>
      </TouchableOpacity>
    </View>

    {/* Inspector Modal */}
    <Modal
      visible={inspectorModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleToggleInspectorPicker}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Select Inspector</Text>
          <Picker
            selectedValue={newTicket.inspectorName}
            onValueChange={itemValue => {
              setNewTicket({ ...newTicket, inspectorName: itemValue })
              handleToggleInspectorPicker()
            }}
            style={styles.modalPicker}
            itemStyle={styles.pickerItem}
            accessibilityLabel="Select Inspector"
          >
            <Picker.Item label="Select Inspector" value="" />
            <Picker.Item label="Bobby Blasewitz" value="Bobby Blasewitz" />
            <Picker.Item label="David Sprott" value="David Sprott" />
            <Picker.Item label="John Bucaria" value="John Bucaria" />
          </Picker>
          <TouchableOpacity
            onPress={handleToggleInspectorPicker}
            style={styles.modalCloseButton}
            accessibilityLabel="Close Inspector Modal"
          >
            <Text style={styles.modalCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* Job Type Modal */}
    <Modal
      visible={jobTypeModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleTogglePicker}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Select Job Type</Text>
          <Picker
            selectedValue={jobType}
            onValueChange={itemValue => {
              handleJobTypeChange(itemValue)
              handleTogglePicker()
            }}
            style={styles.modalPicker}
            itemStyle={styles.pickerItem}
            accessibilityLabel="Select Job Type"
          >
            <Picker.Item label="Select Job Type" value="" />
            <Picker.Item label="Leak Detection" value="leak detection" />
            <Picker.Item label="Inspection" value="inspection" />
            <Picker.Item label="Containment" value="containment" />
            <Picker.Item label="Flood" value="flood" />
            <Picker.Item label="Mold Job" value="mold job" />
            <Picker.Item label="Wipe Down" value="wipe down" />
          </Picker>
          <TouchableOpacity
            onPress={handleTogglePicker}
            style={styles.modalCloseButton}
            accessibilityLabel="Close Job Type Modal"
          >
            <Text style={styles.modalCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* Vacancy Modal */}
    <Modal
      visible={vacancyModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleToggleVacancyPicker}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Select Occupancy</Text>
          <Picker
            selectedValue={vacancy}
            onValueChange={itemValue => {
              handleVacancyChange(itemValue)
              handleToggleVacancyPicker()
            }}
            style={styles.modalPicker}
            itemStyle={styles.pickerItem}
            accessibilityLabel="Select Occupancy"
          >
            <Picker.Item label="Select Occupancy" value="" />
            <Picker.Item label="Occupied" value="occupied" />
            <Picker.Item label="Unoccupied" value="unoccupied" />
          </Picker>
          <TouchableOpacity
            onPress={handleToggleVacancyPicker}
            style={styles.modalCloseButton}
            accessibilityLabel="Close Occupancy Modal"
          >
            <Text style={styles.modalCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* Add Photo Modal */}
    <Modal
      visible={addPhotoModalVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setAddPhotoModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Add a Photo</Text>
          <Text style={styles.modalMessage}>
            Do you want to add a photo to this ticket?
          </Text>
          <TouchableOpacity
            onPress={() => {
              handleAddPhoto()
              setAddPhotoModalVisible(false)
            }}
            style={styles.modalConfirmButton}
            accessibilityLabel="Confirm Add Photo"
          >
            <Text style={styles.modalConfirmButtonText}>Add Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAddPhotoModalVisible(false)}
            style={styles.modalCloseButton}
            accessibilityLabel="Cancel Add Photo"
          >
            <Text style={styles.modalCloseButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  </View>
)
