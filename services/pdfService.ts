import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Booking, BookingField, HandoffInfo, DriverAttendance, AppSettings } from '../types';
import { format, parseISO, differenceInDays, eachMonthOfInterval, startOfMonth, endOfMonth, isWithinInterval, max, min, getDay, getDaysInMonth, startOfDay, endOfDay } from 'date-fns';
import { BOOKING_FIELDS } from '../constants';

const DATE_FORMAT = 'dd-MM-yyyy';
const LOGO_URL = "https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg";
const PAID_SEAL_URL = "https://i.ibb.co.com/Qv2Y07rG/IMG-0753.webp";
const UNPAID_SEAL_URL = "https://i.ibb.co.com/QjTgvXHt/IMG-0754.jpg";
const BARCODE_URL = "https://i.ibb.co.com/Y7YHJ600/65355a07-752b-43e1-92f7-461b81637923.jpg";

const formatCurrency = (amount: number): string => {
  return (amount || 0).toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

const loadCircularLogo = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 4000);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = LOGO_URL;
    
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }

        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, size, size);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        resolve(null);
      }
    };
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };
  });
};

const loadOriginalImage = (url: string): Promise<{data: string, width: number, height: number} | null> => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 4000);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    
    img.onload = () => {
      clearTimeout(timeout);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0);
      resolve({
        data: canvas.toDataURL('image/png'),
        width: img.width,
        height: img.height
      });
    };
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };
  });
};

const drawDeveloperFooter = (doc: jsPDF, startY: number, isSlip: boolean = false) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;
  
  doc.setTextColor(0, 0, 0); 
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  
  doc.text('SYSTEM GENERATED REPORT', centerX, startY, { align: 'center' });
  
  doc.setFontSize(6);
  doc.text('SOFTWARE DEVELOPED BY', centerX, startY + 4, { align: 'center' });
  doc.text('1815124 Cpl (Clk) Billal, ASC', centerX, startY + 7, { align: 'center' });
};

const filterByRange = (bookings: Booking[], start: string, end: string) => {
  if (!start || !end) return bookings.filter(b => !b.isSpecialNote);
  const s = parseISO(start);
  const e = parseISO(end);
  return bookings.filter(b => {
    if (b.isSpecialNote) return false;
    const bStart = parseISO(b.startDate);
    const bEnd = parseISO(b.endDate);
    return (bStart <= e && bEnd >= s);
  }).sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime());
};

