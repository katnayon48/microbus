
import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, ChevronDown, CalendarDays, LogIn, FileText, Settings, BarChart3 } from 'lucide-react';
import { format, addMonths, subMonths, isToday, setMonth, setYear } from 'date-fns';
import { getCalendarDays } from '../utils/dateUtils';
import { Booking, AppSettings } from '../types';
import Modal from './Modal';

interface CalendarProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  bookings: Booking[];
  isAdmin: boolean;
  isMaster?: boolean;
  onDateClick: (date: Date, existing?: Booking) => void;
  onDateDoubleClick?: (date: Date) => void;
  onLoginClick?: () => void;
  onReportClick?: () => void;
  onSettingsClick?: () => void;
  onStatsClick?: () => void;
  onAttendanceViewerClick?: () => void;
  isAppLoading?: boolean; 
  appSettings: AppSettings;
}

const BookingCycler: React.FC<{ 
  bookings: Booking[], 
  onBookingClick: (booking: Booking) => void,
  renderContent: (booking: Booking) => React.ReactNode,
  isAppLoading: boolean
}> = ({ bookings, onBookingClick, renderContent, isAppLoading }) => {
  const [displayIndex, setDisplayIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (bookings.length <= 1) {
      setDisplayIndex(0);
      setPrevIndex(0);
      return;
    }

    const timer = setTimeout(() => {
      setPrevIndex(displayIndex);
      setDisplayIndex((prev) => (prev + 1) % bookings.length);
      setIsAnimating(true);
      
      setTimeout(() => {
        setIsAnimating(false);
      }, 500); // Match animation duration
    }, 2000);

    return () => clearTimeout(timer);
  }, [displayIndex, bookings.length]);

  const getBgClasses = (b: Booking) => {
    const isUnpaid = b.fareStatus === 'Unpaid';
    const isSpecial = b.isSpecialNote;
    return isSpecial ? "bg-gradient-to-b from-[#f59e0b] to-[#92400e]" : isUnpaid ? "bg-gradient-to-b from-[#800000] to-[#3a0000]" : "bg-gradient-to-b from-[#006400] to-[#003300]";
  };

  if (bookings.length <= 1) {
    const booking = bookings[0];
    if (!booking) return null;
    return (
      <div onClick={(e) => { e.stopPropagation(); onBookingClick(booking); }}
        className={`relative px-0.5 py-1 md:py-1 min-h-[30px] md:min-h-[38px] flex items-center justify-center select-none rounded-md md:rounded-lg overflow-hidden cursor-pointer z-20 border transition-all duration-300
          ${!isAppLoading ? 'animate-booking-pop' : 'opacity-0'}
          ${getBgClasses(booking)} shadow-[inset_0_1.5px_0_rgba(255,255,255,0.4),_inset_0_-1.5px_0_rgba(0,0,0,0.4),_0_4px_8px_rgba(0,0,0,0.4)] border-t-white/30 border-b-black/50 border-x-white/10 text-white hover:brightness-110 active:scale-95`}>
        <div className="w-full">
          {renderContent(booking)}
        </div>
      </div>
    );
  }

  const safeDisplayIndex = bookings.length > 0 ? displayIndex % bookings.length : 0;
  const safePrevIndex = bookings.length > 0 ? prevIndex % bookings.length : 0;
  const enteringBooking = bookings[safeDisplayIndex];
  const exitingBooking = bookings[safePrevIndex];

  if (!enteringBooking) return null;

  return (
    <div className="relative w-full h-[30px] md:h-[40px] animate-in fade-in duration-500">
      {/* Counter Box - Positioned exactly above the booking bar with a small gap */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-white px-3 py-0.5 rounded-full border border-slate-200 shadow-md z-40 flex items-center justify-center">
        <span className="text-[11px] md:text-[13px] font-black text-black tabular-nums whitespace-nowrap">
          {safeDisplayIndex + 1}/{bookings.length}
        </span>
      </div>

      <div className="relative w-full h-full overflow-hidden rounded-md md:rounded-lg">
        {/* Exiting Booking */}
        {isAnimating && exitingBooking && (
          <div 
            key={`exit-${exitingBooking.id}-${safePrevIndex}`}
            className={`absolute inset-0 px-0.5 py-1 md:py-1 flex items-center justify-center select-none rounded-md md:rounded-lg overflow-hidden cursor-pointer z-10 border animate-booking-exit
              ${getBgClasses(exitingBooking)} shadow-[inset_0_1.5px_0_rgba(255,255,255,0.4),_inset_0_-1.5px_0_rgba(0,0,0,0.4),_0_4px_8px_rgba(0,0,0,0.4)] border-t-white/30 border-b-black/50 border-x-white/10 text-white`}
          >
            <div className="w-full">
              {renderContent(exitingBooking)}
            </div>
          </div>
        )}

        {/* Entering / Current Booking */}
        <div 
          key={`current-${enteringBooking.id}-${safeDisplayIndex}`}
          onClick={(e) => { e.stopPropagation(); onBookingClick(enteringBooking); }}
          className={`absolute inset-0 px-0.5 py-1 md:py-1 flex items-center justify-center select-none rounded-md md:rounded-lg overflow-hidden cursor-pointer z-20 border transition-all
            ${isAnimating ? 'animate-booking-enter' : ''}
            ${getBgClasses(enteringBooking)} shadow-[inset_0_1.5px_0_rgba(255,255,255,0.4),_inset_0_-1.5px_0_rgba(0,0,0,0.4),_0_4px_8px_rgba(0,0,0,0.4)] border-t-white/30 border-b-black/50 border-x-white/10 text-white hover:brightness-110 active:scale-95`}
        >
          <div className="w-full">
            {renderContent(enteringBooking)}
          </div>
        </div>
      </div>
    </div>
  );
};

