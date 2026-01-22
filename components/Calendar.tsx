
import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MoreHorizontal, Plus } from 'lucide-react';
import { format, addMonths, subMonths, isToday, parseISO, startOfWeek, endOfWeek, max, min, isSameDay } from 'date-fns';
import { getCalendarDays, isBookingStart, isBookingEnd } from '../utils/dateUtils';
import { Booking } from '../types';

interface CalendarProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  bookings: Booking[];
  isAdmin: boolean;
  onDateClick: (date: Date, existing?: Booking) => void;
}

const Calendar: React.FC<CalendarProps> = ({ 
  currentDate, 
  setCurrentDate, 
  bookings, 
  isAdmin, 
  onDateClick 
}) => {
  const days = getCalendarDays(currentDate, bookings);
  const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Calendar Navigation Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-100 shrink-0">
            <CalendarIcon size={16} />
          </div>
          <h2 className="text-sm md:text-xl font-black text-slate-900 tracking-tight uppercase whitespace-nowrap">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>
        
        <div className="flex items-center gap-1 md:gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm shrink-0">
          <button 
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-1 md:p-1.5 hover:bg-slate-50 transition-all rounded-lg text-slate-400 hover:text-indigo-600 active:scale-90"
          >
            <ChevronLeft size={18} md:size={20} strokeWidth={2.5} />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-2 md:px-4 py-1 md:py-1.5 text-[9px] md:text-[10px] font-black text-slate-500 hover:text-indigo-600 transition-all uppercase tracking-wider"
          >
            Today
          </button>
          <button 
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-1 md:p-1.5 hover:bg-slate-50 transition-all rounded-lg text-slate-400 hover:text-indigo-600 active:scale-90"
          >
            <ChevronRight size={18} md:size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/30">
        {weekDays.map(day => (
          <div key={day} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-r border-slate-200 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 relative overflow-hidden bg-slate-50">
        {/* Branding Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.15]">
          <img 
            src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" 
            alt="Watermark" 
            className="w-[280px] md:w-[420px] object-contain mix-blend-multiply" 
          />
        </div>

        {/* The Grid */}
        <div className="absolute inset-0 grid grid-cols-7 auto-rows-fr border-t border-l border-slate-300">
          {days.map((day, idx) => {
            const isTodayDate = isToday(day.date);
            
            return (
              <div 
                key={idx}
                onClick={() => onDateClick(day.date)}
                className={`flex flex-col transition-all relative group z-10 border-r border-b border-slate-300
                  ${day.isCurrentMonth ? 'bg-white/60' : 'bg-slate-200/40 opacity-40'}
                  ${isAdmin ? 'cursor-pointer hover:bg-indigo-50/40' : day.bookings.length > 0 ? 'cursor-pointer hover:bg-slate-50/50' : ''}
                `}
              >
                <div className="flex justify-between items-start p-1 md:p-2 mb-1">
                  <span className={`
                    text-[10px] md:text-xs font-black w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-lg md:rounded-xl transition-all
                    ${isTodayDate 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                      : day.isCurrentMonth ? 'text-slate-700' : 'text-slate-400'}
                  `}>
                    {format(day.date, 'd')}
                  </span>
                  
                  {isAdmin && day.isCurrentMonth && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDateClick(day.date); }}
                      className="opacity-0 group-hover:opacity-100 transition-all p-1 text-indigo-500 hover:bg-indigo-100 rounded-lg"
                    >
                       <Plus size={12} md:size={14} strokeWidth={3} />
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-1 overflow-visible flex-1 px-0.5 pb-1">
                  {day.bookings.slice(0, 3).map(booking => {
                    const isStart = isBookingStart(day.date, booking);
                    const isEnd = isBookingEnd(day.date, booking);
                    const isUnpaid = booking.fareStatus === 'Unpaid';
                    
                    return (
                      <div 
                        key={booking.id}
                        onClick={(e) => { e.stopPropagation(); onDateClick(day.date, booking); }}
                        className={`
                          relative px-0.5 py-1 min-h-[22px] md:min-h-[26px] flex items-center justify-center
                          transition-all duration-200 select-none border-y border-transparent
                          rounded-md shadow-sm
                          ${isUnpaid 
                            ? 'bg-rose-600 text-white hover:brightness-110' 
                            : 'bg-emerald-600 text-white hover:brightness-110'}
                          cursor-pointer z-20
                        `}
                      >
                        <span className="text-[6.5px] md:text-[8px] font-black uppercase tracking-tighter leading-[1.1] whitespace-normal break-words w-full text-center px-0.5">
                          {booking.rankName}
                        </span>

                        {/* Visual Indicators for spanning bookings */}
                        {isStart && !isEnd && (
                           <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 bg-white/40 rounded-full mr-0.5" />
                        )}
                        {!isStart && isEnd && (
                           <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1 bg-white/40 rounded-full ml-0.5" />
                        )}
                        {!isStart && !isEnd && (
                           <>
                             <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-1 bg-white/20 ml-0.5" />
                             <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-1 bg-white/20 mr-0.5" />
                           </>
                        )}
                      </div>
                    );
                  })}
                  {day.bookings.length > 3 && (
                    <div className="px-1 py-0.5 flex items-center justify-center gap-1 bg-slate-100 rounded-md">
                      <span className="text-[7px] font-black text-slate-500 uppercase">+{day.bookings.length - 3} MORE</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
