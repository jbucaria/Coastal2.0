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
import { Asset } from 'expo-asset' // Make sure Asset is imported
import * as FileSystem from 'expo-file-system' // Make sure FileSystem is imported
import coastalLogo from '../../assets/images/CoastalRestorationServicesLogo-FinalTransparentBG.jpg' // VERIFY THIS PATH

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
    console.error('[generateHTML_V3_LogoFix] Received invalid ticket data')
    return '<html><body>Error: Invalid ticket data provided.</body></html>'
  }
  if (!remediationData) {
    // Remediation data might be minimal or null
    console.warn(
      '[generateHTML_V3_LogoFix] Remediation data is null/undefined.'
    )
  }

  // --- Extract Ticket Data ---
  const {
    ticketNumber = 'N/A',
    street = '',
    apt = '',
    city = '',
    state = '',
    zip = '',
    createdAt = {},
    startTime,
    endTime,
    inspectorName = 'Unknown',
    typeOfJob = 'N/A',
    // occupied = false, // Not used in current HTML template
    streetPhoto = null,
  } = ticket

  // --- Fetch Company Details from Firestore ---
  let companyFirestoreLogoUrl = '' // To store URL from Firestore if local fails
  let companyDetails = {
    companyName: 'Coastal Restoration Services',
    email: 'info@coastalrestorationservices.com', // Corrected email format
    phoneNumbers: '(727) 313-8080 | (813) 919-3420', // Example correction
    certifications:
      'Licensed Mold Remediation | State CMR, IICRC Certified | 24/7 Emergency Services',
    licenseNumber: 'MRSR2966',
  }

  try {
    const companyDocRef = doc(firestore, 'companyInfo', 'Vj0FigLyhZCyprQ8iGGV')
    const companyDoc = await getDoc(companyDocRef)
    if (companyDoc.exists()) {
      const fetched = companyDoc.data()
      companyFirestoreLogoUrl = fetched?.logo || '' // Get the Firestore logo URL
      companyDetails = {
        // Update details
        companyName: fetched?.companyName || companyDetails.companyName,
        email: fetched?.email || companyDetails.email,
        phoneNumbers: fetched?.phoneNumbers || companyDetails.phoneNumbers,
        certifications:
          fetched?.certifications || companyDetails.certifications,
        licenseNumber: fetched?.licenseNumber || companyDetails.licenseNumber,
      }
      console.log(
        '[generateHTML_V3_LogoFix] Fetched Firestore company logo URL:',
        companyFirestoreLogoUrl || 'Not found'
      )
    } else {
      console.warn(
        '[generateHTML_V3_LogoFix] Company info document does not exist. Using defaults.'
      )
    }
  } catch (error) {
    console.error(
      '[generateHTML_V3_LogoFix] Error fetching company info from Firestore:',
      error
    )
  }

  // --- Load local logo asset as base64 for embedding (Primary Method) ---
  let localLogoDataUri = '' // This will be the data:image URI

  try {
    if (!coastalLogo) {
      // Check if the import worked
      throw new Error(
        'Local `coastalLogo` import is undefined or null. Verify the import path at the top of ViewRemediationScreen.js'
      )
    }

    const asset = Asset.fromModule(coastalLogo)

    await asset.downloadAsync()

    if (!asset.localUri) {
      throw new Error('Local asset URI is null or undefined after download.')
    }
    const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: FileSystem.EncodingType.Base64,
    })
    if (!base64) {
      throw new Error('Failed to read asset as base64 or the result was empty.')
    }

    // More robust MIME type detection
    let mime = 'image/jpeg' // Default
    if (asset.type) {
      const assetTypeLower = asset.type.toLowerCase()
      if (assetTypeLower === 'png') mime = 'image/png'
      else if (assetTypeLower === 'jpeg' || assetTypeLower === 'jpg')
        mime = 'image/jpeg'
      else if (assetTypeLower) mime = `image/${assetTypeLower}`
    } else if (asset.name) {
      const assetNameLower = asset.name.toLowerCase()
      if (assetNameLower.endsWith('.png')) mime = 'image/png'
      else if (
        assetNameLower.endsWith('.jpg') ||
        assetNameLower.endsWith('.jpeg')
      )
        mime = 'image/jpeg'
    }

    localLogoDataUri = `data:${mime};base64,${base64}`
  } catch (e) {
    console.warn(
      '[generateHTML_V3_LogoFix] Error loading local logo asset:',
      e.message,
      e.stack ? e.stack.substring(0, 100) : ''
    )
    // If local fails, localLogoDataUri will remain empty.
    // The HTML rendering logic will then try companyFirestoreLogoUrl.
  }

  // Decide final logo source for HTML
  let finalLogoSrcForHtml = localLogoDataUri // Prefer local Base64 URI
  if (!finalLogoSrcForHtml && companyFirestoreLogoUrl) {
  
    finalLogoSrcForHtml = companyFirestoreLogoUrl // Fallback to Firestore URL
  } else if (finalLogoSrcForHtml) {
    console.log(
      '[generateHTML_V3_LogoFix] Using local Base64 Data URI for logo.'
    )
  } else {
    console.log(
      '[generateHTML_V3_LogoFix] No logo source available (local or Firestore). Placeholder will be shown.'
    )
  }

  // --- Format Dates ---
  // (Your existing date formatting logic - seems okay)
  const inspectionDate = createdAt?.seconds
    ? new Date(createdAt.seconds * 1000 + (createdAt.nanoseconds || 0) / 1e6)
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
  const remediationStartDate = startTime?.toDate
    ? startTime.toDate()
    : startTime
    ? new Date(startTime)
    : null
  const remediationStartDateStr = remediationStartDate
    ? remediationStartDate.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A'
  const remediationEndDate = endTime?.toDate
    ? endTime.toDate()
    : endTime
    ? new Date(endTime)
    : null
  const remediationEndDateStr = remediationEndDate
    ? remediationEndDate.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A'

  const streetPhotoURL = streetPhoto?.downloadURL || ''

  // --- Build Remediation Rooms HTML ---
  // (Your existing rooms HTML logic - seems okay for now, ensure p.label or p.comment is used for photo captions)
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
        const measurementsHTML =
          Array.isArray(measurements) && measurements.length > 0
            ? `<ul>${measurements
                .map(
                  m =>
                    `<li class="measurement-item ${
                      m.isRoomName && m.taxable ? 'taxable' : ''
                    }">${
                      m.isRoomName
                        ? `<strong>${m.name || 'Room Entry'}</strong> (Taxable)`
                        : `${m.name || 'Unnamed Item'}${
                            m.description ? ` - ${m.description}` : ''
                          }: ${m.quantity || 0}`
                    }</li>`
                )
                .join('')}</ul>`
            : '<p class="no-data">No measurements.</p>'
        const photosHTML =
          Array.isArray(photos) && photos.length > 0
            ? photos
                .map(p => {
                  const imageUrl = p?.downloadURL
                  const photoCaption = p?.label || p?.comment || '' // Use label first, then comment
                  if (
                    imageUrl &&
                    typeof imageUrl === 'string' &&
                    (imageUrl.startsWith('http://') ||
                      imageUrl.startsWith('https://'))
                  ) {
                    return `<div class="photo-item"><img src="${imageUrl}" alt="${roomTitle} photo" onerror="this.style.display='none'; this.parentElement.innerHTML += '<p class=\\'no-photos\\'>Photo failed</p>';"/>${
                      photoCaption
                        ? `<p class="photo-comment">${photoCaption}</p>`
                        : '<p class="photo-comment">&nbsp;</p>'
                    }</div>`
                  }
                  return ''
                })
                .join('')
            : '<p class="no-photos">No photos.</p>'
        return `<div class="room-card"><h3>${roomTitle}</h3>${
          notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''
        }${
          numberOfFans > 0
            ? `<p><strong>Fans Used:</strong> ${numberOfFans}</p>`
            : ''
        }<p><strong>Line Items:</strong></p>${measurementsHTML}<p><strong>Photos:</strong></p><div class="photo-gallery">${photosHTML}</div></div>`
      })
      .join('')
  } else {
    remediationRoomsHTML =
      '<p class="no-data">No remediation work areas recorded.</p>'
  }

  // --- Define CSS ---
  // (Your existing integratedModernCSS string - ensure it's complete and correct)
  const integratedModernCSS = `
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
    @page { size: A4; margin: 20mm; }
    @page:first { margin: 0; }
    * { box-sizing: border-box; }
    body { font-family: 'Roboto', sans-serif; margin: 0; padding: 0; background: #ffffff; color: #333; line-height: 1.6; font-size:10pt; }
    .cover-page { width: 210mm; height: 297mm; padding: 20mm; display: flex; flex-direction: column; align-items: center; text-align: center; background: linear-gradient(to bottom, #e9f5ff, #ffffff); page-break-after: always; justify-content: space-around; /* Adjusted justify-content */ }
    .cover-header { width: 100%; margin-bottom: 10mm; text-align: center; }
    .company-logo { max-width: 160mm; max-height: 50mm; width: auto; height: auto; object-fit: contain; margin: 0 auto 10mm auto; display: block; }
    .logo-placeholder { width: 150px; height: 50px; border: 1px dashed #b0bec5; display: flex; align-items: center; justify-content: center; color: #78909c; font-size: 12px; background-color: #eceff1; margin: 0 auto 10mm auto; padding: 5px; text-align: center; }
    .company-main-title { color: #003366; font-size: 28px; font-weight: bold; margin-bottom: 5px; }
    .company-contact-info { margin-top: 5px; }
    .company-contact-info p { font-size: 10pt; color: #455a64; margin: 2px 0; }
    .cover-photo-container { width: 100%; max-width: 170mm; height: 80mm; margin: 10mm auto; overflow: hidden; display: flex; justify-content: center; align-items: center; background-color: #f0f0f0; border: 1px solid #e0e0e0; border-radius: 4px; }
    .cover-image { display: block; width: 100%; height: 100%; object-fit: contain; border-radius: 4px;}
    .cover-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; text-align: center; color: #6b7280; font-size: 14px; border: 2px dashed #9ca3af; background-color: #e5e7eb; border-radius: 4px; padding: 15px; }
    .report-title-section { margin-top: 10mm; margin-bottom: 10mm; }
    .report-title-section h1 { font-size: 26px; color: #003366; margin: 0; font-weight: bold; text-transform: uppercase; }
    .property-details { margin-bottom: 10mm; font-size: 11pt; color: #37474f; line-height: 1.7; }
    .property-details p { margin: 4px 0; } .property-details strong { color: #003366; }
    .inspector-details-cover { margin-top: 8mm; font-size: 10pt; color: #455a64; }
    .cover-footer { font-size: 9pt; color: #78909c; text-align: center; width: 100%; padding-top:10mm; border-top: 1px solid #ddd; margin-top:auto; }
    /* Content Page Styles from your previous version */
    .container { max-width: 170mm; margin: 0 auto; background: #fff; text-align: left; padding: 0 5mm; }
    .report-header-main { text-align: center; margin-bottom: 8mm; border-bottom: 2px solid #003366; padding-bottom: 4mm; }
    .report-header-main h1 { font-size: 22px; color: #003366; margin: 0; font-weight: bold; }
    .report-section { margin-bottom: 8mm; }
    .report-section h2 { font-size: 16px; color: #003366; margin-bottom: 8mm; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
    .room-card { padding: 12px; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 12px; background-color: #f9f9f9; }
    .room-card h3 { margin: 0 0 8px; font-size: 14px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    .room-card p { margin-bottom: 8px; color: #555; font-size: 10pt; }
    .room-card ul { list-style: disc; margin-left: 18px; padding-left: 5px; margin-bottom: 8px; }
    .room-card li.measurement-item { font-size: 10pt; color: #444; margin-bottom: 2px; }
    .photo-gallery { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .photo-item { width: 50mm; height: 50mm; display: flex; flex-direction: column; background-color: #fff; border-radius: 4px; overflow: hidden; border: 1px solid #dee2e6; box-shadow: 0 1px 2px rgba(0,0,0,0.05); page-break-inside: avoid; }
    .photo-item img { width: 100%; flex-grow: 1; object-fit: contain; background-color: #eff2f5; display: block; overflow: hidden; }
    .photo-comment { font-size: 8pt; color: #2c3e50; padding: 4px 5px; background-color: #f8f9fa; width: 100%; text-align: center; flex-shrink: 0; height: 32px; overflow-y: hidden; line-height: 1.3; border-top: 1px solid #e9edf0; word-wrap: break-word; overflow-wrap: break-word; display: flex; align-items: center; justify-content: center;}
    .no-data, .no-photos { font-style: italic; color: #666; text-align: center; margin: 12px 0; font-size: 10pt; }
    .footer { text-align: center; padding-top: 8mm; font-size: 9pt; color: #666; border-top: 1px solid #e0e0e0; margin-top: 8mm; }
  `

  // --- Assemble Cover Page HTML with refined logo logic ---
  const coverPageHTML = `
    <div class="cover-page">
      <div class="cover-header">
        ${
          // Use finalLogoSrcForHtml which prioritizes local, then Firestore
          finalLogoSrcForHtml
            ? `<img src="${finalLogoSrcForHtml}" alt="Company Logo" class="company-logo" onerror="this.style.display='none'; this.parentElement.innerHTML = '<div class=\\'logo-placeholder\\'>Logo Image Failed</div>';"/>`
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
             ? `<img src="${streetPhotoURL}" alt="Property Street View" class="cover-image" onerror="this.style.display='none'; this.parentElement.innerHTML = '<div class=\\'cover-placeholder\\'>Street Photo Failed</div>';"/>`
             : '<div class="cover-placeholder">Property Photo Not Available</div>'
         }
      </div>
      <div class="report-title-section"><h1>Remediation Report</h1></div>
      <div class="property-details">
        <p><strong>${street}${
    apt ? `, Apt ${apt}` : ''
  }, ${city}, ${state} ${zip}</strong> </p>
        <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
        <p><strong>Job Type:</strong> ${typeOfJob}</p>
        <p><strong>Initial Insp. Date:</strong> ${inspectionDateStr}</p>
        <p><strong>Remediation Start:</strong> ${remediationStartDateStr}</p>
        <p><strong>Remediation End:</strong> ${remediationEndDateStr}</p>
      </div>
      <div class="inspector-details-cover">
         <p><strong>Technician:</strong> ${inspectorName || 'N/A'}</p>
         <p>State License #${companyDetails.licenseNumber || 'N/A'}</p>
      </div>
      <div class="cover-footer">
        <p>© ${new Date().getFullYear()} ${
    companyDetails.companyName
  }. All rights reserved.</p>
      </div>
    </div>
  `

  const finalHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Remediation Report ${ticketNumber}</title>
  <style>${integratedModernCSS}</style>
