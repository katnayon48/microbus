
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Booking, BookingField, HandoffInfo } from '../types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { BOOKING_FIELDS } from '../constants';

const DATE_FORMAT = 'dd-MM-yyyy';
const LOGO_URL = "https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg";
const PAID_SEAL_URL = "https://i.ibb.co.com/Qv2Y07rG/IMG-0753.webp";
const UNPAID_SEAL_URL = "https://i.ibb.co.com/QjTgvXHt/IMG-0754.jpg";

/**
 * Loads the logo and crops it into a circle for the header.
 */
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

/**
 * Loads an image and returns its base64 data along with its natural dimensions.
 */
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
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  
  if (isSlip) {
    doc.text('AUTO GENERATED SLIP', centerX, startY, { align: 'center' });
    doc.text('NO SIGNATURE REQUIRED', centerX, startY + 3, { align: 'center' });
  } else {
    doc.text('AUTO GENERATED REPORT', centerX, startY, { align: 'center' });
  }
  
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('Software Developed By', centerX, isSlip ? startY + 7 : startY + 4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('1815124 CPL (CLK) BILLAL, ASC', centerX, isSlip ? startY + 10 : startY + 7, { align: 'center' });
};

export const generateIndividualPaymentSlip = async (booking: Booking, receivedBy?: string) => {
  if (booking.isSpecialNote) return;

  try {
    const doc = new jsPDF();
    const sealUrl = booking.isExempt ? null : (booking.fareStatus === 'Paid' ? PAID_SEAL_URL : UNPAID_SEAL_URL);

    const [logoData, sealInfo] = await Promise.all([
      loadCircularLogo(),
      sealUrl ? loadOriginalImage(sealUrl) : Promise.resolve(null)
    ]);

    const margin = 20;

    // Header Background
    doc.setFillColor(15, 23, 42); 
    doc.setDrawColor(15, 23, 42);
    doc.rect(-2, -2, 214, 42, 'F'); 

    if (logoData) {
      doc.addImage(logoData, 'PNG', 10, 5, 30, 30);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT SLIP', 115, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('MICROBUS TRANSPORT SERVICE - AREA HQ BARISHAL', 115, 30, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Passenger Details:', margin, 55);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 58, 190, 58);

    let dateRangeValue = 'N/A';
    if (booking.startDate && booking.endDate) {
      const start = parseISO(booking.startDate);
      const end = parseISO(booking.endDate);
      const daysDiff = differenceInDays(end, start) + 1;
      dateRangeValue = `${format(start, DATE_FORMAT)} to ${format(end, DATE_FORMAT)} (${daysDiff} ${daysDiff === 1 ? 'Day' : 'Days'})`;
    }

    autoTable(doc, {
      startY: 65,
      margin: { left: margin },
      body: [
        ['Rank and Name', ':', (booking.rankName || 'N/A').toUpperCase()],
        ['Unit', ':', (booking.unit || 'N/A').toUpperCase()],
        ['Mobile Number', ':', (booking.mobileNumber || 'N/A').toUpperCase()],
        ['Garrison Status', ':', (booking.garrisonStatus || 'N/A').toUpperCase()],
        ['Destination', ':', (booking.destination || 'N/A').toUpperCase()],
        ['Duration', ':', (booking.duration || 'N/A').toUpperCase()],
        ['Date Range', ':', dateRangeValue],
        ['Out Time', ':', booking.outTime || 'N/A'],
        ['In Time', ':', booking.inTime || 'N/A'],
        ['Payment Received By', ':', (receivedBy || 'N/A').toUpperCase()],
        ['Remarks', ':', (booking.remarks || 'None').toUpperCase()],
      ],
      theme: 'plain',
      styles: { 
        fontSize: 12, 
        cellPadding: { top: 3, bottom: 3, left: 1, right: 1 }, 
        textColor: [0, 0, 0],
        valign: 'middle',
        overflow: 'linebreak'
      },
      columnStyles: { 
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { fontStyle: 'bold', cellWidth: 8, halign: 'center' },
        2: { cellWidth: 110 }
      }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 150;
    
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, finalY + 10, 170, 20, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(margin, finalY + 10, 170, 20, 'S');
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('TOTAL FARE:', margin + 5, finalY + 23);
    
    const fareDisplayText = booking.isExempt 
      ? 'NOT REQUIRED' 
      : (booking.fareStatus === 'Unpaid' ? 'UNPAID' : `BDT ${(booking.fare || 0).toLocaleString()}.00`);
      
    doc.text(fareDisplayText, 190 - 5, finalY + 23, { align: 'right' });

    if (sealInfo) {
      const maxWidth = 50;
      const maxHeight = 50;
      const ratio = sealInfo.width / sealInfo.height;
      let drawWidth = maxWidth;
      let drawHeight = maxWidth / ratio;
      if (drawHeight > maxHeight) {
        drawHeight = maxHeight;
        drawWidth = maxHeight * ratio;
      }
      doc.addImage(sealInfo.data, 'PNG', 190 - drawWidth, finalY + 40, drawWidth, drawHeight);
    }
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.text(`Generated on ${format(new Date(), 'dd-MM-yyyy HH:mm')}`, 105, 272, { align: 'center' });
    drawDeveloperFooter(doc, 278, true);
    
    doc.save(`Slip_${(booking.rankName || 'User').replace(/\s+/g, '_')}.pdf`);
  } catch (error) { 
    console.error("PDF generation failed:", error); 
    alert("Error generating PDF.");
  }
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

export const generatePaymentSlip = async (bookings: Booking[], startDate: string, endDate: string, handoff?: HandoffInfo) => {
  try {
    const doc = new jsPDF();
    const filtered = filterByRange(bookings, startDate, endDate);
    const mainHeading = "MONTHLY PAYMENT SLIP - CIVIL MICROBUS";
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
        const fareVal = b.isExempt 
          ? 'EXEMPTED' 
          : (b.fareStatus === 'Unpaid' ? 'UNPAID' : b.fare.toLocaleString());
          
        return [
          i + 1, b.rankName.toUpperCase(), b.unit.toUpperCase(),
          format(parseISO(b.startDate), DATE_FORMAT), format(parseISO(b.endDate), DATE_FORMAT), totalDays, b.duration.toUpperCase(),
          fareVal, (b.remarks || '-').toUpperCase()
        ];
      }),
      foot: [[
        { content: 'TOTAL FARE', colSpan: 7, styles: { halign: 'center', fontStyle: 'bold', fillColor: [220, 220, 220], textColor: [0, 0, 0], lineWidth: 0.1, fontSize: 10 } },
        { content: totalFare.toLocaleString(), styles: { halign: 'center', fontStyle: 'bold', fillColor: [220, 220, 220], textColor: [0, 0, 0], lineWidth: 0.1, fontSize: 10 } },
        { content: '', styles: { fillColor: [220, 220, 220], lineWidth: 0.1 } }
      ]],
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 220, 220], 
        textColor: [0, 0, 0],       
        fontSize: 9, 
        halign: 'center',
        fontStyle: 'bold'
      },
      styles: { fontSize: 9, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, halign: 'center', textColor: [0, 0, 0], overflow: 'visible' },
      columnStyles: {
        0: { cellWidth: 10 }, 
        1: { cellWidth: 45 }, 
        2: { cellWidth: 32 },
        3: { cellWidth: 20 }, 
        4: { cellWidth: 20 },
        5: { cellWidth: 12 }, 
        6: { cellWidth: 18 },
        7: { cellWidth: 20 }, 
        8: { cellWidth: 'auto' }
      },
      margin: { left: 8, right: 8 }
    });

    const finalTableY = (doc as any).lastAutoTable?.finalY || 150;
    const handoffY = finalTableY + 15;
    const currentDateStr = format(new Date(), DATE_FORMAT);

    if (handoff) {
      doc.setFontSize(9);
      doc.setLineWidth(0.3);
      const pTitle = 'PROVIDER INFORMATION';
      doc.setFont('helvetica', 'bold');
      doc.text(pTitle, 10, handoffY);
      doc.line(10, handoffY + 1, 10 + doc.getTextWidth(pTitle), handoffY + 1);
      const pBaseY = handoffY + 25; 
      doc.line(10, pBaseY - 1, 60, pBaseY - 1); 
      doc.setFont('helvetica', 'normal');
      doc.text(`Army No: ${handoff.providerArmyNo.toUpperCase()}`, 10, pBaseY + 5);
      doc.text(`Rank: ${handoff.providerRank.toUpperCase()}`, 10, pBaseY + 10);
      doc.text(`Name: ${handoff.providerName.toUpperCase()}`, 10, pBaseY + 15);
      doc.text(`Date: ${currentDateStr}`, 10, pBaseY + 20);

      const rTitle = 'RECEIVER INFORMATION';
      doc.setFont('helvetica', 'bold');
      // Shift receiver info further right (from 130 to 145)
      doc.text(rTitle, 145, handoffY);
      doc.line(145, handoffY + 1, 145 + doc.getTextWidth(rTitle), handoffY + 1);
      const rBaseY = handoffY + 25;
      doc.line(145, rBaseY - 1, 195, rBaseY - 1);
      doc.setFont('helvetica', 'normal');
      doc.text(`Army No: ${handoff.receiverArmyNo.toUpperCase()}`, 145, rBaseY + 5);
      doc.text(`Rank: ${handoff.receiverRank.toUpperCase()}`, 145, rBaseY + 10);
      doc.text(`Name: ${handoff.receiverName.toUpperCase()}`, 145, rBaseY + 15);
      doc.text(`Date: ${currentDateStr}`, 145, rBaseY + 20);
    }

    // Centered COUNTERSIGN label
    const countersignY = handoff ? handoffY + 65 : finalTableY + 30;
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    const csText = "COUNTERSIGN";
    doc.text(csText, pageWidth / 2, countersignY, { align: 'center' });
    const csWidth = doc.getTextWidth(csText);
    doc.line(pageWidth / 2 - csWidth / 2, countersignY + 1, pageWidth / 2 + csWidth / 2, countersignY + 1);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.text(`Generated on ${format(new Date(), 'dd-MM-yyyy HH:mm')}`, 105, 282, { align: 'center' });
    drawDeveloperFooter(doc, 288);
    
    doc.save(`Monthly_Slip_${monthYearText.replace(/\s+/g, '_') || 'Report'}.pdf`);
  } catch (error) {
    console.error("PDF generation failed:", error);
    alert("Error generating report.");
  }
};

