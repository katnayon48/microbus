
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, ChevronDown, CalendarDays, LogIn, FileText } from 'lucide-react';
import { format, addMonths, subMonths, isToday, startOfYear, addYears, subYears, setMonth, setYear } from 'date-fns';
import { getCalendarDays } from '../utils/dateUtils';
import { Booking } from '../types';
import Modal from './Modal';

interface CalendarProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  bookings: Booking[];
  isAdmin: boolean;
  onDateClick: (date: Date, existing?: Booking) => void;
  onDateDoubleClick?: (date: Date) => void;
  onLoginClick?: () => void;
  onReportClick?: () => void;
}

const Calendar: React.FC<CalendarProps> = ({ 
  currentDate, 
  setCurrentDate, 
  bookings, 
  isAdmin, 
  onDateClick,
  onDateDoubleClick,
  onLoginClick,
  onReportClick
}) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());

  const days = getCalendarDays(currentDate, bookings);
  const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Touch swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum distance required for a swipe action
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (isRightSwipe) {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setYear(setMonth(new Date(currentDate), monthIndex), pickerYear);
    setCurrentDate(newDate);
    setIsDatePickerOpen(false);
  };

  // Helper to split Rank and Name for two-line display with both bold
  const renderBookingContent = (booking: Booking) => {
    if (booking.isSpecialNote) {
      return (
        <div className="flex items-center justify-center w-full px-1">
          <span className="block font-black text-center break-words leading-[1.2]">
            {booking.remarks || 'SPECIAL NOTE'}
          </span>
        </div>
      );
    }

    const fullName = booking.rankName || '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return <span className="block font-black">{fullName}</span>;
    
    const name = parts.pop();
    const rank = parts.join(' ');
    
    return (
      <div className="flex flex-col items-center justify-center w-full">
        <span className="block font-black mb-0.5">{rank}</span>
        <span className="block font-black">{name}</span>
      </div>
    );
  };

  return (
    <div 
      className="flex flex-col h-full bg-white relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Calendar Navigation Header - Updated to 3-column layout */}
      <div className="grid grid-cols-3 items-center px-3 md:px-6 py-1.5 md:py-2 border-b border-slate-200 bg-slate-50/50 shrink-0 gap-1 md:gap-2">
        
        {/* Left Section: Title */}
        <div className="flex items-center gap-1 md:gap-4 overflow-hidden">
          <div className="w-6 h-6 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
            <CalendarIcon size={12} className="md:w-5 md:h-5" />
          </div>
          
          <div className="relative flex items-center">
            <button 
              onClick={() => {
                setPickerYear(currentDate.getFullYear());
                setIsDatePickerOpen(true);
              }}
              className="flex items-center gap-0.5 md:gap-2 px-1 py-1 rounded-lg hover:bg-slate-200/60 transition-all active:scale-95 group"
            >
              <h2 className="text-[10px] md:text-2xl font-black text-slate-900 tracking-tight uppercase whitespace-nowrap">
                {format(currentDate, 'MMM yyyy')}
              </h2>
              <ChevronDown size={10} className="text-slate-400 group-hover:text-indigo-600 transition-colors md:w-5 md:h-5" />
            </button>
          </div>
        </div>
        
        {/* Center Section: Controls */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-0.5 md:gap-2 bg-white p-0.5 md:p-1 rounded-lg md:rounded-xl border border-slate-200 shadow-sm shrink-0">
            <button 
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-1 md:p-2 hover:bg-slate-50 transition-all rounded-lg text-slate-400 hover:text-indigo-600 active:scale-90"
            >
              <ChevronLeft size={14} md:size={24} strokeWidth={2.5} />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-6 md:px-20 py-1 md:py-2 text-[8px] md:text-xs font-black text-slate-500 hover:text-indigo-600 transition-all uppercase tracking-wider"
            >
              Today
            </button>
            <button 
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-1 md:p-2 hover:bg-slate-50 transition-all rounded-lg text-slate-400 hover:text-indigo-600 active:scale-90"
            >
              <ChevronRight size={14} md:size={24} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Right Section: Login or Report Manager Button */}
        <div className="flex justify-end items-center gap-2">
          {!isAdmin && onLoginClick && (
            <button 
              onClick={onLoginClick}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2.5 bg-slate-900 text-white rounded-lg md:rounded-xl text-[7px] md:text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 shadow-md active:scale-95 transition-all whitespace-nowrap"
            >
              <LogIn size={10} className="md:w-4 md:h-4 shrink-0" />
              <span>Login</span>
            </button>
          )}
          {isAdmin && onReportClick && (
            <button 
              onClick={onReportClick}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2.5 bg-black text-white rounded-lg md:rounded-xl text-[7px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-md active:scale-95 transition-all whitespace-nowrap"
            >
              <FileText size={10} className="md:w-4 md:h-4 shrink-0" />
              <span className="md:hidden">REPORT</span>
              <span className="hidden md:inline">GENERATE REPORT</span>
            </button>
          )}
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/30 shrink-0">
        {weekDays.map(day => (
          <div key={day} className="py-1 md:py-2 text-center text-[8px] md:text-[10px] font-black text-black uppercase tracking-[0.1em] md:tracking-[0.2em] border-r border-slate-200 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 relative overflow-hidden bg-slate-50 min-h-0">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.12]">
          <img 
            src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" 
            alt="Watermark" 
            className="w-[220px] md:w-[380px] object-contain mix-blend-multiply" 
          />
        </div>

        <div className="absolute inset-0 grid grid-cols-7 auto-rows-fr border-t border-l border-slate-300">
          {days.map((day, idx) => {
            const isTodayDate = isToday(day.date);
            
            return (
              <div 
                key={idx}
                onClick={() => onDateClick(day.date)}
                onDoubleClick={() => onDateDoubleClick?.(day.date)}
                className={`flex flex-col transition-all relative group z-10 border-r border-b border-slate-300 min-h-0
                  ${day.isCurrentMonth ? 'bg-white/60' : 'bg-slate-200/40 opacity-40'}
                  ${isAdmin ? 'cursor-pointer hover:bg-indigo-50/40' : day.bookings.length > 0 ? 'cursor-pointer hover:bg-slate-50/50' : 'cursor-default'}
                `}
              >
                <div className="flex justify-between items-start p-0.5 md:p-1.5 mb-0 shrink-0">
                  <span className={`
                    text-[9px] md:text-sm font-black w-4 h-4 md:w-8 md:h-8 flex items-center justify-center rounded md:rounded-xl transition-all
                    ${isTodayDate 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                      : day.isCurrentMonth ? 'text-slate-800' : 'text-slate-400'}
                  `}>
                    {format(day.date, 'd')}
                  </span>
                  
                  {isAdmin && day.isCurrentMonth && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDateClick(day.date); }}
                      className="opacity-0 group-hover:opacity-100 transition-all p-0.5 text-indigo-500 hover:bg-indigo-100 rounded"
                    >
                       <Plus size={12} md:size={16} strokeWidth={3} />
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-1 overflow-hidden flex-1 px-0.5 md:px-1 pb-1 justify-center">
                  {day.bookings.slice(0, 2).map(booking => {
                    const isUnpaid = booking.fareStatus === 'Unpaid';
                    const isSpecial = booking.isSpecialNote;
                    
                    return (
                      <div 
                        key={booking.id}
                        onClick={(e) => { e.stopPropagation(); onDateClick(day.date, booking); }}
                        className={`
                          relative px-1 py-1 md:py-2 min-h-[30px] md:min-h-[44px] flex items-center justify-center
                          transition-all duration-200 select-none border-y border-transparent
                          rounded-md md:rounded-lg shadow-md overflow-hidden
                          ${isSpecial 
                            ? 'bg-amber-500 text-white hover:brightness-110' 
                            : isUnpaid 
                              ? 'bg-rose-600 text-white hover:brightness-110' 
                              : 'bg-emerald-600 text-white hover:brightness-110'}
                          cursor-pointer z-20 border border-white/20
                        `}
                      >
                        <div className="text-[10px] md:text-[11px] font-black uppercase tracking-tight leading-[1.2] text-center w-full">
                          {renderBookingContent(booking)}
                        </div>
                      </div>
                    );
                  })}
                  {day.bookings.length > 2 && (
                    <div className="px-1 py-0.5 flex items-center justify-center bg-slate-200/80 rounded-md border border-slate-300">
                      <span className="text-[7px] md:text-[9px] font-black text-slate-700 uppercase">+{day.bookings.length - 2} More</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Professional Date Picker Modal */}
      <Modal 
        isOpen={isDatePickerOpen} 
        onClose={() => setIsDatePickerOpen(false)} 
        title="Jump to Schedule"
      >
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between bg-slate-100 p-2 rounded-2xl border border-slate-200">
            <button 
              onClick={() => setPickerYear(y => y - 1)}
              className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-xl transition-all text-slate-500 hover:text-indigo-600 shadow-sm hover:shadow active:scale-90"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Select Year</span>
              <span className="text-2xl font-black text-slate-900 tabular-nums">{pickerYear}</span>
            </div>
            <button 
              onClick={() => setPickerYear(y => y + 1)}
              className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-xl transition-all text-slate-500 hover:text-indigo-600 shadow-sm hover:shadow active:scale-90"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {months.map((month, idx) => {
              const isCurrentSelected = currentDate.getMonth() === idx && currentDate.getFullYear() === pickerYear;
              return (
                <button
                  key={month}
                  onClick={() => handleMonthSelect(idx)}
                  className={`
                    py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border
                    ${isCurrentSelected 
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-100 scale-105 z-10' 
                      : 'bg-white text-slate-600 border-slate-100 hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/30'}
                  `}
                >
                  {month.substring(0, 3)}
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-center">
             <button 
                onClick={() => {
                  setCurrentDate(new Date());
                  setIsDatePickerOpen(false);
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-600 transition-all active:scale-95"
             >
               <CalendarDays size={14} /> Back to Today
             </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Calendar;
