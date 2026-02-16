import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameDay, 
  isWithinInterval,
  parseISO
} from 'date-fns';
import { Booking, CalendarDay } from '../types';

export const getCalendarDays = (currentDate: Date, bookings: Booking[]): CalendarDay[] => {
  if (!currentDate) currentDate = new Date();
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return days.map(day => {
    const dayBookings = (bookings || []).filter(booking => {
      if (!booking.startDate || !booking.endDate) return false;
      try {
        const start = parseISO(booking.startDate);
        const end = parseISO(booking.endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
        return isWithinInterval(day, { start, end });
      } catch (e) {
        return false;
      }
    });

    return {
      date: day,
      isCurrentMonth: day.getMonth() === monthStart.getMonth(),
      bookings: dayBookings
    };
  });
};

export const isBookingStart = (day: Date, booking: Booking): boolean => {
  if (!booking.startDate) return false;
  return isSameDay(day, parseISO(booking.startDate));
};

export const isBookingEnd = (day: Date, booking: Booking): boolean => {
  if (!booking.endDate) return false;
  return isSameDay(day, parseISO(booking.endDate));
};

export const formatDate = (date: Date | string): string => {
  if (!date) return 'N/A';
  try {
    if (typeof date === 'string') {
      const parsed = parseISO(date);
      return isNaN(parsed.getTime()) ? 'N/A' : format(parsed, 'dd-MM-yyyy');
    }
    return format(date, 'dd-MM-yyyy');
  } catch (e) {
    return 'N/A';
  }
};