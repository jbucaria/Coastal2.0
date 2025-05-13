// @/screens/ViewRemediationScreen.js
'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import {
  View,
  ScrollView,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native'
import { doc, getDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig' // Ensure this path is correct
import { exportCSVReport } from '@/utils/createCSVReport' // Ensure this path is correct
import { PhotoModal } from '@/components/PhotoModal' // Ensure this path is correct
import useProjectStore from '@/store/useProjectStore'
import { HeaderWithOptions } from '@/components/HeaderWithOptions' // Ensure this path is correct
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system'
import coastalLogo from '../../assets/images/CoastalRestorationServicesLogo-FinalTransparentBG.jpg'

// --- generateHTML function (async, styled like generatePdf) ---
/**
 * Generates styled HTML for the remediation report.
 * Fetches company logo and details from Firestore.
 * @param {object} ticket - The main ticket data object.
 * @param {object} remediationData - The remediation specific data.
 * @returns {Promise<string>} A promise resolving with the complete HTML string.
 */
const generateHTML = async (ticket, remediationData) => {
  // --- Validate Input ---
  if (!ticket || typeof ticket !== 'object') {
    console.error('generateHTML received invalid ticket data')
    return '<html><body>Error: Invalid ticket data provided.</body></html>'
  }
  if (!remediationData || typeof remediationData !== 'object') {
    console.error('generateHTML received invalid remediation data')
    // Proceeding, but remediation section might be empty/error
  }

  // --- Extract Ticket Data ---
  const {
    ticketNumber = 'N/A',
    street = '', // Assuming address fields are directly on ticket
    apt = '',
    city = '',
    state = '',
    zip = '',
    createdAt = {}, // Use inspection creation date if available
    startTime, // Remediation start time
    endTime, // Remediation end time
    inspectorName = 'Unknown', // Use inspector if relevant, or add technician field
    typeOfJob = 'N/A',
    occupied = false,
    streetPhoto = null, // Expecting { downloadURL: string } or null
  } = ticket

  // --- Fetch Company Logo & Details from Firestore ---
  let logoURL = ''
  let companyDetails = {
    // Defaults
    companyName: 'Coastal Restoration Services',
    email: 'www.coastalrestorationservices@yahoo.com',
    phoneNumbers: '(727) 313-808-1830 | (813) 919-3420',
    certifications:
      'Licensed Mold Remediation | State CMR, IICRC Certified | 24/7 Emergency Services',
    licenseNumber: 'MRSR2966',
  }

  try {
    const companyDocRef = doc(firestore, 'companyInfo', 'Vj0FigLyhZCyprQ8iGGV') // Use your actual path/ID
    const companyDoc = await getDoc(companyDocRef)
    if (companyDoc.exists()) {
      const fetchedCompanyData = companyDoc.data()
      logoURL = fetchedCompanyData?.logo || ''
      // Overwrite defaults with fetched data if fields exist
      companyDetails.companyName =
        fetchedCompanyData?.companyName || companyDetails.companyName
      companyDetails.email = fetchedCompanyData?.email || companyDetails.email
      companyDetails.phoneNumbers =
        fetchedCompanyData?.phoneNumbers || companyDetails.phoneNumbers
      companyDetails.certifications =
        fetchedCompanyData?.certifications || companyDetails.certifications
      companyDetails.licenseNumber =
        fetchedCompanyData?.licenseNumber || companyDetails.licenseNumber
      // *** Check this log for the logo URL ***
      console.log(
        'Fetched company details and logo URL:',
        logoURL || 'Not found'
      )
    } else {
      console.warn(
        'Company info document (Vj0FigLyhZCyprQ8iGGV) does not exist.'
      )
    }
  } catch (error) {
    console.error('Error fetching company info from Firestore:', error)
    // Continue with defaults
  }
  // --- Load local logo asset as base64 for embedding ---
  let localLogoDataUri = ''
  try {
    const asset = Asset.fromModule(coastalLogo)
    await asset.downloadAsync()
    const base64 = await FileSystem.readAsStringAsync(asset.localUri, { encoding: FileSystem.EncodingType.Base64 })
    const mime = coastalLogo.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
    localLogoDataUri = `data:${mime};base64,${base64}`
  } catch (e) {
    console.warn('Error loading local logo asset:', e)
  }

  // --- Format Dates ---
  const inspectionDate =
    createdAt && typeof createdAt.seconds === 'number'
      ? new Date(createdAt.seconds * 1000)
      : null

  const inspectionDateStr = inspectionDate
    ? inspectionDate.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : 'N/A'

  const remediationStartDate = startTime?.toDate ? startTime.toDate() : null
  const remediationStartDateStr = remediationStartDate
    ? remediationStartDate.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A'
  const remediationEndDate = endTime?.toDate ? endTime.toDate() : null
  const remediationEndDateStr = remediationEndDate
    ? remediationEndDate.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A'

  // --- Get Street Photo URL ---
  // *** This depends on the 'ticket' object passed IN having ticket.streetPhoto.downloadURL ***
  const streetPhotoURL = streetPhoto?.downloadURL || ''
  console.log('Using Street Photo URL for HTML:', streetPhotoURL) // Log the URL being used

  // --- Build Remediation Rooms HTML ---
  let remediationRoomsHTML = ''
  const rooms = remediationData?.rooms || []

  if (Array.isArray(rooms) && rooms.length > 0) {
    remediationRoomsHTML = rooms
      .map((room, index) => {
        const {
          roomTitle = `Work Area ${index + 1}`,
          notes = '',
          numberOfFans = 0,
          measurements = [],
          photos = [],
        } = room || {}

        // Build measurements list HTML
        const measurementsHTML =
          Array.isArray(measurements) && measurements.length > 0
            ? `<ul>${measurements
                .map(m => {
                  if (m.isRoomName) {
                    return `<li class="measurement-item taxable"><strong>${
                      m.name || 'Room Entry'
                    }</strong> (Taxable)</li>`
                  }
                  return `<li class="measurement-item">${
                    m.name || 'Unnamed Item'
                  }${m.description ? ` - ${m.description}` : ''}: ${
                    m.quantity || 0
                  }</li>`
                })
                .join('')}</ul>`
            : '<p class="no-data">No measurements recorded.</p>'

        // Build photos gallery HTML
        const photosHTML =
          Array.isArray(photos) && photos.length > 0
            ? photos
                .map(p => {
                  const imageUrl = p?.downloadURL
                  const label = p?.label
                  if (imageUrl && typeof imageUrl === 'string') {
                    if (
                      !imageUrl.startsWith('http://') &&
                      !imageUrl.startsWith('https://')
                    ) {
                      console.warn(`Invalid photo URL: ${imageUrl}`)
                      return ''
                    }
                    // Added onerror to room photos too
                    return `<div class="photo-item">
                             <img src="${imageUrl}" alt="${roomTitle} photo" onerror="this.style.display='none'; this.parentElement.innerHTML += '<p class=\\'no-photos\\'>Photo failed</p>';"/>
                             ${
                               label
                                 ? `<p class="photo-comment">${label}</p>`
                                 : ''
                             }
                           </div>`
                  }
                  return ''
                })
                .join('')
            : '<p class="no-photos">No photos available for this area.</p>'

        const finalPhotosHTML =
          photosHTML.trim() === '' && Array.isArray(photos) && photos.length > 0
            ? '<p class="no-photos">Photos listed but URLs missing or invalid.</p>'
            : photosHTML ||
              '<p class="no-photos">No photos available for this area.</p>'

        // Assemble room card
        return `
          <div class="room-card">
            <h3>${roomTitle}</h3>
            ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            ${
              numberOfFans > 0
                ? `<p><strong>Fans Used:</strong> ${numberOfFans}</p>`
                : ''
            }
            <p><strong>Line Items / Measurements:</strong></p>
            ${measurementsHTML}
            <p><strong>Photos:</strong></p>
            <div class="photo-gallery">${finalPhotosHTML}</div>
          </div>
        `
      })
      .join('')
  } else {
    remediationRoomsHTML =
      '<p class="no-data">No remediation work areas recorded.</p>'
  }

  // --- Define CSS (Copied & Adapted from generatePdf) ---
  const integratedModernCSS = `
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
    @page { size: A4; margin: 20mm; }
    @page:first { margin: 0; }

    * { box-sizing: border-box; }
    body {
        font-family: 'Roboto', sans-serif;
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #333;
        line-height: 1.6;
    }

    /* Cover Page Styles */
    .cover-page { width: 210mm; height: 297mm; padding: 30mm 20mm; display: flex; flex-direction: column; align-items: center; text-align: center; background: linear-gradient(to bottom, #e3f2fd, #ffffff); page-break-after: always; position: relative; justify-content: flex-start; }
    .cover-header { width: 100%; margin-bottom: 15mm; }
    .company-logo { max-width: 150px; max-height: 75px; width: auto; height: auto; margin-bottom: 15px; object-fit: contain; }
    .logo-placeholder { width: 150px; height: 50px; border: 2px dashed #b0bec5; display: flex; align-items: center; justify-content: center; color: #78909c; font-size: 14px; background-color: #eceff1; margin: 0 auto 15px; padding: 5px; text-align: center; } /* Added padding/text-align */
    .company-main-title { color: #0d47a1; font-size: 32px; font-weight: 700; margin-bottom: 5px; }
    .company-contact-info p { font-size: 13px; color: #555; margin: 2px 0; }
    .cover-photo-container { width: 100%; max-width: 170mm; margin: 10mm auto; overflow: hidden; border-radius: 8px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15); border: 1px solid #e0e0e0; background-color: #f0f0f0; min-height: 70mm; display: flex; justify-content: center; align-items: center; } /* Added background, min-height, flex */
    .cover-image { width: 100%; height: auto; max-height: 70mm; object-fit: contain; display: block; border-radius: 8px; } /* Added radius */
    .cover-placeholder { width: 90%; height: auto; padding: 15px; text-align: center; color: #78909c; font-size: 16px; border: 2px dashed #b0bec5; background-color: #eceff1; border-radius: 4px; } /* Adjusted padding */
    .report-title-section { margin-top: 10mm; margin-bottom: 10mm; }
    .report-title-section h1 { font-size: 36px; color: #1a237e; margin: 0; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
    .property-details { margin-bottom: 10mm; font-size: 14px; color: #444; line-height: 1.7; }
    .property-details p { margin: 3px 0; }
    .property-details strong { color: #0d47a1; }
    .inspector-details-cover { margin-top: 8mm; font-size: 13px; color: #555; }
    .inspector-details-cover p { margin: 2px 0; }
    .cover-footer { position: absolute; bottom: 20mm; left: 20mm; right: 20mm; font-size: 11px; color: #777; text-align: center; }

    /* Content Page Styles */
    .container { max-width: 170mm; margin: 0 auto; background: #fff; text-align: left; }
    .report-header-main { text-align: center; margin-bottom: 10mm; border-bottom: 2px solid #1e3a8a; padding-bottom: 5mm; page-break-after: avoid; }
    .report-header-main h1 { font-size: 28px; color: #1e3a8a; margin: 0; font-weight: 700; }
    .report-section { margin-bottom: 10mm; padding: 0; page-break-inside: auto; }
    .report-section h2 { font-size: 22px; color: #1e3a8a; margin-bottom: 10mm; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px; page-break-after: avoid; }
    .room-card { padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 15px; background-color: #f9f9f9; page-break-inside: avoid; }
    .room-card h3 { margin: 0 0 10px; font-size: 18px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    .room-card p { margin-bottom: 10px; color: #555; font-size: 14px; }
    .room-card p strong { color: #1e3a8a; }
    .room-card ul { list-style: disc; margin-left: 20px; padding-left: 5px; margin-bottom: 10px; }
    .room-card li.measurement-item { font-size: 14px; color: #444; margin-bottom: 3px; }
    .room-card li.taxable { font-weight: bold; }
    .photo-gallery { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-start; margin-top: 10px; }
    .photo-item { display: inline-block; vertical-align: top; width: calc(33.33% - 7px); margin-bottom: 10px; text-align: center; page-break-inside: avoid; }
    .photo-item img { width: 100%; height: 100px; object-fit: cover; border: 1px solid #ccc; border-radius: 4px; display: block; margin-bottom: 5px; background-color: #eee; } /* Added background */
    .photo-comment { font-size: 11px; color: #4b5563; margin-top: 0; text-align: center; }
    .no-data, .no-photos { font-style: italic; color: #666; text-align: center; margin: 15px 0; font-size: 14px; }
    .footer { text-align: center; padding-top: 10mm; font-size: 12px; color: #666; border-top: 1px solid #e0e0e0; margin-top: 10mm; page-break-before: auto; }
  `

  // --- Assemble Cover Page HTML ---
  const coverPageHTML = `
    <div class="cover-page">
      <div class="cover-header">
        ${
          localLogoDataUri
            ? `<img src="${localLogoDataUri}" alt="Company Logo" class="company-logo" onerror="this.parentElement.innerHTML = '<div class=\\'logo-placeholder\\'>Logo Failed to Load</div>';"/>`
            : logoURL
            ? `<img src="${logoURL}" alt="Company Logo" class="company-logo" onerror="this.parentElement.innerHTML = '<div class=\\'logo-placeholder\\'>Logo Failed to Load</div>';"/>`
            : '<div class="logo-placeholder">Company Logo Not Available</div>'
        }
        <div class="company-main-title">${companyDetails.companyName}</div>
        <div class="company-contact-info">
          <p>${companyDetails.email}</p>
          <p>${companyDetails.phoneNumbers}</p>
          <p>${companyDetails.certifications}</p>
        </div>
      </div>
      <div class="cover-photo-container">
         ${
           streetPhotoURL
             ? `<img src="${streetPhotoURL}" alt="Property Street View" class="cover-image" onerror="this.parentElement.innerHTML = '<div class=\\'cover-placeholder\\'>Street View Photo Failed (onerror)</div>';"/>`
             : '<div class="cover-placeholder">Property Photo Not Available</div>'
         }
      </div>
      <div class="report-title-section"><h1>Remediation Report</h1></div>
      <div class="property-details">
        <p><strong>Property Address:</strong> ${street}${
    apt ? `, Apt ${apt}` : ''
  }, ${city}, ${state} ${zip}</p>
        <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
        <p><strong>Job Type:</strong> ${typeOfJob}</p>
        <p><strong>Initial Inspection Date:</strong> ${inspectionDateStr}</p>
        <p><strong>Remediation Start:</strong> ${remediationStartDateStr}</p>
        <p><strong>Remediation End:</strong> ${remediationEndDateStr}</p>
      </div>
      <div class="inspector-details-cover">
         <p><strong>Technician/Inspector:</strong> ${inspectorName || 'N/A'}</p>
         <p>State License #${companyDetails.licenseNumber || 'N/A'}</p>
      </div>
      <div class="cover-footer">
        <p>© ${new Date().getFullYear()} ${
    companyDetails.companyName
  }. All rights reserved.</p>
      </div>
    </div>
  `

  // --- Assemble Final HTML Document ---
  const finalHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Remediation Report ${ticketNumber}</title>
  <style>
    ${integratedModernCSS}
  </style>
</head>
<body>
  ${coverPageHTML}
  <div class="container">
    <div class="report-header-main">
        <h1>Remediation Details</h1>
    </div>
    <div class="report-section">
      <h2>Work Area Details</h2>
      ${remediationRoomsHTML}
    </div>
    <div class="footer">Generated by ${
      companyDetails.companyName
    } | ${new Date().toLocaleDateString()}</div>
  </div>
</body>
</html>`

  return finalHtmlContent
}

// --- Main Screen Component ---
export default function ViewRemediationScreen() {
  const params = useLocalSearchParams()
  const projectIdFromParams = params.projectId
  const { projectId: storeProjectId } = useProjectStore()
  const projectId = projectIdFromParams ?? storeProjectId
  const router = useRouter()

  const [ticket, setTicket] = useState(null)
  const [remediationData, setRemediationData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [headerHeight, setHeaderHeight] = useState(0)
  const marginBelowHeader = 8
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [photoModalVisible, setPhotoModalVisible] = useState(false)

  // Fetch data effect
  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) {
        Alert.alert('Error', 'Project ID is missing.')
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const docRef = doc(firestore, 'tickets', projectId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          setTicket(data)
          const remData = data.remediationData || { rooms: [] }
          const roomsWithLineItems = (remData.rooms || []).filter(room => {
            return (
              Array.isArray(room.measurements) &&
              room.measurements.some(m => !m.isRoomName)
            )
          })
          setRemediationData({ ...remData, rooms: roomsWithLineItems })
          console.log('Fetched and filtered remediation data:', {
            ...remData,
            rooms: roomsWithLineItems,
          })
        } else {
          console.error('No ticket document found for ID:', projectId)
          Alert.alert('Error', 'No data found for this project ID.')
          setTicket(null)
          setRemediationData(null)
        }
      } catch (error) {
        console.error('Error fetching remediation data:', error)
        Alert.alert('Error', 'Failed to load data. Please try again.')
        setTicket(null)
        setRemediationData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [projectId])

  // --- PDF Generation and Sharing ---
  const generatePDFReport = async () => {
    if (!ticket || !remediationData) {
      Alert.alert('Error', 'Data not loaded yet. Cannot generate report.')
      return
    }

    try {
      // *** ADD LOGGING HERE ***
      console.log('--- Data being passed to generateHTML ---')
      console.log(
        'Ticket Data (relevant parts):',
        JSON.stringify(
          {
            ticketNumber: ticket.ticketNumber,
            street: ticket.street,
            streetPhoto: ticket.streetPhoto, // Check if this exists and has downloadURL
          },
          null,
          2
        )
      )
      // console.log("Remediation Data:", JSON.stringify(remediationData, null, 2)); // Optional: log remediation data too

      const html = await generateHTML(ticket, remediationData)
      console.log('Generated HTML for PDF:', html.substring(0, 500) + '...')

      // 1. Generate PDF to a temporary file
      const { uri: tempUri } = await Print.printToFileAsync({
        html,
        width: 595,
        height: 842,
      })
      console.log('PDF generated at temporary URI:', tempUri)

      // 2. Rename file to include only street and 'Remediation_Report'
      const rawStreet = (ticket.street || 'Remediation_Report')
        .replace(/[^a-z0-9 ]/gi, '')
        .trim()
      const safeStreet = rawStreet.replace(/\s+/g, '_')
      const fileName = `${safeStreet}_Remediation_Report.pdf`
      const destUri = `${FileSystem.documentDirectory}${fileName}`
      try { await FileSystem.deleteAsync(destUri, { idempotent: true }) } catch {}
      await FileSystem.moveAsync({ from: tempUri, to: destUri })

      // 3. Share the renamed PDF file
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          'Sharing Not Available',
          'Sharing is not supported on this device.'
        )
        return
      }
      await Sharing.shareAsync(destUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share ${fileName}`,
      })
    } catch (error) {
      console.error('Error generating or sharing PDF:', error)
      Alert.alert('Error', `Failed to process PDF report: ${error.message}`)
    }
  }

  // --- Header Options ---
  const headerOptions = [
    {
      label: 'Edit',
      onPress: () =>
        router.push({
          pathname: '/RemediationScreen',
          params: { projectId: projectId },
        }),
      disabled: loading || !ticket,
    },
    {
      label: 'CSV',
      onPress: () => {
        if (remediationData) {
          exportCSVReport(remediationData, projectId)
        } else {
          Alert.alert(
            'No Data',
            'Cannot export CSV, remediation data is missing.'
          )
        }
      },
      disabled: loading || !remediationData,
    },
    {
      label: 'Invoice',
      onPress: () =>
        router.push({
          pathname: '/ViewInvoiceScreen',
          params: { projectId: projectId },
        }),
      disabled: loading || !ticket,
    },
    {
      label: 'Share PDF',
      onPress: generatePDFReport,
      disabled: loading || !ticket || !remediationData,
    },
  ]

  // --- Render Logic ---
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </View>
    )
  }

  const displayRooms = remediationData?.rooms || []

  if (!ticket || !remediationData || displayRooms.length === 0) {
    return (
      <View style={styles.fullScreenContainer}>
        <HeaderWithOptions
          title="Remediation Report"
          onBack={() => router.back()}
          options={headerOptions}
          onHeightChange={setHeaderHeight}
        />
        <View style={styles.centeredMessageContainer}>
          <Text style={styles.errorText}>
            No remediation data with line items available for this project.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.fullScreenContainer}>
      <HeaderWithOptions
        title="Remediation Report"
        onBack={() => router.back()}
        options={headerOptions}
        onHeightChange={setHeaderHeight}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingTop: headerHeight + marginBelowHeader },
        ]}
      >
        {displayRooms.map((room, roomIndex) => {
          const roomKey = room.id
            ? room.id
            : `room-${roomIndex}-${room.roomTitle || 'Room'}`
          return (
            <View key={roomKey} style={styles.roomContainer}>
              <Text style={styles.roomTitle}>
                {room.roomTitle || 'Unnamed Room'}
              </Text>
              {room.notes && (
                <Text style={styles.notesText}>
                  <Text style={styles.label}>Notes: </Text>
                  {room.notes}
                </Text>
              )}
              {room.numberOfFans > 0 && (
                <Text style={styles.fansText}>
                  <Text style={styles.label}>Number of Fans: </Text>
                  {room.numberOfFans}
                </Text>
              )}
              <Text style={styles.subHeader}>Measurements / Line Items:</Text>
              {Array.isArray(room.measurements) &&
              room.measurements.length > 0 ? (
                room.measurements.map((measurement, measIndex) => {
                  const measurementKey = measurement.id
                    ? measurement.id
                    : `meas-${roomKey}-${measIndex}`
                  return (
                    <View key={measurementKey} style={styles.measurementRow}>
                      {measurement.isRoomName ? (
                        <Text style={styles.roomNameMeasurement}>
                          {measurement.name} (Taxable)
                        </Text>
                      ) : (
                        <Text style={styles.measurementText}>
                          {measurement.name}
                          {measurement.description
                            ? ` - ${measurement.description}`
                            : ''}
                          : {measurement.quantity}
                        </Text>
                      )}
                    </View>
                  )
                })
              ) : (
                <Text style={styles.noDataSubText}>
                  No measurements recorded.
                </Text>
              )}
              {Array.isArray(room.photos) && room.photos.length > 0 && (
                <>
                  <Text style={styles.subHeader}>Photos:</Text>
                  <ScrollView horizontal style={styles.photoRow}>
                    {room.photos.map((photo, index) => {
                      if (!photo || !photo.downloadURL) return null
                      const photoKey = photo.storagePath || `photo-${index}`
                      return (
                        <TouchableOpacity
                          key={photoKey}
                          onPress={() => {
                            setSelectedPhoto(photo.downloadURL)
                            setPhotoModalVisible(true)
                          }}
                          style={styles.photoItem}
                        >
                          <Image
                            source={{ uri: photo.downloadURL }}
                            style={styles.photoImage}
                          />
                          {photo.label && (
                            <Text style={styles.photoLabel}>{photo.label}</Text>
                          )}
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>
                </>
              )}
            </View>
          )
        })}
      </ScrollView>
      {photoModalVisible && (
        <PhotoModal
          visible={photoModalVisible}
          photoUri={selectedPhoto}
          onClose={() => setPhotoModalVisible(false)}
        />
      )}
    </View>
  )
}

// --- Styles ---
const styles = StyleSheet.create({
  fullScreenContainer: { flex: 1, backgroundColor: '#F3F5F7' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F5F7',
  },
  centeredMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollView: { flex: 1 },
  scrollContainer: { padding: 16, paddingBottom: 100 },
  roomContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  roomTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 6,
  },
  subHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginTop: 10,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 6,
    lineHeight: 20,
  },
  fansText: { fontSize: 14, color: '#16A34A', marginBottom: 6 },
  label: { fontWeight: '600', color: '#1E293B' },
  measurementRow: { marginVertical: 3, paddingLeft: 5 },
  roomNameMeasurement: { fontSize: 14, fontWeight: '600', color: '#334155' },
  measurementText: { fontSize: 14, color: '#334155' },
  noDataSubText: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
    marginLeft: 5,
    marginBottom: 5,
  },
  photoRow: { marginTop: 8, marginBottom: 4 },
  photoItem: { marginRight: 10, alignItems: 'center' },
  photoImage: {
    width: 90,
    height: 90,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
  },
  photoLabel: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 90,
  },
  errorText: {
    textAlign: 'center',
    color: '#DC2626',
    fontSize: 16,
    paddingHorizontal: 10,
  },
})
