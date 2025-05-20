'use client'

import React, { useState, useEffect } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native'
import Pdf from 'react-native-pdf'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system'
import { getStorage, ref, deleteObject } from 'firebase/storage'
import { doc, updateDoc, deleteField } from 'firebase/firestore'
import { firestore, app as firebaseApp } from '@/firebaseConfig'

import useTicket from '@/hooks/useTicket'
import useProjectStore from '@/store/useProjectStore'
import { generatePdf } from '@/utils/pdfGenerator'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import { PhotoModal } from '@/components/PhotoModal'
import { TicketDetailsCard, RoomCard } from '@/components/Cards'

const ViewReportScreen = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const projectIdFromParams = params.projectId
  const { projectId: storeProjectId } = useProjectStore()
  const projectId = projectIdFromParams ?? storeProjectId

  const {
    ticket,
    loading: ticketLoading,
    error: ticketError,
    refreshTicket,
  } = useTicket(projectId)

  const [pdfUri, setPdfUri] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isViewerVisible, setIsViewerVisible] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null) // Used by handlePhotoPress and PhotoModal
  const [headerHeight, setHeaderHeight] = useState(0)
  const marginBelowHeader = 8

  useEffect(() => {
    if (ticket) {
      const urlFromTicket =
        ticket.inspectionPdfUrl || ticket.remediationPdfUrl || ticket.pdfUrl
      const currentStoragePath =
        ticket.inspectionPdfStoragePath || ticket.remediationPdfStoragePath

      if (urlFromTicket) {
        if (pdfUri !== urlFromTicket) {
          setPdfUri(urlFromTicket)
        }
      } else {
        if (pdfUri) {
          setPdfUri(null)
        }
      }
    } else if (!ticketLoading && pdfUri) {
      setPdfUri(null)
    }

    if (ticketError) {
      console.error('Error in ticket data for useEffect:', ticketError.message)
    }
  }, [ticket, ticketLoading, ticketError])

  const handleGenerateReport = async () => {
    if (!ticket || typeof ticket !== 'object' || !ticket.id) {
      console.error('handleGenerateReport - Invalid ticket data:', ticket)
      return
    }
    setIsProcessing(true)
    try {
      const newPdfRemoteUrl = await generatePdf(ticket)

      if (newPdfRemoteUrl) {
        setPdfUri(newPdfRemoteUrl)
        setIsViewerVisible(true)

        if (typeof refreshTicket === 'function') {
          refreshTicket()
        }
      } else {
        Alert.alert('Error', 'PDF generation did not return a URL.')
      }
    } catch (error) {
      console.error('Error during PDF generation/upload process:', error)
      Alert.alert(
        'Error',
        `An error occurred while generating the PDF: ${error.message}`
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeletePdf = async () => {
    if (!ticket || !ticket.id) {
      Alert.alert('Error', 'Ticket data is missing.')
      return
    }

    const storagePathToDelete =
      ticket.inspectionPdfStoragePath || ticket.remediationPdfStoragePath
    const urlFieldToDelete = ticket.inspectionPdfUrl
      ? 'inspectionPdfUrl'
      : ticket.remediationPdfUrl
      ? 'remediationPdfUrl'
      : null
    const timestampFieldToDelete = ticket.inspectionPdfUrl
      ? 'inspectionReportGeneratedAt'
      : ticket.remediationPdfUrl
      ? 'remediationReportGeneratedAt'
      : null
    const storagePathFieldToDelete = ticket.inspectionPdfStoragePath
      ? 'inspectionPdfStoragePath'
      : ticket.remediationPdfStoragePath
      ? 'remediationPdfStoragePath'
      : null

    if (
      !storagePathToDelete ||
      !urlFieldToDelete ||
      !timestampFieldToDelete ||
      !storagePathFieldToDelete
    ) {
      Alert.alert(
        'Error',
        'PDF information is incomplete in the ticket data. Cannot delete.'
      )
      console.error('Missing storagePath or field names for deletion', {
        ticket,
      })
      return
    }

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this PDF report? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true)
            try {
              const storage = getStorage(firebaseApp)
              const pdfRef = ref(storage, storagePathToDelete)
              await deleteObject(pdfRef)

              const ticketDocRef = doc(firestore, 'tickets', ticket.id)
              const updates = {}
              updates[urlFieldToDelete] = deleteField()
              updates[timestampFieldToDelete] = deleteField()
              updates[storagePathFieldToDelete] = deleteField()

              await updateDoc(ticketDocRef, updates)

              setPdfUri(null)
              setIsViewerVisible(false)
              Alert.alert('Success', 'PDF report has been deleted.')

              if (typeof refreshTicket === 'function') {
                refreshTicket()
              }
            } catch (error) {
              console.error('Error deleting PDF:', error)
              Alert.alert('Error', `Failed to delete PDF: ${error.message}`)
            } finally {
              setIsProcessing(false)
            }
          },
        },
      ]
    )
  }

  const handleViewReport = () => {
    if (pdfUri) {
      setIsViewerVisible(true)
    } else {
      console.warn(
        'Cannot view report: pdfUri is null. Try generating the report.'
      )
    }
  }

  const handleShareReport = async () => {
    if (!pdfUri) {
      return
    }
    let shareUri = pdfUri
    setIsProcessing(true)

    if (!shareUri.startsWith('file://')) {
      try {
        const filenameTimestamp = Date.now()
        const remoteFilename =
          shareUri.split('/').pop().split('?')[0] ||
          `report-${filenameTimestamp}`
        const localFilename = remoteFilename.endsWith('.pdf')
          ? remoteFilename
          : `${remoteFilename}.pdf`
        const localPath = FileSystem.cacheDirectory + localFilename
        const downloadResult = await FileSystem.downloadAsync(
          shareUri,
          localPath
        )
        shareUri = downloadResult.uri
      } catch (downloadError) {
        console.error('Error downloading PDF for sharing:', downloadError)
        setIsProcessing(false)
        return
      }
    }

    try {
      const fileInfo = await FileSystem.getInfoAsync(shareUri)
      if (!fileInfo.exists) {
        console.error('PDF file does not exist at share URI:', shareUri)
        // setIsProcessing(false) is in finally
        return
      }
      const isAvailable = await Sharing.isAvailableAsync()
      if (!isAvailable) {
        console.warn('Sharing is not available on this device')
        // setIsProcessing(false) is in finally
        return
      }
      await Sharing.shareAsync(shareUri, {
        mimeType: 'application/pdf', // Ensure this is correct
        dialogTitle: `Share Inspection Report ${ticket?.ticketNumber || 'N/A'}`,
        UTI: 'com.adobe.pdf', // iOS specific
      })
    } catch (error) {
      console.error('Error sharing PDF:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  // ========================================================================
  // >>>>>>>>>>>> ADDED MISSING FUNCTIONS handlePhotoPress and closePhoto HERE <<<<<<<<<<<<<<
  // ========================================================================
  const handlePhotoPress = uri => {
    if (uri) {
      setSelectedPhoto(uri)
    }
  }

  const closePhoto = () => {
    setSelectedPhoto(null)
  }
  // ========================================================================

  const currentPdfStoragePath =
    ticket?.inspectionPdfStoragePath || ticket?.remediationPdfStoragePath

  const headerOptions = [
    {
      label: 'Edit Report',
      onPress: () => {
        if (isProcessing) return
        router.push({
          pathname: '/EditReportScreen',
          params: { projectId },
        })
      },
      disabled: isProcessing,
    },
    ...(pdfUri
      ? [
          {
            label: 'View PDF',
            onPress: handleViewReport,
            disabled: isProcessing,
          },
          ...(currentPdfStoragePath
            ? [
                {
                  label: 'Delete PDF',
                  onPress: handleDeletePdf,
                  disabled: isProcessing,
                  isDestructive: true,
                },
              ]
            : []),
        ]
      : [
          {
            label: 'Generate PDF',
            onPress: handleGenerateReport,
            disabled:
              ticketLoading ||
              isProcessing ||
              !ticket ||
              typeof ticket !== 'object',
          },
        ]),
  ]

  const modalHeaderOptions = [
    {
      label: 'Share',
      onPress: handleShareReport,
      disabled: isProcessing,
    },
  ]

  if (ticketLoading && !ticket) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Loading report data...</Text>
      </View>
    )
  }

  if (ticketError && !ticket) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>
          Error loading report data: {ticketError.message}
        </Text>
      </View>
    )
  }

  if (!ticket && !ticketLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Report data not found or unavailable for Project ID: {projectId}.
        </Text>
      </View>
    )
  }

  const inspectionRooms = ticket?.inspectionData?.rooms || []
  const streetPhotoURL = ticket?.streetPhoto?.downloadURL || null

  return (
    <View style={styles.fullScreenContainer}>
      <HeaderWithOptions
        title="Inspection Report"
        onBack={() => {
          if (isProcessing) return
          router.canGoBack() ? router.back() : router.push('/(tabs)')
        }}
        options={headerOptions}
        showHome={true}
        onHeightChange={setHeaderHeight}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingTop:
              headerHeight > 0 ? headerHeight + marginBelowHeader : 60,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {isProcessing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingOverlayText}>Processing...</Text>
          </View>
        )}

        {ticketError && ticket && (
          <View
            style={{
              padding: 10,
              backgroundColor: 'lightyellow',
              marginVertical: 10,
              borderRadius: 5,
            }}
          >
            <Text style={{ color: '#856404', textAlign: 'center' }}>
              Notice: There might be an issue with refreshing some data.{' '}
              {ticketError.message}
            </Text>
          </View>
        )}
        <View style={styles.reportHeader}>
          <Text style={styles.reportTitle}>Inspection Report</Text>
          <View style={styles.reportMetadata}>
            <Text style={styles.metadataText}>
              Ticket #{ticket?.ticketNumber || 'N/A'}
            </Text>
            <Text style={styles.metadataText}>
              Inspected on:{' '}
              {ticket?.createdAt?.seconds
                ? new Date(ticket.createdAt.seconds * 1000).toLocaleDateString()
                : 'N/A'}
            </Text>
          </View>
        </View>

        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Report Overview</Text>
          {ticket && (
            <TicketDetailsCard
              ticket={ticket}
              editable={false}
              onChangeField={() => {}}
              streetPhotoURL={streetPhotoURL}
              style={styles.cardStyle}
            />
          )}
        </View>

        <View style={styles.roomsSection}>
          <Text style={styles.sectionTitle}>Room Inspections</Text>
          {inspectionRooms.length > 0 ? (
            inspectionRooms.map(room => (
              <RoomCard
                key={room.id || room.roomTitle}
                room={room}
                editable={false}
                onChangeField={() => {}}
                onPhotoPress={handlePhotoPress} // This will now find the function
                style={styles.cardStyle}
              />
            ))
          ) : (
            <Text style={styles.noDataText}>No inspection rooms found.</Text>
          )}
        </View>

        <View style={styles.reportFooter}>
          <Text style={styles.footerText}>
            Generated by Coastal Restoration Services
          </Text>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} Coastal Restoration Services
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={isViewerVisible}
        animationType="slide"
        onRequestClose={() => {
          if (!isProcessing) setIsViewerVisible(false)
        }}
      >
        <View style={styles.modalContainer}>
          <HeaderWithOptions
            title="PDF Report"
            onBack={() => {
              if (!isProcessing) setIsViewerVisible(false)
            }}
            options={modalHeaderOptions}
            showHome={false}
            onHeightChange={() => {}}
          />
          {pdfUri ? (
            <Pdf
              trustAllCerts={false}
              source={{ uri: pdfUri, cache: true }}
              style={styles.pdf}
              onLoadComplete={(numberOfPages, filePath) => {}}
              onError={error => {
                console.error('PDF rendering error:', error)
                Alert.alert('Error', 'Could not display PDF.')
                setIsViewerVisible(false)
              }}
              activityIndicatorProps={{
                color: '#1E3A8A',
                progressTintColor: '#1E3A8A',
              }}
            />
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1E3A8A" />
              <Text style={styles.loadingText}>Loading PDF...</Text>
            </View>
          )}
        </View>
      </Modal>

      <PhotoModal
        visible={selectedPhoto !== null}
        photoUri={selectedPhoto}
        onClose={closePhoto} // This will now find the function
      />
    </View>
  )
}

export default ViewReportScreen

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    backgroundColor: '#FFFFFF',
  },
  reportHeader: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reportTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reportMetadata: {
    alignItems: 'center',
  },
  metadataText: {
    fontSize: 14,
    color: '#E0E7FF',
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
    paddingBottom: 5,
  },
  detailsSection: {
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  roomsSection: {
    marginBottom: 20,
  },
  cardStyle: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 15,
    marginBottom: 15,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
    color: '#4B5563',
  },
  errorText: {
    fontSize: 16,
    color: '#B91C1C',
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  loadingOverlayText: {
    color: '#FFFFFF',
    marginTop: 10,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pdf: {
    flex: 1,
    width: '100%',
    backgroundColor: '#E0E0E0',
  },
  reportFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 5,
  },
})
