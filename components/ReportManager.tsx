import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, Table, ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  UserCheck, ArrowRight, ArrowLeft, BarChart3, TrendingUp, Download, 
  BarChart, Clock, User, CheckCircle2, Save, Loader2, CalendarRange, Trash2, CalendarDays, Pencil, FileDown, AlignLeft, History, ShieldCheck, ShieldOff, Coffee, Briefcase, Lock, AlertTriangle, X, Check
} from 'lucide-react';
import { Booking, BookingField, HandoffInfo, DriverAttendance } from '../types';
import { generatePaymentSlip, generateOverallReport, generateTripSummaryReport, generateAttendanceSheet } from '../services/pdfService';
import { BOOKING_FIELDS } from '../constants';
import { 
  startOfMonth, endOfMonth, subMonths, format, parseISO, getYear, 
  startOfYear, endOfYear, differenceInDays, max, min, isSameMonth, addMonths, subDays, isSameDay, isWithinInterval
} from 'date-fns';
import { getDatabase, ref, push, set, onValue, remove } from 'firebase/database';
import Modal from './Modal';

interface ReportManagerProps {
  bookings: Booking[];
  onBack?: () => void;
  initialStep?: ReportStep;
}

type ReportStep = 'dashboard' | 'payment-slip-range' | 'handoff-prompt' | 'handoff-form' | 'detailed-setup' | 'trip-summary' | 'summary-download-range' | 'graph-choice' | 'driver-attendance' | 'attendance-download-range';

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

