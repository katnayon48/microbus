
import { AppSettings } from './types';

export const DEFAULT_SETTINGS: AppSettings = {
  security: {
    adminPin: "4856",
    masterPin: "0560",
    maintenanceMode: false,
    maintenanceMessage: "System is currently being updated.",
    autoLockTimer: 15,
    maskPinInput: true,
  },
  fares: {
    inGarrisonFull: 1200,
    inGarrisonHalf: 800,
    outGarrisonFull: 1500,
    outGarrisonHalf: 1000,
    currencySymbol: "৳",
    taxRate: 0,
    currencyPosition: 'prefix',
  },
  branding: {
    title: "MICROBUS SCHEDULE",
    subtitle: "AREA HQ BARISHAL",
    footerText: "DEVELOPED BY CPL (CLK) BILLAL, ASC",
    footerPhone: "01783413333",
    footerLines: [
      "DEVELOPED BY CPL (CLK) BILLAL, ASC",
      "SUPPORT: 01783413333",
      "SYSTEM VERSION: v4.2.0-PRO"
    ],
    systemVersion: "v4.2.0-PRO",
    pdfSignatureLabel1: "Driver",
    pdfSignatureLabel2: "JCO/NCO",
  },
  ui: {
    watermarkOpacity: 0.12,
    gridOpacity: 0.05,
    themeColor: "#10b981", 
    bgColor: "#062c1e",
    glassIntensity: 0.3,
    borderRadius: 16,
  },
  logistics: {
    drivers: ["NAZRUL", "REZAUL", "KABIR"],
    driverDetails: [
      { name: "NAZRUL", phone: "01700000000", isActive: true },
      { name: "REZAUL", phone: "01711111111", isActive: true },
      { name: "KABIR", phone: "01722222222", isActive: true }
    ],
    units: ["HQ BARISHAL", "STAFF COLLEGE", "MH BARISHAL", "S&T BN"],
    weeklyHolidays: ["Friday"],
    defaultInTime: "08:00",
    defaultOutTime: "17:00",
    maxBookingDays: 31,
  }
};

export const BOOKING_FIELDS: { label: string; value: string }[] = [
  { label: 'Rank and Name', value: 'rankName' },
  { label: 'Unit', value: 'unit' },
  { label: 'Mobile Number', value: 'mobileNumber' },
  { label: 'Garrison Status', value: 'garrisonStatus' },
  { label: 'From', value: 'startDate' },
  { label: 'To', value: 'endDate' },
  { label: 'Total Days', value: 'totalDays' },
  { label: 'Duration', value: 'duration' },
  { label: 'Destination', value: 'destination' },
  { label: 'Fare', value: 'fare' },
  { label: 'Fare Status', value: 'fareStatus' },
  { label: 'Out Time', value: 'outTime' },
  { label: 'In Time', value: 'inTime' },
  { label: 'Kilometres Start', value: 'kmStart' },
  { label: 'Kilometres End', value: 'kmEnd' },
  { label: 'Total Kilometres', value: 'totalKm' },
  { label: 'Purchased Fuel', value: 'purchasedFuel' },
  { label: 'Rate', value: 'fuelRate' },
  { label: 'Total Taka', value: 'totalFuelPrice' },
];
