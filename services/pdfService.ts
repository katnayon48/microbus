import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Booking, BookingField, HandoffInfo, DriverAttendance } from '../types';
import { format, parseISO, differenceInDays, eachMonthOfInterval, startOfMonth, endOfMonth, isWithinInterval, max, min } from 'date-fns';
import { BOOKING_FIELDS } from '../constants';

const DATE_FORMAT = 'dd-MM-yyyy';
const LOGO_URL = "https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg";
const PAID_SEAL_URL = "https://i.ibb.co.com/Qv2Y07rG/IMG-0753.webp";
const UNPAID_SEAL_URL = "https://i.ibb.co.com/QjTgvXHt/IMG-0754.jpg";

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
  
  doc.setTextColor(100, 100, 100); 
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  
  if (isSlip) {
    doc.text('AUTO GENERATED SLIP', centerX, startY, { align: 'center' });
    doc.text('NO SIGNATURE REQUIRED', centerX, startY + 3, { align: 'center' });
  } else {
    doc.text('AUTO GENERATED REPORT', centerX, startY, { align: 'center' });
  }
  
  doc.setFontSize(5);
  doc.text('Software Developed By', centerX, isSlip ? startY + 7 : startY + 4, { align: 'center' });
  doc.setFontSize(5); 
  doc.text('1815124 CPL (CLK) BILLAL, ASC', centerX, isSlip ? startY + 10 : startY + 7, { align: 'center' });
};

