
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
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  return days.map(day => {
    const dayBookings = bookings.filter(booking => {
      const start = parseISO(booking.startDate);
      const end = parseISO(booking.endDate);
      return isWithinInterval(day, { start, end });
    });

    return {
      date: day,
      isCurrentMonth: day.getMonth() === monthStart.getMonth(),
      bookings: dayBookings
    };
  });
};

export const isBookingStart = (day: Date, booking: Booking): boolean => {
  return isSameDay(day, parseISO(booking.startDate));
};

export const isBookingEnd = (day: Date, booking: Booking): boolean => {
  return isSameDay(day, parseISO(booking.endDate));
};

export const formatDate = (date: Date | string): string => {
  if (!date) return 'N/A';
  if (typeof date === 'string') return format(parseISO(date), 'dd-MM-yyyy');
  return format(date, 'dd-MM-yyyy');
};
