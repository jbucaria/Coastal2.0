import { formatAddress, formatDateWithOrdinal } from './helpers'

// Closing note appended to all templates
const CLOSING_NOTE = `
Please retain this letter for your records. If you have any questions or require further assistance, please contact our office at 813-918-4210.
`

/**
 * Array of dry letter templates. Each template has an id, a display name,
 * and a generate function that returns the letter text populated with ticket data.
 */
export const dryLetterTemplates = [
  {
    id: 'standard',
    name: 'Standard Letter',
    generate: ({ ticket, callDate, completionDate }) => {
      const today = formatDateWithOrdinal(new Date())
      const call = formatDateWithOrdinal(callDate)
      const complete = formatDateWithOrdinal(completionDate)
      const address = formatAddress(ticket)
      const inspector = ticket.inspectorName || 'Technician'
      const phone = ticket.customerNumber || ''
      return `
1904 CHESAPEAKE DR
ODESSA FL 33556
${ticket.customerNumber || ''}
${today}
To whom it may concern,

On ${call}, Coastal Restoration Services was called out by ${ticket.customerName || 'the client'} to perform an inspection for a property located at ${address}.
Coastal Restoration Services sent out an IICRC certified water damage and state licensed mold remediation technician (${inspector}) to assess the damage. Upon arrival they took moisture readings on all affected materials. They determined a proper water damage mitigation was needed and removed affected baseboards, tackstrips, drywall and any damaged cabinetry. The technician then treated all affected areas by bio-wiping with an EPA registered chemical for microbial contamination. Air movers and a dehumidifier were placed to pull any excess moisture from the remaining materials. The equipment was set to run until ${complete}.
On ${complete}, Coastal Restoration Services reassessed the moisture levels on all affected materials. All materials were found dry and within normal threshold for moisture content. The work performed here was to ensure against any future mold problems. The mitigation was performed by an IICRC certified technician. As of ${complete}, by the standards of the IICRC, the affected areas of the residence located at ${address} are completely dry.

If there are any questions, please call the office @ ${phone}

Sincerely,
Bobby Blasewitz
Coastal Restoration Services
${CLOSING_NOTE}
      `.trimStart()
    },
  },
  {
    id: 'concise',
    name: 'Concise Letter',
    generate: ({ ticket, callDate, completionDate }) => {
      const today = formatDateWithOrdinal(new Date())
      const call = formatDateWithOrdinal(callDate)
      const complete = formatDateWithOrdinal(completionDate)
      const address = formatAddress(ticket)
      const inspector = ticket.inspectorName || 'Technician'
      return `
${today}
Inspection Date: ${call}
Location: ${address}

Our IICRC certified technician (${inspector}) performed water damage mitigation on ${address} starting ${call}. Affected materials were removed and treated; equipment ran until ${complete}. On ${complete}, all materials tested dry and within acceptable limits.

Questions? Contact us.

Regards,
Bobby Blasewitz
Coastal Restoration Services
${CLOSING_NOTE}
      `.trimStart()
    },
  },
  {
    id: 'technical',
    name: 'Technical Summary',
    generate: ({ ticket, callDate, completionDate }) => {
      const today = formatDateWithOrdinal(new Date())
      const call = formatDateWithOrdinal(callDate)
      const complete = formatDateWithOrdinal(completionDate)
      const address = formatAddress(ticket)
      const inspector = ticket.inspectorName || 'Technician'
      return `
${today}
Re: Water Damage Mitigation - ${address}

Summary:
• Initial assessment on ${call} by IICRC certified technician (${inspector}); moisture readings confirmed elevated levels.
• Mitigation steps: removal of contaminated baseboards, tackstrip, drywall, cabinetry; application of EPA registered biocide; deployment of air movers and dehumidifier.
• Equipment operation period: ${call} to ${complete}.
• Final assessment on ${complete}: moisture content within normal thresholds; area certified dry per IICRC standards.

For detailed report, contact our office.

Sincerely,
Bobby Blasewitz
Coastal Restoration Services
${CLOSING_NOTE}
      `.trimStart()
    },
  },
  {
    id: 'friendly',
    name: 'Friendly Notice',
    generate: ({ ticket, callDate, completionDate }) => {
      const today = formatDateWithOrdinal(new Date())
      const call = formatDateWithOrdinal(callDate)
      const complete = formatDateWithOrdinal(completionDate)
      const address = formatAddress(ticket)
      const inspector = ticket.inspectorName || 'Your Technician'
      return `
${today}
Hello,

We wanted to let you know that on ${call}, our team visited ${address} to address water damage concerns. Our IICRC certified specialist (${inspector}) removed and treated affected materials and set up drying equipment through ${complete}. On ${complete}, we confirmed the area is fully dry and safe.

Thank you for trusting Coastal Restoration Services. If you have any questions, feel free to reach out.

Best regards,
Bobby Blasewitz
Coastal Restoration Services
${CLOSING_NOTE}
      `.trimStart()
    },
  },
  {
    id: 'formal',
    name: 'Formal Letter',
    generate: ({ ticket, callDate, completionDate }) => {
      const today = formatDateWithOrdinal(new Date())
      const call = formatDateWithOrdinal(callDate)
      const complete = formatDateWithOrdinal(completionDate)
      const address = formatAddress(ticket)
      const inspector = ticket.inspectorName || 'Technician'
      return `
${today}
Subject: Water Damage Mitigation Completion - ${address}

  ...

To Whom It May Concern:

This letter serves to document that Coastal Restoration Services was engaged on ${call} to perform water damage mitigation at the above-referenced property. An IICRC certified water damage and state licensed mold remediation technician (${inspector}) was dispatched to conduct initial assessment, perform necessary remediation (including removal and decontamination of affected materials), and deploy drying equipment until ${complete}.

A follow-up evaluation conducted on ${complete} confirmed all moisture levels are within acceptable ranges as defined by IICRC standards. Accordingly, the property has been deemed fully remediated.

Should you require additional information, please contact our office.

Respectfully,
Bobby Blasewitz
Coastal Restoration Services
      `.trimStart()
    },
  },
]