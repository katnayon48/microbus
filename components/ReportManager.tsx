
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  FileText, Table, ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  UserCheck, ArrowRight, ArrowLeft, BarChart3, TrendingUp, Download, 
  BarChart, Clock, User, CheckCircle2, Save, Loader2, CalendarRange, 
  Trash2, CalendarDays, Pencil, FileDown, AlignLeft, History, 
  ShieldCheck, ShieldOff, Coffee, Briefcase, Lock, AlertTriangle, 
  X, Check, Droplets, Fuel, Sparkles, LayoutDashboard, Database,
  Type, UserPlus, Fingerprint, FileSpreadsheet, RotateCw, CheckCircle, Plus
} from 'lucide-react';
import { Booking, BookingField, HandoffInfo, DriverAttendance } from '../types';
import { 
  generatePaymentSlip, generateOverallReport, generateTripSummaryReport, 
  generateAttendanceSheet, generateFuelReport 
} from '../services/pdfService';
import { BOOKING_FIELDS } from '../constants';
import { 
  startOfMonth, endOfMonth, subMonths, format, getYear, 
  startOfYear, endOfYear, differenceInDays, isSameMonth, 
  addMonths, subDays, isSameDay, isWithinInterval, parseISO,
  max, min
} from 'date-fns';
import { getDatabase, ref, push, set, onValue, remove } from 'firebase/database';
import Modal from './Modal';

interface ReportManagerProps {
  bookings: Booking[];
  onBack?: () => void;
  initialStep?: ReportStep;
}

type ReportStep = 'dashboard' | 'payment-slip-range' | 'handoff-prompt' | 'handoff-form' | 'detailed-setup' | 'trip-summary' | 'summary-download-range' | 'graph-choice' | 'driver-attendance' | 'attendance-download-range' | 'fuel-report-range';