export const generateIndividualPaymentSlip = async (booking: Booking, appSettings: AppSettings, receivedBy?: string, type: 'slip' | 'info' = 'slip', status?: string) => {
  if (booking.isSpecialNote) return;

  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    const sealUrl = (type === 'info' || booking.isExempt) ? null : (booking.fareStatus === 'Paid' ? PAID_SEAL_URL : UNPAID_SEAL_URL);

    const [logoData, sealInfo, barcodeInfo] = await Promise.all([
      loadCircularLogo(),
      sealUrl ? loadOriginalImage(sealUrl) : Promise.resolve(null),
      loadOriginalImage(BARCODE_URL)
    ]);

    // --- DRAW SHAPES ---
    // Top Header Shapes
    doc.setFillColor(229, 231, 235); // Light Ash
    doc.moveTo(0, 0);
    doc.lineTo(pageWidth * 0.8, 0);
    doc.curveTo(pageWidth * 0.65, 10, pageWidth * 0.5, 55, 0, 65);
    doc.close();
    doc.fill();

    doc.setFillColor(15, 52, 96); // Dark Blue
    doc.moveTo(0, 0);
    doc.lineTo(pageWidth * 0.7, 0);
    doc.curveTo(pageWidth * 0.55, 5, pageWidth * 0.4, 45, 0, 55);
    doc.close();
    doc.fill();

    // Top Right Accent
    doc.setFillColor(15, 52, 96);
    doc.moveTo(pageWidth, 0);
    doc.lineTo(pageWidth * 0.85, 0);
    doc.curveTo(pageWidth * 0.9, 10, pageWidth * 0.95, 15, pageWidth, 18);
    doc.close();
    doc.fill();

    // Bottom Footer Shapes
    doc.setFillColor(229, 231, 235); // Light Ash
    doc.moveTo(pageWidth, pageHeight);
    doc.lineTo(pageWidth * 0.2, pageHeight);
    doc.curveTo(pageWidth * 0.4, pageHeight - 10, pageWidth * 0.6, pageHeight - 25, pageWidth, pageHeight - 35);
    doc.close();
    doc.fill();

    doc.setFillColor(15, 52, 96); // Dark Blue
    doc.moveTo(pageWidth, pageHeight);
    doc.lineTo(pageWidth * 0.3, pageHeight);
    doc.curveTo(pageWidth * 0.5, pageHeight - 5, pageWidth * 0.7, pageHeight - 15, pageWidth, pageHeight - 25);
    doc.close();
    doc.fill();

    // --- HEADER CONTENT ---
    if (logoData) {
      doc.addImage(logoData, 'PNG', 15, 10, 25, 25);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('MICROBUS SERVICE', 45, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('AREA HQ BARISHAL', 45, 26);

    doc.setTextColor(15, 52, 96);
    doc.setFontSize(type === 'info' ? 16 : 28);
    doc.setFont('helvetica', 'bold');
    const title = type === 'info' ? 'BOOKING INFO' : 'INVOICE';
    const infoX = pageWidth - 60;
    if (type === 'info') {
      doc.text(title, infoX, 30);
    } else {
      doc.text(title, pageWidth - 15, 30, { align: 'right' });
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const invoiceNo = `INV-4856-${format(new Date(), 'ddMMyyyy')}`;
    const invoiceDate = format(new Date(), DATE_FORMAT);
    
    const infoYStart = type === 'info' ? 45 : 38;
    doc.text(type === 'info' ? 'Ref No' : 'Invoice No', infoX, infoYStart);
    doc.text(`:  ${invoiceNo}`, infoX + 22, infoYStart);
    doc.text(type === 'info' ? 'Date' : 'Invoice Date', infoX, infoYStart + 5);
    doc.text(`:  ${invoiceDate}`, infoX + 22, infoYStart + 5);

    // --- PASSENGER DETAILS ---
    doc.setTextColor(15, 52, 96);
    doc.setFontSize(type === 'info' ? 16 : 12);
    doc.setFont('helvetica', 'bold');
    const passengerTitle = 'PASSENGER DETAILS';
    if (type === 'info') {
      doc.text(passengerTitle, pageWidth / 2, 75, { align: 'center' });
      const passengerTitleWidth = doc.getTextWidth(passengerTitle);
      doc.setDrawColor(15, 52, 96);
      doc.setLineWidth(0.5);
      doc.line(pageWidth / 2 - (passengerTitleWidth / 2), 77.5, pageWidth / 2 + (passengerTitleWidth / 2), 77.5);
    } else {
      doc.text(passengerTitle, margin, 75);
      const passengerTitleWidth = doc.getTextWidth(passengerTitle);
      doc.setDrawColor(15, 52, 96);
      doc.setLineWidth(0.5);
      doc.line(margin, 77, margin + passengerTitleWidth, 77);
    }

    doc.setFontSize(type === 'info' ? 11 : 10);
    doc.setTextColor(0, 0, 0);
    
    let detailsY = type === 'info' ? 88 : 83;
    
    if (type === 'info') {
      const start = parseISO(booking.startDate);
      const end = parseISO(booking.endDate);
      const daysDiff = differenceInDays(end, start) + 1;

      const infoDetails = [
        { label: 'Rank and Name', value: (booking.rankName || 'N/A').toUpperCase() },
        { label: 'Unit', value: (booking.unit || 'N/A').toUpperCase() },
        { label: 'Destination', value: (booking.destination || 'N/A') },
        { label: 'Mobile Number', value: (booking.mobileNumber || 'N/A') },
        { label: 'From Date', value: format(start, DATE_FORMAT) },
        { label: 'To Date', value: format(end, DATE_FORMAT) },
        { label: 'Total Days', value: `${daysDiff} ${daysDiff === 1 ? 'Day' : 'Days'}` },
        { label: 'Duration', value: (booking.duration || 'N/A') },
        { label: 'Garrison Status', value: (booking.garrisonStatus || 'N/A') },
        { label: 'BOOKING STATUS', value: (status || 'N/A').toUpperCase() },
      ];

      infoDetails.forEach((item, i) => {
        doc.setFont('helvetica', 'bold');
        doc.text(item.label, margin, detailsY + (i * 7));
        doc.setFont('helvetica', 'normal');
        if (item.label === 'BOOKING STATUS') {
          let statusColor: [number, number, number] = [0, 0, 0];
          if (item.value === 'CONFIRM') statusColor = [16, 185, 129];
          if (item.value === 'PENDING') statusColor = [245, 158, 11];
          if (item.value === 'REJECT' || item.value === 'CANCEL') statusColor = [239, 68, 68];
          doc.setTextColor(...statusColor);
          doc.setFont('helvetica', 'bold');
        }
        doc.text(`: ${item.value}`, margin + 50, detailsY + (i * 7));
        doc.setTextColor(0, 0, 0);
      });
      
      // Add Note Box below Booking Status
      const noteY = detailsY + (infoDetails.length * 7) + 10;
      const noteText = 'NOTE: AREA HQ BARISHAL RESERVES THE RIGHT TO CANCEL THE BOOKING AT ANY TIME';
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 0, 0); // Red
      
      const textWidth = doc.getTextWidth(noteText);
      const boxWidth = textWidth + 10;
      const boxHeight = 10;
      const boxX = (pageWidth - boxWidth) / 2;
      
      doc.setDrawColor(255, 0, 0);
      doc.setLineWidth(0.5);
      doc.roundedRect(boxX, noteY - 7, boxWidth, boxHeight, 1.5, 1.5);
      doc.text(noteText, pageWidth / 2, noteY, { align: 'center' });
      
      doc.setTextColor(0, 0, 0);
      detailsY = noteY + 10;
    } else {
      const detailsLeft = [
        { label: 'Rank and Name', value: (booking.rankName || 'N/A').toUpperCase() },
        { label: 'Unit', value: (booking.unit || 'N/A').toUpperCase() },
        { label: 'From Date', value: format(parseISO(booking.startDate), DATE_FORMAT) },
        { label: 'Garrison Status', value: (booking.garrisonStatus || 'N/A') },
        { label: 'Out Time', value: booking.outTime ? `${booking.outTime} hrs` : 'N/A' },
      ];

      const detailsRight = [
        { label: 'Destination', value: (booking.destination || 'N/A') },
        { label: 'Mobile Number', value: (booking.mobileNumber || 'N/A') },
        { label: 'To Date', value: format(parseISO(booking.endDate), DATE_FORMAT) },
        { label: 'Duration', value: (booking.duration || 'N/A') },
        { label: 'In Time', value: booking.inTime ? `${booking.inTime} hrs` : 'N/A' },
      ];

      detailsLeft.forEach((item, i) => {
        doc.setFont('helvetica', 'bold');
        doc.text(item.label, margin, detailsY + (i * 6));
        doc.setFont('helvetica', 'normal');
        doc.text(`: ${item.value}`, margin + 35, detailsY + (i * 6));
      });

      detailsRight.forEach((item, i) => {
        doc.setFont('helvetica', 'bold');
        doc.text(item.label, pageWidth / 2 + 10, detailsY + (i * 6));
        doc.setFont('helvetica', 'normal');
        doc.text(`: ${item.value}`, pageWidth / 2 + 45, detailsY + (i * 6));
      });
    }

    let finalY = type === 'info' ? detailsY + 5 : detailsY + 30;

    if (type !== 'info') {
      // --- KILOMETRES & FUEL PURCHASE DETAILS ---
      doc.setTextColor(15, 52, 96);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      const fuelTitle = 'KILOMETRES & FUEL PURCHASE DETAILS';
      doc.text(fuelTitle, margin, 115);
      const fuelTitleWidth = doc.getTextWidth(fuelTitle);
      doc.setDrawColor(15, 52, 96);
      doc.setLineWidth(0.5);
      doc.line(margin, 117, margin + fuelTitleWidth, 117);

      const fuelBody: any[] = [];
      const fuelPurchases = booking.fuelPurchases || [];
      
      if (fuelPurchases.length > 0) {
        fuelPurchases.forEach((p, i) => {
          const row: any[] = [];
          if (i === 0) {
            row.push({
              content: booking.totalKm !== undefined ? `${booking.totalKm} KM` : 'N/A',
              rowSpan: fuelPurchases.length,
              styles: { valign: 'middle', halign: 'center' }
            });
          }
          row.push(p.purchasedFuel !== undefined ? `${p.purchasedFuel} L` : '-');
          row.push(p.fuelRate !== undefined ? formatCurrency(p.fuelRate) : '-');
          row.push(p.totalFuelPrice !== undefined ? `BDT ${formatCurrency(p.totalFuelPrice)}` : '-');
          fuelBody.push(row);
        });
      } else {
        fuelBody.push([
          booking.totalKm !== undefined ? `${booking.totalKm} KM` : 'N/A',
          '-',
          '-',
          '-'
        ]);
      }

      autoTable(doc, {
        startY: 120,
        margin: { left: margin, right: margin },
        head: [
          [
            { content: 'TOTAL KILOMETRES', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
            { content: 'FUEL PURCHASE DETAILS', colSpan: 3, styles: { halign: 'center' } }
          ],
          ['PURCHASED FUEL', 'RATE', 'TOTAL TAKA']
        ],
        body: fuelBody,
        theme: 'grid',
        headStyles: {
          fillColor: [15, 52, 96],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center',
          lineWidth: 0.1,
          lineColor: [255, 255, 255]
        },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          valign: 'middle',
          halign: 'center',
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 40 },
          2: { cellWidth: 40 },
          3: { cellWidth: 'auto' }
        }
      });

      const fuelTableY = (doc as any).lastAutoTable?.finalY || 145;

      // --- FARE DETAILS ---
      doc.setTextColor(15, 52, 96);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      const fareTitle = 'FARE DETAILS';
      doc.text(fareTitle, margin, fuelTableY + 6);
      const fareTitleWidth = doc.getTextWidth(fareTitle);
      doc.setDrawColor(15, 52, 96);
      doc.setLineWidth(0.5);
      doc.line(margin, fuelTableY + 8, margin + fareTitleWidth, fuelTableY + 8);

      // --- MAIN TABLE ---
      const start = parseISO(booking.startDate);
      const end = parseISO(booking.endDate);
      const daysDiff = differenceInDays(end, start) + 1;
      const dailyRate = booking.fare / daysDiff;

      autoTable(doc, {
        startY: fuelTableY + 10,
        margin: { left: margin, right: margin },
        head: [['SL', 'DESCRIPTION', 'TOTAL DAYS', 'DURATION', 'RATE/FARE', 'TOTAL']],
        body: [
          [
            '1',
            `${format(start, DATE_FORMAT)} to ${format(end, DATE_FORMAT)}`,
            `${daysDiff} ${daysDiff === 1 ? 'Day' : 'Days'}`,
            booking.duration || 'N/A',
            `BDT ${formatCurrency(dailyRate)}`,
            `BDT ${formatCurrency(booking.fare)}`
          ]
        ],
        theme: 'grid',
        headStyles: {
          fillColor: [15, 52, 96],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
          lineWidth: 0.1,
          lineColor: [255, 255, 255]
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          valign: 'middle',
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { halign: 'left' },
          2: { halign: 'center', cellWidth: 28 },
          3: { halign: 'center', cellWidth: 28 },
          4: { halign: 'right', cellWidth: 32 },
          5: { halign: 'right', cellWidth: 32 }
        }
      });

      finalY = (doc as any).lastAutoTable?.finalY || 150;
    }

    // --- TOTALS SECTION ---
    // Left side: Payment Info
    doc.setFillColor(15, 52, 96);
    doc.rect(margin, finalY + 4.5, 60, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(type === 'info' ? 'BOOKED BY' : 'Payment Receiver Info:', margin + 3, finalY + 10);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(type === 'info' ? 'Rank and Name' : 'Received By', margin, finalY + 22.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${receivedBy || 'N/A'}`, margin + 25, finalY + 22.5);

    doc.setFont('helvetica', 'bold');
    doc.text('Remarks', margin, finalY + 27.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${booking.remarks || 'None'}`, margin + 25, finalY + 27.5);

    // Right side: Totals
    if (type !== 'info') {
      const totalsX = pageWidth - margin;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Subtotal', totalsX - 55, finalY + 10);
      doc.text(`BDT ${formatCurrency(booking.fare)}`, totalsX, finalY + 10, { align: 'right' });

      const taxRate = appSettings.fares.taxRate || 0;
      const taxAmount = (booking.fare * taxRate) / 100;
      const totalWithTax = booking.fare + taxAmount;

      doc.text('Other', totalsX - 55, finalY + 17);
      doc.text(`BDT ${formatCurrency(taxAmount)}`, totalsX, finalY + 17, { align: 'right' });

      doc.setDrawColor(200, 200, 200);
      doc.line(totalsX - 55, finalY + 20, totalsX, finalY + 20);

      doc.setFontSize(14);
      doc.setTextColor(15, 52, 96);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL', totalsX - 55, finalY + 28);
      const fareDisplayText = booking.isExempt ? 'EXEMPTED' : `BDT ${formatCurrency(totalWithTax)}`;
      doc.text(fareDisplayText, totalsX, finalY + 28, { align: 'right' });
    }

    // --- SEAL ---
    if (sealInfo) {
      const maxWidth = 40;
      const maxHeight = 40;
      const ratio = sealInfo.width / sealInfo.height;
      let drawWidth = maxWidth;
      let drawHeight = maxWidth / ratio;
      if (drawHeight > maxHeight) {
        drawHeight = maxHeight;
        drawWidth = maxHeight * ratio;
      }
      doc.addImage(sealInfo.data, 'PNG', pageWidth - margin - drawWidth, finalY + 32, drawWidth, drawHeight);
    }

    // --- SOFTWARE GENERATED SLIP SECTION ---
    const slipTextY = pageHeight - 45;
    const boxWidth = 65; 
    const boxHeight = 11;
    const boxX = (pageWidth - boxWidth) / 2;
    
    doc.setDrawColor(255, 0, 0); // Red
    doc.setLineWidth(0.4);
    doc.roundedRect(boxX, slipTextY - 5.5, boxWidth, boxHeight, 1.5, 1.5);
    
    doc.setTextColor(255, 0, 0); // Red
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const slipTitle = 'SOFTWARE GENERATED SLIP';
    doc.text(slipTitle, pageWidth / 2, slipTextY - 1.5, { align: 'center' });
    doc.text('NO SIGNATURE IS REQUIRED', pageWidth / 2, slipTextY + 2.5, { align: 'center' });

    // --- FOOTER ---
    const footerY = pageHeight - 25;
    
    if (barcodeInfo) {
      const barcodeWidth = 20;
      const barcodeHeight = 20;
      doc.addImage(barcodeInfo.data, 'PNG', margin, footerY - 5, barcodeWidth, barcodeHeight);
      
      // Vertical line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(1.2);
      doc.line(margin + barcodeWidth + 5, footerY - 5, margin + barcodeWidth + 5, footerY + 15);
      
      // Contact Info
      const contactX = margin + barcodeWidth + 10;
      doc.setTextColor(15, 52, 96); // Dark Blue
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('SOFTWARE DEVELOPED BY', contactX, footerY - 2);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('CPL (Clk) Billal Hossain, ASC', contactX, footerY + 3);
      doc.text('Mobile: +8801783413333', contactX, footerY + 7);
      doc.text('Email: nayon@asia.com', contactX, footerY + 11);
    } else {
      doc.setTextColor(15, 52, 96); // Dark Blue
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('SOFTWARE DEVELOPED BY', margin, footerY - 2);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('CPL (Clk) Billal Hossain, ASC', margin, footerY + 3);
      doc.text('Mobile: +8801783413333', margin, footerY + 7);
      doc.text('Email: nayon@asia.com', margin, footerY + 11);
    }

    // Signature section removed as requested
    
    const fileName = type === 'info' ? `Booking_Info_${(booking.rankName || 'User').replace(/\s+/g, '_')}_${invoiceNo}.pdf` : `Invoice_${(booking.rankName || 'User').replace(/\s+/g, '_')}_${invoiceNo}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error("PDF generation failed:", error);
    alert("Error generating PDF.");
  }
};

export const generatePaymentSlip = async (bookings: Booking[], startDate: string, endDate: string, appSettings: AppSettings, handoff?: HandoffInfo, customHeader?: string) => {
  try {
    const doc = new jsPDF();
    doc.setFont('helvetica');
    const filtered = filterByRange(bookings, startDate, endDate);
    const mainHeading = (customHeader && customHeader.trim() !== '') ? customHeader.toUpperCase() : "MONTHLY PAYMENT SLIP - CIVIL MICROBUS";
    let monthYearText = "";
    if (startDate) monthYearText = format(parseISO(startDate), 'MMMM yyyy').toUpperCase();

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(mainHeading, 110, 15, { align: 'center' });
    const headingWidth = doc.getTextWidth(mainHeading);
    doc.setLineWidth(0.5);
    doc.line(110 - (headingWidth / 2), 17, 110 + (headingWidth / 2), 17);
    
    if (monthYearText) {
      doc.text(monthYearText, 110, 24, { align: 'center' });
      const subHeadingWidth = doc.getTextWidth(monthYearText);
      doc.line(110 - (subHeadingWidth / 2), 26, 110 + (subHeadingWidth / 2), 26);
    }
    
    const subtotal = filtered.reduce((sum, b) => b.fareStatus === 'Paid' ? sum + (b.fare || 0) : sum, 0);
    const taxRate = appSettings.fares.taxRate || 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const totalFare = subtotal + taxAmount;

    autoTable(doc, {
      startY: monthYearText ? 32 : 25,
      head: [
        [
          { content: 'SER', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'RANK AND NAME', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'UNIT', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'BOOKING DATE', colSpan: 2, styles: { halign: 'center' } },
          { content: 'DAYS', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'DURATION', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'FARE', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'REMARKS', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } }
        ],
        [
          { content: 'FROM', styles: { halign: 'center' } },
          { content: 'TO', styles: { halign: 'center' } }
        ]
      ],
      body: filtered.map((b, i) => {
        const totalDays = differenceInDays(parseISO(b.endDate), parseISO(b.startDate)) + 1;
        const fareVal = b.isExempt ? 'EXEMPTED' : formatCurrency(b.fare);
        return [
          i + 1, (b.rankName || '').toUpperCase(), (b.unit || '').toUpperCase(),
          format(parseISO(b.startDate), DATE_FORMAT), format(parseISO(b.endDate), DATE_FORMAT), 
          totalDays, b.duration, fareVal, (b.remarks || '-')
        ];
      }),
      foot: [
        [
          { content: 'SUBTOTAL', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', fillColor: [220, 220, 220], textColor: [0, 0, 0], lineWidth: 0.1, fontSize: 10 } },
          { content: formatCurrency(totalFare), styles: { halign: 'center', fontStyle: 'bold', fillColor: [220, 220, 220], textColor: [0, 0, 0], lineWidth: 0.1, fontSize: 10 } },
          { content: '', styles: { fillColor: [220, 220, 220], lineWidth: 0.1 } }
        ]
      ],
      theme: 'grid',
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontSize: 9, halign: 'center', fontStyle: 'bold', font: 'helvetica' },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, halign: 'center', textColor: [0, 0, 0], overflow: 'visible' },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 45, halign: 'left' }, 2: { cellWidth: 32, halign: 'left' }, 3: { cellWidth: 20 }, 4: { cellWidth: 20 }, 5: { cellWidth: 12 }, 6: { cellWidth: 18 }, 7: { cellWidth: 20 }, 8: { cellWidth: 'auto' } },
      margin: { left: 8, right: 8 }
    });

    const finalTableY = (doc as any).lastAutoTable?.finalY || 150;
    const handoffY = finalTableY + 15;
    const currentDateStr = format(new Date(), DATE_FORMAT);

    if (handoff) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setLineWidth(0.3);
      const pTitle = 'PROVIDER INFORMATION';
      doc.text(pTitle, 10, handoffY);
      doc.line(10, handoffY + 1, 10 + doc.getTextWidth(pTitle), handoffY + 1);
      const pBaseY = handoffY + 25; 
      doc.line(10, pBaseY - 1, 60, pBaseY - 1); 
      doc.setFont('helvetica', 'normal');
      doc.text(`Army No: ${handoff.providerArmyNo || 'N/A'}`, 10, pBaseY + 5);
      doc.text(`Rank: ${(handoff.providerRank || 'N/A').toUpperCase()}`, 10, pBaseY + 10);
      doc.text(`Name: ${(handoff.providerName || 'N/A').toUpperCase()}`, 10, pBaseY + 15);
      doc.text(`Date: ${currentDateStr}`, 10, pBaseY + 20);

      const rTitle = 'RECEIVER INFORMATION';
      doc.setFont('helvetica', 'bold');
      doc.text(rTitle, 145, handoffY);
      doc.line(145, handoffY + 1, 145 + doc.getTextWidth(rTitle), handoffY + 1);
      const rBaseY = handoffY + 25;
      doc.line(145, rBaseY - 1, 195, rBaseY - 1);
      doc.setFont('helvetica', 'normal');
      doc.text(`Army No: ${handoff.receiverArmyNo || 'N/A'}`, 145, rBaseY + 5);
      doc.text(`Rank: ${(handoff.receiverRank || 'N/A').toUpperCase()}`, 145, rBaseY + 10);
      doc.text(`Name: ${(handoff.receiverName || 'N/A').toUpperCase()}`, 145, rBaseY + 15);
      doc.text(`Date: ${currentDateStr}`, 145, rBaseY + 20);

      const countersignY = handoffY + 65;
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const csText = "COUNTERSIGN";
      doc.text(csText, pageWidth / 2, countersignY, { align: 'center' });
      const csWidth = doc.getTextWidth(csText);
      doc.line(pageWidth / 2 - csWidth / 2, countersignY + 1, pageWidth / 2 + csWidth / 2, countersignY + 1);
    }

    drawDeveloperFooter(doc, 288);
    doc.save(`Monthly_Slip_${monthYearText.replace(/\s+/g, '_') || 'Report'}.pdf`);
  } catch (error) {
    console.error("PDF generation failed:", error);
    alert("Error generating report.");
  }
};

export const generateBookingDetailsReport = async (bookings: Booking[], startDate: string, endDate: string, withSignature: boolean = true, label1: string = "Driver", label2: string = "JCO/NCO", customHeader?: string) => {
  try {
    const doc = new jsPDF();
    doc.setFont('helvetica');
    const filtered = filterByRange(bookings, startDate, endDate);
    const mainHeading = (customHeader && customHeader.trim() !== '') ? customHeader.toUpperCase() : "BOOKING DETAILS - CIVIL MICROBUS";
    let monthYearText = "";
    if (startDate) monthYearText = format(parseISO(startDate), 'MMMM yyyy').toUpperCase();

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(mainHeading, 110, 15, { align: 'center' });
    const headingWidth = doc.getTextWidth(mainHeading);
    doc.setLineWidth(0.5);
    doc.line(110 - (headingWidth / 2), 17, 110 + (headingWidth / 2), 17);
    
    if (monthYearText) {
      doc.text(monthYearText, 110, 24, { align: 'center' });
      const subHeadingWidth = doc.getTextWidth(monthYearText);
      doc.line(110 - (subHeadingWidth / 2), 26, 110 + (subHeadingWidth / 2), 26);
    }
    
    const totalFare = filtered.reduce((sum, b) => b.fareStatus === 'Paid' ? sum + (b.fare || 0) : sum, 0);

    autoTable(doc, {
      startY: monthYearText ? 32 : 25,
      head: [
        [
          { content: 'SER', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'RANK AND NAME', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'UNIT', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'BOOKING DATE', colSpan: 2, styles: { halign: 'center' } },
          { content: 'DAYS', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'DURATION', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'FARE', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'REMARKS', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } }
        ],
        [
          { content: 'FROM', styles: { halign: 'center' } },
          { content: 'TO', styles: { halign: 'center' } }
        ]
      ],
      body: filtered.map((b, i) => {
        const totalDays = differenceInDays(parseISO(b.endDate), parseISO(b.startDate)) + 1;
        const fareVal = b.isExempt ? 'EXEMPTED' : formatCurrency(b.fare);
        return [
          i + 1, (b.rankName || '').toUpperCase(), (b.unit || '').toUpperCase(),
          format(parseISO(b.startDate), DATE_FORMAT), format(parseISO(b.endDate), DATE_FORMAT), 
          totalDays, b.duration, fareVal, (b.remarks || '-')
        ];
      }),
      foot: [[
        { content: 'TOTAL FARE', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', fillColor: [220, 220, 220], textColor: [0, 0, 0], lineWidth: 0.1, fontSize: 10 } },
        { content: formatCurrency(totalFare), styles: { halign: 'center', fontStyle: 'bold', fillColor: [220, 220, 220], textColor: [0, 0, 0], lineWidth: 0.1, fontSize: 10 } },
        { content: '', styles: { fillColor: [220, 220, 220], lineWidth: 0.1 } }
      ]],
      theme: 'grid',
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontSize: 9, halign: 'center', fontStyle: 'bold', font: 'helvetica' },
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, halign: 'center', textColor: [0, 0, 0], overflow: 'visible' },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 45, halign: 'left' }, 2: { cellWidth: 32, halign: 'left' }, 3: { cellWidth: 20 }, 4: { cellWidth: 20 }, 5: { cellWidth: 12 }, 6: { cellWidth: 18 }, 7: { cellWidth: 20 }, 8: { cellWidth: 'auto' } },
      margin: { left: 8, right: 8 }
    });

    if (withSignature) {
      const finalY = (doc as any).lastAutoTable?.finalY || 150;
      const pageWidth = doc.internal.pageSize.getWidth();
      const sigY = Math.min(finalY + 20, 275);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      
      doc.line(20, sigY, 70, sigY);
      doc.text(label1, 45, sigY + 5, { align: 'center' });
      
      doc.line(pageWidth - 70, sigY, pageWidth - 20, sigY);
      doc.text(label2, pageWidth - 45, sigY + 5, { align: 'center' });
      
      const countersignY = sigY + 22;
      const csText = "COUNTERSIGN";
      doc.text(csText, pageWidth / 2, countersignY, { align: 'center' });
      const csWidth = doc.getTextWidth(csText);
      doc.line(pageWidth / 2 - csWidth / 2, countersignY + 1, pageWidth / 2 + csWidth / 2, countersignY + 1);
    }

    drawDeveloperFooter(doc, 288);
    doc.save(`Booking_Details_${monthYearText.replace(/\s+/g, '_') || 'Report'}.pdf`);
  } catch (error) {
    console.error("PDF generation failed:", error);
    alert("Error generating report.");
  }
};

export const generateOverallReport = async (bookings: Booking[], startDate: string, endDate: string, fields: BookingField[], customHeader?: string, withSignature: boolean = false, label1: string = "Driver", label2: string = "JCO/NCO") => {
  try {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFont('helvetica');
    const filtered = filterByRange(bookings, startDate, endDate);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const titleText = (customHeader && customHeader.trim() !== '') ? customHeader.toUpperCase() : "DETAILED BOOKING REPORT";
    doc.text(titleText, 148, 15, { align: 'center' });
    const titleWidth = doc.getTextWidth(titleText);
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.line(148 - (titleWidth / 2), 16.5, 148 + (titleWidth / 2), 16.5);
    
    if (startDate && endDate) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const periodText = `Period: ${format(parseISO(startDate), DATE_FORMAT)} to ${format(parseISO(endDate), DATE_FORMAT)}`;
      doc.text(periodText, 148, 22, { align: 'center' });
      const periodWidth = doc.getTextWidth(periodText);
      doc.setLineWidth(0.3);
      doc.setDrawColor(0, 0, 0);
      doc.line(148 - (periodWidth / 2), 23.5, 148 + (periodWidth / 2), 23.5);
    }

    const headRow1: any[] = [];
    const headRow2: any[] = [];

    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      const label = (BOOKING_FIELDS.find(bf => bf.value === f)?.label || f.toString()).toUpperCase();

      if ((f === 'kmStart' && fields[i+1] === 'kmEnd') || (f === 'kmEnd' && fields[i+1] === 'kmStart')) {
        headRow1.push({ content: 'KILOMETRES', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } });
        headRow2.push({ content: 'START', styles: { halign: 'center', fontStyle: 'bold' } });
        headRow2.push({ content: 'END', styles: { halign: 'center', fontStyle: 'bold' } });
        i++; 
        continue;
      }

      if ((f === 'startDate' && fields[i+1] === 'endDate') || (f === 'endDate' && fields[i+1] === 'startDate')) {
        headRow1.push({ content: 'BOOKING DATE', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold' } });
        headRow2.push({ content: 'FROM', styles: { halign: 'center', fontStyle: 'bold' } });
        headRow2.push({ content: 'TO', styles: { halign: 'center', fontStyle: 'bold' } });
        i++; 
        continue;
      }

      headRow1.push({ content: label, rowSpan: 2, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' } });
    }

    const colStyles: any = {};
    fields.forEach((f, index) => {
      if (['rankName', 'unit', 'destination', 'remarks'].includes(f)) colStyles[index] = { halign: 'left' };
      else colStyles[index] = { halign: 'center' };
    });

    const tableBody: any[] = [];
    const fuelFields = ['purchasedFuel', 'fuelRate', 'totalFuelPrice'];
    const hasFuelFields = fields.some(f => fuelFields.includes(f as string));

    filtered.forEach((b) => {
      const purchaseCount = (hasFuelFields && b.fuelPurchases && b.fuelPurchases.length > 0) ? b.fuelPurchases.length : 1;
      
      for (let j = 0; j < purchaseCount; j++) {
        const p = hasFuelFields ? b.fuelPurchases?.[j] : null;
        const isFirst = j === 0;
        const row: any[] = [];
        
        fields.forEach((f) => {
          if (fuelFields.includes(f as string)) {
            const val = p ? p[f as keyof typeof p] : b[f as keyof Booking];
            if (f === 'totalFuelPrice') {
              row.push(val !== undefined ? formatCurrency(val as number) : '-');
            } else if (f === 'purchasedFuel') {
              row.push(val !== undefined ? `${val} L` : '-');
            } else {
              row.push(val !== undefined ? val.toString() : '-');
            }
          } else {
            if (isFirst) {
              let content: any = '';
              if (f === 'totalDays') content = differenceInDays(parseISO(b.endDate), parseISO(b.startDate)) + 1;
              else if (f === 'startDate' || f === 'endDate') content = b[f as keyof Booking] ? format(parseISO(b[f as keyof Booking] as string), DATE_FORMAT) : 'N/A';
              else if (f === 'fare') content = b.isExempt ? 'EXEMPTED' : (b.fare !== undefined ? formatCurrency(b.fare) : '-');
              else if (f === 'outTime' || f === 'inTime') {
                const val = b[f as keyof Booking];
                content = val ? `${val} hrs` : 'N/A';
              } else {
                const val = b[f as keyof Booking];
                content = val === undefined || val === null ? '' : val.toString();
              }
              row.push({ content, rowSpan: purchaseCount, styles: { valign: 'top' } });
            }
          }
        });
        tableBody.push(row);
      }
    });

    autoTable(doc, {
      startY: 30,
      head: [headRow1, headRow2],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontSize: 8, fontStyle: 'bold', halign: 'center', font: 'helvetica' },
      styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.5, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
      columnStyles: colStyles,
      margin: { left: 10, right: 10 }
    });

    if (withSignature) {
      const finalY = (doc as any).lastAutoTable?.finalY || 150;
      const pageWidth = doc.internal.pageSize.getWidth();
      const sigY = Math.min(finalY + 20, 185); 
      doc.setFontSize(10); 
      doc.setFont('helvetica', 'bold');
      doc.line(20, sigY, 70, sigY);
      doc.text(label1, 45, sigY + 5, { align: 'center' });
      doc.line(pageWidth - 70, sigY, pageWidth - 20, sigY);
      doc.text(label2, pageWidth - 45, sigY + 5, { align: 'center' });
      const countersignY = sigY + 12;
      const csText = "COUNTERSIGN";
      doc.text(csText, pageWidth / 2, countersignY, { align: 'center' });
      const csWidth = doc.getTextWidth(csText);
      doc.line(pageWidth / 2 - csWidth / 2, countersignY + 1, pageWidth / 2 + csWidth / 2, countersignY + 1);
    }

    drawDeveloperFooter(doc, 200);
    doc.save(`Detailed_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  } catch (error) {
    console.error("Overall report generation failed:", error);
    alert("Error generating report.");
  }
};

export const generateTripSummaryReport = async (bookings: Booking[], start: string, end: string, withGraph: boolean, customHeader?: string) => {
  try {
    const doc = new jsPDF();
    doc.setFont('helvetica');
    const startDate = startOfMonth(parseISO(start));
    const endDate = endOfMonth(parseISO(end));
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    const stats = months.map(m => {
      const mStart = startOfMonth(m);
      const mEnd = endOfMonth(m);
      let monthTotalDays = 0;
      bookings.forEach(b => {
        if (b.isSpecialNote) return;
        const bStart = parseISO(b.startDate);
        const bEnd = parseISO(b.endDate);
        const overlapStart = max([bStart, mStart]);
        const overlapEnd = min([bEnd, mEnd]);
        if (overlapStart <= overlapEnd) {
          const days = differenceInDays(overlapEnd, overlapStart) + 1;
          monthTotalDays += days;
        }
      });
      return { label: format(m, 'MMM yyyy').toUpperCase(), count: monthTotalDays };
    });

    const totalDaysSum = stats.reduce((sum, s) => sum + s.count, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setDrawColor(0, 0, 0); 
    const title1 = (customHeader && customHeader.trim() !== '') ? customHeader.toUpperCase() : 'TRIP SUMMARY REPORT';
    doc.text(title1, 105, 15, { align: 'center' });
    const title1Width = doc.getTextWidth(title1);
    doc.setLineWidth(0.5);
    doc.line(105 - (title1Width / 2), 17, 105 + (title1Width / 2), 17);
    const title2 = 'CIVIL MICROBUS (AREA HQ BARISHAL)';
    doc.text(title2, 105, 25, { align: 'center' });
    const title2Width = doc.getTextWidth(title2);
    doc.line(105 - (title2Width / 2), 27, 105 + (title2Width / 2), 27);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const periodText = `PERIOD: ${format(startDate, 'MMM yyyy').toUpperCase()} TO ${format(endDate, 'MMM yyyy').toUpperCase()}`;
    doc.text(periodText, 105, 34, { align: 'center' });
    const periodWidth = doc.getTextWidth(periodText);
    doc.setLineWidth(0.3);
    doc.line(105 - (periodWidth / 2), 35.5, 105 + (periodWidth / 2), 35.5);
    doc.setLineWidth(0.3);
    doc.line(20, 38, 190, 38);

    let nextY = 48;
    if (withGraph && stats.length > 0) {
      const chartHeight = 80;
      const chartWidth = 160;
      const marginX = 25;
      const baseY = nextY + chartHeight;
      const maxScale = 25; 
      doc.setDrawColor(180, 180, 180); 
      doc.setLineWidth(0.2); 
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0); 
      [0, 10, 20, 25].forEach(val => {
        const yPos = baseY - (val / maxScale) * chartHeight;
        doc.line(marginX, yPos, marginX + chartWidth, yPos);
        doc.text(val.toString(), marginX - 5, yPos + 1.5, { align: 'right' });
        doc.text(val.toString(), marginX + chartWidth + 2, yPos + 1.5);
      });
      const barSpacing = chartWidth / stats.length;
      const barWidth = Math.min(barSpacing * 0.7, 15);
      stats.forEach((s, i) => {
        const h = Math.min((s.count / maxScale) * chartHeight, chartHeight);
        const x = marginX + (i * barSpacing) + (barSpacing - barWidth) / 2;
        doc.setFillColor(16, 185, 129); 
        if (h > 0) doc.rect(x, baseY - h, barWidth, h, 'F');
        doc.setFontSize(6);
        doc.setTextColor(0, 0, 0);
        doc.text(s.label.split(' ')[0], x + barWidth/2, baseY + 5, { align: 'center' });
        if (s.count > 0) {
          doc.setTextColor(0, 0, 0); 
          doc.setFont('helvetica', 'bold');
          doc.text(s.count.toString(), x + barWidth/2, baseY - h - 2, { align: 'center' });
          doc.setFont('helvetica', 'normal');
        }
      });
      nextY = baseY + 20;
    }

    autoTable(doc, {
      startY: nextY,
      head: [['MONTHLY PERIOD', 'TOTAL DAYS']],
      body: stats.map(s => [s.label, s.count]),
      foot: [['SUBTOTAL DAYS', totalDaysSum.toString()]],
      theme: 'grid',
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], halign: 'center', fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.1 },
      footStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], halign: 'center', fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.1 },
      styles: { fontSize: 10, halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], font: 'helvetica' },
      columnStyles: { 0: { halign: 'left' } },
      margin: { left: 40, right: 40 }
    });
    drawDeveloperFooter(doc, 285);
    doc.save(`Trip_Summary_${format(new Date(), 'yyyyMMdd')}.pdf`);
  } catch (error) {
    console.error("Trip Summary generation failed:", error);
    alert("Error generating summary PDF.");
  }
};

