// server/services/pdf.service.js
const PDFDocument = require('pdfkit');

/**
 * Generate Community Monthly Relief & Impact Report PDF
 */
const generateMonthlyReportPdf = (outputStream, { communityName, month, year, stats }) => {
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(outputStream);

  // Header Banner
  doc.rect(0, 0, doc.page.width, 100).fill('#2d6a4f');

  doc
    .fillColor('#ffffff')
    .fontSize(24)
    .font('Helvetica-Bold')
    .text('BiteShare Food Rescue Initiative', 50, 30);

  doc
    .fontSize(14)
    .font('Helvetica')
    .text('Monthly Community Impact & Relief Report', 50, 60);

  doc.moveDown(4);

  // Metadata
  doc
    .fillColor('#2b2b2b')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(`Community Partner: `, { continued: true })
    .font('Helvetica')
    .text(communityName);

  doc
    .font('Helvetica-Bold')
    .text(`Reporting Period: `, { continued: true })
    .font('Helvetica')
    .text(`${month} ${year}`);

  doc
    .font('Helvetica-Bold')
    .text(`Generated Date: `, { continued: true })
    .font('Helvetica')
    .text(new Date().toLocaleDateString('en-US', { dateStyle: 'long' }));

  doc.moveDown(2);
  doc.strokeColor('#e0e0e0').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(2);

  // Key Impact Metrics Grid
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#2d6a4f').text('Executive Summary & Impact Metrics');
  doc.moveDown();

  const metrics = [
    { label: 'Total Meals Rescued & Distributed', value: `${stats.mealsSaved} Meals` },
    { label: 'Food Waste Diverted From Landfill', value: `${stats.foodWastePreventedKg} kg` },
    { label: 'Net Carbon Footprint Reduced', value: `${stats.co2ReducedKg} kg CO2e` },
    { label: 'Successful Delivery Orders', value: `${stats.completedOrdersCount} Orders` }
  ];

  metrics.forEach((m) => {
    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .fillColor('#333333')
      .text(`• ${m.label}: `, { continued: true })
      .fillColor('#f25c05')
      .text(m.value);
    doc.moveDown(0.5);
  });

  doc.moveDown(2);
  doc.strokeColor('#e0e0e0').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(2);

  // Verification & Signoff
  doc
    .fontSize(10)
    .font('Helvetica-Oblique')
    .fillColor('#666666')
    .text('This report is digitally verified and certified by the BiteShare Zero-Hunger Zero-Waste Engine.', {
      align: 'center'
    });

  doc.end();
};

/**
 * Generate Donor Certificate of Honor PDF
 */
const generateDonorCertificatePdf = (outputStream, { donorName, mealCount, date, verificationId }) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  doc.pipe(outputStream);

  // Decorative Border
  doc
    .lineWidth(4)
    .strokeColor('#2d6a4f')
    .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
    .stroke();

  doc
    .lineWidth(1)
    .strokeColor('#f25c05')
    .rect(26, 26, doc.page.width - 52, doc.page.height - 52)
    .stroke();

  doc.moveDown(2);

  // Title
  doc
    .fillColor('#2d6a4f')
    .fontSize(28)
    .font('Helvetica-Bold')
    .text('CERTIFICATE OF NOURISHMENT & HONOR', { align: 'center' });

  doc.moveDown(0.5);

  doc
    .fillColor('#f25c05')
    .fontSize(14)
    .font('Helvetica-Bold')
    .text('BITESHARE COMMUNITY FOOD RESCUE INITIATIVE', { align: 'center' });

  doc.moveDown(1.5);

  doc
    .fillColor('#555555')
    .fontSize(12)
    .font('Helvetica')
    .text('This certificate is gratefully presented to:', { align: 'center' });

  doc.moveDown(1);

  // Donor Name
  doc
    .fillColor('#1b4332')
    .fontSize(26)
    .font('Helvetica-Bold')
    .text(donorName.toUpperCase(), { align: 'center' });

  doc.moveDown(1);

  doc
    .fillColor('#444444')
    .fontSize(13)
    .font('Helvetica')
    .text(
      `In deepest recognition of your compassionate contribution of ${mealCount} surplus meal(s),\npreventing food waste and bringing dignity, nourishment, and hope to needy families.`,
      { align: 'center', lineGap: 4 }
    );

  doc.moveDown(3);

  // Footer / Verification Details
  const yPos = doc.y;
  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#777777')
    .text(`Issue Date: ${date || new Date().toISOString().split('T')[0]}`, 60, yPos);

  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .fillColor('#2d6a4f')
    .text(`Verification ID: ${verificationId}`, 0, yPos, { align: 'right' });

  doc.end();
};

module.exports = {
  generateMonthlyReportPdf,
  generateDonorCertificatePdf
};