/**
 * Generates a detailed report with selected fields.
 */
export const generateOverallReport = async (bookings: Booking[], startDate: string, endDate: string, fields: BookingField[]) => {
  try {
    const doc = new jsPDF({ orientation: 'landscape' });
    const filtered = filterByRange(bookings, startDate, endDate);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const titleText = "DETAILED BOOKING REPORT";
    doc.text(titleText, 148, 15, { align: 'center' });
    
    // Calculate width for main title underline
    const titleWidth = doc.getTextWidth(titleText);
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.line(148 - (titleWidth / 2), 16.5, 148 + (titleWidth / 2), 16.5);
    
    if (startDate && endDate) {
      doc.setFontSize(10);
      const periodText = `Period: ${format(parseISO(startDate), DATE_FORMAT)} to ${format(parseISO(endDate), DATE_FORMAT)}`;
      doc.text(periodText, 148, 22, { align: 'center' });
      
      // Calculate width for period underline
      const periodWidth = doc.getTextWidth(periodText);
      doc.setLineWidth(0.3);
      doc.setDrawColor(0, 0, 0);
      doc.line(148 - (periodWidth / 2), 23.5, 148 + (periodWidth / 2), 23.5);
    }

    const headers = fields.map(f => BOOKING_FIELDS.find(bf => bf.value === f)?.label || f.toUpperCase());
    
    autoTable(doc, {
      startY: 30,
      head: [headers],
      body: filtered.map(b => {
        return fields.map(field => {
          if (field === 'totalDays') {
             return differenceInDays(parseISO(b.endDate), parseISO(b.startDate)) + 1;
          }
          if (field === 'startDate' || field === 'endDate') {
            const dateVal = b[field as keyof Booking];
            return dateVal ? format(parseISO(dateVal as string), DATE_FORMAT) : '-';
          }
          const val = b[field as keyof Booking];
          return (val ?? '-').toString().toUpperCase();
        });
      }),
      theme: 'grid',
      styles: { 
        fontSize: 8, 
        cellPadding: 2, 
        halign: 'center', 
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0], // Black borders
        lineWidth: 0.1 
      },
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    drawDeveloperFooter(doc, 190);
    doc.save(`Detailed_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
  } catch (error) {
    console.error("Report generation failed:", error);
    alert("Error generating report.");
  }
};
