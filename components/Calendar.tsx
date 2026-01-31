
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, ChevronDown, CalendarDays, LogIn, FileText, BarChart3 } from 'lucide-react';
import { format, addMonths, subMonths, isToday, setMonth, setYear } from 'date-fns';
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
  onStatsClick?: () => void;
  isAppLoading?: boolean; 
}

const Calendar: React.FC<CalendarProps> = ({ 
  currentDate, 
  setCurrentDate, 
  bookings, 
  isAdmin, 
  onDateClick,
  onDateDoubleClick,
  onLoginClick,
  onReportClick,
  onStatsClick,
  isAppLoading = false
}) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());

  const days = getCalendarDays(currentDate, bookings);
  const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
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

  const renderBookingContent = (booking: Booking) => {
    const fontSizeClasses = "text-[8px] md:text-[10px] font-black uppercase";

    if (booking.isSpecialNote) {
      return (
        <div className="flex items-center justify-center w-full px-1">
          <span className={`block text-center break-words leading-[1.1] ${fontSizeClasses}`}>
            {booking.remarks || 'SPECIAL NOTE'}
          </span>
        </div>
      );
    }

    const fullName = (booking.rankName || '').trim();
    const parts = fullName.split(/\s+/);
    
    let rank = '';
    let nameString = '';

    // Smart split for military/common ranks
    if (parts.length >= 2) {
      const first = parts[0].toUpperCase();
      const second = parts[1].toUpperCase();
      
      // Detect 2-word ranks (LT COL, MAJ GEN, BRIG GEN, LT GEN, SUB MAJ)
      if ((first === 'LT' || first === 'MAJ' || first === 'BRIG' || first === 'SUB') && 
          (second === 'COL' || second === 'GEN' || second === 'MAJ' || second === 'CDR')) {
        rank = parts.slice(0, 2).join(' ');
        nameString = parts.slice(2).join(' ');
      } else {
        rank = parts[0];
        nameString = parts.slice(1).join(' ');
      }
    } else {
      nameString = fullName;
    }

    // Fallback if split results in empty name
    if (!nameString && rank) {
      nameString = rank;
      rank = '';
    }

    const nameParts = nameString.split(/\s+/).filter(p => p.length > 0);
    
    return (
      <div className="flex flex-col items-center justify-center w-full overflow-hidden px-0.5">
        {rank && (
          <span className={`block leading-none mb-0.5 truncate w-full text-center ${fontSizeClasses}`}>
            {rank}
          </span>
        )}
        <div className="flex flex-col items-center w-full">
          {nameParts.slice(0, 2).map((word, idx) => (
            <span key={idx} className={`block leading-tight break-all text-center w-full ${fontSizeClasses}`}>
              {word}
            </span>
          ))}
          {nameParts.length > 2 && (
             <span className={`block leading-tight truncate text-center w-full ${fontSizeClasses}`}>
               ...
             </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div 
      className="flex flex-col h-full bg-[#062c1e] relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="grid grid-cols-3 items-center px-2 md:px-6 py-1.5 md:py-2 border-b border-white/10 bg-black/40 shrink-0 gap-1">
        <div className="flex items-center gap-1 md:gap-4 overflow-hidden shrink-0">
          <div className="hidden sm:flex w-6 h-6 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-emerald-600 items-center justify-center text-white shadow-lg shadow-emerald-900/20 shrink-0">
            <CalendarIcon size={12} className="md:w-5 md:h-5" />
          </div>
          <div className="relative flex items-center shrink-0">
            <button 
              onClick={() => {
                setPickerYear(currentDate.getFullYear());
                setIsDatePickerOpen(true);
              }}
              className="flex items-center gap-0.5 md:gap-2 px-1 py-1 rounded-lg hover:bg-white/10 transition-all active:scale-95 group"
            >
              <h2 className="text-[10px] md:text-2xl font-black text-white tracking-tight uppercase whitespace-nowrap">
                {format(currentDate, 'MMM yyyy')}
              </h2>
              <ChevronDown size={10} className="text-emerald-400 group-hover:text-emerald-300 transition-colors md:w-5 md:h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-center min-w-0">
          <div className="flex items-center gap-0.5 md:gap-2 bg-white/5 p-0.5 md:p-1 rounded-lg md:rounded-xl border border-white/10 shadow-sm shrink-0">
            <button 
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-1 md:p-2 hover:bg-white/10 transition-all rounded-lg text-slate-400 hover:text-emerald-400 active:scale-90"
            >
              <ChevronLeft size={14} md:size={24} strokeWidth={2.5} />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-3 md:px-20 py-1 md:py-2 text-[8px] md:text-xs font-black text-slate-300 hover:text-emerald-400 transition-all uppercase tracking-wider"
            >
              Today
            </button>
            <button 
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-1 md:p-2 hover:bg-white/10 transition-all rounded-lg text-slate-400 hover:text-emerald-400 active:scale-90"
            >
              <ChevronRight size={14} md:size={24} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="flex justify-end items-center gap-1 md:gap-2 shrink-0">
          {!isAdmin && (
            <button 
              onClick={onStatsClick}
              className="flex items-center justify-center px-2 md:px-4 py-1 md:py-2.5 bg-black text-white rounded-lg md:rounded-xl hover:bg-black/80 transition-all active:scale-[0.97] relative overflow-hidden group border border-white/20 shadow-lg shrink-0"
              title="View Statistics"
            >
              <span className="text-[7px] md:text-[10px] font-black uppercase tracking-widest relative z-10">STATE</span>
            </button>
          )}
          {!isAdmin && onLoginClick && (
            <button 
              onClick={onLoginClick}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2.5 bg-emerald-600 text-white rounded-lg md:rounded-xl text-[7px] md:text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 shadow-md active:scale-95 transition-all whitespace-nowrap shrink-0"
            >
              <LogIn size={10} className="md:w-4 md:h-4 shrink-0" />
              <span>Login</span>
            </button>
          )}
          {isAdmin && onReportClick && (
            <button 
              onClick={onReportClick}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2.5 bg-white text-emerald-900 rounded-lg md:rounded-xl text-[7px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 shadow-md active:scale-95 transition-all whitespace-nowrap shrink-0"
            >
              <FileText size={10} className="md:w-4 md:h-4 shrink-0" />
              <span className="md:hidden">REPORT</span>
              <span className="hidden md:inline">GENERATE REPORT</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-white/5 bg-black/40 shrink-0">
        {weekDays.map(day => (
          <div key={day} className="py-1 md:py-2 text-center text-[8px] md:text-[10px] font-black text-white uppercase tracking-[0.1em] md:tracking-[0.2em] border-r border-white/5 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      <div className="flex-1 relative overflow-hidden bg-[#062c1e] min-h-0">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <img src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" alt="Watermark" className="w-[220px] md:w-[380px] h-[220px] md:h-[380px] object-cover rounded-full opacity-[0.05]" />
        </div>
        <div className="absolute inset-0 grid grid-cols-7 auto-rows-fr border-t border-l border-white/5 shadow-[inset_0_0_120px_rgba(0,0,0,0.9)]">
          {days.map((day, idx) => {
            const isTodayDate = isToday(day.date);
            return (
              <div 
                key={idx}
                onClick={() => onDateClick(day.date)}
                onDoubleClick={() => onDateDoubleClick?.(day.date)}
                className={`flex flex-col transition-all relative group z-10 border-r border-b border-white/5 min-h-0
                  ${day.isCurrentMonth ? 'bg-white/[0.02]' : 'bg-black/60 opacity-20'}
                  ${isAdmin ? 'cursor-pointer hover:bg-white/5' : day.bookings.length > 0 ? 'cursor-pointer hover:bg-white/[0.04]' : 'cursor-default'}
                  ${isTodayDate ? 'today-glow bg-emerald-950/40 shadow-[inset_0_0_20px_rgba(212,175,55,0.1)]' : ''}
                `}
              >
                <div className="flex justify-between items-start p-0.5 md:p-1.5 mb-0 shrink-0 relative z-20">
                  <span className={`text-[9px] md:text-sm font-black w-4 h-4 md:w-8 md:h-8 flex items-center justify-center rounded md:rounded-xl transition-all
                    ${isTodayDate ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50 ring-2 ring-emerald-400/20' : day.isCurrentMonth ? 'text-slate-100' : 'text-slate-500'}`}>
                    {format(day.date, 'd')}
                  </span>
                  {isAdmin && day.isCurrentMonth && (
                    <button onClick={(e) => { e.stopPropagation(); onDateClick(day.date); }} className="opacity-0 group-hover:opacity-100 transition-all p-0.5 text-emerald-400 hover:bg-white/10 rounded">
                       <Plus size={12} md:size={16} strokeWidth={3} />
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-1 overflow-hidden flex-1 px-0.5 md:px-1 pb-1 justify-center relative z-20">
                  {day.bookings.slice(0, 2).map(booking => {
                    const isUnpaid = booking.fareStatus === 'Unpaid';
                    const isSpecial = booking.isSpecialNote;
                    return (
                      <div key={booking.id} onClick={(e) => { e.stopPropagation(); onDateClick(day.date, booking); }}
                        className={`relative px-0.5 py-1 md:py-2 min-h-[30px] md:min-h-[44px] flex items-center justify-center select-none border-y border-transparent rounded-md md:rounded-lg shadow-md overflow-hidden cursor-pointer z-20 border border-white/20 transition-opacity duration-300
                          ${!isAppLoading ? 'animate-booking-pop' : 'opacity-0'}
                          ${isSpecial ? 'bg-amber-500 text-white hover:brightness-110 shadow-[0_2px_10px_rgba(245,158,11,0.3)]' : isUnpaid ? 'bg-rose-600 text-white hover:brightness-110 shadow-[0_2px_10px_rgba(225,29,72,0.3)]' : 'bg-emerald-600 text-white hover:brightness-110 shadow-[0_2px_10px_rgba(16,185,129,0.3)]'}`}>
                        <div className="w-full">
                          {renderBookingContent(booking)}
                        </div>
                      </div>
                    );
                  })}
                  {day.bookings.length > 2 && (
                    <div className={`px-1 py-0.5 flex items-center justify-center bg-white/5 rounded-md border border-white/10 transition-opacity duration-300 ${!isAppLoading ? 'animate-booking-pop' : 'opacity-0'}`}>
                      <span className="text-[7px] md:text-[9px] font-black text-slate-400 uppercase">+{day.bookings.length - 2} More</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Modal isOpen={isDatePickerOpen} onClose={() => setIsDatePickerOpen(false)} title="Jump to Schedule">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between bg-slate-100 p-2 rounded-2xl border border-slate-200">
            <button onClick={() => setPickerYear(y => y - 1)} className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-xl transition-all text-slate-500 hover:text-emerald-600 shadow-sm hover:shadow active:scale-90"><ChevronLeft size={20} /></button>
            <div className="flex flex-col items-center"><span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Select Year</span><span className="text-2xl font-black text-slate-900 tabular-nums">{pickerYear}</span></div>
            <button onClick={() => setPickerYear(y => y + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-xl transition-all text-slate-500 hover:text-emerald-600 shadow-sm hover:shadow active:scale-90"><ChevronRight size={20} /></button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {months.map((month, idx) => {
              const isCurrentSelected = currentDate.getMonth() === idx && currentDate.getFullYear() === pickerYear;
              return (
                <button key={month} onClick={() => handleMonthSelect(idx)}
                  className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border
                    ${isCurrentSelected ? 'bg-emerald-600 text-white border-emerald-700 shadow-lg shadow-emerald-100 scale-105 z-10' : 'bg-white text-slate-600 border-slate-100 hover:border-emerald-200 hover:text-emerald-600 hover:bg-emerald-50/30'}`}>
                  {month.substring(0, 3)}
                </button>
              );
            })}
          </div>
          <div className="pt-4 border-t border-slate-100 flex justify-center">
             <button onClick={() => { setCurrentDate(new Date()); setIsDatePickerOpen(false); }} className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-600 transition-all active:scale-95"><CalendarDays size={14} /> Back to Today</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Calendar;