const Calendar: React.FC<CalendarProps> = ({ 
  currentDate, 
  setCurrentDate, 
  bookings, 
  isAdmin, 
  isMaster,
  onDateClick,
  onDateDoubleClick,
  onLoginClick,
  onReportClick,
  onSettingsClick,
  onStatsClick,
  onAttendanceViewerClick,
  isAppLoading = false,
  appSettings
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

  const themeColor = appSettings?.ui?.themeColor || "#10b981";
  const bgColor = appSettings?.ui?.bgColor || "#062c1e";

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
    if (parts.length >= 2) {
      const first = parts[0].toUpperCase();
      const second = parts[1].toUpperCase();
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
    if (!nameString && rank) {
      nameString = rank;
      rank = '';
    }
    const nameWords = nameString.split(/\s+/).filter(p => p.length > 0);
    return (
      <div className="flex flex-col items-center justify-center w-full overflow-hidden px-0.5">
        {rank && (
          <span className={`block leading-none mb-0.5 w-full text-center whitespace-nowrap ${fontSizeClasses} drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]`}>
            {rank}
          </span>
        )}
        <div className="flex flex-col items-center w-full">
          {nameWords.map((word, idx) => (
            <span key={idx} className={`block leading-tight text-center w-full whitespace-nowrap ${fontSizeClasses} drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]`}>
              {word}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div 
      className="flex flex-col h-full relative overflow-hidden"
      style={{ backgroundColor: bgColor }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="grid grid-cols-3 items-center px-1 md:px-6 py-1.5 md:py-2 border-b border-white/10 bg-black/40 shrink-0 gap-1 overflow-hidden">
        <div className="flex items-center gap-1 md:gap-4 min-w-0">
          <div className="hidden sm:flex w-7 h-7 md:w-10 md:h-10 rounded-lg md:rounded-xl items-center justify-center text-white shadow-lg shrink-0" style={{ backgroundColor: themeColor }}>
            <CalendarIcon size={14} className="md:w-5 md:h-5" />
          </div>
          <div className="flex items-center gap-1 md:gap-2 min-w-0 overflow-hidden">
            <button 
              onClick={() => {
                setPickerYear(currentDate.getFullYear());
                setIsDatePickerOpen(true);
              }}
              className="flex items-center gap-0.5 md:gap-1 px-0.5 py-1 rounded-lg hover:bg-white/10 transition-all active:scale-95 group shrink-0"
            >
              <h2 className="text-[10px] md:text-2xl font-black text-white tracking-tight uppercase whitespace-nowrap">
                {format(currentDate, 'MMM yy')}
              </h2>
              <ChevronDown size={8} className="transition-colors md:w-4 md:h-4 shrink-0" style={{ color: themeColor }} />
            </button>
            <button 
              onClick={onAttendanceViewerClick}
              className="flex items-center justify-center px-1 md:px-5 py-1.5 md:py-2.5 bg-white text-black rounded-lg md:rounded-xl text-[6.5px] md:text-[10px] font-black uppercase tracking-tight md:tracking-widest hover:bg-slate-200 shadow-md active:scale-95 transition-all whitespace-nowrap shrink-0 border border-white/10 h-7 md:h-10"
            >
              <span>Attendance</span>
            </button>
          </div>
        </div>
        
        <div className="flex justify-center min-w-0">
          <div className="flex items-center gap-0 md:gap-2 bg-white/5 p-0.5 rounded-lg md:rounded-xl border border-white/10 shadow-sm shrink-0">
            <button 
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-1 md:p-2 hover:bg-white/10 rounded-lg text-slate-400 active:scale-90"
              onMouseEnter={(e) => e.currentTarget.style.color = themeColor}
              onMouseLeave={(e) => e.currentTarget.style.color = ""}
            >
              <ChevronLeft size={12} md:size={20} strokeWidth={2.5} />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-1 md:px-12 py-1 md:py-2 text-[8px] md:text-xs font-black text-white uppercase tracking-tight md:tracking-wider whitespace-nowrap transition-colors"
            >
              Today
            </button>
            <button 
              onClick={() => addMonths && setCurrentDate(addMonths(currentDate, 1))}
              className="p-1 md:p-2 hover:bg-white/10 rounded-lg text-slate-400 active:scale-90"
              onMouseEnter={(e) => e.currentTarget.style.color = themeColor}
              onMouseLeave={(e) => e.currentTarget.style.color = ""}
            >
              <ChevronRight size={12} md:size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="flex justify-end items-center gap-1.5 md:gap-3 shrink-0">
          {!isAdmin && (
            <>
              <button 
                onClick={onStatsClick}
                className="flex items-center justify-center px-1.5 md:px-5 py-1.5 md:py-2.5 bg-white text-black rounded-lg md:rounded-xl text-[7px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 shadow-md active:scale-95 transition-all whitespace-nowrap shrink-0 border border-white/10 h-7 md:h-10"
              >
                <BarChart3 size={10} className="md:w-4 md:h-4 shrink-0 mr-1" />
                <span>Stats</span>
              </button>
              {onLoginClick && (
                <button 
                  onClick={onLoginClick}
                  className="flex items-center justify-center px-1.5 md:px-5 py-1.5 md:py-2.5 bg-white text-black rounded-lg md:rounded-xl text-[7px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 shadow-md active:scale-95 transition-all whitespace-nowrap shrink-0 border border-white/10 h-7 md:h-10"
                >
                  <LogIn size={9} className="md:w-4 md:h-4 shrink-0 mr-1" />
                  <span className="inline">Login</span>
                </button>
              )}
            </>
          )}
          {isAdmin && onReportClick && (
            <div className="flex items-center gap-1.5 md:gap-3">
              <button 
                onClick={onReportClick}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-5 py-1.5 md:py-2.5 bg-white rounded-lg md:rounded-xl text-[7px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 shadow-md active:scale-95 transition-all whitespace-nowrap shrink-0 h-7 md:h-10"
                style={{ color: themeColor }}
              >
                <FileText size={10} className="md:w-4 md:h-4 shrink-0" />
                <span className="md:hidden">REPORT</span>
                <span className="hidden md:inline">GENERATE REPORT</span>
              </button>
              {isMaster && (
                <button 
                  onClick={onSettingsClick}
                  className="w-7 h-7 md:w-10 md:h-10 flex items-center justify-center bg-amber-600 text-white rounded-lg md:rounded-xl hover:bg-amber-500 shadow-lg active:scale-90 transition-all border border-amber-400/20"
                >
                  <Settings size={14} className="md:w-5 md:h-5" />
                </button>
              )}
            </div>
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

      <div className="flex-1 relative overflow-hidden min-h-0" style={{ backgroundColor: bgColor }}>
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
          style={{ opacity: appSettings?.ui?.watermarkOpacity ?? 0.12 }}
        >
          <div className="logo-3d-container scale-[1.2] md:scale-[0.8]">
            <div className="logo-3d-card xl" style={{ animation: 'rotate-y-3d-watermark 8s cubic-bezier(0.4, 0, 0.2, 1) infinite' }}>
              {[...Array(71)].map((_, i) => {
                const isPC = typeof window !== 'undefined' && window.innerWidth >= 768;
                const layerCount = isPC ? 71 : 31;
                const mid = (layerCount - 1) / 2;
                const z = i - mid;
                const isRim = i === 0 || i === layerCount - 1;
                
                // Only render layers up to the count for the current device
                if (i >= layerCount) return null;

                return (
                  <div 
                    key={i} 
                    className={isRim ? "logo-3d-rim" : "logo-3d-depth"} 
                    style={{ transform: `translateZ(${z}px)` }}
                  />
                );
              })}
              <img 
                src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" 
                alt="Logo Back" 
                className="logo-3d-back" 
              />
              <img 
                src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" 
                alt="Logo Front" 
                className="logo-3d-face" 
              />
            </div>
          </div>
        </div>
        <div className="absolute inset-0 grid grid-cols-7 auto-rows-fr border-t border-l border-white/5 shadow-[inset_0_0_120px_rgba(0,0,0,0.9)]">
          {days.map((day, idx) => {
            const isTodayDate = isToday(day.date);
            return (
              <div 
                key={idx}
                onClick={() => onDateClick(day.date)}
                onDoubleClick={() => onDateDoubleClick?.(day.date)}
                className={`flex flex-col transition-all relative group z-10 min-h-0
                  ${day.isCurrentMonth ? 'bg-transparent' : 'bg-black/60 opacity-20'}
                  ${isAdmin ? 'cursor-pointer hover:bg-white/5' : day.bookings.length > 0 ? 'cursor-pointer hover:bg-white/[0.04]' : 'cursor-default'}
                `}
                style={{ 
                  borderRightWidth: '1px',
                  borderBottomWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: isTodayDate ? `${themeColor}33` : `rgba(255,255,255,${appSettings?.ui?.gridOpacity ?? 0.05})`,
                  ...(isTodayDate ? {
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    boxShadow: `inset 0 0 12px ${themeColor}55`,
                  } : {})
                }}
              >
                <div className="flex justify-between items-start p-0.5 md:p-1 mb-0 shrink-0 relative z-20">
                  <span className={`text-[9px] md:text-sm font-black w-4 h-4 md:w-7 md:h-7 flex items-center justify-center rounded md:rounded-xl transition-all
                    ${isTodayDate ? 'text-white shadow-lg shadow-black/50 ring-2 ring-white/20' : day.isCurrentMonth ? 'text-slate-100' : 'text-slate-500'}`}
                    style={isTodayDate ? { backgroundColor: themeColor } : {}}>
                    {format(day.date, 'd')}
                  </span>
                  {isAdmin && day.isCurrentMonth && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDateClick(day.date); }} 
                      className="opacity-0 group-hover:opacity-100 transition-all p-0.5 hover:bg-white/10 rounded"
                      style={{ color: themeColor }}
                    >
                       <Plus size={12} md:size={16} strokeWidth={3} />
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-0.5 md:gap-1 flex-1 px-0.5 md:px-1 pb-1 justify-center relative z-20">
                  {day.bookings.length > 0 && (
                    <BookingCycler 
                      bookings={day.bookings}
                      onBookingClick={(booking) => onDateClick(day.date, booking)}
                      renderContent={renderBookingContent}
                      isAppLoading={isAppLoading}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Modal isOpen={isDatePickerOpen} onClose={() => setIsDatePickerOpen(false)} title="Jump to Schedule" variant="dark">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between bg-white/5 p-2 rounded-2xl border border-white/10 shadow-inner">
            <button onClick={() => setPickerYear(y => y - 1)} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white active:scale-90"><ChevronLeft size={20} /></button>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: themeColor }}>Select Year</span>
              <span className="text-2xl font-black text-white tabular-nums">{pickerYear}</span>
            </div>
            <button onClick={() => setPickerYear(y => y + 1)} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white active:scale-90"><ChevronRight size={20} /></button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {months.map((month, idx) => {
              const isActive = currentDate.getMonth() === idx && currentDate.getFullYear() === pickerYear;
              return (
                <button 
                  key={month} 
                  onClick={() => handleMonthSelect(idx)}
                  className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border
                    ${isActive ? 'text-white border-white/20 shadow-lg scale-105 z-10' : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/20 hover:text-white'}`}
                  style={isActive ? { backgroundColor: themeColor } : {}}
                >
                  {month.substring(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Calendar;