export const generateAttendanceSheet = async (records: DriverAttendance[], start: string, end: string, withSignature: boolean = true, label1: string = "Driver", label2: string = "JCO/NCO", customHeader?: string) => {
  try {
    const doc = new jsPDF({ orientation: 'p' });
    doc.setFont('helvetica');
    const startDate = parseISO(start);
    const endDate = parseISO(end);
    const filtered = records.filter(r => { const rd = parseISO(r.date); return rd >= startDate && rd <= endDate; }).sort((a, b) => a.date.localeCompare(b.date));
    const mainHeading = (customHeader && customHeader.trim() !== '') ? customHeader.toUpperCase() : "ATTENDANCE SHEET (CIVIL MICROBUS DRIVER)";
    const rangeText = `${format(startDate, 'dd MMMM yyyy')} TO ${format(endDate, 'dd MMMM yyyy')}`.toUpperCase();
    doc.setTextColor(0, 0, 0); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(mainHeading, 105, 12, { align: 'center' });
    let headingWidth = doc.getTextWidth(mainHeading); doc.setLineWidth(0.5); doc.line(105 - (headingWidth / 2), 14, 105 + (headingWidth / 2), 14);
    doc.text(rangeText, 105, 20, { align: 'center' });
    headingWidth = doc.getTextWidth(rangeText); doc.line(105 - (headingWidth / 2), 22, 105 + (headingWidth / 2), 22);
    const headers = [['DATE', 'DAY', 'IN TIME', 'OUT TIME', 'LAST DAY MICROBUS ENTRY TIME\n(TO CANTONMENT)', 'REMARKS']];
    autoTable(doc, {
      startY: 28, head: headers,
      body: filtered.map((r) => {
        const dateObj = parseISO(r.date);
        const baseData = [format(dateObj, 'dd MMM yy').toUpperCase(), format(dateObj, 'EEEE').toUpperCase()];
        let dynamicColumns = r.isHoliday && !r.isDutyDay ? [{ content: 'HOLIDAY', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [250, 250, 250] } }, r.lastDayCompletionTime || '-'] : [r.inTime || '-', r.outTime || '-', r.lastDayCompletionTime || '-'];
        
        // Final logic for remarks: prioritizes user input, then DUTY for duty days
        const remarkDisplay = (r.remarks && r.remarks.trim() !== '') ? r.remarks : (r.isDutyDay ? 'DUTY' : '');
        
        return [...baseData, ...dynamicColumns, remarkDisplay];
      }),
      theme: 'grid',
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontSize: 6.5, fontStyle: 'bold', halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.1, valign: 'middle' },
      styles: { font: 'helvetica', fontSize: 7, cellPadding: 0.8, lineColor: [0, 0, 0], lineWidth: 0.1, halign: 'center', textColor: [0, 0, 0], valign: 'middle', overflow: 'linebreak' },
      columnStyles: { 0: { cellWidth: 26 }, 1: { cellWidth: 28 }, 2: { cellWidth: 20 }, 3: { cellWidth: 20 }, 4: { cellWidth: 62 }, 5: { cellWidth: 34 } },
      margin: { left: 10, right: 10 }
    });
    if (withSignature) {
      const finalY = (doc as any).lastAutoTable?.finalY || 150;
      const pageWidth = doc.internal.pageSize.getWidth();
      const sigY = Math.min(finalY + 12, 275);
      doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      doc.line(10, sigY, 55, sigY); doc.text(label1, 32.5, sigY + 4, { align: 'center' });
      doc.line(pageWidth - 55, sigY, pageWidth - 10, sigY); doc.text(label2, pageWidth - 32.5, sigY + 4, { align: 'center' });
      const countersignY = sigY + 14;
      const csText = "COUNTERSIGN"; doc.text(csText, pageWidth / 2, countersignY, { align: 'center' });
      const csWidth = doc.getTextWidth(csText); doc.line(pageWidth / 2 - csWidth / 2, countersignY + 1, pageWidth / 2 + csWidth / 2, countersignY + 1);
    }
    drawDeveloperFooter(doc, 285);
    doc.save(`Attendance_Sheet_${format(startDate, 'MMM_yyyy')}.pdf`);
  } catch (error) { console.error("Attendance PDF generation failed:", error); alert("Error generating attendance PDF."); }
};

