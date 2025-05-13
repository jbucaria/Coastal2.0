import * as Print from 'expo-print'
import * as FileSystem from 'expo-file-system' // Still needed for EncodingType
import { Asset } from 'expo-asset'
import coastalLogo from '../assets/images/CoastalRestorationServicesLogo-FinalTransparentBG.jpg' // Ensure this path is correct relative to this file

import { doc, getDoc, setDoc } from 'firebase/firestore'
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage'
import { firestore, app } from '@/firebaseConfig.js' // Ensure 'app' (FirebaseApp) and 'firestore' are correctly exported from your firebaseConfig

// Helper function to escape backslashes and other potentially problematic characters for HTML/JS strings
const escapeString = str => {
  if (typeof str !== 'string') return str
  return str
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/'/g, "\\'") // Escape single quotes (for JS in HTML attributes)
    .replace(/"/g, '\\"') // Escape double quotes (for JS in HTML attributes or if HTML is in JS)
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\r/g, '\\r') // Escape carriage returns
}

/**
 * Generates a PDF inspection report, uploads it to Firebase Storage,
 * and stores metadata in Firestore.
 * @param {object | null | undefined} ticket - The ticket data object. Must be a valid object.
 * @returns {Promise<string | null>} A promise that resolves with the Firebase Storage download URL of the PDF, or null if the process fails.
 * @throws {Error} Throws an error if ticket data is invalid, Expo modules are unavailable, or PDF generation/upload fails.
 */
