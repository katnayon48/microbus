
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, BarChart3, TrendingUp } from 'lucide-react';
import { Booking } from '../types';
import { format, parseISO, getYear, startOfMonth, endOfMonth, differenceInDays, max, min } from 'date-fns';

interface TripStatsProps {
  bookings: Booking[];
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

const TripStats: React.FC<TripStatsProps> = ({ bookings }) => {
  const [selectedYear, setSelectedYear] = useState(() => getYear(new Date()));

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

  // Set max scale to 25 as requested
  const maxScale = 25;
  const scaleValues = [25, 20, 10, 0];

  return (
    <div className="flex flex-col w-full h-full max-h-[85vh] overflow-hidden animate-stats-reveal">
      <div className="w-full flex items-center justify-between gap-2 mb-4 shrink-0">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
               <TrendingUp size={24} />
            </div>
            <div>
               <h3 className="text-sm md:text-xl font-black text-white uppercase tracking-tight">MONTH WISE TRIP STATISTICS</h3>
               <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Trip Analysis for {selectedYear}</p>
            </div>
         </div>
         <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-xl border border-white/10 shadow-lg">
            <button onClick={() => setSelectedYear(y => y - 1)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 active:scale-90"><ChevronLeft size={20} /></button>
            <span className="text-sm font-black text-white min-w-[60px] text-center tracking-widest">{selectedYear}</span>
            <button onClick={() => setSelectedYear(y => y + 1)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 active:scale-90"><ChevronRight size={20} /></button>
         </div>
      </div>

      <div className="w-full bg-[#062c1e] p-4 md:p-10 rounded-[2rem] md:rounded-[3rem] border-2 border-white/5 shadow-2xl relative flex flex-col h-[480px] md:h-[600px] lg:h-[650px] overflow-hidden shrink-0">
        <div className="flex items-end gap-1 md:gap-6 relative group flex-1 pt-12 pb-12 min-h-0 h-full">
          {/* Left Scale */}
          <div className="flex flex-col justify-between h-full text-right pr-2 md:pr-4 select-none border-r border-white/5">
             {scaleValues.map(val => (
               <div key={`l-${val}`} className="flex items-center justify-end gap-2 relative">
                 <span className="text-[10px] md:text-[12px] font-black text-slate-500">{val}</span>
                 <div className="w-2 h-[1px] bg-slate-600"></div>
               </div>
             ))}
          </div>

          {/* Chart Area */}
          <div className="flex-1 relative h-full flex items-end justify-between gap-1 md:gap-6 px-2 md:px-4 border-b-2 border-white/10">
             {/* Horizontal Grid Lines */}
             <div className="absolute inset-0 flex flex-col pointer-events-none opacity-[0.05] px-4">
                <div className="absolute left-0 right-0 border-t border-white" style={{ bottom: '100%' }}></div>
                <div className="absolute left-0 right-0 border-t border-white" style={{ bottom: '80%' }}></div>
                <div className="absolute left-0 right-0 border-t border-white" style={{ bottom: '40%' }}></div>
                <div className="absolute left-0 right-0" style={{ bottom: '0%' }}></div>
             </div>

             {monthlyStats.map((stat, i) => {
               const heightPercent = Math.min((stat.count / maxScale) * 100, 100);
               const finalHeight = Math.max(heightPercent, stat.count > 0 ? 4 : 0);
               return (
                 <div key={`${selectedYear}-${stat.month}`} className="flex-1 flex flex-col items-center group/bar relative z-10 h-full justify-end">
                    <div 
                      className="w-full max-w-[28px] md:max-w-[64px] lg:max-w-[80px] rounded-t-md md:rounded-t-2xl shadow-2xl animate-bar-grow transition-all cursor-default border-x border-t border-white/10 hover:brightness-125 z-10"
                      style={{ 
                        height: `${finalHeight}%`,
                        animationDelay: `${i * 80}ms`,
                        background: stat.style.gradient,
                        backgroundColor: stat.style.color
                      }}
                    ></div>
                    <span className="absolute -bottom-10 text-[8px] md:text-[12px] font-black text-slate-400 uppercase tracking-tight group-hover/bar:text-white transition-colors">
                      {stat.month}
                    </span>
                    {stat.count > 0 && (
                      <span 
                        className="absolute font-black text-white bg-black/70 px-2 md:px-4 py-1 rounded-lg backdrop-blur-lg z-30 shadow-xl border border-white/10 whitespace-nowrap text-[10px] md:text-[14px] animate-in fade-in zoom-in duration-500"
                        style={{ 
                          bottom: `calc(${finalHeight}% + 10px)`,
                          animationDelay: `${(i * 80) + 400}ms`
                        }}
                      >
                        {stat.count}
                      </span>
                    )}
                 </div>
               );
             })}
          </div>

          {/* Right Scale */}
          <div className="flex flex-col justify-between h-full text-left pl-2 md:pl-4 select-none border-l border-white/5">
             {scaleValues.map(val => (
               <div key={`r-${val}`} className="flex items-center gap-2">
                 <div className="w-2 h-[1px] bg-slate-600"></div>
                 <span className="text-[10px] md:text-[12px] font-black text-slate-500">{val}</span>
               </div>
             ))}
          </div>
        </div>
        
        {/* Footer info inside chart area */}
        <div className="mt-8 md:mt-12 pt-4 md:pt-6 border-t border-white/5 flex items-center justify-between shrink-0 gap-2">
           <div className="flex items-center gap-1.5 md:gap-3 px-2 md:px-4 py-1.5 md:py-2 bg-white/5 rounded-lg md:rounded-xl border border-white/5 min-w-0">
              <div className="w-2 md:w-3.5 h-2 md:h-3.5 bg-emerald-500 rounded-sm shrink-0"></div>
              <span className="text-[7px] md:text-[12px] font-black text-white uppercase tracking-widest truncate">Trip Statistics</span>
           </div>
           <div className="px-3 md:px-6 py-1.5 md:py-2.5 bg-emerald-600/10 rounded-lg md:rounded-2xl border border-emerald-500/20 shadow-lg min-w-0">
              <span className="text-[7px] md:text-[14px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 md:gap-3 truncate">
                <BarChart3 size={10} className="md:w-[18px] md:h-[18px]" /> Total Days: {monthlyStats.reduce((a, b) => a + b.count, 0)}
              </span>
           </div>
        </div>
      </div>
      <div className="pb-4"></div>
    </div>
  );
};

export default TripStats;