export const generateFuelReport = async (bookings: Booking[], startDate: string, endDate: string, withSignature: boolean = true, label1: string = "Driver", label2: string = "JCO/NCO", customHeader?: string) => {
  try {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFont('helvetica');
    const sDate = parseISO(startDate);
    const eDate = parseISO(endDate);
    const filtered = filterByRange(bookings, startDate, endDate);

    const mainHeading = (customHeader && customHeader.trim() !== '') ? customHeader.toUpperCase() : "FUEL PURCHASE REPORT - CIVIL MICROBUS";
    const rangeText = `${format(sDate, 'dd MMMM yyyy')} TO ${format(eDate, 'dd MMMM yyyy')}`.toUpperCase();

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(mainHeading, 148.5, 12, { align: 'center' });
    let headingWidth = doc.getTextWidth(mainHeading);
    doc.setLineWidth(0.5);
    doc.line(148.5 - (headingWidth / 2), 14, 148.5 + (headingWidth / 2), 14);

    doc.setFontSize(10);
    doc.text(rangeText, 148.5, 20, { align: 'center' });
    headingWidth = doc.getTextWidth(rangeText);
    doc.setLineWidth(0.3);
    doc.line(148.5 - (headingWidth / 2), 21.5, 148.5 + (headingWidth / 2), 21.5);

    const tableBody: any[] = [];
    filtered.forEach((b, i) => {
      const start = parseISO(b.startDate);
      const end = parseISO(b.endDate);
      const days = differenceInDays(end, start) + 1;
      
      const purchaseCount = (b.fuelPurchases && b.fuelPurchases.length > 0) ? b.fuelPurchases.length : 1;
      
      for (let j = 0; j < purchaseCount; j++) {
        const p = b.fuelPurchases?.[j];
        const isFirst = j === 0;
        const row: any[] = [];
        
        if (isFirst) {
          row.push({ content: i + 1, rowSpan: purchaseCount, styles: { valign: 'top' } }); // SER
          row.push({ content: (b.rankName || '').toUpperCase(), rowSpan: purchaseCount, styles: { valign: 'top' } }); // NAME
          row.push({ content: format(start, DATE_FORMAT), rowSpan: purchaseCount, styles: { valign: 'top' } }); // FROM
          row.push({ content: format(end, DATE_FORMAT), rowSpan: purchaseCount, styles: { valign: 'top' } }); // TO
          row.push({ content: days, rowSpan: purchaseCount, styles: { valign: 'top' } }); // DAYS
          row.push({ content: (b.destination || '-').toUpperCase(), rowSpan: purchaseCount, styles: { valign: 'top' } }); // DESTINATION
          row.push({ content: b.kmStart !== undefined ? b.kmStart : '-', rowSpan: purchaseCount, styles: { valign: 'top' } }); // START
          row.push({ content: b.kmEnd !== undefined ? b.kmEnd : '-', rowSpan: purchaseCount, styles: { valign: 'top' } }); // END
          row.push({ content: b.totalKm !== undefined ? b.totalKm : '-', rowSpan: purchaseCount, styles: { valign: 'top' } }); // TOTAL KM
        }
        
        const fuelStr = p?.purchasedFuel !== undefined ? p.purchasedFuel.toString() : (isFirst && b.purchasedFuel !== undefined ? b.purchasedFuel.toString() : '-');
        const rateStr = p?.fuelRate !== undefined ? p.fuelRate.toString() : (isFirst && b.fuelRate !== undefined ? b.fuelRate.toString() : '-');
        const takaStr = p?.totalFuelPrice !== undefined ? formatCurrency(p.totalFuelPrice) : (isFirst && b.totalFuelPrice !== undefined ? formatCurrency(b.totalFuelPrice) : '-');

        row.push(fuelStr);
        row.push(rateStr);
        row.push(takaStr);
        
        if (isFirst) {
          row.push({ content: (b.remarks || '-'), rowSpan: purchaseCount, styles: { valign: 'top' } }); // REMARKS
        }
        
        tableBody.push(row);
      }
    });

    autoTable(doc, {
      startY: 28,
      head: [
        [
          { content: 'SER', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'NAME AND RANK', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'BOOKING DATE', colSpan: 2, styles: { halign: 'center' } },
          { content: 'DAYS', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'DESTINATION', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'KILOMETERS', colSpan: 2, styles: { halign: 'center' } },
          { content: 'TOTAL KILOMETRES', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'PURCHASED FUEL', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'RATE', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'TOTAL TAKA', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'REMARKS', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
        ],
        [
          { content: 'FROM', styles: { halign: 'center' } },
          { content: 'TO', styles: { halign: 'center' } },
          { content: 'START', styles: { halign: 'center' } },
          { content: 'END', styles: { halign: 'center' } }
        ]
      ],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontSize: 8, halign: 'center', fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.1 },
      styles: { font: 'helvetica', fontSize: 7, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1, halign: 'center', textColor: [0, 0, 0], valign: 'top' },
      columnStyles: { 
        1: { halign: 'left', cellWidth: 40 }, 
        5: { halign: 'left' },
        9: { cellWidth: 20 },
        10: { cellWidth: 15 },
        11: { cellWidth: 20 }
      },
      margin: { left: 8, right: 8 }
    });

    if (withSignature) {
      const finalY = (doc as any).lastAutoTable?.finalY || 150;
      const pageWidth = doc.internal.pageSize.getWidth();
      const sigY = Math.min(finalY + 20, 185);
      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      
      doc.line(20, sigY, 70, sigY);
      doc.text(label1, 45, sigY + 5, { align: 'center' });
      
      doc.line(pageWidth - 70, sigY, pageWidth - 20, sigY);
      doc.text(label2, pageWidth - 45, sigY + 5, { align: 'center' });
      
      const csY = sigY + 12;
      doc.text("COUNTERSIGN", pageWidth / 2, csY, { align: 'center' });
      const csW = doc.getTextWidth("COUNTERSIGN");
      doc.line(pageWidth / 2 - csW / 2, csY + 1, pageWidth / 2 + csW / 2, csY + 1);
    }

    drawDeveloperFooter(doc, 200);
    doc.save(`Fuel_Report_${format(sDate, 'MMM_yyyy')}.pdf`);
  } catch (error) {
    console.error("Fuel report generation failed:", error);
    alert("Error generating fuel report.");
  }
};

export const generateCalendarPDF = async (bookings: Booking[], startDateStr: string, endDateStr: string, customHeader?: string) => {
  try {
    const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
    const startDate = parseISO(startDateStr);
    const endDate = parseISO(endDateStr);
    const filteredBookings = bookings.filter(b => !b.isSpecialNote);

    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    months.forEach((monthDate, monthIndex) => {
      if (monthIndex > 0) {
        doc.addPage();
      }

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text("MICROBUS SCHEDULE", 148.5, 10, { align: 'center' });
      
      // Underline MICROBUS SCHEDULE
      const titleWidth = doc.getTextWidth("MICROBUS SCHEDULE");
      doc.setLineWidth(0.5);
      doc.line(148.5 - titleWidth/2, 11.5, 148.5 + titleWidth/2, 11.5);

      doc.setFontSize(16);
      const monthYear = format(monthDate, 'MMMM yyyy').toUpperCase();
      doc.text(monthYear, 148.5, 18, { align: 'center' });
      
      // Underline monthYear
      const monthYearWidth = doc.getTextWidth(monthYear);
      doc.setLineWidth(0.5);
      doc.line(148.5 - monthYearWidth/2, 19.5, 148.5 + monthYearWidth/2, 19.5);

      if (customHeader && customHeader !== "MICROBUS SCHEDULE") {
        doc.setFontSize(10);
        doc.text(customHeader, 148.5, 25, { align: 'center' });
      }

      // Grid parameters
      const startX = 10;
      const startY = 35;
      const cellW = 277 / 7;
      const cellH = 165 / 6; // Adjusted for new startY

      // Days of week
      const daysOfWeek = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      daysOfWeek.forEach((day, i) => {
        const x = startX + i * cellW;
        const y = startY - 8;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.rect(x, y, cellW, 8); // Border for day name
        doc.text(day, x + (cellW / 2), y + 5.5, { align: 'center' });
      });

      // Draw grid
      const daysInMonth = getDaysInMonth(monthDate);
      const firstDayOfMonth = getDay(startOfMonth(monthDate));

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);

      let currentDay = 1;
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 7; col++) {
          const x = startX + col * cellW;
          const y = startY + row * cellH;

          if ((row === 0 && col < firstDayOfMonth) || currentDay > daysInMonth) {
            // Empty cell
            doc.setFillColor(245, 245, 245);
            doc.rect(x, y, cellW, cellH, 'FD');
          } else {
            // Draw cell border
            doc.setFillColor(255, 255, 255);
            doc.rect(x, y, cellW, cellH, 'FD');

            // Date number
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(currentDay.toString(), x + 2, y + 5);

            // Find bookings for this day
            const currentDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), currentDay);
            const dayBookings = filteredBookings.filter(b => {
              const bStart = startOfDay(parseISO(b.startDate));
              const bEnd = endOfDay(parseISO(b.endDate));
              return currentDate >= bStart && currentDate <= bEnd;
            });

            // Print bookings
            const maxBookings = Math.floor((cellH - 10) / 7);
            const bookingsToShow = dayBookings.slice(0, maxBookings);
            const totalHeight = bookingsToShow.length * 7;
            
            // Center bookings vertically in the cell (below the date number)
            let bookingY = y + 10 + (cellH - 10 - totalHeight) / 2 + 4;

            bookingsToShow.forEach((b) => {
              doc.setDrawColor(0, 0, 0);
              doc.setLineWidth(0.1);
              // Small box for each booking
              doc.rect(x + 1, bookingY - 5, cellW - 2, 6);
              
              doc.setFontSize(7.5);
              doc.setFont('helvetica', 'bold');
              const rankName = doc.splitTextToSize(b.rankName || 'Unknown', cellW - 4)[0];
              doc.text(rankName, x + cellW/2, bookingY - 0.5, { align: 'center' });
              
              bookingY += 7;
            });

            if (dayBookings.length > maxBookings) {
              doc.setFontSize(7);
              doc.setFont('helvetica', 'italic');
              doc.text(`+${dayBookings.length - maxBookings} more bookings`, x + 2, bookingY);
            }

            currentDay++;
          }
        }
        if (currentDay > daysInMonth) break;
      }
      
      drawDeveloperFooter(doc, 204);
    });

    doc.save(`Calendar_View_${startDateStr}_to_${endDateStr}.pdf`);
  } catch (error) {
    console.error("Calendar PDF generation failed:", error);
    alert("Error generating calendar PDF.");
  }
};