const ReportManager: React.FC<ReportManagerProps> = ({ bookings, onBack, initialStep = 'dashboard' }) => {
  const [activeStep, setActiveStep] = useState<ReportStep>(initialStep);
  const [selectedYear, setSelectedYear] = useState(() => getYear(new Date()));
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<DriverAttendance[]>([]);
  const [attendanceToDelete, setAttendanceToDelete] = useState<DriverAttendance | null>(null);
  
  const [historyMonth, setHistoryMonth] = useState(new Date());

  const [attendanceForm, setAttendanceForm] = useState<DriverAttendance>({
    date: format(new Date(), 'yyyy-MM-dd'),
    driverName: 'NAZRUL',
    inTime: '08:00',
    outTime: '17:00',
    isHoliday: false,
    isOfficeDay: false,
    isDutyDay: false,
    lastDayCompletionTime: '',
    remarks: ''
  });

  const [withSignature, setWithSignature] = useState(true);

  // Check if there was a booking on the previous day
  const hasPreviousBooking = useMemo(() => {
    if (!attendanceForm.date) return false;
    try {
      const selectedDateObj = parseISO(attendanceForm.date);
      const yesterdayDateObj = subDays(selectedDateObj, 1);
      return bookings.some(b => {
        if (b.isSpecialNote) return false;
        const bEnd = parseISO(b.endDate);
        return isSameDay(bEnd, yesterdayDateObj);
      });
    } catch (e) {
      return false;
    }
  }, [attendanceForm.date, bookings]);

  // Holiday Toggle Logic
  const toggleHoliday = () => {
    setAttendanceForm(prev => {
      const nextHoliday = !prev.isHoliday;
      return {
        ...prev,
        isHoliday: nextHoliday,
        // When holiday is enabled, office day must be disabled
        isOfficeDay: nextHoliday ? false : prev.isOfficeDay
      };
    });
  };

  // Selection Logic for Office vs Duty (Mutually Exclusive)
  const handleDayTypeSelection = (type: 'office' | 'duty') => {
    if (type === 'office') {
      if (attendanceForm.isHoliday) return; // Cannot select Office Day if Holiday is active
      setAttendanceForm(prev => ({
        ...prev,
        isOfficeDay: !prev.isOfficeDay,
        isDutyDay: false,
        remarks: prev.remarks === 'DUTY' ? '' : prev.remarks
      }));
    } else {
      // Duty Day Toggle with auto-fetching times from reservation
      const nextDuty = !attendanceForm.isDutyDay;
      if (nextDuty) {
        const selectedDateObj = parseISO(attendanceForm.date);
        const bookingForDay = bookings.find(b => {
          if (b.isSpecialNote) return false;
          const start = parseISO(b.startDate);
          const end = parseISO(b.endDate);
          return isWithinInterval(selectedDateObj, { start, end });
        });

        if (bookingForDay) {
          setAttendanceForm(prev => ({
            ...prev,
            isDutyDay: true,
            isOfficeDay: false,
            // Logic: Reservation OUT TIME -> Attendance IN TIME, Reservation IN TIME -> Attendance OUT TIME
            inTime: bookingForDay.outTime || prev.inTime,
            outTime: bookingForDay.inTime || prev.outTime,
            remarks: 'DUTY'
          }));
        } else {
          alert("No reservation found for the selected date to auto-populate times.");
          setAttendanceForm(prev => ({ 
            ...prev, 
            isDutyDay: true, 
            isOfficeDay: false, 
            remarks: 'DUTY' 
          }));
        }
      } else {
        setAttendanceForm(prev => ({
          ...prev,
          isDutyDay: false,
          remarks: prev.remarks === 'DUTY' ? '' : prev.remarks
        }));
      }
    }
  };

  // Auto-calculate Last Day Duty Completion Time based on selected date
  useEffect(() => {
    if (!attendanceForm.date) return;
    
    const selectedDateObj = parseISO(attendanceForm.date);
    const yesterdayDateObj = subDays(selectedDateObj, 1);
    
    const yesterdayBooking = bookings.find(b => {
      if (b.isSpecialNote) return false;
      const bEnd = parseISO(b.endDate);
      return isSameDay(bEnd, yesterdayDateObj);
    });

    setAttendanceForm(prev => {
      const calculatedVal = yesterdayBooking?.inTime || '';
      if (prev.lastDayCompletionTime === calculatedVal) return prev;
      return {
        ...prev,
        lastDayCompletionTime: calculatedVal
      };
    });
  }, [attendanceForm.date, bookings]);

  const [range, setRange] = useState(() => {
    const now = new Date();
    return {
      start: format(startOfMonth(now), 'yyyy-MM-dd'),
      end: format(endOfMonth(now), 'yyyy-MM-dd')
    };
  });

  const [summaryRange, setSummaryRange] = useState(() => {
    const now = new Date();
    return {
      start: format(startOfYear(now), 'yyyy-MM-dd'),
      end: format(endOfYear(now), 'yyyy-MM-dd')
    };
  });

  const [attendanceReportRange, setAttendanceReportRange] = useState(() => {
    const now = new Date();
    return {
      start: format(startOfMonth(now), 'yyyy-MM-dd'),
      end: format(endOfMonth(now), 'yyyy-MM-dd')
    };
  });
  
  const [selectedFields, setSelectedFields] = useState<BookingField[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const [handoffData, setHandoffData] = useState<HandoffInfo>({
    providerArmyNo: '',
    providerRank: '',
    providerName: '',
    receiverArmyNo: '',
    receiverRank: '',
    receiverName: '',
  });

  useEffect(() => {
    if (activeStep === 'driver-attendance' || activeStep === 'attendance-download-range') {
      const db = getDatabase();
      const attendanceRef = ref(db, 'attendance');
      const unsubscribe = onValue(attendanceRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const list = Object.keys(data).map(key => ({ ...data[key] }));
          setAttendanceRecords(list.sort((a, b) => b.date.localeCompare(a.date)));
        } else {
          setAttendanceRecords([]);
        }
      });
      return () => unsubscribe();
    }
  }, [activeStep]);

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
  const scaleValues = [25, 20, 10, 0];

  const handleSaveAttendance = async () => {
    setIsSavingAttendance(true);
    setSaveSuccess(false);
    try {
      const db = getDatabase();
      const attendanceRef = ref(db, 'attendance');
      const existing = attendanceRecords.find(r => r.date === attendanceForm.date);
      
      const recordToSave = {
        ...attendanceForm,
        id: (existing && existing.id) ? existing.id : undefined
      };

      if (recordToSave.id) {
         await set(ref(db, `attendance/${recordToSave.id}`), recordToSave);
      } else {
         const newAttendanceRef = push(attendanceRef);
         await set(newAttendanceRef, {
           ...recordToSave,
           id: newAttendanceRef.key
         });
      }
      
      setSaveSuccess(true);
      setAttendanceForm({
        ...attendanceForm,
        id: undefined,
        remarks: '',
        isDutyDay: false,
        isOfficeDay: false,
        isHoliday: false
      });
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Attendance save failed:", error);
      alert("Failed to save attendance.");
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleEditAttendance = (record: DriverAttendance) => {
    setAttendanceForm({
      date: record.date,
      driverName: record.driverName,
      inTime: record.inTime || '08:00',
      outTime: record.outTime || '17:00',
      isHoliday: record.isHoliday,
      isOfficeDay: record.isOfficeDay || false,
      isDutyDay: record.isDutyDay || false,
      lastDayCompletionTime: record.lastDayCompletionTime || '',
      remarks: record.remarks || '',
      id: record.id
    });
    const container = document.querySelector('.custom-scrollbar');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const confirmDeleteAttendance = async () => {
    if (!attendanceToDelete || !attendanceToDelete.id) return;
    try {
      const db = getDatabase();
      await remove(ref(db, `attendance/${attendanceToDelete.id}`));
      setAttendanceToDelete(null);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Delete failed.");
    }
  };

  const handleAttendanceSheetDownload = async () => {
    setIsGenerating(true);
    await generateAttendanceSheet(attendanceRecords, attendanceReportRange.start, attendanceReportRange.end, withSignature);
    setIsGenerating(false);
    setActiveStep('driver-attendance');
  };

  const filteredAttendance = useMemo(() => {
    const monthStr = format(historyMonth, 'yyyy-MM');
    return attendanceRecords.filter(record => record.date.startsWith(monthStr))
      .sort((a, b) => a.date.localeCompare(b.date)); 
  }, [attendanceRecords, historyMonth]);

  const toggleField = (field: BookingField) => {
    setSelectedFields(prev => 
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  const isRangeValid = range.start && range.end;
  const isSummaryRangeValid = summaryRange.start && summaryRange.end;
  const isAttendanceRangeValid = attendanceReportRange.start && attendanceReportRange.end;

  const handlePaymentRangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRangeValid) setActiveStep('handoff-prompt');
  };

  const handlePromptChoice = (choice: 'yes' | 'no') => {
    if (choice === 'yes') {
      setActiveStep('handoff-form');
    } else {
      (async () => {
        setIsGenerating(true);
        await generatePaymentSlip(bookings, range.start, range.end);
        setIsGenerating(false);
        setActiveStep('dashboard');
      })();
    }
  };

  const handleHandoffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    await generatePaymentSlip(bookings, range.start, range.end, handoffData);
    setIsGenerating(false);
    setActiveStep('dashboard');
  };

  const handleDetailedReportExport = async () => {
    setIsGenerating(true);
    await generateOverallReport(bookings, range.start, range.end, selectedFields);
    setIsGenerating(false);
    setActiveStep('dashboard');
  };

  const handleTripSummaryDownload = async (withGraph: boolean) => {
    setIsGenerating(true);
    await generateTripSummaryReport(bookings, summaryRange.start, summaryRange.end, withGraph);
    setIsGenerating(false);
    setActiveStep('trip-summary');
  };

  const inputClasses = "block w-full min-w-0 pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-bold text-white shadow-sm hover:border-white/20 box-border appearance-none";
  const labelClasses = "text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1";

  const StepHeader = ({ title, subtitle, onBackStep }: { title: string, subtitle: string, onBackStep: () => void }) => (
    <div className="flex items-center gap-3 md:gap-4 mb-4 animate-in fade-in slide-in-from-left-4 duration-500">
      <button 
        onClick={onBackStep}
        className="w-9 h-9 flex items-center justify-center bg-white/5 border border-white/10 text-slate-400 rounded-xl hover:bg-white hover:text-slate-900 transition-all active:scale-90 shadow-sm shrink-0"
      >
        <ArrowLeft size={18} />
      </button>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm md:text-xl font-black text-white uppercase tracking-tight leading-none truncate">{title}</h3>
        <p className="text-slate-400 font-bold text-[8px] md:text-[10px] uppercase tracking-widest mt-0.5 truncate">{subtitle}</p>
      </div>
    </div>
  );

  const DateInput = ({ label, value, onChange }: any) => (
    <div className="relative group w-full mb-1">
      <label className={labelClasses}>{label}</label>
      <div className="relative w-full overflow-hidden rounded-xl">
        <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none z-10" size={16} />
        <input 
          required
          type="date" 
          value={value}
          onChange={onChange}
          className={inputClasses}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col max-w-4xl mx-auto w-full px-4 md:px-0 box-border min-h-0 h-full overflow-y-auto custom-scrollbar pb-10">
      {activeStep === 'dashboard' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 md:space-y-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight truncate">Report Generator</h2>
              <p className="text-slate-400 font-bold mt-0.5 uppercase text-[7px] md:text-[10px] tracking-[0.2em]">Choose a document type</p>
            </div>
            {onBack && (
              <button 
                onClick={onBack}
                className="flex items-center justify-center gap-2 text-[8px] md:text-[10px] font-black text-slate-300 hover:text-white transition-all uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 px-4 md:px-6 py-2 rounded-lg md:rounded-xl shadow-sm shrink-0"
              >
                <ArrowLeft size={12} /> Back
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => setActiveStep('payment-slip-range')} className="p-4 md:p-6 bg-[#062c1e] rounded-2xl md:rounded-[2rem] border-2 border-white/5 shadow-xl hover:border-emerald-600 transition-all group text-left flex flex-col items-start">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <FileText size={20} strokeWidth={2.5} />
              </div>
              <h4 className="text-sm md:text-lg font-black text-white uppercase tracking-tight mb-1">Payment Slip</h4>
              <p className="text-slate-400 font-medium text-[9px] md:text-xs leading-relaxed mb-4 opacity-80">Handover bills with automated calculations and officer details.</p>
              <div className="mt-auto flex items-center gap-2 text-emerald-400 font-black uppercase text-[8px] md:text-[10px] tracking-widest">
                Start Generation <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button onClick={() => setActiveStep('driver-attendance')} className="p-4 md:p-6 bg-[#062c1e] rounded-2xl md:rounded-[2rem] border-2 border-white/5 shadow-xl hover:border-amber-500 transition-all group text-left flex flex-col items-start">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Clock size={20} strokeWidth={2.5} />
              </div>
              <h4 className="text-sm md:text-lg font-black text-white uppercase tracking-tight mb-1">Driver's Attendance</h4>
              <p className="text-slate-400 font-medium text-[9px] md:text-xs leading-relaxed mb-4 opacity-80">Record daily In/Out times for Nazrul or other drivers.</p>
              <div className="mt-auto flex items-center gap-2 text-amber-400 font-black uppercase text-[8px] md:text-[10px] tracking-widest">
                Manage Timing <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button onClick={() => setActiveStep('detailed-setup')} className="p-4 md:p-6 bg-[#062c1e] rounded-2xl md:rounded-[2rem] border-2 border-white/5 shadow-xl hover:border-emerald-600 transition-all group text-left flex flex-col items-start">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-700 text-white rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Table size={20} strokeWidth={2.5} />
              </div>
              <h4 className="text-sm md:text-lg font-black text-white uppercase tracking-tight mb-1">Detailed Data</h4>
              <p className="text-slate-400 font-medium text-[9px] md:text-xs leading-relaxed mb-4 opacity-80">Full export of booking history with fully custom columns.</p>
              <div className="mt-auto flex items-center gap-2 text-slate-400 font-black uppercase text-[8px] md:text-[10px] tracking-widest">
                Configure Table <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            <button onClick={() => setActiveStep('trip-summary')} className="p-4 md:p-6 bg-[#062c1e] rounded-2xl md:rounded-[2rem] border-2 border-white/5 shadow-xl hover:border-amber-500 transition-all group text-left flex flex-col items-start">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-500 text-white rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <BarChart3 size={20} strokeWidth={2.5} />
              </div>
              <h4 className="text-sm md:text-lg font-black text-white uppercase tracking-tight mb-1">Trip Summary</h4>
              <p className="text-slate-400 font-medium text-[9px] md:text-xs leading-relaxed mb-4 opacity-80">View month-wise trip volume for the current year in an animated chart.</p>
              <div className="mt-auto flex items-center gap-2 text-amber-500 font-black uppercase text-[8px] md:text-[10px] tracking-widest">
                View Statistics <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        </div>
      )}

      {activeStep === 'driver-attendance' && (
        <div className="animate-in fade-in slide-in-from-right-6 duration-500 max-w-lg mx-auto w-full py-6 space-y-10">
          <StepHeader title="Driver Attendance" subtitle="Daily Log Management" onBackStep={() => setActiveStep('dashboard')} />
          
          <div className="bg-[#062c1e] p-6 rounded-3xl border-2 border-white/5 shadow-2xl space-y-6">
            <div className="space-y-4">
              <DateInput 
                label="Attendance Date" 
                value={attendanceForm.date} 
                onChange={(e:any) => setAttendanceForm({...attendanceForm, date: e.target.value})} 
              />

              <div className="relative group">
                <label className={labelClasses}>Driver's Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none z-10" size={16} />
                  <input 
                    type="text"
                    value={attendanceForm.driverName}
                    onChange={(e) => setAttendanceForm({...attendanceForm, driverName: e.target.value})}
                    className={inputClasses}
                    placeholder="e.g., NAZRUL"
                  />
                </div>
              </div>

              <div className="space-y-3">
                 <div 
                   onClick={toggleHoliday}
                   className={`flex flex-col items-center justify-center py-4 px-2 rounded-xl border-2 cursor-pointer transition-all h-14 ${attendanceForm.isHoliday ? 'bg-amber-500/10 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/10'}`}
                 >
                   <div className="flex items-center gap-2">
                     <Coffee size={14} className={attendanceForm.isHoliday ? 'text-amber-500' : 'text-slate-400'} />
                     <h4 className={`text-[10px] font-black uppercase tracking-widest ${attendanceForm.isHoliday ? 'text-amber-500' : 'text-slate-300'}`}>Holiday</h4>
                   </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div 
                     onClick={() => handleDayTypeSelection('office')}
                     className={`flex flex-col items-center justify-center py-4 px-2 rounded-xl border-2 cursor-pointer transition-all h-14 ${attendanceForm.isHoliday ? 'opacity-40 cursor-not-allowed grayscale bg-black/20 border-white/5' : attendanceForm.isOfficeDay ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                   >
                     <h4 className={`text-[10px] font-black uppercase tracking-widest ${attendanceForm.isOfficeDay ? 'text-emerald-500' : 'text-slate-300'}`}>Office Day</h4>
                   </div>

                   <div 
                     onClick={() => handleDayTypeSelection('duty')}
                     className={`flex flex-col items-center justify-center py-4 px-2 rounded-xl border-2 cursor-pointer transition-all h-14 ${attendanceForm.isDutyDay ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                   >
                     <h4 className={`text-[10px] font-black uppercase tracking-widest ${attendanceForm.isDutyDay ? 'text-emerald-500' : 'text-slate-300'}`}>Duty Day</h4>
                   </div>
                 </div>
              </div>

              {(!attendanceForm.isHoliday || attendanceForm.isDutyDay) && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="relative group">
                    <label className={labelClasses}>In Time</label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none z-10" size={16} />
                      <input 
                        type="time"
                        value={attendanceForm.inTime}
                        onChange={(e) => setAttendanceForm({...attendanceForm, inTime: e.target.value})}
                        className={inputClasses}
                      />
                    </div>
                  </div>
                  <div className="relative group">
                    <label className={labelClasses}>Out Time</label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none z-10" size={16} />
                      <input 
                        type="time"
                        value={attendanceForm.outTime}
                        onChange={(e) => setAttendanceForm({...attendanceForm, outTime: e.target.value})}
                        className={inputClasses}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Last Day Duty Completion Time: Disabled if no activity on previous day */}
              <div className="relative group">
                <label className={labelClasses}>Last Day Duty Completion Time</label>
                <div className="relative">
                  <History className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${hasPreviousBooking ? 'text-emerald-500/60' : 'text-slate-500/30'} group-focus-within:text-emerald-500 transition-colors pointer-events-none z-10`} size={16} />
                  <input 
                    disabled={!hasPreviousBooking}
                    type="time"
                    value={attendanceForm.lastDayCompletionTime || ''}
                    onChange={(e) => setAttendanceForm({...attendanceForm, lastDayCompletionTime: e.target.value})}
                    className={`${inputClasses} ${hasPreviousBooking ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-black/20 border-white/5 text-slate-500 cursor-not-allowed'} focus:border-emerald-500`}
                    placeholder={hasPreviousBooking ? "Select Time" : "No activity recorded"}
                  />
                  {!hasPreviousBooking && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600">
                      <Lock size={14} />
                    </div>
                  )}
                </div>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tight mt-1 ml-1">
                  {hasPreviousBooking ? 'Automatically fetched from the previous day\'s reservation' : 'Field locked: No reservation found for previous day'}
                </p>
              </div>

              <div className="relative group">
                <label className={labelClasses}>Remarks</label>
                <div className="relative">
                  <AlignLeft className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none z-10" size={16} />
                  <textarea 
                    value={attendanceForm.remarks || ''}
                    onChange={(e) => setAttendanceForm({...attendanceForm, remarks: e.target.value})}
                    className={`${inputClasses} pl-10 pt-2.5 min-h-[80px] resize-none font-medium text-xs`}
                    placeholder="Enter any additional notes..."
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleSaveAttendance}
              disabled={isSavingAttendance || saveSuccess}
              className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] ${saveSuccess ? 'bg-emerald-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'}`}
            >
              {isSavingAttendance ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving Entry...
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 size={18} />
                  Attendance Saved!
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Attendance
                </>
              )}
            </button>
          </div>

          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10 w-full overflow-hidden">
             <div className="flex flex-col md:flex-row md:items-end justify-between px-2 gap-4">
                <div className="flex items-center gap-4">
                   <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-600/10 text-emerald-500 rounded-lg md:rounded-xl flex items-center justify-center border border-emerald-500/20 shadow-inner">
                      <CalendarRange size={18} />
                   </div>
                   <div className="flex flex-col">
                      <div className="flex items-baseline gap-2">
                        <h4 className="text-[10px] md:text-sm font-black text-white uppercase tracking-tight whitespace-nowrap">ATTENDANCE LOG</h4>
                        <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-white/10 shadow-lg shrink-0">
                           <button onClick={() => setHistoryMonth(m => subMonths(m, 1))} className="text-slate-500 hover:text-emerald-400 active:scale-90 transition-colors"><ChevronLeft size={14} /></button>
                           <span className="text-[8px] md:text-[10px] font-black text-emerald-400 uppercase tracking-widest min-w-[90px] text-center">
                             {format(historyMonth, 'MMM yyyy')}
                           </span>
                           <button onClick={() => setHistoryMonth(m => addMonths(m, 1))} className="text-slate-500 hover:text-emerald-400 active:scale-90 transition-colors"><ChevronRight size={14} /></button>
                        </div>
                      </div>
                   </div>
                </div>
                
                <div className="bg-emerald-500/5 border border-emerald-500/10 px-3 py-0.5 rounded-full self-start">
                   <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest">
                     {filteredAttendance.length} entries
                   </span>
                </div>
             </div>

             <div className="bg-[#0a1128]/40 rounded-xl md:rounded-2xl border border-white/20 overflow-hidden shadow-2xl w-full">
                {filteredAttendance.length > 0 ? (
                  <div className="w-full">
                    <table className="w-full text-left border-collapse border border-white/20 table-fixed">
                      <thead>
                        <tr className="bg-black/40">
                          <th className="p-2 md:p-3 text-[8px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest w-[85px] md:w-[120px] border border-white/20">Date</th>
                          <th className="p-2 md:p-3 text-[8px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest border border-white/20 w-[70px] md:w-[100px]">Day</th>
                          <th className="p-2 md:p-3 text-[8px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest text-center border border-white/20 w-[60px] md:w-[80px]">In</th>
                          <th className="p-2 md:p-3 text-[8px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest text-center border border-white/20 w-[60px] md:w-[80px]">Out</th>
                          <th className="p-2 md:p-3 text-[8px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest text-right border border-white/20 w-[70px] md:w-[90px]">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/[0.02]">
                        {filteredAttendance.map((record, index) => (
                          <tr key={record.id || index} className="group hover:bg-white/[0.05] transition-colors">
                            <td className="p-2 md:p-3 whitespace-nowrap border border-white/20 overflow-hidden text-ellipsis">
                               <span className="text-[9px] md:text-sm font-black text-white uppercase tracking-tight">
                                  {format(parseISO(record.date), 'dd MMM yy')}
                               </span>
                            </td>
                            <td className="p-2 md:p-3 whitespace-nowrap border border-white/20 overflow-hidden text-ellipsis">
                               <span className="text-[8px] md:text-xs font-black text-emerald-500/80 uppercase tracking-widest">
                                  {format(parseISO(record.date), 'EEEE')}
                               </span>
                            </td>
                            {record.isHoliday && !record.isDutyDay ? (
                              <td colSpan={2} className="p-2 md:p-3 text-center border border-white/20 bg-amber-500/5">
                                <div className="inline-flex items-center gap-1 px-2 py-1 border border-amber-500/20 rounded-md">
                                   <span className="text-[7px] md:text-[10px] font-black text-amber-500 uppercase tracking-widest">HOLIDAY</span>
                                </div>
                              </td>
                            ) : (
                              <>
                                <td className="p-2 md:p-3 text-center border border-white/20">
                                   <div className="inline-flex items-center bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
                                      <span className="text-[8px] md:text-xs font-black text-emerald-400">{record.inTime}</span>
                                   </div>
                                </td>
                                <td className="p-2 md:p-3 text-center border border-white/20">
                                   <div className="inline-flex items-center bg-amber-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
                                      <span className="text-[8px] md:text-xs font-black text-amber-400">{record.outTime}</span>
                                   </div>
                                </td>
                              </>
                            )}
                            <td className="p-2 md:p-3 text-right border border-white/20">
                               <div className="flex items-center justify-end gap-1 md:gap-2">
                                 <button 
                                   onClick={() => handleEditAttendance(record)}
                                   className="w-7 h-7 md:w-8 md:h-8 rounded-md inline-flex items-center justify-center text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                   title="Edit Entry"
                                  >
                                   <Pencil size={14} />
                                 </button>
                                 <button 
                                   onClick={() => setAttendanceToDelete(record)}
                                   className="w-7 h-7 md:w-8 md:h-8 rounded-md inline-flex items-center justify-center text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                   title="Delete Entry"
                                  >
                                   <Trash2 size={14} />
                                 </button>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-24 flex flex-col items-center justify-center opacity-40">
                    <CalendarDays size={48} className="text-slate-600 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No logs for {format(historyMonth, 'MMMM yyyy')}</p>
                    <p className="text-[8px] font-bold text-slate-600 uppercase mt-2 tracking-widest">AREA HQ BARISHAL</p>
                  </div>
                )}
             </div>

             <div className="pt-6 flex flex-col items-center">
                <button 
                  onClick={() => setActiveStep('attendance-download-range')}
                  className="flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(16,185,129,0.2)] transition-all active:scale-[0.98] group border-2 border-white/10"
                >
                  <FileDown size={18} className="group-hover:translate-y-0.5 transition-transform" />
                  Download Attendance Sheet
                </button>
             </div>
          </div>
        </div>
      )}

      {activeStep === 'attendance-download-range' && (
        <div className="animate-in fade-in slide-in-from-right-6 duration-500 max-w-md mx-auto w-full py-8">
          <StepHeader title="Attendance Range" subtitle="Choose export period" onBackStep={() => setActiveStep('driver-attendance')} />
          <form 
            onSubmit={(e) => { e.preventDefault(); if(isAttendanceRangeValid) handleAttendanceSheetDownload(); }} 
            className="space-y-6 bg-[#062c1e] p-8 rounded-[2.5rem] border-2 border-white/5 shadow-2xl"
          >
             <div className="grid grid-cols-1 gap-6">
               <DateInput label="Start Date" value={attendanceReportRange.start} onChange={(e:any) => setAttendanceReportRange(p => ({...p, start: e.target.value}))} />
               <DateInput label="End Date" value={attendanceReportRange.end} onChange={(e:any) => setAttendanceReportRange(p => ({...p, end: e.target.value}))} />
               
               <div className="space-y-2">
                 <label className={labelClasses}>Signature Policy</label>
                 <div className="flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setWithSignature(true)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl border transition-all ${withSignature ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:border-emerald-500/30'}`}
                    >
                      <ShieldCheck size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">With Signature</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setWithSignature(false)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl border transition-all ${!withSignature ? 'bg-amber-600 text-white border-amber-500 shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:border-amber-500/30'}`}
                    >
                      <ShieldOff size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Without Signature</span>
                    </button>
                 </div>
                 <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tight ml-1">
                   {withSignature ? 'Includes Driver/JCO cols & Countersign' : 'Removes Driver/JCO cols & Countersign'}
                 </p>
               </div>
             </div>
             
             <button 
              type="submit" 
              disabled={!isAttendanceRangeValid || isGenerating} 
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-emerald-900/20 disabled:opacity-50 flex items-center justify-center gap-3 transition-all active:scale-95"
             >
                {isGenerating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Download PDF Sheet
                  </>
                )}
             </button>
          </form>
        </div>
      )}

      {activeStep === 'trip-summary' && (
        <div className="animate-in fade-in zoom-in-95 duration-500 w-full flex flex-col py-1 md:py-2 h-full min-h-0 overflow-hidden">
          <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-1 shrink-0 mb-1">
            <StepHeader 
              title="Trip Statistics" 
              subtitle={`Total Days Booked per Month (${selectedYear})`} 
              onBackStep={() => setActiveStep('dashboard')} 
            />
            <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/10 self-end md:self-center shadow-lg">
               <button onClick={() => setSelectedYear(y => y - 1)} className="p-1 hover:bg-white/10 rounded-lg text-slate-400 active:scale-90"><ChevronLeft size={16} /></button>
               <span className="text-xs font-black text-white min-w-[50px] text-center tracking-widest">{selectedYear}</span>
               <button onClick={() => setSelectedYear(y => y + 1)} className="p-1 hover:bg-white/10 rounded-lg text-slate-400 active:scale-90"><ChevronRight size={16} /></button>
            </div>
          </div>
          
          <div className="w-full bg-[#062c1e] p-3 md:p-6 rounded-2xl md:rounded-[2rem] border-2 border-white/5 shadow-2xl relative flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="flex items-center gap-3 mb-4 md:mb-6 shrink-0">
               <div className="w-8 h-8 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center">
                  <TrendingUp size={18} />
               </div>
               <div>
                  <h3 className="text-sm md:text-lg font-black text-white uppercase tracking-tight">MONTH WISE TRIP STATISTICS</h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Trip Analysis for {selectedYear}</p>
               </div>
            </div>

            <div className="flex items-end gap-1 md:gap-4 relative group flex-1 pt-12 pb-6 min-h-0">
              <div className="flex flex-col justify-between h-full text-right pr-1 md:pr-2 select-none border-r border-white/5 pb-6">
                 {scaleValues.map(val => (
                   <div key={`l-${val}`} className="flex items-center justify-end gap-1">
                     <span className="text-[8px] md:text-[10px] font-black text-slate-500">{val}</span>
                     <div className="w-1 h-[1px] bg-slate-600"></div>
                   </div>
                 ))}
              </div>

              <div className="flex-1 relative h-full flex items-end justify-between gap-1 md:gap-4 px-1 md:px-2 border-b-2 border-white/10 pb-6">
                 <div className="absolute inset-0 flex flex-col pointer-events-none opacity-[0.05] px-2 pb-6">
                    <div className="absolute left-0 right-0 border-t border-white" style={{ bottom: '100%' }}></div>
                    <div className="absolute left-0 right-0 border-t border-white" style={{ bottom: '80%' }}></div>
                    <div className="absolute left-0 right-0 border-t border-white" style={{ bottom: '40%' }}></div>
                    <div className="absolute left-0 right-0" style={{ bottom: '0%' }}></div>
                 </div>

                 {monthlyStats.map((stat, i) => {
                   const heightPercent = Math.min((stat.count / maxScale) * 100, 100);
                   const finalHeight = Math.max(heightPercent, stat.count > 0 ? 3 : 0);
                   return (
                     <div key={`${selectedYear}-${stat.month}`} className="flex-1 flex flex-col items-center group/bar relative z-10 h-full justify-end">
                        <div 
                          className="w-full max-w-[20px] md:max-w-[48px] rounded-t-sm md:rounded-t-lg shadow-lg animate-bar-grow transition-all cursor-default border-x border-t border-white/10 hover:brightness-125 block"
                          style={{ 
                            height: `${finalHeight}%`,
                            animationDelay: `${i * 80}ms`,
                            background: stat.style.gradient,
                            backgroundColor: stat.style.color
                          }}
                        ></div>
                        <span className="absolute -bottom-6 text-[7px] md:text-[10px] font-black text-slate-400 uppercase tracking-tight group-hover/bar:text-white transition-colors">
                          {stat.month}
                        </span>
                        {stat.count > 0 && (
                          <span className="absolute -top-7 md:-top-10 text-[10px] md:text-[12px] font-black text-white bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-md z-30 shadow-sm border border-white/10 whitespace-nowrap">
                            {stat.count}
                          </span>
                        )}
                     </div>
                   );
                 })}
              </div>

              <div className="flex flex-col justify-between h-full text-left pl-1 md:pl-2 select-none border-l border-white/5 pb-6">
                 {scaleValues.map(val => (
                   <div key={`r-${val}`} className="flex items-center gap-1">
                     <div className="w-1 h-[1px] bg-slate-600"></div>
                     <span className="text-[8px] md:text-[10px] font-black text-slate-500">{val}</span>
                   </div>
                 ))}
              </div>
            </div>
            
            <div className="mt-2 pt-3 border-t border-white/5 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></div>
                  <span className="text-[8px] font-black text-white uppercase tracking-widest">Trip Statistics</span>
               </div>
               <div className="px-4 py-1.5 bg-emerald-600/10 rounded-xl border border-emerald-500/20">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                    <BarChart3 size={12} /> Total Booked Days: {monthlyStats.reduce((a, b) => a + b.count, 0)}
                  </span>
               </div>
            </div>
          </div>

          <div className="mt-2 flex flex-col items-center shrink-0 pb-4">
            <button
              onClick={() => setActiveStep('summary-download-range')}
              className="flex items-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] group border border-white/10"
            >
              <Download size={16} />
              Download Trip Summary
            </button>
          </div>
        </div>
      )}

      {activeStep === 'summary-download-range' && (
        <div className="animate-in fade-in slide-in-from-right-6 duration-500 max-w-md mx-auto w-full py-6">
          <StepHeader title="Summary Range" subtitle="Select period" onBackStep={() => setActiveStep('trip-summary')} />
          <form onSubmit={(e) => { e.preventDefault(); if(isSummaryRangeValid) setActiveStep('graph-choice'); }} className="space-y-4 bg-[#062c1e] p-6 rounded-2xl border-2 border-white/5 shadow-2xl">
             <div className="grid grid-cols-1 gap-4">
               <DateInput label="Start Month" value={summaryRange.start} onChange={(e:any) => setSummaryRange(p => ({...p, start: e.target.value}))} />
               <DateInput label="End Month" value={summaryRange.end} onChange={(e:any) => setSummaryRange(p => ({...p, end: e.target.value}))} />
             </div>
             <button type="submit" disabled={!isSummaryRangeValid} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black uppercase text-[10px] shadow-lg disabled:opacity-50 mt-2">Continue <ArrowRight size={14} className="inline ml-1" /></button>
          </form>
        </div>
      )}

      {activeStep === 'graph-choice' && (
        <div className="animate-in fade-in zoom-in-95 duration-500 max-md:max-w-md mx-auto text-center space-y-6 py-12">
          <div className="w-14 h-14 bg-blue-600/10 text-blue-500 rounded-2xl flex items-center justify-center mx-auto shadow-inner"><BarChart size={24} /></div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Report Format</h3>
            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest leading-relaxed">Choose whether to include a chart in your summary PDF.</p>
          </div>
          <div className="flex flex-col gap-3 px-6">
            <button onClick={() => handleTripSummaryDownload(true)} disabled={isGenerating} className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg flex items-center justify-center gap-2">
              {isGenerating ? 'Processing...' : <><BarChart3 size={16} /> With Graph</>}
            </button>
            <button onClick={() => handleTripSummaryDownload(false)} disabled={isGenerating} className="w-full bg-white/10 text-slate-300 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
              {isGenerating ? 'Processing...' : <><Table size={16} /> Without Graph</>}
            </button>
          </div>
        </div>
      )}

      {activeStep === 'payment-slip-range' && (
        <div className="animate-in fade-in slide-in-from-right-6 duration-500 max-w-md mx-auto w-full py-8">
          <StepHeader title="Step 1: Period" subtitle="Choose date range" onBackStep={() => setActiveStep('dashboard')} />
          <form onSubmit={handlePaymentRangeSubmit} className="space-y-4 bg-[#062c1e] p-6 rounded-2xl border-2 border-white/5 shadow-2xl">
             <div className="flex gap-2 justify-center mb-1">
                <button type="button" onClick={() => setRange({ start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: format(endOfMonth(new Date()), 'yyyy-MM-dd') })} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-md">This Month</button>
                <button type="button" onClick={() => {
                  const last = subMonths(new Date(), 1);
                  setRange({ start: format(startOfMonth(last), 'yyyy-MM-dd'), end: format(endOfMonth(last), 'yyyy-MM-dd') });
                }} className="px-3 py-1.5 bg-white/10 text-slate-300 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-white/20">Last Month</button>
             </div>
             <div className="grid grid-cols-1 gap-4">
               <DateInput label="From Date" value={range.start} onChange={(e:any) => setRange(p => ({...p, start: e.target.value}))} />
               <DateInput label="To Date" value={range.end} onChange={(e:any) => setRange(p => ({...p, end: e.target.value}))} />
             </div>
             <button type="submit" disabled={!isRangeValid} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black uppercase text-[10px] shadow-lg disabled:opacity-50 mt-2">Next Step <ArrowRight size={14} className="inline ml-1" /></button>
          </form>
        </div>
      )}

      {activeStep === 'handoff-prompt' && (
        <div className="animate-in fade-in zoom-in-95 duration-500 max-md:max-w-md mx-auto text-center space-y-6 py-12">
          <div className="w-14 h-14 bg-emerald-600/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto"><UserCheck size={24} /></div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Add Signatures?</h3>
            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest leading-relaxed">Include officer info for the official handover section?</p>
          </div>
          <div className="flex flex-col gap-2 px-8">
            <button onClick={() => handlePromptChoice('yes')} className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg">Yes, Add Info</button>
            <button onClick={() => handlePromptChoice('no')} className="w-full bg-white/10 text-slate-300 py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px]">No, Skip</button>
          </div>
        </div>
      )}

      {activeStep === 'handoff-form' && (
        <div className="animate-in fade-in slide-in-from-right-6 duration-500 max-md:max-w-md mx-auto w-full py-4 overflow-y-auto custom-scrollbar pr-1">
          <StepHeader title="Personnel Info" subtitle="Handover details" onBackStep={() => setActiveStep('handoff-prompt')} />
          <form onSubmit={handleHandoffSubmit} className="space-y-4">
            <div className="bg-[#062c1e] p-5 rounded-[1.5rem] border-2 border-white/5 shadow-xl space-y-3">
              <h5 className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Provider</h5>
              <div className="grid grid-cols-1 gap-2">
                <input required value={handoffData.providerArmyNo} onChange={e => setHandoffData({...handoffData, providerArmyNo: e.target.value})} className={inputClasses} placeholder="Army No" />
                <input required value={handoffData.providerRank} onChange={e => setHandoffData({...handoffData, providerRank: e.target.value})} className={inputClasses} placeholder="Rank" />
                <input required value={handoffData.providerName} onChange={e => setHandoffData({...handoffData, providerName: e.target.value})} className={inputClasses} placeholder="Full Name" />
              </div>
            </div>
            <div className="bg-[#062c1e] p-5 rounded-[1.5rem] border-2 border-white/5 shadow-xl space-y-3">
              <h5 className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Receiver</h5>
              <div className="grid grid-cols-1 gap-2">
                <input required value={handoffData.receiverArmyNo} onChange={e => setHandoffData({...handoffData, receiverArmyNo: e.target.value})} className={inputClasses} placeholder="Army No" />
                <input required value={handoffData.receiverRank} onChange={e => setHandoffData({...handoffData, receiverRank: e.target.value})} className={inputClasses} placeholder="Rank" />
                <input required value={handoffData.receiverName} onChange={e => setHandoffData({...handoffData, receiverName: e.target.value})} className={inputClasses} placeholder="Full Name" />
              </div>
            </div>
            <button type="submit" disabled={isGenerating} className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl">{isGenerating ? 'Processing...' : 'Finalize PDF'}</button>
          </form>
        </div>
      )}

      {activeStep === 'detailed-setup' && (
        <div className="animate-in fade-in slide-in-from-right-6 duration-500 w-full max-w-xl mx-auto py-8">
          <StepHeader title="Detailed Export" subtitle="Select options" onBackStep={() => setActiveStep('dashboard')} />
          <div className="bg-[#062c1e] p-6 rounded-[2rem] border-2 border-white/5 shadow-xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DateInput label="From Date" value={range.start} onChange={(e:any) => setRange(p => ({...p, start: e.target.value}))} />
              <DateInput label="To Date" value={range.end} onChange={(e:any) => setRange(p => ({...p, end: e.target.value}))} />
            </div>
            <div className="space-y-3">
              <h4 className="text-[9px] font-black text-white uppercase tracking-tight border-b border-white/5 pb-1">Select Columns</h4>
              <div className="flex flex-col gap-2">
                {BOOKING_FIELDS.map(f => (
                  <button key={f.value} onClick={() => toggleField(f.value as BookingField)} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 transition-all ${selectedFields.includes(f.value as BookingField) ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-white/5 text-slate-500 border-white/5 hover:border-emerald-500/30'}`}>
                    <div className={`w-3 h-3 rounded flex items-center justify-center border ${selectedFields.includes(f.value as BookingField) ? 'bg-white border-white text-emerald-600' : 'border-white/20'}`}>
                      {selectedFields.includes(f.value as BookingField) && <div className="w-1.5 h-1.5 bg-emerald-600 rounded-sm"></div>}
                    </div>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleDetailedReportExport} disabled={!isRangeValid || selectedFields.length === 0 || isGenerating} className="w-full bg-emerald-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg disabled:opacity-30">{isGenerating ? 'Generating...' : 'Export PDF'}</button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deletion */}
      <Modal 
        isOpen={!!attendanceToDelete} 
        onClose={() => setAttendanceToDelete(null)} 
        title="Delete Confirmation" 
        variant="dark"
      >
        <div className="flex flex-col items-center space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-500/20 shadow-inner">
            <AlertTriangle size={32} />
          </div>
          
          <div className="space-y-2">
            <h4 className="text-lg font-black text-white uppercase tracking-tight">Are you sure?</h4>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
              This will permanently delete the attendance record for <span className="text-white">{attendanceToDelete ? format(parseISO(attendanceToDelete.date), 'dd MMMM yyyy') : ''}</span>. 
              This action cannot be undone.
            </p>
          </div>

          <div className="flex w-full gap-3">
            <button 
              onClick={() => setAttendanceToDelete(null)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white/5 text-slate-300 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
            >
              <X size={16} /> Cancel
            </button>
            <button 
              onClick={confirmDeleteAttendance}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-900/20 hover:bg-rose-500 transition-all active:scale-95"
            >
              <Check size={16} /> Yes, Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReportManager;