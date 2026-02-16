
export type DurationType = 'Full Day' | 'Half Day';
export type FareStatusType = 'Paid' | 'Unpaid';
export type GarrisonStatusType = 'In Garrison' | 'Out Garrison';
export type UserRole = 'viewer' | 'admin' | 'master';

export interface DriverInfo {
  name: string;
  phone: string;
  isActive: boolean;
}

export interface AppSettings {
  security: {
    adminPin: string;
    masterPin: string;
    maintenanceMode: boolean;
    maintenanceMessage?: string;
    autoLockTimer: number; // In minutes
    maskPinInput: boolean;
  };
  fares: {
    inGarrisonFull: number;
    inGarrisonHalf: number;
    outGarrisonFull: number;
    outGarrisonHalf: number;
    currencySymbol: string;
    taxRate: number; // Percentage
    currencyPosition: 'prefix' | 'suffix';
  };
  branding: {
    title: string;
    subtitle: string;
    footerText: string;
    footerPhone: string;
    footerLines: string[]; // New: Dynamic list of footer lines
    systemVersion: string;
    pdfSignatureLabel1?: string;
    pdfSignatureLabel2?: string;
  };
  ui: {
    watermarkOpacity: number;
    gridOpacity: number;
    themeColor: string;
    bgColor: string;
    glassIntensity: number; // 0 to 1
    borderRadius: number; // in px
  };
  logistics: {
    drivers: string[]; // Keep for compatibility
    driverDetails?: DriverInfo[];
    units?: string[];
    weeklyHolidays: string[];
    defaultInTime?: string;
    defaultOutTime?: string;
    maxBookingDays: number;
  };
}

export interface FuelPurchase {
  id: string;
  purchasedFuel?: number;
  fuelRate?: number;
  totalFuelPrice?: number;
}

export interface Booking {
  id: string;
  rankName: string;
  unit: string;
  mobileNumber?: string;
  garrisonStatus: GarrisonStatusType;
  startDate: string; // ISO format
  endDate: string; // ISO format
  duration: DurationType;
  destination: string;
  fare: number;
  fareStatus: FareStatusType;
  inTime?: string;
  outTime?: string;
  remarks?: string;
  isExempt?: boolean;
  isSpecialNote?: boolean;
  isFuelEntry?: boolean;
  kmStart?: number;
  kmEnd?: number;
  totalKm?: number;
  fuelPurchases?: FuelPurchase[];
  purchasedFuel?: number;
  fuelRate?: number;
  totalFuelPrice?: number;
}

export interface DriverAttendance {
  id?: string;
  date: string;
  driverName: string;
  inTime?: string;
  outTime?: string;
  isHoliday: boolean;
  isOfficeDay?: boolean;
  isDutyDay?: boolean;
  lastDayCompletionTime?: string;
  remarks?: string;
}

export type BookingField = keyof Booking | 'totalDays';

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  bookings: Booking[];
}

export interface HandoffInfo {
  providerArmyNo: string;
  providerRank: string;
  providerName: string;
  receiverArmyNo: string;
  receiverRank: string;
  receiverName: string;
}
