
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, BarChart3, TrendingUp, Info } from 'lucide-react';
import { Booking, AppSettings } from '../types';
import { format, parseISO, getYear, startOfMonth, endOfMonth, differenceInDays, max, min } from 'date-fns';

// Define the missing TripStatsProps interface
interface TripStatsProps {
  bookings: Booking[];
  appSettings: AppSettings;
}

const MONTH_BAR_STYLES = [
  { color: '#10b981', gradient: 'linear-gradient(to top, #065f46, #10b981)' },
  { color: '#06b6d4', gradient: 'linear-gradient(to top, #164e63, #06b6d4)' },
  { color: '#3b82f6', gradient: 'linear-gradient(to top, #1e3a8a, #3b82f6)' },
  { color: '#6366f1', gradient: 'linear-gradient(to top, #312e81, #6366f1)' },
  { color: '#8b5cf6', gradient: 'linear-gradient(to top, #4c1d95, #8b5cf6)' },
  { color: '#d946ef', gradient: 'linear-gradient(to top, #701a75, #d946ef)' },
  { color: '#f43f5e', gradient: 'linear-gradient(to top, #881337, #f43f5e)' },
  { color: '#f97316', gradient: 'linear-gradient(to top, #7c2d12, #f97316)' },
  { color: '#f59e0b', gradient: 'linear-gradient(to top, #78350f, #f59e0b)' },
  { color: '#eab308', gradient: 'linear-gradient(to top, #713f12, #eab308)' },
  { color: '#84cc16', gradient: 'linear-gradient(to top, #365314, #84cc16)' },
  { color: '#14b8a6', gradient: 'linear-gradient(to top, #134e4a, #14b8a6)' }
];

