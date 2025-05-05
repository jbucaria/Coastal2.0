// generate.js
// PDF generator for live preview. Requires pdfkit: npm install pdfkit

const PDFDocument = require('pdfkit');

/**
 * generatePdf
 * Returns a Promise resolving to a Buffer containing the PDF data.
 */
function generatePdf() {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', err => reject(err));

    // Example PDF content - customize as needed
    doc
      .fontSize(20)
      .text('Live PDF Preview', { align: 'center' })
      .moveDown()
      .fontSize(12)
      .text(`Generated at ${new Date().toISOString()}`, { align: 'right' });

    // Finalize PDF file
    doc.end();
  });
}

module.exports = { generatePdf };