</head>
<body>
  ${coverPageHTML}
  <div class="container">
    <div class="report-header-main"><h1>Remediation Details</h1></div>
    <div class="report-section">
      <h2>Work Area Details & Actions</h2>
      ${remediationRoomsHTML}
    </div>
    <div class="footer">Generated by ${
      companyDetails.companyName
    } | ${new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })}</div>
  </div>
</body>
</html>`

  return finalHtmlContent
}

// --- Main Screen Component (Make sure the rest of ViewRemediationScreen.js is here) ---
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
  const [isGeneratingReport, setIsGeneratingReport] = useState(false) // For activity indicator

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
          setTicket(data) // Set the full ticket data
          const remData = data.remediationData || { rooms: [] }
          // Filter rooms if needed, or use all rooms from remData for the report
          setRemediationData(remData)
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

  const generatePDFReport = async () => {
    if (!ticket || !remediationData) {
      Alert.alert('Error', 'Data not loaded yet. Cannot generate report.')
      return
    }
    setIsGeneratingReport(true) // Start activity indicator

    try {
      // Log only specific parts of ticket to avoid overly verbose logs, or stringify with replacer.
      console.log(
        'Ticket (summary):',
        JSON.stringify(
          {
            ticketNumber: ticket.ticketNumber,
            street: ticket.street,
            streetPhotoExists: !!ticket.streetPhoto?.downloadURL,
          },
          null,
          2
        )
      )

      const html = await generateHTML(ticket, remediationData) // Pass full ticket and remediationData

      const { uri: tempUri } = await Print.printToFileAsync({
        html,
        width: 595,
        height: 842,
      })

      const rawStreet = (ticket.street || 'Remediation_Report')
        .replace(/[^a-z0-9 ]/gi, '')
        .trim()
      const safeStreet = rawStreet.replace(/\s+/g, '_')
      const fileName = `${safeStreet}_Remediation_Report.pdf`

      // Use cacheDirectory for files that might be deleted or are temporary
      const destDir = FileSystem.cacheDirectory || FileSystem.documentDirectory
      const destUri = `${destDir}${fileName}` // Ensure destDir ends with '/' or handle appropriately

      try {
        await FileSystem.deleteAsync(destUri, { idempotent: true })
      } catch (e) {
        console.log('No existing file to delete or minor error:', e.message)
      }
      await FileSystem.moveAsync({ from: tempUri, to: destUri })

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          'Sharing Not Available',
          'Sharing is not supported on this device.'
        )
        setIsGeneratingReport(false)
        return
      }
      await Sharing.shareAsync(destUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share ${fileName}`,
      })
    } catch (error) {
      console.error('Error generating or sharing PDF:', error)
      Alert.alert('Error', `Failed to process PDF report: ${error.message}`)
    } finally {
      setIsGeneratingReport(false) // Stop activity indicator
    }
  }

  const headerOptions = [
    {
      label: 'Edit',
      onPress: () =>
        router.push({ pathname: '/RemediationScreen', params: { projectId } }),
      disabled: loading || !ticket || isGeneratingReport,
    },
    // { // CSV Export - re-enable if needed
    //   label: 'CSV',
    //   onPress: () => { /* ... */ },
    //   disabled: loading || !remediationData || isGeneratingReport,
    // },
    {
      label: 'Invoice',
      onPress: () =>
        router.push({ pathname: '/ViewInvoiceScreen', params: { projectId } }),
      disabled: loading || !ticket || isGeneratingReport,
    },
    {
      label: isGeneratingReport ? 'Generating...' : 'Share PDF', // Show loading state
      onPress: generatePDFReport,
      disabled: loading || !ticket || !remediationData || isGeneratingReport,
    },
  ]

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </View>
    )
  }

  const displayRooms = remediationData?.rooms || []

  if (
    !ticket ||
    (displayRooms.length === 0 && !remediationData?.someGlobalNote)
  ) {
    // Adjusted condition
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
            No remediation data available for this project.
          </Text>
        </View>
      </View>
    )
  }

  // --- Render Logic from your ViewRemediationScreen.js ---
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
        {/* Displaying the ticket and remediation data as per your original ViewRemediationScreen */}
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Ticket #:</Text>
          <Text style={styles.detailValue}>
            {ticket?.ticketNumber || 'N/A'}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Address:</Text>
          <Text style={styles.detailValue}>{`${ticket?.street || ''}${
            ticket?.apt ? `, ${ticket.apt}` : ''
          }, ${ticket?.city || ''}, ${ticket?.state || ''} ${
            ticket?.zip || ''
          }`}</Text>
        </View>
        {/* Add more ticket details here if needed */}

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
              {typeof room.numberOfFans === 'number' &&
                room.numberOfFans > 0 && (
                  <Text style={styles.fansText}>
                    <Text style={styles.label}>Air Movers: </Text>
                    {room.numberOfFans}
                  </Text>
                )}

              <Text style={styles.subHeader}>Line Items:</Text>
              {Array.isArray(room.measurements) &&
              room.measurements.length > 0 ? (
                room.measurements.map((measurement, measIndex) => {
                  const measurementKey = measurement.id
                    ? measurement.id
                    : `meas-${roomKey}-${measIndex}`
                  if (measurement.isRoomName) return null // Do not display room name as a line item here
                  return (
                    <View key={measurementKey} style={styles.measurementRow}>
                      <Text style={styles.measurementText}>
                        {measurement.name || 'N/A'}
                        {measurement.description
                          ? ` (${measurement.description})`
                          : ''}
                        : Qty{' '}
                        {measurement.quantity === undefined
                          ? 'N/A'
                          : measurement.quantity}
                      </Text>
                    </View>
                  )
                })
              ) : (
                <Text style={styles.noDataSubText}>No line items.</Text>
              )}

              {Array.isArray(room.photos) && room.photos.length > 0 && (
                <>
                  <Text style={styles.subHeader}>Photos:</Text>
                  <ScrollView horizontal style={styles.photoRowScrollView}>
                    {room.photos.map((photo, index) => {
                      if (!photo || !photo.downloadURL) return null
                      const photoKey =
                        photo.storagePath || `photo-${index}-${roomKey}`
                      return (
                        <TouchableOpacity
                          key={photoKey}
                          onPress={() => {
                            setSelectedPhoto(photo.downloadURL)
                            setPhotoModalVisible(true)
                          }}
                          style={styles.photoItemContainer} // Changed from photoItem to avoid conflict with PDF styles
                        >
                          <Image
                            source={{ uri: photo.downloadURL }}
                            style={styles.photoThumbnail}
                          />
                          {(photo.label || photo.comment) && ( // Check for label or comment
                            <Text style={styles.photoCaption}>
                              {photo.label || photo.comment}
                            </Text>
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
      {isGeneratingReport && ( // Full screen overlay activity indicator
        <View style={styles.activityOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.activityText}>Generating Report...</Text>
        </View>
      )}
    </View>
  )
}

// --- Styles (ensure these are complete from your original ViewRemediationScreen.js) ---
const styles = StyleSheet.create({
  fullScreenContainer: { flex: 1, backgroundColor: '#F3F5F7' }, // Changed from #F3F5F7
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  roomTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  subHeader: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    marginTop: 12,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 6,
    lineHeight: 21,
  },
  fansText: {
    fontSize: 14,
    color: '#15803D',
    marginBottom: 6,
    fontWeight: '500',
  },
  label: { fontWeight: '600', color: '#1F2937' }, // Reused if needed
  measurementRow: { marginVertical: 4, paddingLeft: 8 },
  measurementText: { fontSize: 14, color: '#4B5563' },
  noDataSubText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
    marginLeft: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  photoRowScrollView: { marginTop: 8, marginBottom: 4 }, // Added specific style for the scrollview
  photoItemContainer: {
    marginRight: 12,
    alignItems: 'center',
    marginBottom: 10,
  }, // Renamed from photoItem
  photoThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  }, // Renamed from photoImage
  photoCaption: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 5,
    textAlign: 'center',
    maxWidth: 100,
  }, // Renamed from photoLabel
  errorText: {
    textAlign: 'center',
    color: '#B91C1C',
    fontSize: 16,
    paddingHorizontal: 10,
  },
  detailItem: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: 5 },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginRight: 5,
    width: '30%',
  },
  detailValue: { fontSize: 14, color: '#4B5563', flexShrink: 1 },
  activityOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, // Make sure it's on top
  },
  activityText: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 16,
  },
})