const TripStats: React.FC<TripStatsProps> = ({ bookings, appSettings }) => {
  const [selectedYear, setSelectedYear] = useState(() => getYear(new Date()));
  const themeColor = appSettings?.ui?.themeColor || "#10b981";
  const bgColor = appSettings?.ui?.bgColor || "#062c1e";

  const monthlyStats = useMemo(() => {
    const statsArray = Array(12).fill(0).map((_, i) => ({
      month: format(new Date(selectedYear, i, 1), 'MMM'),
      count: 0,
      style: MONTH_BAR_STYLES[i]
    }));
    
    for (let m = 0; m < 12; m++) {
      const monthStart = startOfMonth(new Date(selectedYear, m, 1));
      const monthEnd = endOfMonth(new Date(selectedYear, m, 1));
      let totalDaysInMonth = 0;

      bookings.forEach(b => {
        if (b.isSpecialNote) return;
        try {
          const bookingStart = parseISO(b.startDate);
          const bookingEnd = parseISO(b.endDate);
          
          const overlapStart = max([bookingStart, monthStart]);
          const overlapEnd = min([bookingEnd, monthEnd]);

          if (overlapStart <= overlapEnd) {
            const days = differenceInDays(overlapEnd, overlapStart) + 1;
            totalDaysInMonth += days;
          }
        } catch (err) {}
      });
      
      statsArray[m].count = totalDaysInMonth;
    }
    
    return statsArray;
  }, [bookings, selectedYear]);

  const maxScale = 25;
  const scaleValues = [25, 20, 15, 10, 5, 0];

  return (
    <div 
      className="flex flex-col w-full h-[85vh] overflow-hidden animate-stats-reveal relative px-2 md:px-8 py-4"
      style={{ backgroundColor: bgColor }}
    >
      <div className="w-full grid grid-cols-1 md:grid-cols-3 items-center gap-4 mb-8 shrink-0 relative z-10">
         <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center shadow-inner"
              style={{ backgroundColor: `${themeColor}22`, borderColor: `${themeColor}44`, borderWidth: '1px', borderStyle: 'solid', color: themeColor }}
            >
               <BarChart3 size={16} md:size={18} />
            </div>
            <div className="min-w-0">
               <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-tighter leading-none">TRIP STATISTICS</h3>
            </div>
         </div>
         
         <div className="flex justify-center">
           <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 shadow-2xl shrink-0">
              <button 
                onClick={() => setSelectedYear(y => y - 1)} 
                className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all active:scale-90"
              >
                <ChevronLeft size={14} md:size={16} />
              </button>
              <div className="px-3 md:px-5 flex flex-col items-center">
                <span className="text-[11px] md:text-sm font-black text-white tabular-nums tracking-[0.2em]">{selectedYear}</span>
              </div>
              <button 
                onClick={() => setSelectedYear(y => y + 1)} 
                className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all active:scale-90"
              >
                <ChevronRight size={14} md:size={16} />
              </button>
           </div>
         </div>

         <div className="hidden md:block"></div>
      </div>

      <div className="w-full flex-1 bg-black/20 rounded-[2rem] md:rounded-[3rem] border border-white/5 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] relative flex flex-col overflow-hidden p-6 md:p-12">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.03]">
          <img 
            src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" 
            alt="Watermark" 
            className="w-[300px] md:w-[600px] h-[300px] md:h-[600px] object-cover rounded-full" 
          />
        </div>

        <div className="flex items-end gap-2 md:gap-8 relative flex-1 min-h-0 h-full z-10">
          <div className="flex flex-col justify-between h-full text-right pr-2 md:pr-6 select-none border-r border-white/5 pb-10">
             {scaleValues.map(val => (
               <div key={`l-${val}`} className="flex items-center justify-end gap-2 md:gap-4 relative group">
                 <span className="text-[9px] md:text-[10px] font-black text-slate-500/80 group-hover:text-slate-300 transition-colors">{val}</span>
                 <div className="w-2 md:w-3 h-[1px] bg-slate-700"></div>
               </div>
             ))}
          </div>

          <div className="flex-1 relative h-full flex items-end justify-between gap-1.5 md:gap-6 px-1 md:px-6 border-b-2 border-white/10 pb-10">
             <div className="absolute inset-0 flex flex-col pointer-events-none opacity-[0.03] px-6 pb-10">
                {scaleValues.slice(0, -1).map((_, i) => (
                  <div key={i} className="flex-1 border-t border-white"></div>
                ))}
             </div>

             {monthlyStats.map((stat, i) => {
               const heightPercent = Math.min((stat.count / maxScale) * 100, 100);
               const finalHeight = Math.max(heightPercent, stat.count > 0 ? 4 : 0);
               return (
                 <div key={`${selectedYear}-${stat.month}`} className="flex-1 flex flex-col items-center group/bar relative z-10 h-full justify-end">
                    {/* Numerical Label on Top - Always Visible */}
                    <div 
                      className="absolute z-40 mb-1"
                      style={{ bottom: `${finalHeight}%` }}
                    >
                      <span className="text-[8px] md:text-[12px] font-black text-emerald-400 tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                        {stat.count > 0 ? stat.count : ''}
                      </span>
                    </div>

                    <div 
                      className="w-full max-w-[24px] md:max-w-[70px] rounded-t-lg md:rounded-t-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] animate-bar-grow transition-all cursor-default border-x border-t border-white/10 group-hover/bar:brightness-125 group-hover/bar:scale-x-105 z-10"
                      style={{ 
                        height: `${finalHeight}%`,
                        animationDelay: `${i * 100}ms`,
                        background: stat.style.gradient,
                        backgroundColor: stat.style.color
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50 rounded-t-lg md:rounded-t-2xl"></div>
                    </div>

                    <span 
                      className="absolute -bottom-7 md:-bottom-9 text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-tight group-hover/bar:text-emerald-400 transition-colors"
                      style={{ color: stat.count > 0 ? '' : '#475569' }}
                    >
                      {stat.month}
                    </span>
                 </div>
               );
             })}
          </div>
        </div>
        
        <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-center z-10">
           <div 
              className="px-5 py-2.5 md:px-7 md:py-3 rounded-xl md:rounded-2xl shadow-lg transition-all hover:scale-105 duration-300"
              style={{ backgroundColor: `${themeColor}CC`, borderColor: `${themeColor}44`, borderWidth: '1px', borderStyle: 'solid' }}
           >
              <span className="text-[10px] md:text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2.5">
                <TrendingUp size={14} md:size={18} /> 
                Annual Total: <span className="text-white drop-shadow-md">{monthlyStats.reduce((a, b) => a + b.count, 0)} Days</span>
              </span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TripStats;
