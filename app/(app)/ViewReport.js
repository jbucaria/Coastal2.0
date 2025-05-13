'use client'

import React, { useState, useEffect } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native'
import Pdf from 'react-native-pdf'
import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system'
import useTicket from '@/hooks/useTicket'
import useProjectStore from '@/store/useProjectStore'
import { generatePdf } from '@/utils/pdfGenerator'
import { HeaderWithOptions } from '@/components/HeaderWithOptions'
import { uploadPDFToFirestore } from '@/utils/pdfUploader'
import { updateTicketPdfUrl } from '@/utils/firestoreUtils'
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
  } = useTicket(projectId)

  const [pdfUri, setPdfUri] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isViewerVisible, setIsViewerVisible] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [headerHeight, setHeaderHeight] = useState(0)
  const marginBelowHeader = 8

  useEffect(() => {
    console.log(
      'useTicket effect - loading:',
      ticketLoading,
      'ticket:',
      ticket,
      'error:',
      ticketError
    )
    if (ticket) {
      console.log('Ticket pdfUrl:', ticket.pdfUrl)
      if (ticket.pdfUrl) {
        setPdfUri(ticket.pdfUrl)
        console.log('Existing PDF URL found:', ticket.pdfUrl)
      } else if (pdfUri) {
        console.log('Clearing pdfUri since ticket.pdfUrl is not present')
        if (pdfUri.startsWith('file://')) {
          FileSystem.deleteAsync(pdfUri).catch(error => {
            console.error('Error deleting local PDF file:', error)
          })
        }
        setPdfUri(null)
      }
    } else if (ticketError) {
      console.error('Error fetching ticket:', ticketError)
    }
  }, [ticket, ticketLoading, ticketError])

  // Handler to generate, upload, and display PDF
  const handleGenerateReport = async () => {
    console.log('handleGenerateReport - Ticket data being used:', ticket)
    if (!ticket || typeof ticket !== 'object' || !ticket.id) {
      console.error('handleGenerateReport - Invalid ticket data:', ticket)
      return
    }
    setIsGenerating(true)
    try {
      const localPdfUri = await generatePdf(ticket)
      console.log('Generated local PDF URI:', localPdfUri)
      if (localPdfUri) {
        const uploadedPdfUrl = await uploadPDFToFirestore(ticket, localPdfUri)
        console.log('Uploaded PDF URL:', uploadedPdfUrl)
        await updateTicketPdfUrl(ticket.id, uploadedPdfUrl)
        console.log('Firestore ticket updated with new PDF URL.')
        setPdfUri(localPdfUri)
        setIsViewerVisible(true)
      }
    } catch (error) {
      console.error('Error during PDF generation/upload/update:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Handler to open the PDF viewer modal
  const handleViewReport = () => {
    if (pdfUri) {
      console.log('Viewing PDF with URI:', pdfUri)
      setIsViewerVisible(true)
    }
  }

  // Handler to share the PDF using Expo Sharing
  const handleShareReport = async () => {
    if (!pdfUri) {
      console.log('No PDF URI available to share')
      return
    }
    let shareUri = pdfUri
    // If remote URL, download to a local cache before sharing
    if (!shareUri.startsWith('file://')) {
      try {
        const filename = shareUri.split('/').pop().split('?')[0]
        const localPath = FileSystem.cacheDirectory + filename
        const downloadResult = await FileSystem.downloadAsync(shareUri, localPath)
        shareUri = downloadResult.uri
      } catch (downloadError) {
        console.error('Error downloading PDF for share:', downloadError)
        return
      }
    }
    try {
      // Check if the file exists
      const fileInfo = await FileSystem.getInfoAsync(pdfUri)
      if (!fileInfo.exists) {
        console.error('PDF file does not exist at:', pdfUri)
        return
      }
      console.log('File exists, size:', fileInfo.size, 'bytes')

      // Check sharing availability
      const isAvailable = await Sharing.isAvailableAsync()
      console.log('Sharing available:', isAvailable)
      if (!isAvailable) {
        console.warn('Sharing is not available on this device')
        return
      }

      // Attempt to share
      console.log('Initiating share for PDF:', pdfUri)
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share Inspection Report ${ticket?.ticketNumber || 'N/A'}`,
        UTI: 'com.adobe.pdf', // iOS-specific UTI for PDF
      })
      console.log('Share action completed successfully')
    } catch (error) {
      console.error('Error sharing PDF:', error)
    }
  }

  // Define header options
  const headerOptions = [
    {
      label: 'Edit Report',
      onPress: () => {
        router.push({
          pathname: '/EditReportScreen',
          params: { projectId },
        })
      },
    },
    ...(pdfUri
      ? [{ label: 'View PDF', onPress: handleViewReport }]
      : [
          {
            label: 'Generate PDF',
            onPress: handleGenerateReport,
            disabled:
              ticketLoading ||
              isGenerating ||
              !ticket ||
              typeof ticket !== 'object',
          },
        ]),
  ]

  // Define modal header options
  const modalHeaderOptions = [
    {
      label: 'Share',
      onPress: handleShareReport,
    },
  ]

  // Photo Modal Handlers
  const handlePhotoPress = uri => {
    if (uri) setSelectedPhoto(uri)
  }
  const closePhoto = () => setSelectedPhoto(null)

  // --- Render Logic ---
  if (ticketLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text style={styles.loadingText}>Loading report data...</Text>
      </View>
    )
  }

  if (ticketError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>
          Error loading report data: {ticketError.message}
        </Text>
      </View>
    )
  }

  if (!ticket) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Report data not found or unavailable.
        </Text>
      </View>
    )
  }

  const inspectionRooms = ticket.inspectionData?.rooms || []
  const streetPhotoURL = ticket.streetPhoto?.downloadURL || null

  return (
    <View style={styles.fullScreenContainer}>
      {/* Custom Header */}
      <HeaderWithOptions
        title="Inspection Report"
        onBack={() =>
          router.canGoBack() ? router.back() : router.push('/(tabs)')
        }
        options={headerOptions}
        showHome={true}
        onHeightChange={setHeaderHeight}
      />

      {/* Scrollable content area */}
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
        {/* Loading overlay */}
        {isGenerating && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingOverlayText}>Processing...</Text>
          </View>
        )}

        {/* Report Header Section */}
        <View style={styles.reportHeader}>
          <Text style={styles.reportTitle}>Inspection Report</Text>
          <View style={styles.reportMetadata}>
            <Text style={styles.metadataText}>
              Ticket #{ticket.ticketNumber || 'N/A'}
            </Text>
            <Text style={styles.metadataText}>
              Inspected on:{' '}
              {new Date(
                ticket.createdAt?.seconds * 1000
              ).toLocaleDateString() || 'N/A'}
            </Text>
          </View>
        </View>

        {/* --- Ticket Details Section --- */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Report Overview</Text>
          <TicketDetailsCard
            ticket={ticket}
            editable={false}
            onChangeField={() => {}}
            streetPhotoURL={streetPhotoURL}
            style={styles.cardStyle}
          />
        </View>

        {/* --- Room Details Section --- */}
        <View style={styles.roomsSection}>
          <Text style={styles.sectionTitle}>Room Inspections</Text>
          {inspectionRooms.length > 0 ? (
            inspectionRooms.map(room => (
              <RoomCard
                key={room.id || room.roomTitle}
                room={room}
                editable={false}
                onChangeField={() => {}}
                onPhotoPress={handlePhotoPress}
                style={styles.cardStyle}
              />
            ))
          ) : (
            <Text style={styles.noDataText}>No inspection rooms found.</Text>
          )}
        </View>

        {/* Report Footer */}
        <View style={styles.reportFooter}>
          <Text style={styles.footerText}>
            Generated by Coastal Restoration Services
          </Text>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} Coastal Restoration Services
          </Text>
        </View>
      </ScrollView>

      {/* PDF Viewer Modal */}
      <Modal
        visible={isViewerVisible}
        animationType="slide"
        onRequestClose={() => setIsViewerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <HeaderWithOptions
            title="PDF Report"
            onBack={() => setIsViewerVisible(false)}
            options={modalHeaderOptions}
            showHome={false}
            onHeightChange={() => {}}
          />
          {pdfUri ? (
            <Pdf
              trustAllCerts={false}
              source={{ uri: pdfUri, cache: true }}
              style={styles.pdf}
              onLoadComplete={(numberOfPages, filePath) => {
                console.log(
                  `PDF loaded: ${numberOfPages} pages from ${filePath}`
                )
              }}
              onError={error => {
                console.error('PDF rendering error:', error)
                setIsViewerVisible(false)
              }}
              activityIndicatorProps={{
                color: '#1E3A8A',
                progressTintColor: '#1E3A8A',
              }}
            />
          ) : (
            <View style={styles.loadingContainer}>
              <Text>Loading PDF...</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Photo Viewer Modal */}
      <PhotoModal
        visible={selectedPhoto !== null}
        photoUri={selectedPhoto}
        onClose={closePhoto}
      />
    </View>
  )
}

export default ViewReportScreen

// --- Styles ---
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
