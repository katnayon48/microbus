
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, BarChart3, TrendingUp, Info } from 'lucide-react';
import { Booking, AppSettings } from '../types';
import { format, parseISO, getYear, startOfMonth, endOfMonth, differenceInDays, max, min } from 'date-fns';

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
      {/* Header Bar */}
      <div className="w-full flex items-center justify-between gap-4 mb-8 shrink-0 relative z-10">
         <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center border shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]"
              style={{ backgroundColor: `${themeColor}22`, borderColor: `${themeColor}44`, color: themeColor }}
            >
               <BarChart3 size={24} md:size={32} />
            </div>
            <div className="min-w-0">
               <h3 className="text-xl md:text-4xl font-black text-white uppercase tracking-tighter leading-none">TRIP STATISTICS</h3>
            </div>
         </div>
         
         <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/10 shadow-2xl shrink-0">
            <button 
              onClick={() => setSelectedYear(y => y - 1)} 
              className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all active:scale-90"
            >
              <ChevronLeft size={20} md:size={24} />
            </button>
            <div className="px-4 md:px-8 flex flex-col items-center">
              <span className="text-[14px] md:text-2xl font-black text-white tabular-nums tracking-widest">{selectedYear}</span>
            </div>
            <button 
              onClick={() => setSelectedYear(y => y + 1)} 
              className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all active:scale-90"
            >
              <ChevronRight size={20} md:size={24} />
            </button>
         </div>
      </div>

      {/* Main Chart Card */}
      <div className="w-full flex-1 bg-black/20 rounded-[2rem] md:rounded-[3rem] border border-white/5 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] relative flex flex-col overflow-hidden p-6 md:p-12">
        {/* Background Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.03]">
          <img 
            src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" 
            alt="Watermark" 
            className="w-[300px] md:w-[600px] h-[300px] md:h-[600px] object-cover rounded-full" 
          />
        </div>

        <div className="flex items-end gap-2 md:gap-8 relative flex-1 min-h-0 h-full z-10">
          {/* Y-Axis Scale */}
          <div className="flex flex-col justify-between h-full text-right pr-2 md:pr-6 select-none border-r border-white/5 pb-10">
             {scaleValues.map(val => (
               <div key={`l-${val}`} className="flex items-center justify-end gap-2 md:gap-4 relative group">
                 <span className="text-[9px] md:text-sm font-black text-slate-500/80 group-hover:text-slate-300 transition-colors">{val}</span>
                 <div className="w-2 md:w-3 h-[1px] bg-slate-700"></div>
               </div>
             ))}
          </div>

          {/* Visualization Area */}
          <div className="flex-1 relative h-full flex items-end justify-between gap-1.5 md:gap-6 px-1 md:px-6 border-b-2 border-white/10 pb-10">
             {/* Grid Lines */}
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
                    {/* Tooltip on top */}
                    {stat.count > 0 && (
                      <div 
                        className="absolute opacity-0 group-hover/bar:opacity-100 transition-all duration-300 transform translate-y-2 group-hover/bar:translate-y-0 z-40"
                        style={{ bottom: `calc(${finalHeight}% + 12px)` }}
                      >
                        <div className="bg-white text-[#062c1e] px-3 py-1.5 rounded-xl font-black text-xs md:text-sm shadow-2xl whitespace-nowrap border border-white/20">
                          {stat.count} Trips
                        </div>
                        <div className="w-2 h-2 bg-white rotate-45 mx-auto -mt-1 border-r border-b border-white/20"></div>
                      </div>
                    )}

                    {/* The Bar */}
                    <div 
                      className="w-full max-w-[24px] md:max-w-[70px] rounded-t-lg md:rounded-t-2xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] animate-bar-grow transition-all cursor-default border-x border-t border-white/10 group-hover/bar:brightness-125 group-hover/bar:scale-x-105 z-10"
                      style={{ 
                        height: `${finalHeight}%`,
                        animationDelay: `${i * 100}ms`,
                        background: stat.style.gradient,
                        backgroundColor: stat.style.color
                      }}
                    >
                      {/* Glossy overlay on bar */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50 rounded-t-lg md:rounded-t-2xl"></div>
                    </div>

                    {/* X-Axis Label */}
                    <span 
                      className="absolute -bottom-8 md:-bottom-10 text-[8px] md:text-[13px] font-black text-slate-500 uppercase tracking-tight group-hover/bar:text-emerald-400 transition-colors"
                      style={{ color: stat.count > 0 ? '' : '#475569' }}
                    >
                      {stat.month}
                    </span>
                 </div>
               );
             })}
          </div>
        </div>
        
        {/* Footer Statistics Bar */}
        <div className="mt-12 pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-6 z-10">
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 px-5 py-3 bg-white/5 rounded-2xl border border-white/5">
                <Info size={16} style={{ color: themeColor }} />
                <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Monthly Usage Summary</span>
              </div>
           </div>
           
           <div className="flex items-center gap-4">
             <div 
                className="px-6 md:px-10 py-3.5 md:py-4 rounded-[1.2rem] md:rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border"
                style={{ backgroundColor: themeColor, borderColor: `${themeColor}44` }}
             >
                <span className="text-xs md:text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
                  <TrendingUp size={16} md:size={24} /> Annual Total: {monthlyStats.reduce((a, b) => a + b.count, 0)} Days
                </span>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TripStats;
