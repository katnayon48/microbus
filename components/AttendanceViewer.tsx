
import React, { useState, useEffect, useMemo } from 'react';
import { getDatabase, ref, onValue } from 'firebase/database';
import { format, parseISO, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarRange, CalendarDays, LogIn, Plus } from 'lucide-react';
import { DriverAttendance } from '../types';

interface AttendanceViewerProps {
  isAdmin: boolean;
  onLoginClick: () => void;
}

const AttendanceViewer: React.FC<AttendanceViewerProps> = ({ isAdmin, onLoginClick }) => {
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

  return (
    <div className="relative h-full w-full bg-[#062c1e] rounded-2xl md:rounded-3xl p-3 md:p-6 border border-white/10 shadow-2xl overflow-hidden flex flex-col">
      {/* Watermark Logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <img 
          src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" 
          alt="Watermark" 
          className="w-[240px] md:w-[450px] h-[240px] md:h-[450px] object-cover rounded-full opacity-[0.05]" 
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col min-h-0 space-y-4">
        {/* Updated Header Layout with Centered Month Nav */}
        <div className="flex flex-col gap-4 px-1 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-600/20 text-emerald-400 rounded-lg md:rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-inner shrink-0">
                <CalendarRange size={18} className="md:w-5 md:h-5" />
              </div>
              <h4 className="text-[10px] md:text-lg font-black text-white uppercase tracking-tight whitespace-nowrap">DRIVER'S ATTENDANCE LOG</h4>
            </div>
            
            <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              <span className="text-[7px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest">
                {filteredAttendance.length} Records
              </span>
            </div>
          </div>

          {/* Centered Month Navigation Control */}
          <div className="flex justify-center">
            <div className="flex items-center gap-1 md:gap-2 bg-black/40 px-2 py-1.5 md:px-6 md:py-2.5 rounded-xl md:rounded-2xl border border-white/10 shadow-2xl shrink-0">
              <button 
                onClick={() => setHistoryMonth(m => subMonths(m, 1))} 
                className="p-1 text-slate-500 hover:text-emerald-400 active:scale-90 transition-colors bg-white/5 rounded-lg"
              >
                <ChevronLeft size={16} className="md:w-6 md:h-6" />
              </button>
              <span className="text-[9px] md:text-[14px] font-black text-white uppercase tracking-[0.1em] md:tracking-[0.2em] min-w-[85px] md:min-w-[120px] text-center px-1">
                {format(historyMonth, 'MMM yyyy')}
              </span>
              <button 
                onClick={() => setHistoryMonth(m => addMonths(m, 1))} 
                className="p-1 text-slate-500 hover:text-emerald-400 active:scale-90 transition-colors bg-white/5 rounded-lg"
              >
                <ChevronRight size={16} className="md:w-6 md:h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Attendance Table Container */}
        <div className="bg-black/30 rounded-xl md:rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl w-full backdrop-blur-sm flex-1 flex flex-col min-h-0">
          {filteredAttendance.length > 0 ? (
            <div className="w-full h-full overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-[#0a1128] border-b border-white/10">
                    <th className="p-2 md:p-4 text-[7px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest border-r border-white/5 w-[25%]">Date</th>
                    <th className="p-2 md:p-4 text-[7px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest border-r border-white/5 w-[25%]">Day</th>
                    <th className="p-2 md:p-4 text-[7px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest text-center border-r border-white/5 w-[25%]">In</th>
                    <th className="p-2 md:p-4 text-[7px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest text-center w-[25%]">Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAttendance.map((record, index) => (
                    <tr key={record.id || index} className="group hover:bg-white/[0.04] transition-colors">
                      <td className="p-2 md:p-4 whitespace-nowrap border-r border-white/5 overflow-hidden text-ellipsis">
                        <span className="text-[9px] md:text-sm font-black text-white uppercase tracking-tight">
                          {format(parseISO(record.date), 'dd MMM yy')}
                        </span>
                      </td>
                      <td className="p-2 md:p-4 whitespace-nowrap border-r border-white/5 overflow-hidden text-ellipsis">
                        <span className="text-[7px] md:text-[10px] font-black text-white/60 uppercase tracking-widest">
                          {format(parseISO(record.date), 'EEEE')}
                        </span>
                      </td>
                      {record.isHoliday && !record.isDutyDay ? (
                        <td colSpan={2} className="p-2 md:p-4 text-center bg-amber-500/5">
                          <div className="inline-flex items-center gap-1 md:gap-2 px-2 py-0.5 md:px-4 md:py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full">
                            <span className="text-[7px] md:text-[10px] font-black text-amber-500 uppercase tracking-widest">HOLIDAY</span>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="p-2 md:p-4 text-center border-r border-white/5">
                            <div className="inline-flex items-center bg-white/5 px-1.5 py-0.5 md:px-3 md:py-1 rounded-md md:rounded-lg border border-white/10">
                              <span className="text-[9px] md:text-xs font-black text-white">{record.inTime || '--:--'}</span>
                            </div>
                          </td>
                          <td className="p-2 md:p-4 text-center">
                            <div className="inline-flex items-center bg-amber-500/10 px-1.5 py-0.5 md:px-3 md:py-1 rounded-md md:rounded-lg border border-amber-500/20">
                              <span className="text-[9px] md:text-xs font-black text-amber-400">{record.outTime || '--:--'}</span>
                            </div>
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
              <div className="w-12 h-12 md:w-20 md:h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 md:mb-6 border border-white/5">
                <CalendarDays size={24} className="text-slate-600 md:w-10 md:h-10" />
              </div>
              <p className="text-[9px] md:text-[12px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">
                No logs for {format(historyMonth, 'MMMM yyyy')}
              </p>
              <p className="text-[7px] md:text-[9px] font-bold text-slate-600 uppercase mt-2 tracking-[0.3em]">AREA HQ BARISHAL</p>
            </div>
          )}
        </div>

        {/* Action Button Section */}
        <div className="py-2 md:py-4 flex flex-col items-center gap-2 md:gap-3 shrink-0">
          <button 
            onClick={onLoginClick}
            className="group flex items-center justify-center gap-2 md:gap-3 px-6 py-2.5 md:px-10 md:py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl md:rounded-2xl text-[9px] md:text-[12px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-[0.98] border border-white/10"
          >
            {isAdmin ? (
              <>
                <Plus size={14} className="md:w-5 md:h-5 group-hover:rotate-90 transition-transform duration-300" />
                Add Record
              </>
            ) : (
              <>
                <LogIn size={14} className="md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                Login to Add
              </>
            )}
          </button>
          
          <div className="flex flex-col items-center gap-1 opacity-50">
            <div className="h-px w-20 md:w-32 bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
            <p className="text-[6px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
              Authorized Personnel Only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceViewer;
