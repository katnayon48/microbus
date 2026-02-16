
import React, { useState, useEffect, useMemo } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';
import { format, parseISO, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarRange, CalendarDays, LogIn, Plus } from 'lucide-react';
import { DriverAttendance, AppSettings } from '../types';

interface AttendanceViewerProps {
  isAdmin: boolean;
  onLoginClick: () => void;
  appSettings: AppSettings;
}

const AttendanceViewer: React.FC<AttendanceViewerProps> = ({ isAdmin, onLoginClick, appSettings }) => {
  const [attendanceRecords, setAttendanceRecords] = useState<DriverAttendance[]>([]);
  const [historyMonth, setHistoryMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const db = getDatabase();
    const attendanceRef = ref(db, 'attendance');
    const unsubscribe = onValue(attendanceRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ ...data[key], id: key }));
        setAttendanceRecords(list.sort((a, b) => b.date.localeCompare(a.date)));
      } else {
        setAttendanceRecords([]);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredAttendance = useMemo(() => {
    const monthStr = format(historyMonth, 'yyyy-MM');
    return attendanceRecords.filter(record => record.date.startsWith(monthStr))
      .sort((a, b) => a.date.localeCompare(b.date)); 
  }, [attendanceRecords, historyMonth]);

  const bgColor = appSettings?.ui?.bgColor || "#062c1e";

  return (
    <div 
      className="relative h-full w-full rounded-2xl md:rounded-3xl p-3 md:p-4 border border-white/10 shadow-2xl overflow-hidden flex flex-col box-border"
      style={{ backgroundColor: bgColor }}
    >
      {/* Watermark Logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <img 
          src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" 
          alt="Watermark" 
          className="w-[240px] md:w-[450px] h-[240px] md:h-[450px] object-cover rounded-full opacity-[0.05]" 
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col min-h-0 space-y-3 md:space-y-4">
        <div className="flex flex-col gap-2 md:gap-3 px-1 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="w-7 h-7 md:w-9 md:h-9 bg-emerald-600/20 text-emerald-400 rounded-lg md:rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-inner shrink-0">
                <CalendarRange size={16} className="md:w-5 md:h-5" />
              </div>
              <h4 className="text-[10px] md:text-base font-black text-white uppercase tracking-tight whitespace-nowrap truncate">ATTENDANCE LOG</h4>
            </div>
            <div className="bg-white/5 border border-white/10 px-2 py-1 rounded-full shrink-0">
              <span className="text-[7px] md:text-[9px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">
                {filteredAttendance.length} Logs
              </span>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="flex items-center gap-1 md:gap-2 bg-black/40 px-2 py-1 md:px-4 md:py-1.5 rounded-xl md:rounded-2xl border border-white/10 shadow-2xl shrink-0">
              <button 
                onClick={() => setHistoryMonth(m => subMonths(m, 1))} 
                className="p-1 text-slate-500 hover:text-emerald-400 active:scale-90 transition-colors bg-white/5 rounded-lg"
              >
                <ChevronLeft size={14} className="md:w-5 md:h-5" />
              </button>
              <span className="text-[9px] md:text-[13px] font-black text-white uppercase tracking-[0.1em] md:tracking-[0.15em] min-w-[85px] md:min-w-[110px] text-center px-1">
                {format(historyMonth, 'MMM yyyy')}
              </span>
              <button 
                onClick={() => setHistoryMonth(m => addMonths(m, 1))} 
                className="p-1 text-slate-500 hover:text-emerald-400 active:scale-90 transition-colors bg-white/5 rounded-lg"
              >
                <ChevronRight size={14} className="md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-black/30 rounded-xl md:rounded-[1.5rem] border border-white/10 overflow-hidden shadow-2xl w-full backdrop-blur-sm flex-1 flex flex-col min-h-0 box-border">
          {filteredAttendance.length > 0 ? (
            <div className="w-full h-full overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed min-w-full">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-[#0a1128] border-b border-white/10">
                    <th className="p-2 md:py-2.5 md:px-4 text-[7px] md:text-[12px] font-black text-slate-300 uppercase tracking-widest border-r border-white/5 w-[30%] md:w-[12%]">Date</th>
                    <th className="p-2 md:py-2.5 md:px-4 text-[7px] md:text-[12px] font-black text-slate-300 uppercase tracking-widest border-r border-white/5 w-[25%] md:w-[10%]">Day</th>
                    <th className="p-2 md:py-2.5 md:px-4 text-[7px] md:text-[12px] font-black text-slate-300 uppercase tracking-widest text-center border-r border-white/5 w-[22.5%] md:w-[10%]">In</th>
                    <th className="p-2 md:py-2.5 md:px-4 text-[7px] md:text-[12px] font-black text-slate-300 uppercase tracking-widest text-center border-r border-white/5 w-[22.5%] md:w-[10%]">Out</th>
                    <th className="hidden md:table-cell py-2.5 px-4 text-[7px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest border-r border-white/5 w-[28%] text-center leading-tight">Last Day Microbus Entry Time<br/>(To Cantonment)</th>
                    <th className="hidden md:table-cell py-2.5 px-4 md:text-[12px] font-black text-slate-300 uppercase tracking-widest w-[30%]">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAttendance.map((record, index) => (
                    <tr key={record.id || index} className="group hover:bg-white/[0.04] transition-colors">
                      <td className="p-2 md:py-1.5 md:px-4 whitespace-nowrap border-r border-white/5 overflow-hidden">
                        <span className="text-[8.5px] md:text-sm font-black text-white uppercase tracking-tight">
                          {format(parseISO(record.date), 'dd MMM yy')}
                        </span>
                      </td>
                      <td className="p-2 md:py-1.5 md:px-4 whitespace-nowrap border-r border-white/5 overflow-hidden">
                        <span className="text-[7px] md:text-[10px] font-black text-white/60 uppercase tracking-widest truncate block">
                          {format(parseISO(record.date), 'EEE').toUpperCase()}
                        </span>
                      </td>
                      {record.isHoliday && !record.isDutyDay ? (
                        <td colSpan={2} className="p-2 md:py-1.5 md:px-4 text-center bg-amber-500/5 md:hidden">
                          <span className="text-[6.5px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 whitespace-nowrap">HOLIDAY</span>
                        </td>
                      ) : (
                        <>
                          <td className="p-2 md:py-1.5 md:px-4 text-center border-r border-white/5 overflow-hidden">
                            <span className="text-[8px] md:text-[13px] font-black text-white block truncate">{record.inTime || '--:--'}</span>
                          </td>
                          <td className="p-2 md:py-1.5 md:px-4 text-center border-r border-white/5 overflow-hidden">
                            <span className="text-[8px] md:text-[13px] font-black text-amber-400 block truncate">{record.outTime || '--:--'}</span>
                          </td>
                        </>
                      )}

                      {/* Desktop only columns for regular days */}
                      {!(record.isHoliday && !record.isDutyDay) && (
                        <>
                          <td className="hidden md:table-cell py-1.5 px-4 text-center border-r border-white/5">
                            <span className="text-[13px] font-black text-cyan-400 block truncate italic">{record.lastDayCompletionTime || '--:--'}</span>
                          </td>
                          <td className="hidden md:table-cell py-1.5 px-4 overflow-hidden">
                            <span className="text-[11px] font-bold text-slate-400 block truncate max-w-full" title={record.remarks}>
                              {record.remarks || '-'}
                            </span>
                          </td>
                        </>
                      )}

                      {/* Desktop Holiday spanning */}
                      {record.isHoliday && !record.isDutyDay && (
                        <>
                          <td colSpan={3} className="hidden md:table-cell py-1.5 px-4 text-center bg-amber-500/5 border-r border-white/5">
                            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-4 py-0.5 rounded-full border border-amber-500/20 whitespace-nowrap">OFFICIAL HOLIDAY</span>
                          </td>
                          <td className="hidden md:table-cell py-1.5 px-4">
                            <span className="text-[11px] font-bold text-slate-500 italic block truncate">{record.remarks || '-'}</span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-12 h-12 md:w-20 md:h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5">
                <CalendarDays size={24} className="text-slate-600 md:w-10 md:h-10" />
              </div>
              <p className="text-[9px] md:text-[12px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">No logs found</p>
            </div>
          )}
        </div>

        <div className="py-2 md:py-2 flex flex-col items-center gap-1.5 md:gap-2 shrink-0">
          <button 
            onClick={onLoginClick}
            className="group flex items-center justify-center gap-2 px-6 py-2 md:px-10 md:py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[11px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] border border-white/10"
          >
            {isAdmin ? <><Plus size={14} className="group-hover:rotate-90 transition-transform" /> Add Record</> : <><LogIn size={14} className="group-hover:translate-x-1 transition-transform" /> Access terminal</>}
          </button>
          <p className="text-[6px] md:text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] opacity-50">Authorized Access Only</p>
        </div>
      </div>
    </div>
  );
};

export default AttendanceViewer;
