import * as Print from 'expo-print'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { firestore } from '@/firebaseConfig'

/**
 * Generates a PDF inspection report from ticket data, saves it locally,
 * and stores metadata in Firestore.
 * @param {object | null | undefined} ticket - The ticket data object. Should be a valid object.
 * @returns {Promise<string | null>} A promise that resolves with the permanent local URI of the saved PDF file, or null if saving fails.
 * @throws {Error} Throws an error if ticket data is invalid, Expo modules are unavailable, or PDF generation/saving fails.
 */
export const generatePdf = async ticket => {
  // --- Input Validation ---
  if (!ticket || typeof ticket !== 'object') {
    console.error(
      'generatePdf received invalid ticket data. Type:',
      typeof ticket,
      'Value:',
      ticket
    )
    throw new Error('Invalid ticket data provided')
  }

  // --- Check Expo Modules Availability ---
  if (!Print || typeof Print.printToFileAsync !== 'function') {
    console.error(
      'Expo Print module or printToFileAsync function is not available.'
    )
    throw new Error('Expo Print module is not available')
  }
  if (!FileSystem || typeof FileSystem.moveAsync !== 'function') {
    console.error(
      'Expo FileSystem module or moveAsync function is not available.'
    )
    throw new Error('Expo FileSystem module is not available')
  }

  // --- Data Extraction with Defaults ---
  const {
    ticketNumber = 'N/A',
    street = '',
    apt = '',
    city = '',
    state = '',
    zip = '',
    createdAt = {},
    inspectorName = 'Unknown',
    reason = 'Not specified',
    inspectionData = { rooms: [] },
    streetPhoto = null,
  } = ticket

  // --- Fetch Company Logo from Firestore ---
  let logoURL = ''
  let companyDetails = {
    companyName: 'Coastal Restoration Services',
    email: 'www.coastalrestorationservices@yahoo.com',
    phoneNumbers: '(727) 313-808-1830 | (813) 919-3420',
    certifications:
      'Licensed Mold Remediation | State CMR, IICRC Certified | 24/7 Emergency Services',
    licenseNumber: 'MRSR2966',
  }
  try {
    const companyDocRef = doc(firestore, 'companyInfo', 'Vj0FigLyhZCyprQ8iGGV')
    const companyDoc = await getDoc(companyDocRef)
    if (companyDoc.exists()) {
      const fetchedCompanyData = companyDoc.data()
      logoURL = fetchedCompanyData?.logo || ''
      companyDetails.companyName =
        fetchedCompanyData?.companyName || companyDetails.companyName
      companyDetails.email = fetchedCompanyData?.email || companyDetails.email
      companyDetails.phoneNumbers =
        fetchedCompanyData?.phoneNumbers || companyDetails.phoneNumbers
      companyDetails.certifications =
        fetchedCompanyData?.certifications || companyDetails.certifications
      companyDetails.licenseNumber =
        fetchedCompanyData?.licenseNumber || companyDetails.licenseNumber
      console.log('Fetched logo URL:', logoURL || 'Not Found')
    } else {
      console.warn(
        'Company info document (Vj0FigLyhZCyprQ8iGGV) does not exist. Using defaults.'
      )
    }
  } catch (error) {
    console.error('Error fetching company logo/details from Firestore:', error)
  }

  // --- Format Date ---
  const createdAtDate =
    createdAt && typeof createdAt.seconds === 'number'
      ? new Date(createdAt.seconds * 1000)
      : new Date()
  const createdAtStr = createdAtDate.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  // --- Get Street Photo URL ---
  const streetPhotoURL = streetPhoto?.downloadURL || ''
  console.log('Using Street Photo URL:', streetPhotoURL)

  // --- Build Rooms HTML ---
  let roomsHTML = ''
  if (
    inspectionData &&
    Array.isArray(inspectionData.rooms) &&
    inspectionData.rooms.length > 0
  ) {
    roomsHTML = inspectionData.rooms
      .map((room, index) => {
        const {
          roomTitle = `Room ${index + 1}`,
          inspectionFindings = '',
          photos = [],
        } = room || {}
        const photosHTML =
          Array.isArray(photos) && photos.length > 0
            ? photos
                .map(p => {
                  const imageUrl = p?.downloadURL
                  const comment = p?.comment
                  if (imageUrl && typeof imageUrl === 'string') {
                    if (
                      !imageUrl.startsWith('http://') &&
                      !imageUrl.startsWith('https://')
                    ) {
                      console.warn(`Invalid photo URL found: ${imageUrl}`)
                      return `<div class="photo-item"><p class="no-photos">Invalid Photo URL</p></div>`
                    }
                    return `<div class="photo-item">
                            <img src="${imageUrl}" alt="${
                      roomTitle || `Room ${index + 1}`
                    } photo" onerror="this.style.display='none'; this.parentElement.innerHTML += '<p class=\\'no-photos\\'>Photo failed to load</p>';"/>
                            ${
                              comment
                                ? `<p class="photo-comment">${comment}</p>`
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
            <h3>${roomTitle || `Room ${index + 1}`}</h3>
            <p><strong>Findings:</strong> ${
              inspectionFindings || 'No findings reported.'
            }</p>
            <div class="photo-gallery">${finalPhotosHTML}</div>
          </div>
        `
      })
      .join('')
  } else {
    roomsHTML = '<p class="no-data">No inspection data or rooms available.</p>'
  }

  // --- HTML Structure: Cover Page ---
  const coverPageHTML = `
    <div class="cover-page">
      <div class="cover-header">
        ${
          logoURL
            ? `<img src="${logoURL}" alt="Company Logo" class="company-logo" onerror="this.parentElement.innerHTML = '<div class=\\'logo-placeholder\\'>Logo Failed to Load</div>';"/>`
            : '<div class="logo-placeholder">Company Logo Not Available</div>'
        }
        
        <div class="company-contact-info">
          <p>${companyDetails.email}</p>
          <p>${companyDetails.certifications}</p>
        </div>
      </div>
      <div class="cover-photo-container">
        ${
          streetPhotoURL
            ? `<img src="${streetPhotoURL}" alt="Property Street View" class="cover-image" onerror="this.parentElement.innerHTML = '<div class=\\'cover-placeholder\\'>Street View Photo Failed to Load</div>';"/>`
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
        <p><strong>Inspected By:</strong> ${inspectorName || 'N/A'}</p>
        <p>State License #${companyDetails.licenseNumber || 'N/A'}</p>
      </div>
      <div class="cover-footer">
        <p>© ${new Date().getFullYear()} ${
    companyDetails.companyName
  }. All rights reserved.</p>
      </div>
    </div>
  `

  // --- CSS Styles ---
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
    .cover-page { width: 210mm; height: 297mm; padding: 30mm 20mm; display: flex; flex-direction: column; align-items: center; text-align: center; background: linear-gradient(to bottom, #e3f2fd, #ffffff); page-break-after: always; position: relative; justify-content: flex-start; }
    .cover-header { width: 100%;  }
  .company-logo {
  max-width: 400px; /* Increased from 150px */
  max-height: 200px; /* Increased from 75px */
  width: auto;
  height: auto;
  margin-bottom: 5px; /* Slightly increased to balance spacing */
  object-fit: contain;
}
    .logo-placeholder { width: 150px; height: 50px; border: 2px dashed #b0bec5; display: flex; align-items: center; justify-content: center; color: #78909c; font-size: 14px; background-color: #eceff1; margin: 0 auto 15px; padding: 5px; text-align: center; }
    .company-main-title { color: #0d47a1; font-size: 32px; font-weight: 700; margin-bottom: 5px; }
    .company-contact-info p { font-size: 13px; color: #555; margin: 2px 0; }
    .cover-photo-container { width: 100%; max-width: 170mm; height: 100mm; margin: 5mm auto;  overflow: hidden; display: flex; justify-content: center; align-items: center;  }
    .cover-image { display: block; width: auto; height: 100%; max-width: 100%; max-height: 100%; object-fit: cover; border-radius: 0; }
    .cover-placeholder { width: 90%; height: auto; padding: 15px; text-align: center; color: #6b7280; font-size: 16px; border: 2px dashed #9ca3af; background-color: #e5e7eb; border-radius: 4px; }
    .report-title-section { margin-top: 10mm; margin-bottom: 10mm; }
    .report-title-section h1 { font-size: 40px; color: #1a237e; margin: 0; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; }
    .property-details { margin-bottom: 10mm; font-size: 15px; color: #444; line-height: 1.8; }
    .property-details p { margin: 4px 0; }
    .property-details strong { color: #0d47a1; }
    .inspector-details-cover { margin-top: 10mm; font-size: 14px; color: #555; }
    .inspector-details-cover p { margin: 3px 0; }
    .cover-footer { position: absolute; bottom: 20mm; left: 20mm; right: 20mm; font-size: 11px; color: #777; text-align: center; }
    .container { max-width: 170mm; margin: 0 auto; background: #fff; text-align: left; padding-bottom: 20mm; }
    .report-header-main { text-align: center; margin-bottom: 10mm; border-bottom: 2px solid #1e3a8a; padding-bottom: 5mm; page-break-after: avoid; }
    .report-header-main h1 { font-size: 28px; color: #1e3a8a; margin: 0; font-weight: 700; }
    .report-section { margin-bottom: 10mm; padding: 0; page-break-inside: auto; }
    .report-section h2 { font-size: 22px; color: #1e3a8a; margin-bottom: 10mm; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px; page-break-after: avoid; }
    .room-card { padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 15px; background-color: #f9f9f9; page-break-inside: avoid; }
    .room-card h3 { margin: 0 0 10px; font-size: 18px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    .room-card p { margin-bottom: 10px; color: #555; }
    .room-card p strong { color: #1e3a8a; }
    .photo-gallery { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-start; margin-top: 10px; }
    .photo-item { display: inline-block; vertical-align: top; width: calc(33.333% - 7px); margin-bottom: 10px; text-align: center; page-break-inside: avoid; background-color: #f0f0f0; border-radius: 4px; overflow: hidden; min-height: 120px; display: flex; flex-direction: column; justify-content: space-between; }
    .photo-item img { width: 100%; height: 100px; object-fit: cover; border: none; display: block; margin-bottom: 5px; background-color: #e0e0e0; }
    .photo-comment { font-size: 11px; color: #4b5563; margin-top: auto; padding: 0 5px 5px 5px; word-wrap: break-word; }
    .no-data, .no-photos { font-style: italic; color: #666; text-align: center; margin: 15px 0; font-size: 14px; padding: 10px; width: 100%; }
    .footer { text-align: center; padding-top: 10mm; font-size: 12px; color: #666; border-top: 1px solid #e0e0e0; margin-top: 10mm; page-break-before: auto; }
  `

  // --- Assemble Final HTML ---
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inspection Report ${ticketNumber}</title>
  <style>
    ${integratedModernCSS}
  </style>
</head>
<body>
  ${coverPageHTML}
  <div class="container">
    <div class="report-section">
     
    </div>
    <div class="report-section">
      <h2>Room Details & Findings</h2>
      ${roomsHTML}
    </div>
    <div class="footer">Generated by ${
      companyDetails.companyName
    } | ${new Date().toLocaleDateString()}</div>
  </div>
</body>
</html>`

  // --- Generate PDF, Save Locally, and Save to Firestore ---
  let finalLocalUri = null
  try {
    // 1. Generate PDF to a temporary file
    console.log(`Generating PDF for inspection ticket: ${ticketNumber}`)
    const { uri: temporaryPdfUri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
      width: 595,
      height: 842,
    })
    console.log(`PDF generated at temporary URI: ${temporaryPdfUri}`)

    // 2. Determine a unique local filename
    const safeTicketNumber = String(ticketNumber || 'report').replace(
      /[^a-z0-9_.-]/gi,
      '_'
    )
    const safeStreet = String(street || 'address').replace(
      /[^a-z0-9_.-]/gi,
      '_'
    )
    const filenameBase = `Inspection_Report_${safeTicketNumber}_${safeStreet}`
    let filename = `${filenameBase}.pdf`
    let counter = 1
    let potentialLocalUri = `${FileSystem.documentDirectory}${filename}`

    while (
      await FileSystem.getInfoAsync(potentialLocalUri).then(info => info.exists)
    ) {
      console.log(`File exists: ${potentialLocalUri}. Trying next name.`)
      filename = `${filenameBase}_${counter++}.pdf`
      potentialLocalUri = `${FileSystem.documentDirectory}${filename}`
      if (counter > 20) {
        console.warn('Exceeded file renaming attempts for PDF save.')
        throw new Error('Could not create unique filename for saving PDF.')
      }
    }
    console.log(`Determined unique local save URI: ${potentialLocalUri}`)

    // 3. Move the temporary file to the permanent local location
    await FileSystem.moveAsync({
      from: temporaryPdfUri,
      to: potentialLocalUri,
    })
    finalLocalUri = potentialLocalUri
    console.log(`PDF successfully saved to: ${finalLocalUri}`)

    // 4. Save PDF metadata to Firestore
    try {
      const pdfDocRef = doc(
        firestore,
        'tickets',
        ticketNumber,
        'reports',
        filename
      )
      await setDoc(pdfDocRef, {
        localUri: finalLocalUri,
        filename: filename,
        ticketNumber: ticketNumber,
        createdAt: new Date(),
        type: 'inspection',
      })
      console.log(`PDF metadata saved to Firestore for ticket: ${ticketNumber}`)
    } catch (firestoreError) {
      console.error('Error saving PDF metadata to Firestore:', firestoreError)
    }

    // 5. Return the final local URI
    return finalLocalUri
  } catch (error) {
    console.error('Error generating or saving PDF:', error)
    throw new Error(`Failed to process PDF report: ${error.message}`)
  }
}
