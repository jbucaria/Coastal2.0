import * as Print from 'expo-print'
import * as FileSystem from 'expo-file-system'
import { Asset } from 'expo-asset'
import coastalLogo from '../assets/images/CoastalRestorationServicesLogo-FinalTransparentBG.jpg' // Ensure path is correct

import { doc, getDoc, setDoc } from 'firebase/firestore'
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage'
import { firestore, app } from '@/firebaseConfig.js'

const escapeString = str => {
  if (typeof str !== 'string') return str
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
}

export const generatePdf = async ticket => {
  console.log('[generatePdf_Simplified] Function called.')

  if (
    !ticket ||
    typeof ticket !== 'object' ||
    Object.keys(ticket).length === 0
  ) {
    console.error('[generatePdf_Simplified] Invalid ticket data:', ticket)
    throw new Error('Invalid or empty ticket data provided')
  }

  if (!Print || !FileSystem || !Asset || !app) {
    console.error('[generatePdf_Simplified] Missing critical modules.')
    throw new Error('A required module is not available.')
  }
  console.log(
    '[generatePdf_Simplified] Modules checked. Ticket data validated.'
  )

  const ticketNumber = escapeString(ticket.ticketNumber || 'N/A')
  const street = escapeString(ticket.street || 'Unknown Address')
  const apt = escapeString(ticket.apt || '')
  const city = escapeString(ticket.city || '')
  const state = escapeString(ticket.state || '')
  const zip = escapeString(ticket.zip || '')
  const inspectorName = escapeString(ticket.inspectorName || 'Unknown')
  const reason = escapeString(ticket.reason || 'Not specified')
  const {
    createdAt = {},
    inspectionData = { rooms: [] },
    remediationData = null,
    streetPhoto = null,
  } = ticket
  if (remediationData) {
    console.log(
      `[generatePdf_Simplified] Using 'remediationData' for room details.`
    )
  } else {
    console.log(
      `[generatePdf_Simplified] Using 'inspectionData' for room details.`
    )
  }

  let companyLogoFirestoreUrl = ''
  let companyDetails = {
    companyName: escapeString('Coastal Restoration Services'),
    email: escapeString('info@coastalrestorationservices.com'),
    phoneNumbers: escapeString('(727) 313-8080 | (813) 919-3420'),
    certifications: escapeString(
      'Licensed Mold Remediation | State CMR, IICRC Certified | 24/7 Emergency Services'
    ),
    licenseNumber: escapeString('MRSR2966'),
  }
  try {
    const companyDocRef = doc(firestore, 'companyInfo', 'Vj0FigLyhZCyprQ8iGGV')
    const companyDoc = await getDoc(companyDocRef)
    if (companyDoc.exists()) {
      const fetched = companyDoc.data()
      companyLogoFirestoreUrl = fetched?.logo || ''
      companyDetails = {
        companyName: escapeString(
          fetched?.companyName || companyDetails.companyName
        ),
        email: escapeString(fetched?.email || companyDetails.email),
        phoneNumbers: escapeString(
          fetched?.phoneNumbers || companyDetails.phoneNumbers
        ),
        certifications: escapeString(
          fetched?.certifications || companyDetails.certifications
        ),
        licenseNumber: escapeString(
          fetched?.licenseNumber || companyDetails.licenseNumber
        ),
      }
    } else {
      console.warn(
        '[generatePdf_Simplified] Company info document not found, using defaults.'
      )
    }
  } catch (e) {
    console.error('[generatePdf_Simplified] Error fetching company info:', e)
  }

  let logoDataUri = ''
  try {
    if (!coastalLogo) throw new Error('Local logo import is invalid.')
    const asset = Asset.fromModule(coastalLogo)
    await asset.downloadAsync()
    if (!asset.localUri) throw new Error('Asset local URI is null.')
    const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
      encoding: FileSystem.EncodingType.Base64,
    })
    if (!base64) throw new Error('Base64 conversion of logo failed.')
    let mime = asset.type ? `image/${asset.type.toLowerCase()}` : 'image/jpeg'
    if (asset.name) {
      const nameLower = asset.name.toLowerCase()
      if (nameLower.endsWith('.png')) mime = 'image/png'
      else if (nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg'))
        mime = 'image/jpeg'
    }
    logoDataUri = `data:${mime};base64,${base64}`
  } catch (e) {
    console.error(
      '[generatePdf_Simplified] Error loading local logo:',
      e.message
    )
    logoDataUri = companyLogoFirestoreUrl || ''
    console.log(
      logoDataUri
        ? '[generatePdf_Simplified] Using Firestore logo as fallback.'
        : '[generatePdf_Simplified] No logo available.'
    )
  }

  const createdAtDateObj = createdAt?.seconds
    ? new Date(createdAt.seconds * 1000 + (createdAt.nanoseconds || 0) / 1e6)
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
  const streetPhotoURLForHTML = streetPhoto?.downloadURL || ''

  const dataForRooms = remediationData || inspectionData
  let roomsHTML = ''
  if (
    dataForRooms &&
    Array.isArray(dataForRooms.rooms) &&
    dataForRooms.rooms.length > 0
  ) {
    console.log(
      `[generatePdf_Simplified] Processing ${dataForRooms.rooms.length} rooms.`
    )
    roomsHTML = dataForRooms.rooms
      .map((room, index) => {
        const roomTitle = escapeString(room?.roomTitle || `Area ${index + 1}`)
        const findingsOrNotes = escapeString(
          room?.notes ||
            room?.inspectionFindings ||
            'No specific details provided.'
        )
        const photos = room?.photos || []

        const photosHTML =
          Array.isArray(photos) && photos.length > 0
            ? photos
                .map(p => {
                  const imageUrl = p?.downloadURL
                  const commentText = escapeString(p?.comment || p?.label || '')
                  if (
                    imageUrl &&
                    typeof imageUrl === 'string' &&
                    (imageUrl.startsWith('http') || imageUrl.startsWith('file'))
                  ) {
                    return `<div class="photo-item">
                        <img src="${imageUrl}" alt="${roomTitle} photo" onerror="this.style.display='none'; this.parentElement.innerHTML += '<p class=\\'no-photos\\'>Photo load error</p>';"/>
                        ${
                          commentText
                            ? `<p class="photo-comment">${commentText}</p>`
                            : '<p class="photo-comment"> </p>'
                        } 
                      </div>`
                  }
                  return ''
                })
                .join('')
            : '<p class="no-photos">No photos for this area.</p>'

        let measurementsHTML = ''
        if (
          remediationData &&
          Array.isArray(room.measurements) &&
          room.measurements.length > 0
        ) {
          measurementsHTML = '<h4>Line Items:</h4><ul>'
          measurementsHTML += room.measurements
            .map(
              m =>
                `<li>${escapeString(m.name || 'Item')}: Qty ${escapeString(
                  m.quantity?.toString() || 'N/A'
                )}` +
                (m.description ? ` (${escapeString(m.description)})` : '') +
                `</li>`
            )
            .join('')
          measurementsHTML += '</ul>'
        }

        return `
        <div class="room-card">
          <h3>${roomTitle}</h3>
          <p><strong>${
            remediationData ? 'Notes/Actions' : 'Findings'
          }:</strong> ${findingsOrNotes}</p>
          ${measurementsHTML}
          ${
            remediationData && room.numberOfFans
              ? `<p><strong>Air Movers:</strong> ${escapeString(
                  room.numberOfFans.toString()
                )}</p>`
              : ''
          }
          <div class="photo-gallery">${photosHTML}</div>
        </div>`
      })
      .join('')
  } else {
    roomsHTML = '<p class="no-data">No specific area data available.</p>'
  }

  const reportTypeForTitle = remediationData
    ? 'Remediation Report'
    : 'Inspection Report'
  const coverPageHTML = `
    <div class="cover-page">
      <div class="cover-header">
        ${
          logoDataUri
            ? `<img src="${logoDataUri}" alt="Logo" class="company-logo" onerror="this.style.display='none';"/>`
            : '<div class="logo-placeholder">Logo</div>'
        }
        <div class="company-contact-info"><p>${companyDetails.email}</p><p>${
    companyDetails.certifications
  }</p></div>
      </div>
      <div class="cover-photo-container">
        ${
          streetPhotoURLForHTML
            ? `<img src="${streetPhotoURLForHTML}" alt="Property" class="cover-image" onerror="this.style.display='none';"/>`
            : '<div class="cover-placeholder">Property View Not Available</div>'
        }
      </div>
      <div class="company-main-title">${companyDetails.companyName}</div>
      <div class="company-main-title">${escapeString(
        ticket.reportTitle || reportTypeForTitle
      )}</div>
      <div class="property-details">
        <p><strong>${street}${
    apt ? `, ${apt}` : ''
  }, ${city}, ${state} ${zip}</strong> </p>
        <p><strong>Date:</strong> ${createdAtStr}</p>
        <p><strong>License:</strong> ${companyDetails.licenseNumber}</p>
      </div>
      <div class="cover-footer"><p>© ${new Date().getFullYear()} ${
    companyDetails.companyName
  }</p></div>
    </div>`

  const integratedModernCSS = `
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
    @page { size: A4; margin: 20mm; } 
    @page:first { margin: 0; } 
    * { box-sizing: border-box; }
    body { font-family: 'Roboto', sans-serif; margin: 0; padding: 0; background: #fff; color: #333; line-height: 1.5; font-size: 10pt; }
    
    .cover-page { width: 210mm; height: 297mm; padding: 15mm; display: flex; flex-direction: column; align-items: center; text-align: center; background: #f4f8fb; page-break-after: always; justify-content: space-between; }
    curiosité. Les bordures sont définies pour améliorer la clarté visuelle sans surcharger le design. Les couleurs sont choisies pour refléter une esthétique professionnelle et moderne, tout en restant lisibles et adaptées à l'impression.

    .cover-header { width: 100%; } .company-logo { max-width: 140mm; max-height: 45mm; object-fit: contain; margin-bottom: 5mm; }
    .company-contact-info { font-size: 9pt; color: #444; margin-top: 3mm; } .company-contact-info p { margin: 1.5px 0; }
    .cover-photo-container { width: 100%; max-width: 175mm; height: 95mm; margin: 5mm auto; overflow: hidden; display: flex; justify-content: center; align-items: center; background-color: #ddd; border: 1px solid #ccc; }
    .cover-image { width: 100%; height: 100%; object-fit: contain; }
    .company-main-title { color: #002d56; font-size: 22pt; font-weight: 700; margin-bottom: 4mm; }
    .property-details { margin-bottom: 4mm; font-size: 10pt; } .property-details p { margin: 3px 0; }
    .inspector-details-cover { font-size: 20pt; color: #333; }
    .cover-footer { font-size: 8pt; color: #555; margin-top: auto; padding-top: 5mm; border-top: 0.5px solid #ccc; width:100%;}
    
    .container { padding: 0 5mm; } 
    .report-header-main h1 { font-size: 18pt; color: #002d56; text-align:center; margin-bottom:6mm; border-bottom:1.5px solid #002d56; padding-bottom:3mm;}
    .report-section h2 { font-size: 14pt; color: #002d56; margin-bottom: 4mm; border-bottom: 0.5px solid #aaa; padding-bottom: 2mm; }
    .room-card { padding: 12px; border: 0.5px solid #ddd; border-radius: 6px; margin-bottom: 12px; background-color: #fdfdfd; page-break-inside: avoid; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
    .room-card h3 { font-size: 12pt; color: #111; margin: 0 0 8px; padding-bottom: 5px; border-bottom: 0.5px solid #eee; }
    .room-card p { margin-bottom: 7px; font-size: 9.5pt; }
    .room-card ul { padding-left: 18px; margin-top: 5px; margin-bottom: 7px; } .room-card li { font-size: 9.5pt; margin-bottom: 3px; }
    
    .photo-gallery {
        display: flex;
        flex-wrap: wrap;
        gap: 8px; 
        margin-top: 10px;
    }
    .photo-item {
        width: 50mm; 
        height: 50mm; 
        display: flex;
        flex-direction: column;
        background-color: #ffffff;
        border-radius: 4px;
        overflow: hidden;
        border: 1px solid #dee2e6;
        page-break-inside: avoid;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .photo-item img {
        width: 100%;
        flex-grow: 1;
        object-fit: contain;  
        background-color: #eff2f5; 
        display: block; 
        overflow: hidden;
    }
    .photo-comment {
        font-size: 8pt;
        color: #2c3e50;
        padding: 4px 5px;
        background-color: #f8f9fa;
        width: 100%;
        text-align: center; 
        flex-shrink: 0; 
        height: 32px;
        overflow-y: hidden;
        line-height: 1.3; 
        border-top: 1px solid #e9edf0;
        word-wrap: break-word;
        overflow-wrap: break-word;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .no-data, .no-photos { font-style: italic; color: #555; text-align: center; margin: 12px 0; font-size: 9.5pt; padding: 8px; background-color: #f9fafb; border-radius: 4px; }
    .footer { text-align: center; padding-top: 8mm; font-size: 8.5pt; color: #555; border-top: 0.5px solid #ddd; margin-top: 8mm; }
  `

  const mainReportTitle = escapeString(
    ticket.reportTitle ||
      (remediationData
        ? 'Remediation Report Details'
        : 'Inspection Report Details')
  )
  const overviewSectionTitle = escapeString(
    remediationData
      ? 'Property & Work Overview'
      : 'Property & Inspection Overview'
  )
  const roomsSectionTitle = escapeString(
    remediationData ? 'Area Details & Actions' : 'Room Details & Findings'
  )

  const htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${mainReportTitle} - ${ticketNumber}</title><style>${integratedModernCSS}</style></head><body>${coverPageHTML}<div class="container"><div class="report-header-main"><h1>${mainReportTitle}</h1></div><div class="report-section"><h2>${overviewSectionTitle}</h2><div class="room-card"><p><strong>Ticket:</strong> ${ticketNumber}</p><p><strong>Address:</strong> ${street}${
    apt ? `, ${apt}` : ''
  }, ${city}, ${state} ${zip}</p><p><strong>Date:</strong> ${createdAtStr}</p>${
    inspectorName !== 'Unknown'
      ? `<p><strong>By:</strong> ${inspectorName}</p>`
      : ''
  }${
    reason !== 'Not specified' && reason !== reportTypeForTitle
      ? `<p><strong>Scope:</strong> ${reason}</p>`
      : ''
  }</div></div><div class="report-section"><h2>${roomsSectionTitle}</h2>${roomsHTML}</div><div class="footer"><p>${
    companyDetails.companyName
  } | License: ${
    companyDetails.licenseNumber
  }</p><p>Report Generated: ${escapeString(
    new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  )}</p></div></div></body></html>`

  let firebaseStorageDownloadUrl = null
  try {
    console.log(`[generatePdf_Simplified] Generating PDF for: ${ticketNumber}`)
    const { uri: temporaryPdfUri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
      width: 595,
      height: 842,
    })
    console.log(`[generatePdf_Simplified] Temp PDF URI: ${temporaryPdfUri}`)

    const rawTicketNumber = ticket.ticketNumber || 'UnknownTicket'
    const reportType = remediationData
      ? 'Remediation_Report'
      : 'Inspection_Report'

    let cleanStreet = (ticket.street || 'UnknownAddress').replace(
      /[\/\?\%\*\:\<\>\&\"\']/g,
      ''
    )
    cleanStreet = cleanStreet.replace(/\s+/g, '_')

    let streetNumberPart = ''
    let streetNamePart = cleanStreet
    const streetMatch = cleanStreet.match(/^([0-9]+(?:[A-Za-z])?)(.*)/)
    if (streetMatch && streetMatch[1]) {
      streetNumberPart = streetMatch[1]
      streetNamePart = (streetMatch[2] || '')
        .replace(/^_|^_*(.+?)_*$/, '$1')
        .trim()
    }
    if (!streetNamePart && streetNumberPart) streetNamePart = 'Street'
    else if (!streetNamePart && !streetNumberPart)
      streetNamePart = 'UnknownAddress'

    let baseFilename = streetNumberPart
      ? `${streetNumberPart}_${streetNamePart}_${reportType}`
      : `${streetNamePart}_${reportType}`

    baseFilename = baseFilename
      .replace(/_{2,}/g, '_')
      .replace(/_$/, '')
      .replace(/^_/, '')

    const filenameInStorage = `${baseFilename}.pdf`
    const storagePath = `${filenameInStorage}`
    console.log(
      `[generatePdf_Simplified] Firebase Storage Path: ${storagePath}`
    )

    const response = await fetch(temporaryPdfUri)
    if (!response.ok)
      throw new Error(`Failed to fetch temp PDF: ${response.status}`)
    const blob = await response.blob()
    console.log(`[generatePdf_Simplified] PDF blob fetched. Size: ${blob.size}`)

    const storage = getStorage(app)
    const storageFileRef = ref(storage, storagePath)
    console.log(`[generatePdf_Simplified] Uploading to: ${storagePath}`)
    const uploadTaskSnapshot = await uploadBytesResumable(
      storageFileRef,
      blob,
      { contentType: 'application/pdf' }
    )
    console.log(
      '[generatePdf_Simplified] Upload successful:',
      uploadTaskSnapshot.state
    )

    firebaseStorageDownloadUrl = await getDownloadURL(uploadTaskSnapshot.ref)
    console.log(
      `[generatePdf_Simplified] Download URL: ${firebaseStorageDownloadUrl}`
    )

    const reportTimestamp = new Date()
    try {
      const mainTicketDocRef = doc(
        firestore,
        'tickets',
        String(rawTicketNumber)
      )
      const pdfUrlField = remediationData
        ? 'remediationPdfUrl'
        : 'inspectionPdfUrl'
      const reportGeneratedAtField = remediationData
        ? 'remediationReportGeneratedAt'
        : 'inspectionReportGeneratedAt'

      await setDoc(
        mainTicketDocRef,
        {
          [pdfUrlField]: firebaseStorageDownloadUrl,
          [reportGeneratedAtField]: reportTimestamp,
        },
        { merge: true }
      )
      console.log(
        `[generatePdf_Simplified] Main ticket ${rawTicketNumber} updated.`
      )
    } catch (e) {
      console.error(
        '[generatePdf_Simplified] Error saving Firestore metadata:',
        e
      )
    }

    try {
      await FileSystem.deleteAsync(temporaryPdfUri, { idempotent: true })
      console.log(
        `[generatePdf_Simplified] Temp PDF deleted: ${temporaryPdfUri}`
      )
    } catch (e) {
      console.warn('[generatePdf_Simplified] Could not delete temp PDF:', e)
    }

    return firebaseStorageDownloadUrl
  } catch (error) {
    console.error(
      '[generatePdf_Simplified] Critical PDF process error:',
      error.message,
      error.stack?.substring(0, 300)
    )
    throw new Error(`PDF Generation/Upload Failed: ${error.message}`)
  }
}