export const generatePdf = async ticket => {
  console.log('[generatePdf_V4_START_UnicodeFix] Function called.')

  // --- Input Validation ---
  if (
    !ticket ||
    typeof ticket !== 'object' ||
    Object.keys(ticket).length === 0
  ) {
    console.error(
      '[generatePdf_V4_UnicodeFix] Invalid or empty ticket data. Type:',
      typeof ticket,
      'Value:',
      ticket
    )
    throw new Error('Invalid or empty ticket data provided')
  }
  console.log('[generatePdf_V4_UnicodeFix] Ticket data validated.')

  // --- Check Expo Modules Availability ---
  if (!Print || typeof Print.printToFileAsync !== 'function') {
    console.error(
      '[generatePdf_V4_UnicodeFix] Expo Print module or printToFileAsync function is not available.'
    )
    throw new Error('Expo Print module is not available')
  }
  if (
    !FileSystem ||
    typeof FileSystem.readAsStringAsync !== 'function' ||
    typeof FileSystem.EncodingType !== 'object'
  ) {
    console.error(
      '[generatePdf_V4_UnicodeFix] Expo FileSystem module, readAsStringAsync, or EncodingType is not available.'
    )
    throw new Error('Expo FileSystem module is not fully available')
  }
  if (!Asset || typeof Asset.fromModule !== 'function') {
    console.error(
      '[generatePdf_V4_UnicodeFix] Expo Asset module or fromModule function is not available.'
    )
    throw new Error('Expo Asset module is not available')
  }
  if (!app) {
    console.error(
      '[generatePdf_V4_UnicodeFix] Firebase App (from firebaseConfig) is not available.'
    )
    throw new Error('Firebase App is not initialized or imported correctly.')
  }
  console.log('[generatePdf_V4_UnicodeFix] Expo and Firebase modules checked.')

  // --- Data Extraction with Defaults ---
  // Apply escaping to string fields that will be directly embedded in HTML
  const ticketNumber = escapeString(ticket.ticketNumber || 'N/A')
  const street = escapeString(ticket.street || '')
  const apt = escapeString(ticket.apt || '')
  const city = escapeString(ticket.city || '')
  const state = escapeString(ticket.state || '')
  const zip = escapeString(ticket.zip || '')
  const inspectorName = escapeString(ticket.inspectorName || 'Unknown')
  const reason = escapeString(ticket.reason || 'Not specified')
  const {
    createdAt = {}, // Expecting Firestore Timestamp or an object with seconds/nanoseconds
    inspectionData = { rooms: [] },
    streetPhoto = null, // Expecting an object with downloadURL
  } = ticket
  console.log(
    '[generatePdf_V4_UnicodeFix] Ticket data extracted. Ticket Number:',
    ticketNumber
  )

  // --- Fetch Company Logo URL from Firestore (this is a fallback if local asset fails for HTML) ---
  let companyLogoFirestoreUrl = ''
  let companyDetails = {
    companyName: escapeString('Coastal Restoration Services'),
    email: escapeString('www.coastalrestorationservices@yahoo.com'),
    phoneNumbers: escapeString('(727) 313-808-1830 | (813) 919-3420'),
    certifications: escapeString(
      'Licensed Mold Remediation | State CMR, IICRC Certified | 24/7 Emergency Services'
    ),
    licenseNumber: escapeString('MRSR2966'),
  }
  try {
    console.log(
      '[generatePdf_V4_UnicodeFix] Attempting to fetch company info from Firestore.'
    )
    const companyDocRef = doc(firestore, 'companyInfo', 'Vj0FigLyhZCyprQ8iGGV')
    const companyDoc = await getDoc(companyDocRef)
    if (companyDoc.exists()) {
      const fetchedCompanyData = companyDoc.data()
      companyLogoFirestoreUrl = fetchedCompanyData?.logo || '' // This is a URL, typically doesn't need escaping unless it's malformed
      companyDetails.companyName = escapeString(
        fetchedCompanyData?.companyName || companyDetails.companyName
      )
      companyDetails.email = escapeString(
        fetchedCompanyData?.email || companyDetails.email
      )
      companyDetails.phoneNumbers = escapeString(
        fetchedCompanyData?.phoneNumbers || companyDetails.phoneNumbers
      )
      companyDetails.certifications = escapeString(
        fetchedCompanyData?.certifications || companyDetails.certifications
      )
      companyDetails.licenseNumber = escapeString(
        fetchedCompanyData?.licenseNumber || companyDetails.licenseNumber
      )
      console.log(
        '[generatePdf_V4_UnicodeFix] Fetched Firestore logo URL for potential use in HTML:',
        companyLogoFirestoreUrl || 'Not Found'
      )
    } else {
      console.warn(
        '[generatePdf_V4_UnicodeFix] Company info document (Vj0FigLyhZCyprQ8iGGV) does not exist. Using defaults.'
      )
    }
  } catch (error) {
    console.error(
      '[generatePdf_V4_UnicodeFix] Error fetching company logo/details from Firestore:',
      error
    )
  }
  console.log('[generatePdf_V4_UnicodeFix] Company info fetch complete.')

  // --- Load local logo asset as base64 to embed in PDF HTML ---
  let logoDataUri = ''
  console.log(
    '[generatePdf_V4_LOCAL_LOGO_START_UnicodeFix] Attempting to process local logo for HTML embedding.'
  )
  try {
    console.log(
      '[generatePdf_V4_LOCAL_LOGO_UnicodeFix] `coastalLogo` import reference:',
      coastalLogo
        ? `Exists (type: ${typeof coastalLogo}, value: ${JSON.stringify(
            coastalLogo
          ).substring(0, 100)}...)`
        : 'UNDEFINED/NULL'
    )
    if (!coastalLogo) {
      throw new Error(
        '`coastalLogo` import is undefined or null. Check the import path.'
      )
    }
    const asset = Asset.fromModule(coastalLogo)
    console.log(
      '[generatePdf_V4_LOCAL_LOGO_UnicodeFix] Asset.fromModule called. Asset name:',
      asset.name,
      'Type:',
      asset.type,
      'URI:',
      asset.uri
    )
    await asset.downloadAsync()
    console.log(
      '[generatePdf_V4_LOCAL_LOGO_UnicodeFix] Asset downloaded. Local URI:',
      asset.localUri
    )
    if (!asset.localUri) {
      throw new Error(
        'Local asset URI is null or undefined after download. Asset might not be bundled correctly or download failed.'
      )
    }
    const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: FileSystem.EncodingType.Base64,
    })
    console.log(
      '[generatePdf_V4_LOCAL_LOGO_UnicodeFix] Asset read as base64. Length:',
      base64 ? base64.length : 'EMPTY/NULL'
    )
    if (!base64) {
      throw new Error(
        'Failed to read asset as base64 or the resulting base64 string is empty.'
      )
    }
    let mime = 'image/jpeg'
    if (asset.type) {
      const assetTypeLower = asset.type.toLowerCase()
      if (assetTypeLower === 'png') mime = 'image/png'
      else if (assetTypeLower === 'jpeg' || assetTypeLower === 'jpg')
        mime = 'image/jpeg'
      else mime = `image/${assetTypeLower}`
    } else if (asset.name) {
      const assetNameLower = asset.name.toLowerCase()
      if (assetNameLower.endsWith('.png')) mime = 'image/png'
      else if (
        assetNameLower.endsWith('.jpg') ||
        assetNameLower.endsWith('.jpeg')
      )
        mime = 'image/jpeg'
    }
    console.log(
      '[generatePdf_V4_LOCAL_LOGO_UnicodeFix] Determined MIME type for data URI:',
      mime
    )
    logoDataUri = `data:${mime};base64,${base64}` // Base64 data doesn't need `escapeString`
    console.log(
      `[generatePdf_V4_LOCAL_LOGO_UnicodeFix] Successfully created data URI from local asset. Data URI length: ${logoDataUri.length}`
    )
    if (logoDataUri.length > 2 * 1024 * 1024) {
      console.warn(
        `[generatePdf_V4_LOCAL_LOGO_UnicodeFix] Generated logo data URI is very long (${logoDataUri.length} characters).`
      )
    }
  } catch (e) {
    console.error(
      '[generatePdf_V4_LOCAL_LOGO_ERROR_UnicodeFix] Error loading local logo asset for HTML:',
      e.message,
      e.stack ? e.stack.split('\n')[0] : 'No stack available'
    )
    console.log(
      '[generatePdf_V4_LOCAL_LOGO_FALLBACK_UnicodeFix] Falling back to Firestore logo URL for HTML. Fetched `companyLogoFirestoreUrl` was:',
      companyLogoFirestoreUrl || 'Not Found'
    )
    logoDataUri = companyLogoFirestoreUrl || '' // This is a URL, generally safe
    if (logoDataUri) {
      console.log(
        '[generatePdf_V4_LOCAL_LOGO_FALLBACK_UnicodeFix] Using Firestore URL for logo in HTML:',
        logoDataUri.substring(0, 70) + '...'
      )
    } else {
      console.log(
        '[generatePdf_V4_LOCAL_LOGO_FALLBACK_UnicodeFix] No local asset and no Firestore URL available for logo in HTML. Placeholder will be shown.'
      )
    }
  }
  console.log(
    '[generatePdf_V4_LOGO_FINAL_URI_FOR_HTML_UnicodeFix] Final `logoDataUri` to be used in HTML:',
    logoDataUri ? logoDataUri.substring(0, 100) + '...' : 'EMPTY'
  )

  // --- Format Date ---
  const createdAtDateObj =
    createdAt && typeof createdAt.seconds === 'number'
      ? new Date(
          createdAt.seconds * 1000 + (createdAt.nanoseconds || 0) / 1000000
        )
      : new Date()
  const createdAtStr = escapeString(
    createdAtDateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  )
  console.log('[generatePdf_V4_UnicodeFix] Date formatted:', createdAtStr)

  // --- Get Street Photo URL for HTML ---
  const streetPhotoURLForHTML = streetPhoto?.downloadURL || '' // URLs are generally safe
  console.log(
    '[generatePdf_V4_UnicodeFix] Using Street Photo URL for HTML:',
    streetPhotoURLForHTML || 'Not available'
  )

  // --- Build Rooms HTML ---
  let roomsHTML = ''
  if (
    inspectionData &&
    Array.isArray(inspectionData.rooms) &&
    inspectionData.rooms.length > 0
  ) {
    roomsHTML = inspectionData.rooms
      .map((room, index) => {
        const roomTitle = escapeString(room?.roomTitle || `Room ${index + 1}`)
        const inspectionFindings = escapeString(
          room?.inspectionFindings || 'No findings reported.'
        )
        const photos = room?.photos || []

        const photosHTML =
          Array.isArray(photos) && photos.length > 0
            ? photos
                .map(p => {
                  const imageUrl = p?.downloadURL // URLs are generally safe
                  const comment = escapeString(p?.comment || '')
                  if (
                    imageUrl &&
                    typeof imageUrl === 'string' &&
                    (imageUrl.startsWith('http://') ||
                      imageUrl.startsWith('https://') ||
                      imageUrl.startsWith('file://'))
                  ) {
                    return `<div class="photo-item">
                        <img src="${imageUrl}" alt="${
                      roomTitle /* already escaped */ || `Room ${index + 1}`
                    } photo" onerror="this.style.display='none'; this.parentElement.innerHTML += '<p class=\\'no-photos\\'>Photo failed to load</p>';"/>
                        ${
                          comment
                            ? `<p class="photo-comment">${
                                comment /* already escaped */
                              }</p>`
                            : ''
                        }
                      </div>`
                  }
                  return ''
                })
                .join('')
            : '<p class="no-photos">No photos available for this room.</p>'
        const finalPhotosHTML =
          photosHTML.trim() === ''
            ? '<p class="no-photos">No valid photos available for this room.</p>'
            : photosHTML
        return `
          <div class="room-card">
            <h3>${roomTitle /* already escaped */}</h3>
            <p><strong>Findings:</strong> ${
              inspectionFindings /* already escaped */
            }</p>
            <div class="photo-gallery">${finalPhotosHTML}</div>
          </div>`
      })
      .join('')
  } else {
    roomsHTML = '<p class="no-data">No inspection data or rooms available.</p>'
  }
  console.log('[generatePdf_V4_UnicodeFix] Rooms HTML built.')

  // --- HTML Structure: Cover Page ---
  // All dynamic string variables used here should now be escaped
  const coverPageHTML = `
    <div class="cover-page">
      <div class="cover-header">
        ${
          logoDataUri
            ? `<img src="${logoDataUri}" alt="Company Logo" class="company-logo" onerror="this.style.display='none'; this.parentElement.innerHTML = '<div class=\\'logo-placeholder\\'>Logo Failed to Load (HTML)</div>';"/>`
            : '<div class="logo-placeholder">Company Logo Not Available for HTML</div>'
        }
        <div class="company-contact-info">
          <p>${companyDetails.email}</p>
          <p>${companyDetails.certifications}</p>
        </div>
      </div>
      <div class="cover-photo-container">
        ${
          streetPhotoURLForHTML
            ? `<img src="${streetPhotoURLForHTML}" alt="Property Street View" class="cover-image" onerror="this.style.display='none'; this.parentElement.innerHTML = '<div class=\\'cover-placeholder\\'>Street View Photo Failed to Load</div>';"/>`
            : '<div class="cover-placeholder">Street View Photo Not Available</div>'
        }
      </div>
      <div class="company-main-title">${companyDetails.companyName}</div>
      <div class="company-main-title">Inspection Report</div>
      <div class="property-details">
        <p><strong>Property Address:</strong> ${street}${
    apt ? `, Apt ${apt}` : ''
  }, ${city}, ${state} ${zip}</p>
        <p><strong>Inspected on:</strong> ${createdAtStr}</p>
        <p><strong>Reason for Inspection:</strong> ${reason}</p>
      </div>
      <div class="inspector-details-cover">
        <p><strong>Inspected By:</strong> ${inspectorName}</p>
        <p>State License #${companyDetails.licenseNumber}</p>
      </div>
      <div class="cover-footer">
        <p>© ${new Date().getFullYear()} ${
    companyDetails.companyName
  }. All rights reserved.</p>
      </div>
    </div>`

  // --- CSS Styles (Static string, no changes needed for this error) ---
  const integratedModernCSS = `
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
    @page { size: A4; margin: 20mm; } @page:first { margin: 0; } * { box-sizing: border-box; }
    body { font-family: 'Roboto', sans-serif; margin: 0; padding: 0; background: #ffffff; color: #333; line-height: 1.6; }
    .cover-page { width: 210mm; height: 297mm; padding: 20mm; display: flex; flex-direction: column; align-items: center; text-align: center; background: linear-gradient(to bottom, #e3f2fd, #ffffff); page-break-after: always; position: relative; justify-content: space-around; }
    .cover-header { width: 100%; display: flex; flex-direction: column; align-items: center; margin-bottom: 10mm; }
    .company-logo { max-width: 160mm; max-height: 60mm; width: auto; height: auto; object-fit: contain; margin-bottom: 5mm; }
    .logo-placeholder { width: 150px; height: 75px; border: 2px dashed #b0bec5; display: flex; align-items: center; justify-content: center; color: #78909c; font-size: 14px; background-color: #eceff1; margin: 0 auto 15px; padding: 10px; text-align: center; }
    .company-contact-info { margin-top: 5mm; } .company-contact-info p { font-size: 12px; color: #455a64; margin: 3px 0; }
    .cover-photo-container { width: 100%; max-width: 170mm; height: 90mm; margin: 10mm auto; overflow: hidden; display: flex; justify-content: center; align-items: center; background-color: #f0f0f0; border: 1px solid #e0e0e0; }
    .cover-image { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: 0; }
    .cover-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; text-align: center; color: #6b7280; font-size: 16px; border: 2px dashed #9ca3af; background-color: #e5e7eb; border-radius: 4px; padding: 15px; }
    .company-main-title { color: #0d47a1; font-size: 28px; font-weight: 700; margin-bottom: 5mm; letter-spacing: 1px; }
    .property-details { margin-bottom: 10mm; font-size: 14px; color: #37474f; line-height: 1.7; } .property-details p { margin: 5px 0; } .property-details strong { color: #0d47a1; font-weight: bold; }
    .inspector-details-cover { margin-top: 5mm; font-size: 13px; color: #455a64; } .inspector-details-cover p { margin: 4px 0; }
    .cover-footer { margin-top: auto; padding-top: 10mm; font-size: 10px; color: #78909c; text-align: center; width: 100%; }
    .container { max-width: 170mm; margin: 0 auto; background: #fff; text-align: left; padding-bottom: 20mm; }
    .report-header-main { text-align: center; margin-bottom: 10mm; border-bottom: 2px solid #1e3a8a; padding-bottom: 5mm; page-break-after: avoid; } .report-header-main h1 { font-size: 26px; color: #1e3a8a; margin: 0; font-weight: 700; }
    .report-section { margin-bottom: 10mm; padding: 0; page-break-inside: auto; } .report-section h2 { font-size: 20px; color: #1e3a8a; margin-top: 0; margin-bottom: 8mm; border-bottom: 1px solid #b0bec5; padding-bottom: 4mm; page-break-after: avoid; }
    .room-card { padding: 15px; border: 1px solid #cfd8dc; border-radius: 8px; margin-bottom: 15px; background-color: #f8f9fa; page-break-inside: avoid; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .room-card h3 { margin: 0 0 10px; font-size: 17px; color: #263238; border-bottom: 1px solid #eceff1; padding-bottom: 8px; font-weight: 700; }
    .room-card p { margin-bottom: 10px; color: #455a64; font-size: 13px; } .room-card p strong { color: #1e3a8a; font-weight: bold; }
    .photo-gallery { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-start; margin-top: 10px; }
    .photo-item { width: calc(33.333% - 7px); margin-bottom: 10px; text-align: center; page-break-inside: avoid; background-color: #e9ecef; border-radius: 4px; overflow: hidden; min-height: 120px; display: flex; flex-direction: column; justify-content: flex-start; border: 1px solid #dee2e6; }
    .photo-item img { width: 100%; height: 100px; object-fit: cover; border: none; display: block; background-color: #ced4da; }
    .photo-comment { font-size: 10px; color: #495057; margin-top: auto; padding: 5px; word-wrap: break-word; background-color: #f8f9fa; width: 100%; }
    .no-data, .no-photos { font-style: italic; color: #6c757d; text-align: center; margin: 15px 0; font-size: 13px; padding: 10px; width: 100%; background-color: #f1f3f5; border-radius: 4px; }
    .footer { text-align: center; padding-top: 10mm; font-size: 11px; color: #6c757d; border-top: 1px solid #dee2e6; margin-top: 10mm; page-break-before: auto; }
  `

  // --- Assemble Final HTML ---
  const htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Inspection Report ${ticketNumber}</title><style>${integratedModernCSS}</style></head><body>${coverPageHTML}<div class="container"><div class="report-header-main"><h1>Inspection Report Details</h1></div><div class="report-section"><h2>Property & Inspection Overview</h2><div class="room-card"><p><strong>Ticket Number:</strong> ${ticketNumber}</p><p><strong>Property Address:</strong> ${street}${
    apt ? `, Apt ${apt}` : ''
  }, ${city}, ${state} ${zip}</p><p><strong>Date of Inspection:</strong> ${createdAtStr}</p><p><strong>Inspector:</strong> ${inspectorName}</p><p><strong>Reason for Inspection:</strong> ${reason}</p></div></div><div class="report-section"><h2>Room Details & Findings</h2>${roomsHTML}</div><div class="footer"><p>Generated by ${
    companyDetails.companyName
  } | ${escapeString(
    new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  )}</p><p>License: ${
    companyDetails.licenseNumber
  }</p></div></div></body></html>`
  console.log('[generatePdf_V4_UnicodeFix] HTML content assembled.')

  // --- Generate PDF, Upload to Firebase Storage, and Save Metadata ---
  let firebaseStorageDownloadUrl = null
  try {
    // 1. Generate PDF to a temporary file
    console.log(
      `[generatePdf_V4_UnicodeFix] Generating PDF for inspection ticket: ${ticketNumber} using expo-print.`
    )
    const { uri: temporaryPdfUri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
      width: 595,
      height: 842,
    })
    console.log(
      `[generatePdf_V4_UnicodeFix] PDF generated at temporary device URI: ${temporaryPdfUri}`
    )

    // 2. Determine a unique filename for Firebase Storage
    // Use the unescaped ticketNumber for the storage path for consistency with other parts of your system if needed
    const rawTicketNumber = ticket.ticketNumber || 'report'
    const safeRawTicketNumber = String(rawTicketNumber).replace(
      /[^a-z0-9_.-]/gi,
      '_'
    )
    const safeStreetForFilename = String(ticket.street || 'address').replace(
      /[^a-z0-9_.-]/gi,
      '_'
    )
    const timestamp = Date.now()
    const filenameInStorage =
      `Inspection_Report_${safeRawTicketNumber}_${safeStreetForFilename}_${timestamp}.pdf`.replace(
        /[#$[\]*?/]/g,
        '_'
      )
    const storagePath = `reports/${String(
      rawTicketNumber
    )}/${filenameInStorage}`

    console.log(
      `[generatePdf_V4_UnicodeFix] Determined Firebase Storage path for PDF: ${storagePath}`
    )

    // 3. Fetch the PDF file content from the temporary URI as a blob
    const response = await fetch(temporaryPdfUri)
    if (!response.ok) {
      throw new Error(
        `Failed to fetch temporary PDF from URI '${temporaryPdfUri}': ${response.status} ${response.statusText}`
      )
    }
    const blob = await response.blob()
    console.log(
      `[generatePdf_V4_UnicodeFix] PDF fetched as blob from temporary URI. Blob size: ${blob.size}, Blob type: ${blob.type}`
    )

    // 4. Upload the blob to Firebase Storage
    const storage = getStorage(app)
    const storageFileRef = ref(storage, storagePath)
    console.log(
      `[generatePdf_V4_UnicodeFix] Attempting to upload PDF blob to Firebase Storage at: ${storagePath}`
    )
    const uploadTaskSnapshot = await uploadBytesResumable(
      storageFileRef,
      blob,
      {
        contentType: 'application/pdf',
      }
    )
    console.log(
      '[generatePdf_V4_UnicodeFix] Upload to Firebase Storage successful. Snapshot state:',
      uploadTaskSnapshot.state
    )

    // 5. Get the Download URL for the uploaded file
    firebaseStorageDownloadUrl = await getDownloadURL(uploadTaskSnapshot.ref)
    console.log(
      `[generatePdf_V4_UnicodeFix] PDF successfully uploaded to Firebase Storage. Download URL: ${firebaseStorageDownloadUrl}`
    )

    // 6. Save Report metadata to Firestore subcollection and update main ticket document
    const reportTimestamp = new Date()
    try {
      const reportSubcollectionDocRef = doc(
        firestore,
        'tickets',
        String(rawTicketNumber),
        'reports',
        filenameInStorage
      )
      await setDoc(reportSubcollectionDocRef, {
        storageUrl: firebaseStorageDownloadUrl,
        storagePath: storagePath,
        filename: filenameInStorage,
        ticketNumber: String(rawTicketNumber),
        createdAt: reportTimestamp,
        type: 'inspection',
      })
      console.log(
        `[generatePdf_V4_UnicodeFix] Report metadata saved to Firestore subcollection: tickets/${rawTicketNumber}/reports/${filenameInStorage}`
      )

      const mainTicketDocRef = doc(
        firestore,
        'tickets',
        String(rawTicketNumber)
      )
      await setDoc(
        mainTicketDocRef,
        {
          pdfUrl: firebaseStorageDownloadUrl,
          reportGeneratedAt: reportTimestamp,
        },
        { merge: true }
      )
      console.log(
        `[generatePdf_V4_UnicodeFix] Main ticket document updated with new PDF URL for ticket: ${rawTicketNumber}`
      )
    } catch (firestoreError) {
      console.error(
        '[generatePdf_V4_UnicodeFix] Error saving report metadata or updating main ticket in Firestore:',
        firestoreError
      )
    }

    // 7. Optionally, delete the temporary local PDF file
    try {
      await FileSystem.deleteAsync(temporaryPdfUri, { idempotent: true })
      console.log(
        `[generatePdf_V4_UnicodeFix] Temporary local PDF file deleted: ${temporaryPdfUri}`
      )
    } catch (deleteError) {
      console.warn(
        `[generatePdf_V4_UnicodeFix] Could not delete temporary local PDF file: ${temporaryPdfUri}`,
        deleteError
      )
    }

    // 8. Return the Firebase Storage Download URL
    return firebaseStorageDownloadUrl
  } catch (error) {
    console.error(
      '[generatePdf_V4_UnicodeFix] Critical error in PDF generation or Firebase Storage upload process:',
      error.message,
      error.stack ? error.stack.substring(0, 300) : ''
    )
    throw new Error(`Failed to process and upload PDF report: ${error.message}`)
  }
}