const MONTH_BAR_STYLES = [
  { color: '#10b981', gradient: 'linear-gradient(to top, #064e3b, #10b981)' },
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<DriverAttendance[]>([]);
  const [historyMonth, setHistoryMonth] = useState(new Date());
  
  // State to control visibility of the attendance form
  const [isAddingAttendance, setIsAddingAttendance] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Signature States
  const [withSignature, setWithSignature] = useState(true);
  const [fuelWithSignature, setFuelWithSignature] = useState(true);
  const [masterDataWithSignature, setMasterDataWithSignature] = useState(false);
  const [customHeader, setCustomHeader] = useState('');
  const [selectedFields, setSelectedFields] = useState<BookingField[]>([]);

  const [handoffData, setHandoffData] = useState<HandoffInfo>({
    providerArmyNo: '',
    providerRank: '',
    providerName: '',
    receiverArmyNo: '',
    receiverRank: '',
    receiverName: '',
  });

  const [range, setRange] = useState(() => {
    const now = new Date();
    return {
      start: format(startOfMonth(now), 'yyyy-MM-dd'),
      end: format(endOfMonth(now), 'yyyy-MM-dd')
    };
  });

  const [attendanceForm, setAttendanceForm] = useState<DriverAttendance>({
    date: format(new Date(), 'yyyy-MM-dd'),
    driverName: 'NAZRUL',
    inTime: '08:00',
    outTime: '17:00',
    isHoliday: false,
    isOfficeDay: true,
    isDutyDay: false,
    lastDayCompletionTime: '',
    remarks: ''
  });

  const lastAutoPopDate = useRef<string | null>(null);

  useEffect(() => {
    if (activeStep === 'driver-attendance' && attendanceForm.date && isAddingAttendance && !attendanceForm.id) {
      if (attendanceForm.date !== lastAutoPopDate.current) {
        try {
          const currentDateObj = parseISO(attendanceForm.date);
          const prevDateObj = subDays(currentDateObj, 1);
          const prevDateStr = format(prevDateObj, 'yyyy-MM-dd');

          const prevBooking = bookings
            .filter(b => !b.isSpecialNote && b.endDate === prevDateStr && b.inTime)
            .sort((a, b) => (b.inTime || '').localeCompare(a.inTime || ''))[0];

          if (prevBooking && prevBooking.inTime) {
            setAttendanceForm(prev => ({ ...prev, lastDayCompletionTime: prevBooking.inTime || '' }));
          } else {
            setAttendanceForm(prev => ({ ...prev, lastDayCompletionTime: '' }));
          }
          
          lastAutoPopDate.current = attendanceForm.date;
        } catch (err) {
          console.error("Error calculating auto-attendance time:", err);
        }
      }
    }
  }, [attendanceForm.date, activeStep, bookings, isAddingAttendance, attendanceForm.id]);

  useEffect(() => {
    if (activeStep === 'driver-attendance' || activeStep === 'attendance-download-range') {
      const db = getDatabase();
      const unsubscribe = onValue(ref(db, 'attendance'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const list = Object.keys(data).map(key => ({ ...data[key], id: key }));
          setAttendanceRecords(list.sort((a, b) => b.date.localeCompare(a.date)));
        } else { setAttendanceRecords([]); }
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
    try {
      const db = getDatabase();
      const attendanceRef = ref(db, 'attendance');
      const recordToSave = { ...attendanceForm };
      
      if (recordToSave.id) {
         await set(ref(db, `attendance/${recordToSave.id}`), recordToSave);
      } else {
         const newRef = push(attendanceRef);
         await set(newRef, { ...recordToSave, id: newRef.key });
      }
      
      setAttendanceForm({ 
        date: format(new Date(), 'yyyy-MM-dd'),
        driverName: 'NAZRUL',
        inTime: '08:00',
        outTime: '17:00',
        id: undefined, 
        remarks: '', 
        isDutyDay: false, 
        isOfficeDay: true, 
        isHoliday: false,
        lastDayCompletionTime: '' 
      });
      lastAutoPopDate.current = null;
      setIsAddingAttendance(false); // Close form after successful save
    } catch (error) { alert("Save failed."); } finally { setIsSavingAttendance(false); }
  };

  const handleEditAttendance = (record: DriverAttendance) => {
    setAttendanceForm({ ...record });
    setIsAddingAttendance(true);
  };

  const confirmDeleteAttendance = async () => {
    if (!deletingId) return;
    try {
      const db = getDatabase();
      await remove(ref(db, `attendance/${deletingId}`));
      setDeletingId(null);
    } catch (error) {
      alert("Delete failed.");
    }
  };

  const handleAttendanceSheetDownload = async () => {
    setIsGenerating(true);
    await generateAttendanceSheet(attendanceRecords, range.start, range.end, withSignature);
    setIsGenerating(false);
    setActiveStep('driver-attendance');
  };

  const handleFuelReportDownload = async () => {
    setIsGenerating(true);
    await generateFuelReport(bookings, range.start, range.end, fuelWithSignature);
    setIsGenerating(false);
    setActiveStep('dashboard');
  };

  const handleDetailedReportDownload = async () => {
    setIsGenerating(true);
    const allFields: BookingField[] = BOOKING_FIELDS.map(f => f.value as BookingField);
    await generateOverallReport(bookings, range.start, range.end, allFields, "DETAILED MASTER DATA REPORT", masterDataWithSignature);
    setIsGenerating(false);
    setActiveStep('dashboard');
  };

  const handleDetailedReportExport = async () => {
    setIsGenerating(true);
    await generateOverallReport(bookings, range.start, range.end, selectedFields, customHeader, masterDataWithSignature);
    setIsGenerating(false);
    setActiveStep('dashboard');
  };

  const toggleField = (field: BookingField) => {
    setSelectedFields(prev => 
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  const handleTripSummaryDownload = async (withGraph: boolean) => {
    setIsGenerating(true);
    await generateTripSummaryReport(bookings, range.start, range.end, withGraph);
    setIsGenerating(false);
    setActiveStep('trip-summary');
  };

  const handlePaymentSlipGenerate = async () => {
    setIsGenerating(true);
    await generatePaymentSlip(bookings, range.start, range.end, activeStep === 'handoff-form' ? handoffData : undefined);
    setIsGenerating(false);
    setActiveStep('dashboard');
  };

  const filteredAttendance = useMemo(() => {
    const monthStr = format(historyMonth, 'yyyy-MM');
    return attendanceRecords.filter(record => record.date.startsWith(monthStr))
      .sort((a, b) => a.date.localeCompare(b.date)); 
  }, [attendanceRecords, historyMonth]);

  const StepHeader = ({ title, subtitle, onBackStep }: { title: string, subtitle: string, onBackStep: () => void }) => (
    <div className="flex items-center gap-2 md:gap-3 mb-3 animate-in fade-in slide-in-from-left-4 duration-500 shrink-0">
      <button 
        onClick={onBackStep}
        className="w-7 h-7 md:w-9 md:h-9 flex items-center justify-center bg-white/5 border border-white/10 text-slate-400 rounded-lg hover:bg-emerald-600 hover:text-white transition-all active:scale-90 shadow-lg shrink-0"
      >
        <ArrowLeft size={16} />
      </button>
      <div className="min-w-0">
        <h3 className="text-xs md:text-lg font-black text-white uppercase tracking-tight leading-none truncate">{title}</h3>
        <p className="text-emerald-500 font-bold text-[7px] md:text-[9px] uppercase tracking-widest mt-1 truncate">{subtitle}</p>
      </div>
    </div>
  );

  const ReportTile = ({ onClick, icon: Icon, title, subtitle, color, accentColor }: any) => {
    const iconSize = typeof window !== 'undefined' && window.innerWidth < 768 ? 20 : 28;

    return (
      <button 
        onClick={onClick} 
        className="relative aspect-square md:aspect-auto md:h-52 p-3.5 md:p-6 bg-black/30 backdrop-blur-2xl rounded-2xl md:rounded-[2rem] border border-white/10 shadow-2xl hover:border-emerald-500/50 hover:bg-emerald-950/20 transition-all group flex flex-col items-center justify-center text-center overflow-hidden active:scale-[0.98]"
      >
        <div className="relative mb-3 md:mb-5 group-hover:scale-105 transition-transform duration-500 ease-out">
          <div className={`absolute inset-0 rounded-xl md:rounded-[1.5rem] blur-lg opacity-30 group-hover:opacity-70 transition-opacity ${color}`}></div>
          <div className={`relative w-11 h-11 md:w-16 md:h-16 ${color} rounded-xl md:rounded-[1.5rem] flex items-center justify-center border-2 border-white/20 shadow-2xl overflow-hidden`}>
            <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '6px 6px' }}></div>
            <Icon className="text-white relative z-10 drop-shadow-md" size={iconSize} strokeWidth={1.5} />
            <div className="absolute inset-[3px] border border-white/5 rounded-[inherit] pointer-events-none"></div>
          </div>
        </div>

        <div className="space-y-1 w-full px-2">
          <h4 className="text-[9px] md:text-lg font-black text-white uppercase tracking-tight leading-tight group-hover:text-emerald-400 transition-colors">
            {title}
          </h4>
          <p className="text-slate-500 font-bold text-[5px] md:text-[10px] uppercase tracking-[0.3em] opacity-80 leading-none">
            {subtitle}
          </p>
        </div>

        <div className={`mt-2 md:mt-4 flex items-center gap-2 ${accentColor} font-black uppercase text-[6px] md:text-[9px] tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-all duration-500`}>
          <div className="w-3 h-[1.5px] bg-current"></div>
          EXECUTE
        </div>
      </button>
    );
  };

  const getSigState = () => {
    if (activeStep === 'attendance-download-range') return withSignature;
    if (activeStep === 'fuel-report-range') return fuelWithSignature;
    if (activeStep === 'detailed-setup') return masterDataWithSignature;
    return false;
  };

  const toggleSigState = () => {
    const nextVal = !getSigState();
    if (activeStep === 'attendance-download-range') setWithSignature(nextVal);
    else if (activeStep === 'fuel-report-range') setFuelWithSignature(nextVal);
    else if (activeStep === 'detailed-setup') setMasterDataWithSignature(nextVal);
  };

  return (
    <div className="flex flex-col w-full h-full box-border relative bg-[#062c1e] overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <img 
          src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" 
          alt="Watermark" 
          className="w-[220px] md:w-[450px] h-[220px] md:h-[450px] object-cover rounded-full opacity-[0.04]" 
        />
      </div>

      <div className="relative z-10 flex flex-col h-full w-full max-w-7xl mx-auto p-2 md:p-8 space-y-4 md:space-y-6 overflow-hidden">
        {activeStep === 'dashboard' && (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 justify-center">
            <div className="flex items-center justify-between mb-4 md:mb-8 shrink-0">
              <div className="min-w-0">
                <h2 className="text-sm md:text-3xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
                  REPORT COMMAND CENTER
                  <div className="hidden md:block h-px w-20 bg-gradient-to-r from-emerald-500/50 to-transparent"></div>
                </h2>
              </div>
              {onBack && (
                <button 
                  onClick={onBack} 
                  className="group flex items-center gap-2 text-[7px] md:text-[10px] font-black text-slate-300 hover:text-white uppercase tracking-widest bg-white/5 px-3 py-1.5 md:px-5 md:py-2.5 rounded-lg md:rounded-xl border border-white/10 transition-all active:scale-95 overflow-hidden shadow-lg shrink-0"
                >
                  <X size={12} />
                  <span>Exit Terminal</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 flex-1 max-h-fit content-center overflow-hidden">
              <ReportTile 
                onClick={() => setActiveStep('payment-slip-range')}
                icon={FileText}
                title="Payment Slip"
                subtitle="MONTHLY BILLS"
                color="bg-emerald-600"
                accentColor="text-emerald-400"
              />
              <ReportTile 
                onClick={() => setActiveStep('driver-attendance')}
                icon={Clock}
                title="Driver's Attendence"
                subtitle="LOG MANAGEMENT"
                color="bg-amber-600"
                accentColor="text-amber-400"
              />
              <ReportTile 
                onClick={() => setActiveStep('fuel-report-range')}
                icon={Fuel}
                title="Fuel Report"
                subtitle="MILEAGE DATA"
                color="bg-cyan-600"
                accentColor="text-cyan-400"
              />
              <ReportTile 
                onClick={() => setActiveStep('detailed-setup')}
                icon={Database}
                title="Detailed Data Report"
                subtitle="FULL EXPORT"
                color="bg-blue-600"
                accentColor="text-blue-400"
              />
              <ReportTile 
                onClick={() => setActiveStep('trip-summary')}
                icon={BarChart3}
                title="Trip Statistics"
                subtitle="ANNUAL REVIEW"
                color="bg-indigo-600"
                accentColor="text-indigo-400"
              />
              <div className="hidden md:flex p-6 bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[2rem] flex-col items-center justify-center text-center opacity-30 group hover:opacity-50 transition-opacity">
                <LayoutDashboard size={24} className="text-slate-400 mb-2" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] leading-relaxed">System Link Secure<br/>Monitoring Active</span>
              </div>
            </div>
          </div>
        )}

        {activeStep === 'driver-attendance' && (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden relative">
            <StepHeader title="Driver Attendance" subtitle="Log Access Terminal" onBackStep={() => setActiveStep('dashboard')} />
            
            {/* Delete Confirmation Overlay */}
            {deletingId && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                <div className="bg-[#0a1128] border-2 border-rose-500/50 p-6 md:p-8 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-w-sm w-full text-center space-y-6">
                  <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20 shadow-inner">
                    <AlertTriangle size={32} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-white uppercase tracking-tight">Delete record?</h4>
                    <p className="text-xs font-medium text-slate-400 leading-relaxed">
                      Are you sure you want to permanently remove this attendance log? This action cannot be undone.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setDeletingId(null)}
                      className="flex-1 py-3.5 bg-white/5 text-slate-300 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={confirmDeleteAttendance}
                      className="flex-1 py-3.5 bg-rose-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-rose-900/20 hover:bg-rose-500 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Trash2 size={14} /> Yes, Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden w-full">
              <div className="w-full md:w-[35%] lg:w-[30%] flex flex-col gap-4 overflow-y-auto custom-scrollbar shrink-0 min-w-0">
                {!isAddingAttendance ? (
                  <div className="bg-black/30 backdrop-blur-xl p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                    <div className="text-center space-y-2 mb-2">
                       <h5 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Log Entry Panel</h5>
                       <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Select an action below</p>
                    </div>
                    
                    <button 
                      onClick={() => {
                        setAttendanceForm({
                          date: format(new Date(), 'yyyy-MM-dd'),
                          driverName: 'NAZRUL',
                          inTime: '08:00',
                          outTime: '17:00',
                          isHoliday: false,
                          isOfficeDay: true,
                          isDutyDay: false,
                          lastDayCompletionTime: '',
                          remarks: ''
                        });
                        setIsAddingAttendance(true);
                      }}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2.5 border border-emerald-400/20 group"
                    >
                      <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus size={14} strokeWidth={4} />
                      </div>
                      <span>Add Attendance</span>
                    </button>
                    
                    <div className="flex items-center gap-2 py-1 opacity-20">
                      <div className="h-px flex-1 bg-white"></div>
                      <span className="text-[7px] font-black text-white">READY</span>
                      <div className="h-px flex-1 bg-white"></div>
                    </div>
                    
                    <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                        Attendance data is synchronized with the main database in real-time.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-black/30 backdrop-blur-xl p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-white/10 flex flex-col gap-5 animate-in slide-in-from-left-4 duration-300 shadow-2xl relative">
                    <button 
                      onClick={() => setIsAddingAttendance(false)}
                      className="absolute right-4 top-4 text-slate-500 hover:text-white transition-colors"
                    >
                      <X size={18} />
                    </button>
                    
                    <div className="flex flex-col gap-1 w-full">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">LOG DATE</label>
                      <input 
                        type="date" 
                        value={attendanceForm.date} 
                        onChange={e => setAttendanceForm({...attendanceForm, date: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-black text-white outline-none focus:border-emerald-500 transition-all shadow-inner box-border" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 w-full">
                      <button 
                        onClick={() => setAttendanceForm({...attendanceForm, isOfficeDay: true, isHoliday: false, isDutyDay: false})} 
                        className={`py-2.5 rounded-xl text-[8px] font-black uppercase tracking-tight border transition-all ${attendanceForm.isOfficeDay ? 'bg-emerald-600 border-emerald-500 shadow-lg' : 'bg-white/5 border-white/10 text-slate-500'}`}
                      >
                        Office
                      </button>
                      <button 
                        onClick={() => setAttendanceForm({...attendanceForm, isHoliday: !attendanceForm.isHoliday, isOfficeDay: false})} 
                        className={`py-2.5 rounded-xl text-[8px] font-black uppercase tracking-tight border transition-all ${attendanceForm.isHoliday ? 'bg-amber-600 border-amber-500 shadow-lg text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}
                      >
                        Holiday
                      </button>
                      <button 
                        onClick={() => setAttendanceForm({...attendanceForm, isDutyDay: !attendanceForm.isDutyDay, isOfficeDay: false})} 
                        className={`py-2.5 rounded-xl text-[8px] font-black uppercase tracking-tight border transition-all ${attendanceForm.isDutyDay ? 'bg-blue-600 border-blue-500 shadow-lg text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}
                      >
                        Duty
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full">
                      <div className="flex flex-col gap-1 min-w-0">
                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">In Time</label>
                        <div className="relative group">
                          <input 
                            type="time" 
                            value={attendanceForm.inTime || ''} 
                            onChange={e => setAttendanceForm({...attendanceForm, inTime: e.target.value})} 
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-xs text-white outline-none focus:border-emerald-500 transition-all box-border" 
                          />
                          {attendanceForm.inTime && (
                            <button 
                              onClick={() => setAttendanceForm({...attendanceForm, inTime: ''})}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white transition-colors"
                              title="Clear Time"
                            >
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 min-w-0">
                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Out Time</label>
                        <div className="relative group">
                          <input 
                            type="time" 
                            value={attendanceForm.outTime || ''} 
                            onChange={e => setAttendanceForm({...attendanceForm, outTime: e.target.value})} 
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-xs text-white outline-none focus:border-emerald-500 transition-all box-border" 
                          />
                          {attendanceForm.outTime && (
                            <button 
                              onClick={() => setAttendanceForm({...attendanceForm, outTime: ''})}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white transition-colors"
                              title="Clear Time"
                            >
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 relative group w-full">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1 leading-tight">LAST DAY MICROBUS ENTRY TIME (TO CANTONMENT)</label>
                      <div className="relative">
                        <input 
                          type="time" 
                          value={attendanceForm.lastDayCompletionTime || ''} 
                          onChange={e => setAttendanceForm({...attendanceForm, lastDayCompletionTime: e.target.value})} 
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-700 box-border" 
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                          {attendanceForm.lastDayCompletionTime && (
                            <button 
                              onClick={() => setAttendanceForm({...attendanceForm, lastDayCompletionTime: ''})}
                              className="p-1 text-slate-500 hover:text-white transition-colors"
                              title="Clear Time"
                            >
                              <X size={10} />
                            </button>
                          )}
                          <div className="opacity-20 group-hover:opacity-100 transition-opacity">
                            <RotateCw size={12} className="text-emerald-500" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 w-full">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">REMARKS</label>
                      <textarea 
                        value={attendanceForm.remarks || ''} 
                        onChange={e => setAttendanceForm({...attendanceForm, remarks: e.target.value})} 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-700 min-h-[70px] resize-none box-border" 
                        placeholder="e.g., Late entry, Duty finished early"
                      />
                    </div>

                    <button 
                      onClick={handleSaveAttendance} 
                      disabled={isSavingAttendance}
                      className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      {isSavingAttendance ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      {attendanceForm.id ? 'Update Record' : 'Save Record'}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col min-h-0 min-w-0 gap-3">
                <div className="flex-1 bg-black/40 rounded-xl md:rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl w-full backdrop-blur-sm flex flex-col min-h-0 min-w-0">
                   <div className="p-4 border-b border-white/10 bg-[#0a1128]/50 flex items-center justify-between">
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Operation Log History</span>
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">{filteredAttendance.length} Entries</span>
                   </div>
                   <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse table-fixed">
                         <thead className="sticky top-0 z-20 bg-[#0a1128]">
                            <tr className="border-b border-white/10">
                               <th className="p-2 md:p-4 text-[7px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest border-r border-white/5 w-[22%]">Date</th>
                               <th className="p-2 md:p-4 text-[7px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest border-r border-white/5 w-[20%]">Day</th>
                               <th className="p-2 md:p-4 text-[7px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest text-center border-r border-white/5 w-[18%]">In</th>
                               <th className="p-2 md:p-4 text-[7px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest text-center border-r border-white/5 w-[18%]">Out</th>
                               <th className="p-2 md:p-4 text-[7px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest text-center w-[22%]">Actions</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-white/5">
                            {filteredAttendance.map(r => {
                               const dateObj = parseISO(r.date);
                               return (
                                  <tr key={r.id} className="group hover:bg-white/[0.04] transition-colors">
                                     <td className="p-2 md:p-4 whitespace-nowrap border-r border-white/5 overflow-hidden text-ellipsis">
                                        <span className="text-[9px] md:text-sm font-black text-white uppercase tracking-tight">
                                           {format(dateObj, 'dd MMM yy')}
                                        </span>
                                     </td>
                                     <td className="p-2 md:p-4 whitespace-nowrap border-r border-white/5 overflow-hidden text-ellipsis">
                                        <span className="text-[7px] md:text-[10px] font-black text-white/60 uppercase tracking-widest">
                                           {format(dateObj, 'EEEE')}
                                        </span>
                                     </td>
                                     {r.isHoliday && !r.isDutyDay ? (
                                        <td colSpan={2} className="p-2 md:p-4 text-center bg-amber-500/5 border-r border-white/5">
                                           <div className="inline-flex items-center gap-1 md:gap-2 px-2 py-0.5 md:px-4 md:py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full">
                                              <span className="text-[7px] md:text-[10px] font-black text-amber-500 uppercase tracking-widest">HOLIDAY</span>
                                           </div>
                                        </td>
                                     ) : (
                                        <>
                                           <td className="p-2 md:p-4 text-center border-r border-white/5">
                                              <div className="inline-flex items-center bg-white/5 px-1.5 py-0.5 md:px-3 md:py-1 rounded-md md:rounded-lg border border-white/10">
                                                 <span className="text-[9px] md:text-xs font-black text-white">{r.inTime || '--:--'}</span>
                                              </div>
                                           </td>
                                           <td className="p-2 md:p-4 text-center border-r border-white/5">
                                              <div className="inline-flex items-center bg-amber-500/10 px-1.5 py-0.5 md:px-3 md:py-1 rounded-md md:rounded-lg border border-amber-500/20">
                                                 <span className="text-[9px] md:text-xs font-black text-amber-400">{r.outTime || '--:--'}</span>
                                              </div>
                                           </td>
                                        </>
                                     )}
                                     <td className="p-2 md:p-4 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                           <button 
                                              onClick={() => handleEditAttendance(r)}
                                              className="p-1.5 bg-white/5 text-emerald-400 hover:bg-emerald-500/20 rounded-md transition-all active:scale-90"
                                              title="Edit Log"
                                           >
                                              <Pencil size={14} />
                                           </button>
                                           <button 
                                              onClick={() => r.id && setDeletingId(r.id)}
                                              className="p-1.5 bg-white/5 text-rose-400 hover:bg-rose-500/20 rounded-md transition-all active:scale-90"
                                              title="Delete Log"
                                           >
                                              <Trash2 size={14} />
                                           </button>
                                        </div>
                                     </td>
                                  </tr>
                               );
                            })}
                         </tbody>
                      </table>
                   </div>
                </div>
                
                <button 
                  onClick={() => setActiveStep('attendance-download-range')} 
                  className="w-full py-3.5 bg-black/40 text-emerald-400 rounded-xl md:rounded-2xl font-black uppercase text-[10px] border border-emerald-500/20 shadow-lg flex items-center justify-center gap-2.5 hover:bg-emerald-500/10 transition-all active:scale-95 group shrink-0"
                >
                  <Download size={16} className="group-hover:-translate-y-0.5 transition-transform" /> 
                  <span>Download Attendance Log</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {(['payment-slip-range', 'fuel-report-range', 'attendance-download-range', 'detailed-setup', 'summary-download-range'] as ReportStep[]).includes(activeStep) && (
          <div className="flex flex-col h-full md:justify-center animate-in fade-in slide-in-from-right-4 duration-500 overflow-y-auto custom-scrollbar pt-2 pb-8 md:p-0">
             <div className={`${activeStep === 'detailed-setup' ? 'max-w-full md:max-w-[95%] xl:max-w-7xl' : 'max-w-md'} mx-auto w-full bg-black/40 backdrop-blur-2xl p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-2 border-white/5 shadow-2xl space-y-4 md:space-y-6 shrink-0`}>
                <StepHeader 
                  title={activeStep === 'detailed-setup' ? "Detailed Data Report" : "Report Config"} 
                  subtitle={activeStep === 'detailed-setup' ? "Customize Full Master Export" : "Configure export parameters"} 
                  onBackStep={() => setActiveStep(activeStep === 'attendance-download-range' ? 'driver-attendance' : (activeStep === 'summary-download-range' ? 'trip-summary' : 'dashboard'))} 
                />
                
                <div className={`grid grid-cols-1 ${activeStep === 'detailed-setup' ? 'md:grid-cols-3' : ''} gap-4`}>
                  <div className="space-y-1">
                    <label className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Start Date</label>
                    <input type="date" value={range.start} onChange={e => setRange({...range, start: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-black text-white outline-none focus:border-emerald-500 transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">End Date</label>
                    <input type="date" value={range.end} onChange={e => setRange({...range, end: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-black text-white outline-none focus:border-emerald-500 transition-all" />
                  </div>
                  {activeStep === 'detailed-setup' && (
                    <div className="space-y-1">
                      <label className="text-[7px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Type size={10} className="text-emerald-500" /> Custom Header (Optional)
                      </label>
                      <input 
                        type="text" 
                        value={customHeader} 
                        onChange={e => setCustomHeader(e.target.value)} 
                        placeholder="e.g., ANNUAL TRANSPORT AUDIT 2024"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-black text-white placeholder:text-slate-600 outline-none focus:border-emerald-500 transition-all shadow-inner" 
                      />
                    </div>
                  )}
                </div>

                {activeStep === 'detailed-setup' && (
                  <div className="space-y-3 pt-2">
                    <label className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <Table size={12} className="text-emerald-500" /> Selective Data Columns
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:max-h-none p-1.5 bg-black/20 rounded-2xl border border-white/5 overflow-y-auto max-h-[40vh]">
                       {BOOKING_FIELDS.map(f => (
                         <button 
                           key={f.value} 
                           onClick={() => toggleField(f.value as BookingField)} 
                           className={`flex items-center gap-2 px-3 py-3 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-tight border transition-all ${selectedFields.includes(f.value as BookingField) ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-lg' : 'bg-black/20 text-slate-500 border-white/5 hover:border-white/20'}`}
                         >
                           <div className={`w-3 h-3 md:w-4 md:h-4 rounded flex items-center justify-center border ${selectedFields.includes(f.value as BookingField) ? 'bg-emerald-600 border-emerald-400' : 'border-slate-700'}`}>
                             {selectedFields.includes(f.value as BookingField) && <Check size={12} className="text-white" />}
                           </div>
                           <span className="truncate">{f.label}</span>
                         </button>
                       ))}
                    </div>
                  </div>
                )}

                {(activeStep === 'attendance-download-range' || activeStep === 'fuel-report-range' || activeStep === 'detailed-setup') && (
                  <div className="pt-2 border-t border-white/5 space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h5 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Report Output Options</h5>
                    </div>
                    
                    <button 
                      onClick={toggleSigState}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
                        getSigState()
                          ? 'bg-emerald-600/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]' 
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        getSigState() 
                          ? 'bg-emerald-500 text-white shadow-lg' 
                          : 'bg-white/5 text-slate-600'
                      }`}>
                        {getSigState() ? <ShieldCheck size={22} /> : <ShieldOff size={22} />}
                      </div>
                      <div className="text-left flex-1">
                        <p className={`text-[12px] font-black uppercase tracking-widest ${
                          getSigState() ? 'text-white' : 'text-slate-500'
                        }`}>Add Signature Lines</p>
                        <p className="text-[8px] font-bold text-slate-600 uppercase mt-0.5">
                          {getSigState() ? 'Authorized Official Document Mode' : 'Raw Data Export Mode'}
                        </p>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                        getSigState() ? 'bg-emerald-500 border-emerald-400 shadow-sm' : 'border-slate-800'
                      }`}>
                        {getSigState() && <Check size={14} className="text-white" />}
                      </div>
                    </button>
                  </div>
                )}

                <button 
                  onClick={() => {
                    if(activeStep === 'payment-slip-range') setActiveStep('handoff-prompt');
                    else if(activeStep === 'fuel-report-range') handleFuelReportDownload();
                    else if(activeStep === 'detailed-setup') handleDetailedReportExport();
                    else if(activeStep === 'summary-download-range') setActiveStep('graph-choice');
                    else handleAttendanceSheetDownload();
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black uppercase text-[10px] md:text-[14px] tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {isGenerating ? 'Processing...' : 'Proceed to Export'}
                </button>
             </div>
          </div>
        )}

        {activeStep === 'handoff-form' && (
          <div className="flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="max-w-4xl mx-auto w-full bg-black/40 backdrop-blur-3xl p-5 md:p-8 rounded-[2rem] border-2 border-white/5 shadow-2xl flex flex-col min-h-0">
                <StepHeader 
                  title="Authorization Setup" 
                  subtitle="Input personnel details for official handover" 
                  onBackStep={() => setActiveStep('handoff-prompt')} 
                />
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5 shadow-inner">
                    <div className="flex items-center gap-2 mb-2">
                       <ShieldCheck className="text-emerald-500" size={16} />
                       <h5 className="text-[10px] font-black text-white uppercase tracking-widest">Provider Information</h5>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[7px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Army No</label>
                        <input type="text" value={handoffData.providerArmyNo} onChange={e => setHandoffData({...handoffData, providerArmyNo: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500 transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Rank</label>
                        <input type="text" value={handoffData.providerRank} onChange={e => setHandoffData({...handoffData, providerRank: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500 transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Name</label>
                        <input type="text" value={handoffData.providerName} onChange={e => setHandoffData({...handoffData, providerName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500 transition-all" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 bg-white/5 p-5 rounded-2xl border border-white/5 shadow-inner">
                    <div className="flex items-center gap-2 mb-2">
                       <UserCheck className="text-emerald-500" size={16} />
                       <h5 className="text-[10px] font-black text-white uppercase tracking-widest">Receiver Information</h5>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[7px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Army No</label>
                        <input type="text" value={handoffData.receiverArmyNo} onChange={e => setHandoffData({...handoffData, receiverArmyNo: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500 transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Rank</label>
                        <input type="text" value={handoffData.receiverRank} onChange={e => setHandoffData({...handoffData, receiverRank: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500 transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Name</label>
                        <input type="text" value={handoffData.receiverName} onChange={e => setHandoffData({...handoffData, receiverName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white outline-none focus:border-emerald-500 transition-all" />
                      </div>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handlePaymentSlipGenerate}
                  disabled={isGenerating}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 mt-6 rounded-xl font-black uppercase text-[10px] md:text-[12px] tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Fingerprint size={16} />}
                  {isGenerating ? 'Processing...' : 'Finalize & Export PDF'}
                </button>
             </div>
          </div>
        )}

        {activeStep === 'trip-summary' && (
          <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <StepHeader title="Trip Statistics" subtitle={`Annual Overview ${selectedYear}`} onBackStep={() => setActiveStep('dashboard')} />
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 shrink-0 shadow-xl">
                 <button onClick={() => setSelectedYear(y => y - 1)} className="p-1 text-slate-400 hover:text-white"><ChevronLeft size={16}/></button>
                 <span className="text-[10px] font-black text-white px-2">{selectedYear}</span>
                 <button onClick={() => setSelectedYear(y => y + 1)} className="p-1 text-slate-400 hover:text-white"><ChevronRight size={16}/></button>
              </div>
            </div>
            <div className="flex-1 bg-black/20 p-4 md:p-8 rounded-[2rem] border-2 border-white/5 flex flex-col min-h-0 overflow-hidden shadow-inner">
               <div className="flex-1 relative flex items-end gap-1 md:gap-4 pt-10 pb-6 min-h-0">
                  <div className="flex flex-col justify-between h-full text-right pr-2 border-r border-white/5 select-none shrink-0">
                     {scaleValues.map(val => (
                       <span key={`l-${val}`} className="text-[7px] md:text-[10px] font-black text-slate-500 tabular-nums">{val}</span>
                     ))}
                  </div>
                  <div className="flex-1 relative h-full flex items-end justify-between gap-1 md:gap-4 px-1 border-b-2 border-white/10">
                    {monthlyStats.map((stat, i) => {
                      const heightPercent = Math.min((stat.count / maxScale) * 100, 100);
                      const finalHeight = Math.max(heightPercent, stat.count > 0 ? 3 : 0);
                      return (
                        <div key={`${selectedYear}-${stat.month}`} className="flex-1 flex flex-col items-center group/bar relative h-full justify-end">
                           <div 
                             className="w-full max-w-[18px] md:max-w-[40px] rounded-t-md md:rounded-t-lg shadow-2xl animate-bar-grow transition-all border-x border-t border-white/10"
                             style={{ 
                               height: `${finalHeight}%`,
                               animationDelay: `${i * 60}ms`,
                               background: stat.style.gradient,
                               backgroundColor: stat.style.color
                             }}
                           ></div>
                           <span className="absolute -bottom-5 text-[6px] md:text-[9px] font-black text-slate-400 uppercase tracking-tighter">{stat.month}</span>
                        </div>
                      );
                    })}
                  </div>
               </div>
               <div className="mt-6 flex justify-between items-center shrink-0">
                 <div className="bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                   <span className="text-[7px] md:text-[10px] font-black text-emerald-400 uppercase tracking-widest">Aggregate: {monthlyStats.reduce((a, b) => a + b.count, 0)} Trips</span>
                 </div>
                 <button onClick={() => setActiveStep('summary-download-range')} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all shadow-xl">
                   <Download size={14} /> EXPORT PDF
                 </button>
               </div>
            </div>
          </div>
        )}

        {(activeStep === 'handoff-prompt' || activeStep === 'graph-choice') && (
          <div className="flex flex-col h-full justify-center animate-in fade-in zoom-in-95 duration-500">
            <div className="max-w-md mx-auto w-full text-center space-y-6 bg-emerald-950/60 backdrop-blur-3xl rounded-[3rem] border-2 border-white/5 p-8 md:p-12 shadow-2xl">
              <div className="w-14 h-14 bg-emerald-600/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20 shadow-inner">
                {activeStep === 'handoff-prompt' ? <UserCheck size={28} /> : <BarChart size={28} />}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none">
                  {activeStep === 'handoff-prompt' ? 'AUTHORIZED SIGNATURES' : 'DATA VISUALIZATION'}
                </h3>
                <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest leading-relaxed opacity-60">
                  {activeStep === 'handoff-prompt' ? 'Include officer identity for handover' : 'Select preferred reporting presentation'}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {activeStep === 'handoff-prompt' ? (
                  <>
                    <button onClick={() => setActiveStep('handoff-form')} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all">Yes, Include Info</button>
                    <button 
                      onClick={handlePaymentSlipGenerate} 
                      className="w-full bg-white/5 text-slate-300 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                    >No, Skip</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleTripSummaryDownload(true)} disabled={isGenerating} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all">With Statistical Chart</button>
                    <button onClick={() => handleTripSummaryDownload(false)} disabled={isGenerating} className="w-full bg-white/5 text-slate-300 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/10 hover:bg-white/10 transition-all active:scale-95">Data Table Only</button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportManager;
