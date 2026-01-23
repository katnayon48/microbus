export type DurationType = 'Full Day' | 'Half Day';
export type FareStatusType = 'Paid' | 'Unpaid';
export type GarrisonStatusType = 'In Garrison' | 'Out Garrison';

export interface Booking {
  id: string;
  rankName: string;
  unit: string;
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