export const generateIndividualPaymentSlip = async (booking: Booking, receivedBy?: string) => {
  if (booking.isSpecialNote) return;

  try {
    const doc = new jsPDF();
    doc.setFont('helvetica');

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
    doc.text('E-PAYMENT SLIP', 115, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
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
        ['Mobile Number', ':', (booking.mobileNumber || 'N/A')],
        ['Garrison Status', ':', (booking.garrisonStatus || 'N/A')],
        ['Destination', ':', (booking.destination || 'N/A')],
        ['Duration', ':', (booking.duration || 'N/A')],
        ['Date Range', ':', dateRangeValue],
        ['Out Time', ':', booking.outTime ? `${booking.outTime} hrs` : 'N/A'],
        ['In Time', ':', booking.inTime ? `${booking.inTime} hrs` : 'N/A'],
        ['Payment Received By', ':', (receivedBy || 'N/A').toUpperCase()],
        ['Remarks', ':', (booking.remarks || 'None')],
      ],
      theme: 'plain',
      styles: { 
        font: 'helvetica',
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
    
    doc.text('TOTAL FARE:', 140, finalY + 23, { align: 'right' });
    
    const fareDisplayText = booking.isExempt 
      ? 'NOT REQUIRED' 
      : `BDT ${(booking.fare || 0).toLocaleString()}.00`;
      
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
    doc.setFont('helvetica');

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
        const fareVal = b.isExempt ? 'EXEMPTED' : b.fare.toLocaleString();
          
        return [
          i + 1, 
          (b.rankName || '').toUpperCase(), 
          (b.unit || '').toUpperCase(),
          format(parseISO(b.startDate), DATE_FORMAT), 
          format(parseISO(b.endDate), DATE_FORMAT), 
          totalDays, 
          b.duration,
          fareVal, 
          (b.remarks || '-')
        ];
      }),
      foot: [[
        { content: 'TOTAL FARE', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', fillColor: [220, 220, 220], textColor: [0, 0, 0], lineWidth: 0.1, fontSize: 10 } },
        { content: totalFare.toLocaleString(), styles: { halign: 'center', fontStyle: 'bold', fillColor: [220, 220, 220], textColor: [0, 0, 0], lineWidth: 0.1, fontSize: 10 } },
        { content: '', styles: { fillColor: [220, 220, 220], lineWidth: 0.1 } }
      ]],
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 220, 220], 
        textColor: [0, 0, 0],       
        fontSize: 9, 
        halign: 'center',
        fontStyle: 'bold',
        font: 'helvetica'
      },
      styles: { 
        font: 'helvetica',
        fontSize: 9, 
        cellPadding: 1.5, 
        lineColor: [0, 0, 0], 
        lineWidth: 0.1, 
        halign: 'center', 
        textColor: [0, 0, 0], 
        overflow: 'visible' 
      },
      columnStyles: {
        0: { cellWidth: 10 }, 
        1: { cellWidth: 45, halign: 'left' }, 
        2: { cellWidth: 32, halign: 'left' }, 
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
      doc.setFont('helvetica', 'bold');
      doc.setLineWidth(0.3);
      const pTitle = 'PROVIDER INFORMATION';
      doc.text(pTitle, 10, handoffY);
      doc.line(10, handoffY + 1, 10 + doc.getTextWidth(pTitle), handoffY + 1);
      const pBaseY = handoffY + 25; 
      doc.line(10, pBaseY - 1, 60, pBaseY - 1); 
      doc.setFont('helvetica', 'normal');
      doc.text(`Army No: ${handoff.providerArmyNo}`, 10, pBaseY + 5);
      doc.text(`Rank: ${handoff.providerRank.toUpperCase()}`, 10, pBaseY + 10);
      doc.text(`Name: ${handoff.providerName.toUpperCase()}`, 10, pBaseY + 15);
      doc.text(`Date: ${currentDateStr}`, 10, pBaseY + 20);

      const rTitle = 'RECEIVER INFORMATION';
      doc.setFont('helvetica', 'bold');
      doc.text(rTitle, 145, handoffY);
      doc.line(145, handoffY + 1, 145 + doc.getTextWidth(rTitle), handoffY + 1);
      const rBaseY = handoffY + 25;
      doc.line(145, rBaseY - 1, 195, rBaseY - 1);
      doc.setFont('helvetica', 'normal');
      doc.text(`Army No: ${handoff.receiverArmyNo}`, 145, rBaseY + 5);
      doc.text(`Rank: ${handoff.receiverRank.toUpperCase()}`, 145, rBaseY + 10);
      doc.text(`Name: ${handoff.receiverName.toUpperCase()}`, 145, rBaseY + 15);
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

export const generateOverallReport = async (bookings: Booking[], startDate: string, endDate: string, fields: BookingField[]) => {
  try {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFont('helvetica');

    const filtered = filterByRange(bookings, startDate, endDate);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const titleText = "DETAILED BOOKING REPORT";
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

    const headers = fields.map(f => BOOKING_FIELDS.find(bf => bf.value === f)?.label || f.toUpperCase());
    
    const colStyles: any = {};
    fields.forEach((f, index) => {
      if (f === 'rankName' || f === 'unit' || f === 'destination' || f === 'remarks') {
        colStyles[index] = { halign: 'left' };
      } else {
        colStyles[index] = { halign: 'center' };
      }
    });

    autoTable(doc, {
      startY: 30,
      head: [headers],
      body: filtered.map(b => {
        return fields.map(f => {
          if (f === 'totalDays') {
            return differenceInDays(parseISO(b.endDate), parseISO(b.startDate)) + 1;
          }
          if (f === 'startDate' || f === 'endDate') {
            return b[f as keyof Booking] ? format(parseISO(b[f as keyof Booking] as string), DATE_FORMAT) : 'N/A';
          }
          if (f === 'fare') {
            return b.isExempt ? 'EXEMPTED' : (b.fare || 0).toLocaleString();
          }
          if (f === 'outTime' || f === 'inTime') {
            const val = b[f as keyof Booking];
            return val ? `${val} hrs` : 'N/A';
          }
          const val = b[f as keyof Booking];
          return val === undefined || val === null ? '' : val.toString();
        });
      }),
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 220, 220], 
        textColor: [0, 0, 0], 
        fontSize: 9, 
        fontStyle: 'bold',
        halign: 'center',
        font: 'helvetica'
      },
      styles: { 
        font: 'helvetica',
        fontSize: 8, 
        cellPadding: 1.5, 
        textColor: [0, 0, 0], 
        lineColor: [0, 0, 0], 
        lineWidth: 0.1 
      },
      columnStyles: colStyles,
      margin: { left: 10, right: 10 }
    });

    drawDeveloperFooter(doc, 200);
    
    doc.save(`Detailed_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  } catch (error) {
    console.error("Overall report generation failed:", error);
    alert("Error generating report.");
  }
};

export const generateTripSummaryReport = async (bookings: Booking[], start: string, end: string, withGraph: boolean) => {
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

      return {
        label: format(m, 'MMM yyyy').toUpperCase(),
        count: monthTotalDays
      };
    });

    const totalDaysSum = stats.reduce((sum, s) => sum + s.count, 0);

    // Header Section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setDrawColor(0, 0, 0); // Black color for underlines
    
    // Line 1: TRIP SUMMARY REPORT
    const title1 = 'TRIP SUMMARY REPORT';
    doc.text(title1, 105, 15, { align: 'center' });
    const title1Width = doc.getTextWidth(title1);
    doc.setLineWidth(0.5);
    doc.line(105 - (title1Width / 2), 17, 105 + (title1Width / 2), 17);

    // Line 2: CIVIL MICROBUS (AREA HQ BARISHAL)
    const title2 = 'CIVIL MICROBUS (AREA HQ BARISHAL)';
    doc.text(title2, 105, 25, { align: 'center' });
    const title2Width = doc.getTextWidth(title2);
    doc.line(105 - (title2Width / 2), 27, 105 + (title2Width / 2), 27);

    // Period Info - Uppercase, Bold, Underlined
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const periodText = `PERIOD: ${format(startDate, 'MMM yyyy').toUpperCase()} TO ${format(endDate, 'MMM yyyy').toUpperCase()}`;
    doc.text(periodText, 105, 34, { align: 'center' });
    const periodWidth = doc.getTextWidth(periodText);
    doc.setLineWidth(0.3);
    doc.line(105 - (periodWidth / 2), 35.5, 105 + (periodWidth / 2), 35.5);
    
    // Separator line
    doc.setLineWidth(0.3);
    doc.line(20, 38, 190, 38);

    let nextY = 48;

    if (withGraph && stats.length > 0) {
      const chartHeight = 80;
      const chartWidth = 160;
      const marginX = 25;
      const baseY = nextY + chartHeight;
      const maxScale = 25; // Matched with UI

      // Draw Grid Lines & Labels - Darkened for better visibility
      doc.setDrawColor(180, 180, 180); // Darker gray for grid lines
      doc.setLineWidth(0.2); // Slightly thicker line
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60); // Darker gray for labels

      [0, 10, 20, 25].forEach(val => { // Matched with UI
        const yPos = baseY - (val / maxScale) * chartHeight;
        doc.line(marginX, yPos, marginX + chartWidth, yPos);
        doc.text(val.toString(), marginX - 5, yPos + 1.5, { align: 'right' });
        doc.text(val.toString(), marginX + chartWidth + 2, yPos + 1.5);
      });

      // Draw Bars
      const barSpacing = chartWidth / stats.length;
      const barWidth = Math.min(barSpacing * 0.7, 15);
      
      stats.forEach((s, i) => {
        const h = Math.min((s.count / maxScale) * chartHeight, chartHeight);
        const x = marginX + (i * barSpacing) + (barSpacing - barWidth) / 2;
        
        // Bar
        doc.setFillColor(16, 185, 129); // Emerald-600 color
        if (h > 0) doc.rect(x, baseY - h, barWidth, h, 'F');
        
        // Label
        doc.setFontSize(6);
        doc.setTextColor(60, 60, 60);
        doc.text(s.label.split(' ')[0], x + barWidth/2, baseY + 5, { align: 'center' });
        if (s.count > 0) {
          doc.setTextColor(0, 0, 0); // Black for numerical values
          doc.setFont('helvetica', 'bold');
          doc.text(s.count.toString(), x + barWidth/2, baseY - h - 2, { align: 'center' });
          doc.setFont('helvetica', 'normal');
        }
      });

      nextY = baseY + 20;
    }

    // Data Table
    autoTable(doc, {
      startY: nextY,
      head: [['MONTHLY PERIOD', 'TOTAL DAYS']],
      body: stats.map(s => [s.label, s.count]),
      foot: [['SUBTOTAL DAYS', totalDaysSum.toString()]],
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 220, 220], // Light ash color
        textColor: [0, 0, 0],       // Black text
        halign: 'center',
        fontStyle: 'bold',
        lineColor: [0, 0, 0],       // Black border
        lineWidth: 0.1
      },
      footStyles: {
        fillColor: [220, 220, 220], // Light ash color
        textColor: [0, 0, 0],       // Black text
        halign: 'center',
        fontStyle: 'bold',
        lineColor: [0, 0, 0],       // Black border
        lineWidth: 0.1
      },
      styles: { 
        fontSize: 10, 
        halign: 'center',
        lineColor: [0, 0, 0],       // All borders black
        lineWidth: 0.1,
        textColor: [0, 0, 0],
        font: 'helvetica'
      },
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

export const generateAttendanceSheet = async (records: DriverAttendance[], start: string, end: string, withSignature: boolean = true) => {
  try {
    const doc = new jsPDF({ orientation: 'p' });
    doc.setFont('helvetica');

    const startDate = parseISO(start);
    const endDate = parseISO(end);
    
    const filtered = records
      .filter(r => {
        const rd = parseISO(r.date);
        return rd >= startDate && rd <= endDate;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // Heading Configuration - Two-line heading
    const mainHeading = "ATTENDANCE SHEET (CIVIL MICROBUS DRIVER)";
    // Full month names (MMMM)
    const rangeText = `${format(startDate, 'dd MMMM yyyy')} TO ${format(endDate, 'dd MMMM yyyy')}`.toUpperCase();

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11); 
    doc.setFont('helvetica', 'bold');
    
    // Line 1: Main Title
    doc.text(mainHeading, 105, 12, { align: 'center' });
    let headingWidth = doc.getTextWidth(mainHeading);
    doc.setLineWidth(0.5);
    doc.line(105 - (headingWidth / 2), 14, 105 + (headingWidth / 2), 14);

    // Line 2: Date Range
    doc.text(rangeText, 105, 20, { align: 'center' });
    headingWidth = doc.getTextWidth(rangeText);
    doc.line(105 - (headingWidth / 2), 22, 105 + (headingWidth / 2), 22);

    // Table Headers - With Newline for (TO CANTONMENT)
    const headers = [['DATE', 'DAY', 'IN TIME', 'OUT TIME', 'LAST DAY MICROBUS ENTRY TIME\n(TO CANTONMENT)', 'REMARKS']];

    autoTable(doc, {
      startY: 28, 
      head: headers,
      body: filtered.map((r) => {
        const dateObj = parseISO(r.date);
        const baseData = [
          format(dateObj, 'dd MMM yy').toUpperCase(),
          format(dateObj, 'EEEE').toUpperCase()
        ];
        
        let dynamicColumns;
        if (r.isHoliday) {
          dynamicColumns = [
            { content: 'HOLIDAY', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: [250, 250, 250] } },
            r.lastDayCompletionTime || '-'
          ];
        } else {
          dynamicColumns = [
            r.inTime || '-',
            r.outTime || '-',
            r.lastDayCompletionTime || '-'
          ];
        }

        // Remarks logic: If isDutyDay is true, put "DUTY" in remarks column
        const finalRemarks = r.isDutyDay ? 'DUTY' : (r.remarks || '');

        return [...baseData, ...dynamicColumns, finalRemarks];
      }),
      theme: 'grid',
      headStyles: { 
        fillColor: [220, 220, 220], 
        textColor: [0, 0, 0], 
        fontSize: 6.5, 
        fontStyle: 'bold',
        halign: 'center',
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        valign: 'middle'
      },
      styles: { 
        font: 'helvetica',
        fontSize: 7, 
        cellPadding: 0.8, 
        lineColor: [0, 0, 0], 
        lineWidth: 0.1, 
        halign: 'center', 
        textColor: [0, 0, 0],
        valign: 'middle',
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 26 }, // Date
        1: { cellWidth: 28 }, // Day
        2: { cellWidth: 20 }, // In Time
        3: { cellWidth: 20 }, // Out Time
        4: { cellWidth: 62 }, // Last Day Entry (TO CANTONMENT)
        5: { cellWidth: 34 }  // Remarks
      },
      margin: { left: 10, right: 10 }
    });

    if (withSignature) {
      const finalY = (doc as any).lastAutoTable?.finalY || 150;
      const pageWidth = doc.internal.pageSize.getWidth();
      
      const sigY = Math.min(finalY + 12, 275);

      doc.setFontSize(9); 
      doc.setFont('helvetica', 'bold');
      
      // Driver signature line (Left)
      doc.line(10, sigY, 55, sigY);
      doc.text("Driver", 32.5, sigY + 4, { align: 'center' });

      // JCO/NCO signature line (Right)
      doc.line(pageWidth - 55, sigY, pageWidth - 10, sigY);
      doc.text("JCO/NCO", pageWidth - 32.5, sigY + 4, { align: 'center' });

      // Countersign (Center)
      const countersignY = sigY + 14;
      const csText = "COUNTERSIGN";
      doc.text(csText, pageWidth / 2, countersignY, { align: 'center' });
      const csWidth = doc.getTextWidth(csText);
      doc.line(pageWidth / 2 - csWidth / 2, countersignY + 1, pageWidth / 2 + csWidth / 2, countersignY + 1);
    }

    drawDeveloperFooter(doc, 285);
    doc.save(`Attendance_Sheet_${format(startDate, 'MMM_yyyy')}.pdf`);
  } catch (error) {
    console.error("Attendance PDF generation failed:", error);
    alert("Error generating attendance PDF.");
  }
};

export const generateFuelReport = async (bookings: Booking[], startDate: string, endDate: string, withSignature: boolean = true) => {
  try {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFont('helvetica');

    const sDate = parseISO(startDate);
    const eDate = parseISO(endDate);
    const filtered = filterByRange(bookings, startDate, endDate);

    const mainHeading = "FUEL PURCHASE REPORT - CIVIL MICROBUS";
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
    let serial = 1;

    filtered.forEach((b) => {
      const days = differenceInDays(parseISO(b.endDate), parseISO(b.startDate)) + 1;
      const numPurchases = (b.fuelPurchases && b.fuelPurchases.length > 0) ? b.fuelPurchases.length : 1;

      if (b.fuelPurchases && b.fuelPurchases.length > 0) {
        b.fuelPurchases.forEach((p, pIdx) => {
          if (pIdx === 0) {
            // First row for this booking contains common info with rowSpan for merging
            tableBody.push([
              { content: serial++, rowSpan: numPurchases, styles: { valign: 'top', halign: 'center' } },
              { content: (b.rankName || '').toUpperCase(), rowSpan: numPurchases, styles: { valign: 'top', halign: 'left' } },
              { content: format(parseISO(b.startDate), DATE_FORMAT), rowSpan: numPurchases, styles: { valign: 'top', halign: 'center' } },
              { content: format(parseISO(b.endDate), DATE_FORMAT), rowSpan: numPurchases, styles: { valign: 'top', halign: 'center' } },
              { content: days, rowSpan: numPurchases, styles: { valign: 'top', halign: 'center' } },
              { content: (b.destination || '-').toUpperCase(), rowSpan: numPurchases, styles: { valign: 'top', halign: 'center' } },
              { content: b.kmStart ?? '-', rowSpan: numPurchases, styles: { valign: 'top', halign: 'center' } },
              { content: b.kmEnd ?? '-', rowSpan: numPurchases, styles: { valign: 'top', halign: 'center' } },
              { content: b.totalKm ?? '-', rowSpan: numPurchases, styles: { valign: 'top', halign: 'center' } },
              p.purchasedFuel ?? '-',
              p.fuelRate ?? '-',
              p.totalFuelPrice ? p.totalFuelPrice.toLocaleString() : '-',
              { content: b.remarks || '-', rowSpan: numPurchases, styles: { valign: 'top', halign: 'center' } }
            ]);
          } else {
            // Subsequent rows for the same booking
            tableBody.push([
              p.purchasedFuel ?? '-',
              p.fuelRate ?? '-',
              p.totalFuelPrice ? p.totalFuelPrice.toLocaleString() : '-'
            ]);
          }
        });
      } else {
        // Single row base entry
        tableBody.push([
          serial++,
          (b.rankName || '').toUpperCase(),
          format(parseISO(b.startDate), DATE_FORMAT),
          format(parseISO(b.endDate), DATE_FORMAT),
          days,
          (b.destination || '-').toUpperCase(),
          b.kmStart ?? '-',
          b.kmEnd ?? '-',
          b.totalKm ?? '-',
          '-', '-', '-',
          b.remarks || '-'
        ]);
      }
    });

    autoTable(doc, {
      startY: 28,
      head: [
        [
          { content: 'SER', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'NAME AND RANK', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'BOOKING DATE', colSpan: 2, styles: { halign: 'center' } },
          { content: 'DAYS', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'DESTINATION', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'KILOMETERS', colSpan: 2, styles: { halign: 'center' } },
          { content: 'TOTAL KILOMETRES', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'PURCHASED FUEL', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'RATE', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'TOTAL TAKA', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
          { content: 'REMARKS', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } }
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
      headStyles: { 
        fillColor: [220, 220, 220], 
        textColor: [0, 0, 0], 
        fontSize: 7.5, 
        fontStyle: 'bold',
        halign: 'center',
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        valign: 'middle'
      },
      styles: { 
        font: 'helvetica',
        fontSize: 8, 
        cellPadding: 1, 
        lineColor: [0, 0, 0], 
        lineWidth: 0.1, 
        halign: 'center', 
        textColor: [0, 0, 0],
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 41, halign: 'left' },
        2: { cellWidth: 22 },
        3: { cellWidth: 22 },
        4: { cellWidth: 12 },
        5: { cellWidth: 25, halign: 'center' },
        6: { cellWidth: 18 },
        7: { cellWidth: 18 },
        8: { cellWidth: 22 },
        9: { cellWidth: 22 },
        10: { cellWidth: 15 },
        11: { cellWidth: 20 },
        12: { cellWidth: 30 }
      },
      margin: { left: 10, right: 10 }
    });

    if (withSignature) {
      const finalY = (doc as any).lastAutoTable?.finalY || 150;
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Position signatures significantly below the table
      const sigY = Math.min(finalY + 15, 180); 

      doc.setFontSize(9); 
      doc.setFont('helvetica', 'bold');
      
      // Driver signature line (Left)
      doc.line(20, sigY, 70, sigY);
      doc.text("Driver", 45, sigY + 4, { align: 'center' });

      // JCO/NCO signature line (Right)
      doc.line(pageWidth - 70, sigY, pageWidth - 20, sigY);
      doc.text("JCO/NCO", pageWidth - 45, sigY + 4, { align: 'center' });

      // Countersign (Center)
      const countersignY = sigY + 12;
      const csText = "COUNTERSIGN";
      doc.text(csText, pageWidth / 2, countersignY, { align: 'center' });
      const csWidth = doc.getTextWidth(csText);
      doc.line(pageWidth / 2 - csWidth / 2, countersignY + 1, pageWidth / 2 + csWidth / 2, countersignY + 1);
    }

    drawDeveloperFooter(doc, 200);
    doc.save(`Fuel_Report_${format(sDate, 'MMM_yyyy')}.pdf`);
  } catch (error) {
    console.error("Fuel PDF generation failed:", error);
    alert("Error generating fuel report PDF.");
  }
};