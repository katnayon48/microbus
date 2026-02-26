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
import { Booking, BookingField, HandoffInfo, DriverAttendance, AppSettings } from '../types';
import { 
  generatePaymentSlip, generateOverallReport, generateTripSummaryReport, 
  generateAttendanceSheet, generateFuelReport, generateBookingDetailsReport 
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
  appSettings: AppSettings;
  onBack?: () => void;
  initialStep?: ReportStep;
}

type ReportStep = 'dashboard' | 'payment-slip-range' | 'booking-details-range' | 'handoff-prompt' | 'handoff-form' | 'detailed-setup' | 'trip-summary' | 'summary-download-range' | 'graph-choice' | 'driver-attendance' | 'attendance-download-range' | 'fuel-report-range';

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

const ReportManager: React.FC<ReportManagerProps> = ({ bookings, appSettings, onBack, initialStep = 'dashboard' }) => {
  const [activeStep, setActiveStep] = useState<ReportStep>(initialStep);
  const [selectedYear, setSelectedYear] = useState(() => getYear(new Date()));
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<DriverAttendance[]>([]);
  const [historyMonth, setHistoryMonth] = useState(new Date());
  
  const [isAddingAttendance, setIsAddingAttendance] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [withSignature, setWithSignature] = useState(true);
  const [bookingDetailsWithSignature, setBookingDetailsWithSignature] = useState(true);
  const [fuelWithSignature, setFuelWithSignature] = useState(true);
  const [masterDataWithSignature, setMasterDataWithSignature] = useState(false);
  const [customHeader, setCustomHeader] = useState('');
  const [selectedFields, setSelectedFields] = useState<BookingField[]>([]);

  const sigLabel1 = appSettings.branding.pdfSignatureLabel1 || "Driver";
  const sigLabel2 = appSettings.branding.pdfSignatureLabel2 || "JCO/NCO";
  const bgColor = appSettings.ui.bgColor || "#062c1e";

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

  // Reset custom header ONLY when returning to the dashboard or finishing a sequence
  useEffect(() => {
    if (activeStep === 'dashboard') {
      setCustomHeader('');
    }
  }, [activeStep]);

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
        id: undefined, 
        remarks: '', 
        isDutyDay: false, 
        isOfficeDay: true, 
        isHoliday: false,
        lastDayCompletionTime: '',
        inTime: '08:00',
        outTime: '17:00'
      });
      lastAutoPopDate.current = null;
      setIsAddingAttendance(false);
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
    await generateAttendanceSheet(attendanceRecords, range.start, range.end, withSignature, sigLabel1, sigLabel2, customHeader);
    setIsGenerating(false);
    setCustomHeader('');
    setActiveStep('dashboard'); // Go back to dashboard to clear state
  };

  const handleFuelReportDownload = async () => {
    setIsGenerating(true);
    await generateFuelReport(bookings, range.start, range.end, fuelWithSignature, sigLabel1, sigLabel2, customHeader);
    setIsGenerating(false);
    setCustomHeader('');
    setActiveStep('dashboard');
  };

  const handleDetailedReportDownload = async () => {
    setIsGenerating(true);
    const allFields: BookingField[] = BOOKING_FIELDS.map(f => f.value as BookingField);
    await generateOverallReport(bookings, range.start, range.end, allFields, customHeader || "DETAILED MASTER DATA REPORT", masterDataWithSignature, sigLabel1, sigLabel2);
    setIsGenerating(false);
    setCustomHeader('');
    setActiveStep('dashboard');
  };

  const handleDetailedReportExport = async () => {
    setIsGenerating(true);
    await generateOverallReport(bookings, range.start, range.end, selectedFields, customHeader, masterDataWithSignature, sigLabel1, sigLabel2);
    setIsGenerating(false);
    setCustomHeader('');
    setActiveStep('dashboard');
  };

  const toggleField = (field: BookingField) => {
    setSelectedFields(prev => 
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  const handleTripSummaryDownload = async (withGraph: boolean) => {
    setIsGenerating(true);
    await generateTripSummaryReport(bookings, range.start, range.end, withGraph, customHeader);
    setIsGenerating(false);
    setCustomHeader('');
    setActiveStep('dashboard');
  };

  const handlePaymentSlipGenerate = async () => {
    setIsGenerating(true);
    await generatePaymentSlip(bookings, range.start, range.end, activeStep === 'handoff-form' ? handoffData : undefined, customHeader);
    setIsGenerating(false);
    setCustomHeader('');
    setActiveStep('dashboard');
  };

  const handleBookingDetailsGenerate = async () => {
    setIsGenerating(true);
    await generateBookingDetailsReport(bookings, range.start, range.end, bookingDetailsWithSignature, sigLabel1, sigLabel2, customHeader);
    setIsGenerating(false);
    setCustomHeader('');
    setActiveStep('dashboard');
  };

  const filteredAttendance = useMemo(() => {
    const monthStr = format(historyMonth, 'yyyy-MM');
    return attendanceRecords.filter(record => record.date.startsWith(monthStr))
      .sort((a, b) => a.date.localeCompare(b.date)); 
  }, [attendanceRecords, historyMonth]);

  const StepHeader = ({ title, subtitle, onBackStep }: { title: string, subtitle: string, onBackStep: () => void }) => (
    <div className="flex items-center gap-2 md:gap-3 mb-4 animate-in fade-in slide-in-from-left-4 duration-500 shrink-0 w-full px-1 box-border">
      <button 
        onClick={onBackStep}
        className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center bg-white/5 border border-white/10 text-slate-400 rounded-lg hover:bg-emerald-600 hover:text-white transition-all active:scale-90 shadow-lg shrink-0"
      >
        <ArrowLeft size={16} />
      </button>
      <div className="min-w-0 flex-1">
        <h3 className="text-[11px] md:text-lg font-black text-white uppercase tracking-tight leading-none truncate">{title}</h3>
        <p className="text-emerald-500 font-bold text-[7px] md:text-[9px] uppercase tracking-widest mt-1 truncate">{subtitle}</p>
      </div>
    </div>
  );

  const ReportTile = ({ onClick, icon: Icon, title, subtitle, color }: any) => {
    const iconSize = typeof window !== 'undefined' && window.innerWidth < 768 ? 20 : 28;

    return (
      <button 
        onClick={onClick} 
        className="relative aspect-square md:aspect-auto md:h-52 p-3 md:p-6 bg-black/30 backdrop-blur-2xl rounded-2xl md:rounded-[2rem] border border-white/10 shadow-2xl hover:border-emerald-500/50 hover:bg-emerald-950/20 transition-all group flex flex-col items-center justify-center text-center overflow-hidden active:scale-[0.98] box-border"
      >
        <div className="relative mb-3 md:mb-5 group-hover:scale-105 transition-transform duration-500 ease-out shrink-0">
          <div className={`absolute inset-0 rounded-xl md:rounded-[1.5rem] blur-lg opacity-30 group-hover:opacity-70 transition-opacity ${color}`}></div>
          <div className={`relative w-11 h-11 md:w-16 md:h-16 ${color} rounded-xl md:rounded-[1.5rem] flex items-center justify-center border-2 border-white/20 shadow-2xl overflow-hidden`}>
            <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '6px 6px' }}></div>
            <Icon className="text-white relative z-10 drop-shadow-md" size={iconSize} strokeWidth={1.5} />
          </div>
        </div>
        <div className="space-y-1 w-full px-1 min-w-0">
          <h4 className="text-[9px] md:text-lg font-black text-white uppercase tracking-tight leading-tight group-hover:text-emerald-400 transition-colors truncate">
            {title}
          </h4>
          <p className="text-slate-500 font-bold text-[5px] md:text-[10px] uppercase tracking-[0.3em] opacity-80 leading-none truncate">
            {subtitle}
          </p>
        </div>
      </button>
    );
  };

  const getSigState = () => {
    if (activeStep === 'attendance-download-range') return withSignature;
    if (activeStep === 'fuel-report-range') return fuelWithSignature;
    if (activeStep === 'detailed-setup') return masterDataWithSignature;
    if (activeStep === 'booking-details-range') return bookingDetailsWithSignature;
    return false;
  };

  const toggleSigState = () => {
    const nextVal = !getSigState();
    if (activeStep === 'attendance-download-range') setWithSignature(nextVal);
    else if (activeStep === 'fuel-report-range') setFuelWithSignature(nextVal);
    else if (activeStep === 'detailed-setup') setMasterDataWithSignature(nextVal);
    else if (activeStep === 'booking-details-range') setBookingDetailsWithSignature(nextVal);
  };

  return (
    <div 
      className="flex flex-col w-full h-full box-border relative overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <img 
          src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" 
          alt="Watermark" 
          className="w-[220px] md:w-[450px] h-[220px] md:h-[450px] object-cover rounded-full opacity-[0.04]" 
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col h-full w-full max-w-7xl mx-auto p-4 md:p-8 space-y-4 md:space-y-6 overflow-hidden box-border">
        {activeStep === 'dashboard' && (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500 justify-center w-full box-border">
            <div className="flex items-center justify-between mb-4 md:mb-8 shrink-0 w-full box-border">
              <div className="min-w-0">
                <h2 className="text-sm md:text-3xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
                  REPORT COMMAND CENTER
                  <div className="hidden md:block h-px w-20 bg-gradient-to-r from-emerald-500/50 to-transparent"></div>
                </h2>
              </div>
              {onBack && (
                <button 
                  onClick={onBack} 
                  className="group flex items-center gap-2 text-[7px] md:text-[10px] font-black text-slate-300 hover:text-white uppercase tracking-widest bg-white/5 px-3 py-1.5 md:px-5 md:py-2.5 rounded-lg md:rounded-xl border border-white/10 transition-all active:scale-90 shadow-lg shrink-0"
                >
                  <X size={12} />
                  <span>Exit</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 flex-1 max-h-fit content-center w-full box-border overflow-hidden">
              <ReportTile onClick={() => setActiveStep('payment-slip-range')} icon={FileText} title="Payment Slip" subtitle="MONTHLY BILLS" color="bg-emerald-600" />
              <ReportTile onClick={() => setActiveStep('booking-details-range')} icon={FileSpreadsheet} title="Booking Details" subtitle="CIVIL MICROBUS" color="bg-rose-600" />
              <ReportTile onClick={() => setActiveStep('driver-attendance')} icon={Clock} title="Driver's Attendence" subtitle="LOG MANAGEMENT" color="bg-amber-600" />
              <ReportTile onClick={() => setActiveStep('fuel-report-range')} icon={Fuel} title="Fuel Report" subtitle="MILEAGE DATA" color="bg-cyan-600" />
              <ReportTile onClick={() => setActiveStep('detailed-setup')} icon={Database} title="Detailed Data" subtitle="FULL EXPORT" color="bg-blue-600" />
              <ReportTile onClick={() => setActiveStep('trip-summary')} icon={BarChart3} title="Trip Statistics" subtitle="ANNUAL REVIEW" color="bg-indigo-600" />
            </div>
          </div>
        )}

        {activeStep === 'driver-attendance' && (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden relative w-full box-border">
            <StepHeader title="Driver Attendance" subtitle="Log Access Terminal" onBackStep={() => setActiveStep('dashboard')} />
            
            {deletingId && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                <div className="bg-[#0a1128] border-2 border-rose-500/50 p-6 md:p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center space-y-6">
                  <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20 shadow-inner">
                    <AlertTriangle size={32} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-white uppercase tracking-tight">Delete record?</h4>
                    <p className="text-xs font-medium text-slate-400 leading-relaxed">Are you sure? This cannot be undone.</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setDeletingId(null)} className="flex-1 py-3 bg-white/5 text-slate-300 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">Cancel</button>
                    <button onClick={confirmDeleteAttendance} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2">Delete</button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-x-hidden overflow-y-auto md:overflow-y-hidden w-full box-border custom-scrollbar">
              <div className="w-full md:w-[35%] lg:w-[30%] flex flex-col gap-4 shrink-0 min-w-0 box-border">
                {!isAddingAttendance ? (
                  <div className="bg-black/30 backdrop-blur-xl p-6 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 flex flex-col gap-4 shadow-2xl box-border">
                    <button 
                      onClick={() => setIsAddingAttendance(true)}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2.5 border border-emerald-400/20"
                    >
                      <Plus size={14} strokeWidth={4} />
                      <span>Add Attendance</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-black/30 backdrop-blur-xl p-4 md:p-5 rounded-[1.5rem] md:rounded-[2rem] border border-white/10 flex flex-col gap-4 animate-in slide-in-from-left-4 duration-300 shadow-2xl relative w-full box-border overflow-hidden">
                    <button onClick={() => setIsAddingAttendance(false)} className="absolute right-3 top-3 text-slate-500 hover:text-white transition-colors z-20"><X size={18} /></button>
                    
                    <div className="flex flex-col gap-1 w-full box-border">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">LOG DATE</label>
                      <input type="date" value={attendanceForm.date} onChange={e => setAttendanceForm({...attendanceForm, date: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-black text-white outline-none focus:border-emerald-500 transition-all box-border" />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-1.5 w-full box-border">
                      <button onClick={() => setAttendanceForm({...attendanceForm, isOfficeDay: true, isHoliday: false, isDutyDay: false})} className={`py-2 rounded-lg text-[7px] md:text-[8px] font-black uppercase tracking-tight border transition-all ${attendanceForm.isOfficeDay ? 'bg-emerald-600 border-emerald-500 shadow-lg' : 'bg-white/5 border-white/10 text-slate-500'}`}>Office</button>
                      <button onClick={() => setAttendanceForm({...attendanceForm, isHoliday: !attendanceForm.isHoliday, isOfficeDay: false})} className={`py-2 rounded-lg text-[7px] md:text-[8px] font-black uppercase tracking-tight border transition-all ${attendanceForm.isHoliday ? 'bg-amber-600 border-amber-500 shadow-lg text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}>Holiday</button>
                      <button onClick={() => {
                        const nextDuty = !attendanceForm.isDutyDay;
                        setAttendanceForm({
                          ...attendanceForm, 
                          isDutyDay: nextDuty, 
                          isOfficeDay: false, 
                          isHoliday: false,
                          remarks: nextDuty ? 'Duty' : (attendanceForm.remarks === 'Duty' ? '' : attendanceForm.remarks)
                        });
                      }} className={`py-2 rounded-lg text-[7px] md:text-[8px] font-black uppercase tracking-tight border transition-all ${attendanceForm.isDutyDay ? 'bg-blue-600 border-blue-500 shadow-lg text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}>Duty</button>
                    </div>

                    <div className="flex flex-col items-center gap-3 w-full box-border">
                      <div className="grid grid-cols-2 gap-4 w-full max-w-[220px] box-border">
                        <div className="flex flex-col gap-1 min-w-0">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1 text-center">In Time</label>
                          <div className="relative group w-full">
                            <input type="time" value={attendanceForm.inTime || ''} onChange={e => setAttendanceForm({...attendanceForm, inTime: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-1 py-2 text-[10px] text-white outline-none focus:border-emerald-500 transition-all box-border pr-6" />
                            {attendanceForm.inTime && (
                              <button onClick={() => setAttendanceForm({...attendanceForm, inTime: ''})} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-rose-400 transition-colors">
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 min-w-0">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1 text-center">Out Time</label>
                          <div className="relative group w-full">
                            <input type="time" value={attendanceForm.outTime || ''} onChange={e => setAttendanceForm({...attendanceForm, outTime: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-1 py-2 text-[10px] text-white outline-none focus:border-emerald-500 transition-all box-border pr-6" />
                            {attendanceForm.outTime && (
                              <button onClick={() => setAttendanceForm({...attendanceForm, outTime: ''})} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-rose-400 transition-colors">
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 w-full box-border">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1 leading-tight">ENTRY TIME (CANTONMENT)</label>
                      <div className="relative w-full">
                        <input type="time" value={attendanceForm.lastDayCompletionTime || ''} onChange={e => setAttendanceForm({...attendanceForm, lastDayCompletionTime: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-emerald-500 transition-all box-border pr-12" />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {attendanceForm.lastDayCompletionTime && <button onClick={() => setAttendanceForm({...attendanceForm, lastDayCompletionTime: ''})} className="p-1 text-slate-500"><X size={10} /></button>}
                          <RotateCw size={12} className="text-emerald-500 opacity-40" />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 w-full box-border">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">REMARKS</label>
                      <textarea value={attendanceForm.remarks || ''} onChange={e => setAttendanceForm({...attendanceForm, remarks: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-xs text-white outline-none focus:border-emerald-500 transition-all min-h-[60px] resize-none box-border" />
                    </div>

                    <button onClick={handleSaveAttendance} disabled={isSavingAttendance} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                      {isSavingAttendance ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      {attendanceForm.id ? 'Update Record' : 'Save Record'}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col min-h-0 min-w-0 gap-3 box-border">
                <div className="flex-1 bg-black/30 rounded-xl md:rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl w-full backdrop-blur-sm flex flex-col min-h-0 min-w-0 box-border">
                   <div className="p-4 border-b border-white/10 bg-[#0a1128]/50 flex items-center justify-between shrink-0 box-border">
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">History</span>
                      
                      <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-white/10">
                        <button 
                          onClick={() => setHistoryMonth(m => subMonths(m, 1))}
                          className="p-0.5 text-slate-500 hover:text-white transition-colors active:scale-90"
                        >
                          <ChevronLeft size={14}/>
                        </button>
                        <span className="text-[8px] md:text-[10px] font-black text-white px-1 min-w-[70px] text-center uppercase tracking-tight">
                          {format(historyMonth, 'MMM yyyy')}
                        </span>
                        <button 
                          onClick={() => setHistoryMonth(m => addMonths(m, 1))}
                          className="p-0.5 text-slate-500 hover:text-white transition-colors active:scale-90"
                        >
                          <ChevronRight size={14}/>
                        </button>
                      </div>

                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em]">{filteredAttendance.length} Logs</span>
                   </div>
                   <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar w-full box-border">
                      <table className="w-full text-left border-collapse table-fixed min-w-[320px] box-border">
                         <thead className="sticky top-0 z-20 bg-[#0a1128]">
                            <tr className="border-b border-white/10">
                               <th className="p-2 md:p-4 text-[7px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest border-r border-white/5 w-[25%]">Date</th>
                               <th className="p-2 md:p-4 text-[7px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest border-r border-white/5 w-[25%]">In</th>
                               <th className="p-2 md:p-4 text-[7px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest border-r border-white/5 w-[25%]">Out</th>
                               <th className="p-2 md:p-4 text-[7px] md:text-[10px] font-black text-slate-300 uppercase tracking-widest text-center w-[25%]">Edit</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-white/5">
                            {filteredAttendance.map(r => {
                               const dateObj = parseISO(r.date);
                               return (
                                  <tr key={r.id} className="group hover:bg-white/[0.04] transition-colors">
                                     <td className="p-2 md:p-4 whitespace-nowrap border-r border-white/5 overflow-hidden box-border">
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-[8px] md:text-sm font-black text-white uppercase tracking-tight">{format(dateObj, 'dd MMM yy')}</span>
                                          <span className="text-[6px] md:text-[9px] font-bold text-slate-500 uppercase">{format(dateObj, 'EEE')}</span>
                                        </div>
                                     </td>
                                     {r.isHoliday && !r.isDutyDay ? (
                                        <td colSpan={2} className="p-2 md:p-4 text-center bg-amber-500/5 border-r border-white/5 box-border">
                                           <span className="text-[7px] md:text-[9px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 whitespace-nowrap">HOLIDAY</span>
                                        </td>
                                     ) : (
                                        <>
                                           <td className="p-2 md:p-4 border-r border-white/5 box-border">
                                              <span className="text-[8px] md:text-xs font-black text-white block truncate">{r.inTime || '--:--'}</span>
                                           </td>
                                           <td className="p-2 md:p-4 border-r border-white/5 box-border">
                                              <span className="text-[8px] md:text-xs font-black text-amber-400 block truncate">{r.outTime || '--:--'}</span>
                                           </td>
                                        </>
                                     )}
                                     <td className="p-2 md:p-4 text-center box-border">
                                        <div className="flex items-center justify-center gap-1.5">
                                           <button onClick={() => handleEditAttendance(r)} className="p-1.5 md:p-2 bg-white/5 text-emerald-400 rounded-md active:scale-90 hover:bg-white/10"><Pencil size={12} /></button>
                                           <button onClick={() => r.id && setDeletingId(r.id)} className="p-1.5 md:p-2 bg-white/5 text-rose-400 rounded-md active:scale-90 hover:bg-white/10"><Trash2 size={12} /></button>
                                        </div>
                                     </td>
                                  </tr>
                               );
                            })}
                         </tbody>
                      </table>
                   </div>
                </div>
                <button onClick={() => setActiveStep('attendance-download-range')} className="w-full py-3.5 bg-black/40 text-emerald-400 rounded-xl md:rounded-2xl font-black uppercase text-[9px] md:text-[10px] border border-emerald-500/20 shadow-lg flex items-center justify-center gap-2.5 transition-all active:scale-95 shrink-0 box-border mb-2">
                  <Download size={14} /> 
                  <span>Export Log</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {(['payment-slip-range', 'booking-details-range', 'fuel-report-range', 'attendance-download-range', 'detailed-setup', 'summary-download-range'] as ReportStep[]).includes(activeStep) && (
          <div className="flex-1 flex flex-col h-full md:justify-center animate-in fade-in slide-in-from-right-4 duration-500 overflow-y-auto custom-scrollbar px-3 md:px-0 w-full box-border">
             <div className={`${activeStep === 'detailed-setup' ? 'max-w-[96vw] md:max-w-[95%] xl:max-w-7xl' : 'max-w-md'} mx-auto w-full bg-black/40 backdrop-blur-2xl p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-2 border-white/5 shadow-2xl space-y-5 md:space-y-6 shrink-0 box-border overflow-hidden`}>
                <StepHeader 
                  title={activeStep === 'detailed-setup' ? "Detailed Data" : "Report Config"} 
                  subtitle={activeStep === 'detailed-setup' ? "Customize Full Master Export" : "Configure Parameters"} 
                  onBackStep={() => setActiveStep(activeStep === 'attendance-download-range' ? 'driver-attendance' : (activeStep === 'summary-download-range' ? 'trip-summary' : 'dashboard'))} 
                />
                
                <div className="flex flex-col gap-4 w-full box-border">
                  <div className={`grid grid-cols-2 gap-4 w-full box-border`}>
                    <div className="space-y-1.5 w-full box-border">
                      <label className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-center block">Start Date</label>
                      <input type="date" value={range.start} onChange={e => setRange({...range, start: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-1 py-1.5 text-[10px] sm:text-sm font-black text-white outline-none focus:border-emerald-500 transition-all box-border text-center" />
                    </div>
                    <div className="space-y-1.5 w-full box-border">
                      <label className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-center block">End Date</label>
                      <input type="date" value={range.end} onChange={e => setRange({...range, end: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-1 py-1.5 text-[10px] sm:text-sm font-black text-white outline-none focus:border-emerald-500 transition-all box-border text-center" />
                    </div>
                  </div>
                  
                  {/* FULL WIDTH CUSTOM HEADER OPTION */}
                  <div className="space-y-1.5 w-full box-border mt-1">
                    <label className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2 truncate justify-center">CUSTOM HEADER (OPTIONAL)</label>
                    <input type="text" value={customHeader} onChange={e => setCustomHeader(e.target.value)} placeholder="Title" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] sm:text-sm font-black text-white outline-none focus:border-emerald-500 transition-all box-border placeholder:text-slate-700" />
                  </div>
                </div>

                {activeStep === 'detailed-setup' && (
                  <div className="space-y-3 pt-1 w-full box-border">
                    <label className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">Selective Columns</label>
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-2 p-2 bg-black/20 rounded-2xl border border-white/5 overflow-y-auto max-h-[35vh] md:max-h-none box-border">
                       {BOOKING_FIELDS.map(f => (
                         <button key={f.value} onClick={() => toggleField(f.value as BookingField)} className={`flex items-center gap-2 px-2.5 py-3 rounded-xl text-[7.5px] md:text-[9px] font-black uppercase tracking-tight border transition-all ${selectedFields.includes(f.value as BookingField) ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-lg' : 'bg-black/20 text-slate-500 border-white/5 hover:border-white/20'}`}>
                           <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${selectedFields.includes(f.value as BookingField) ? 'bg-emerald-600 border-emerald-400' : 'border-slate-700'}`}>
                             {selectedFields.includes(f.value as BookingField) && <div className="w-3.5 h-3.5 rounded bg-emerald-600 flex items-center justify-center"><Check size={10} className="text-white" /></div>}
                           </div>
                           <span className="truncate">{f.label}</span>
                         </button>
                       ))}
                    </div>
                  </div>
                )}

                {(activeStep === 'attendance-download-range' || activeStep === 'fuel-report-range' || activeStep === 'detailed-setup' || activeStep === 'booking-details-range') && (
                  <div className="pt-2 border-t border-white/5 space-y-3 w-full box-border">
                    <button onClick={toggleSigState} className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all ${getSigState() ? 'bg-emerald-600/20 border-emerald-500' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${getSigState() ? 'bg-emerald-500 text-white' : 'bg-white/5 text-slate-600'}`}>{getSigState() ? <ShieldCheck size={20} /> : <ShieldOff size={20} />}</div>
                      <div className="text-left flex-1 min-w-0">
                        <p className={`text-[11px] font-black uppercase tracking-widest ${getSigState() ? 'text-white' : 'text-slate-500'}`}>Signature Lines</p>
                        <p className="text-[7.5px] font-bold text-slate-600 uppercase truncate">Official Documentation Mode</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${getSigState() ? 'bg-emerald-500 border-emerald-400' : 'border-slate-800'}`}>{getSigState() && <Check size={12} className="text-white" />}</div>
                    </button>
                  </div>
                )}

                <div className="w-full box-border pt-4 pb-2">
                  <button onClick={() => {
                    if(activeStep === 'payment-slip-range') setActiveStep('handoff-prompt');
                    else if(activeStep === 'booking-details-range') handleBookingDetailsGenerate();
                    else if(activeStep === 'fuel-report-range') handleFuelReportDownload();
                    else if(activeStep === 'detailed-setup') handleDetailedReportExport();
                    else if(activeStep === 'summary-download-range') setActiveStep('graph-choice');
                    else handleAttendanceSheetDownload();
                  }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 md:py-5 rounded-xl font-black uppercase text-[12px] md:text-[14px] tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 box-border border border-emerald-400/20">
                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    {isGenerating ? 'Processing PDF...' : 'Export Final PDF'}
                  </button>
                </div>
             </div>
          </div>
        )}

        {activeStep === 'handoff-form' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 w-full box-border">
             <div className="max-w-4xl mx-auto w-full bg-black/40 backdrop-blur-3xl p-5 md:p-8 rounded-[2rem] border-2 border-white/5 shadow-2xl flex flex-col min-h-0 box-border overflow-hidden">
                <StepHeader title="Authorization" subtitle="Handover Details" onBackStep={() => setActiveStep('handoff-prompt')} />
                <div className="flex-1 overflow-y-auto custom-scrollbar px-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full box-border">
                  <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/5 shadow-inner box-border">
                    <h5 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2"><ShieldCheck className="text-emerald-500" size={14} /> Provider</h5>
                    <div className="space-y-3">
                      <input type="text" value={handoffData.providerArmyNo} onChange={e => setHandoffData({...handoffData, providerArmyNo: e.target.value})} placeholder="Army No" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-all box-border placeholder:text-slate-700" />
                      <input type="text" value={handoffData.providerRank} onChange={e => setHandoffData({...handoffData, providerRank: e.target.value})} placeholder="Rank" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-all box-border placeholder:text-slate-700" />
                      <input type="text" value={handoffData.providerName} onChange={e => setHandoffData({...handoffData, providerName: e.target.value})} placeholder="Name" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-all box-border placeholder:text-slate-700" />
                    </div>
                  </div>
                  <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/5 shadow-inner box-border">
                    <h5 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2"><UserCheck className="text-emerald-500" size={14} /> Receiver</h5>
                    <div className="space-y-3">
                      <input type="text" value={handoffData.receiverArmyNo} onChange={e => setHandoffData({...handoffData, receiverArmyNo: e.target.value})} placeholder="Army No" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-all box-border placeholder:text-slate-700" />
                      <input type="text" value={handoffData.receiverRank} onChange={e => setHandoffData({...handoffData, receiverRank: e.target.value})} placeholder="Rank" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-all box-border placeholder:text-slate-700" />
                      <input type="text" value={handoffData.receiverName} onChange={e => setHandoffData({...handoffData, receiverName: e.target.value})} placeholder="Name" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-emerald-500 transition-all box-border placeholder:text-slate-700" />
                    </div>
                  </div>
                </div>
                <div className="px-6 w-full box-border mt-5 shrink-0">
                  <button onClick={handlePaymentSlipGenerate} disabled={isGenerating} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black uppercase text-[11px] tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                    {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                    Export Monthly PDF
                  </button>
                </div>
             </div>
          </div>
        )}

        {activeStep === 'trip-summary' && (
          <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-500 overflow-hidden w-full box-border">
            <div className="flex items-center justify-between mb-2 shrink-0 w-full box-border px-1">
              <StepHeader title="Trip Stats" subtitle={`Annual ${selectedYear}`} onBackStep={() => setActiveStep('dashboard')} />
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 shrink-0">
                 <button onClick={() => setSelectedYear(y => y - 1)} className="p-1 text-slate-400 hover:text-white transition-colors"><ChevronLeft size={16}/></button>
                 <span className="text-[10px] font-black text-white px-2 min-w-[40px] text-center">{selectedYear}</span>
                 <button onClick={() => setSelectedYear(y => y + 1)} className="p-1 text-slate-400 hover:text-white transition-colors"><ChevronRight size={16}/></button>
              </div>
            </div>
            <div className="flex-1 bg-black/20 p-4 md:p-8 rounded-[2rem] border border-white/5 flex flex-col min-h-0 overflow-hidden shadow-inner w-full box-border mx-auto">
               <div className="flex-1 relative flex items-end gap-1.5 md:gap-4 pt-10 pb-6 min-h-0 w-full box-border">
                  <div className="flex flex-col justify-between h-full text-right pr-1.5 border-r border-white/5 select-none shrink-0">
                     {scaleValues.map(val => (
                       <span key={`l-${val}`} className="text-[8px] md:text-[10px] font-black text-slate-500 tabular-nums">{val}</span>
                     ))}
                  </div>
                  <div className="flex-1 relative h-full flex items-end justify-between gap-1 px-1 border-b-2 border-white/10">
                    {monthlyStats.map((stat, i) => {
                      const heightPercent = Math.min((stat.count / maxScale) * 100, 100);
                      const finalHeight = Math.max(heightPercent, stat.count > 0 ? 3 : 0);
                      return (
                        <div key={`${selectedYear}-${stat.month}`} className="flex-1 flex flex-col items-center group/bar relative h-full justify-end">
                           {/* Numerical Label on Top */}
                           <div 
                              className="absolute z-40 mb-1"
                              style={{ bottom: `${finalHeight}%` }}
                           >
                             <span className="text-[6.5px] md:text-[11px] font-black text-emerald-400 tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                               {stat.count > 0 ? stat.count : ''}
                             </span>
                           </div>

                           <div className="w-full max-w-[16px] md:max-w-[40px] rounded-t-sm md:rounded-t-lg shadow-2xl animate-bar-grow transition-all border-x border-t border-white/10"
                             style={{ height: `${finalHeight}%`, animationDelay: `${i * 80}ms`, background: stat.style.gradient, backgroundColor: stat.style.color }}></div>
                           <span className="absolute -bottom-5 text-[6.5px] md:text-[9px] font-black text-slate-400 uppercase tracking-tighter">{stat.month}</span>
                        </div>
                      );
                    })}
                  </div>
               </div>
               <div className="mt-8 flex justify-between items-center shrink-0 w-full box-border">
                 <div className="bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/20 truncate mr-2">
                   <span className="text-[8px] md:text-[11px] font-black text-emerald-400 uppercase tracking-widest">Aggregate: {monthlyStats.reduce((a, b) => a + b.count, 0)} Trips</span>
                 </div>
                 <button onClick={() => setActiveStep('summary-download-range')} className="flex items-center gap-2 px-5 md:px-7 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[8px] md:text-[11px] font-black uppercase tracking-widest shadow-xl shrink-0 transition-all active:scale-95">
                   <Download size={14} /> EXPORT
                 </button>
               </div>
            </div>
          </div>
        )}

        {(activeStep === 'handoff-prompt' || activeStep === 'graph-choice') && (
          <div className="flex-1 flex flex-col h-full justify-center animate-in fade-in zoom-in-95 duration-500 px-4 md:px-0 w-full box-border">
            <div className="max-w-md mx-auto w-full text-center space-y-7 bg-emerald-950/60 backdrop-blur-3xl rounded-[2.5rem] border-2 border-white/5 p-8 md:p-10 shadow-2xl box-border overflow-hidden">
              <div className="w-16 h-16 bg-emerald-600/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20 shadow-inner shrink-0">
                {activeStep === 'handoff-prompt' ? <UserCheck size={32} /> : <BarChart size={32} />}
              </div>
              <div className="space-y-2.5">
                <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight leading-none">
                  {activeStep === 'handoff-prompt' ? 'AUTHORIZED SIGNATURES' : 'DATA VISUALIZATION'}
                </h3>
                <p className="text-slate-400 font-bold text-[9px] md:text-[10px] uppercase tracking-widest leading-relaxed opacity-60">
                  {activeStep === 'handoff-prompt' ? 'Include officer identity for handover' : 'Select preferred presentation'}
                </p>
              </div>
              <div className="flex flex-col gap-3.5">
                {activeStep === 'handoff-prompt' ? (
                  <>
                    <button onClick={() => setActiveStep('handoff-form')} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] md:text-[11px] shadow-lg active:scale-95 transition-all">Yes, Include Info</button>
                    <button onClick={handlePaymentSlipGenerate} className="w-full bg-white/5 text-slate-300 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] md:text-[11px] border border-white/10 active:scale-95 transition-all hover:bg-white/10">No, Skip</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleTripSummaryDownload(true)} disabled={isGenerating} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black uppercase text-[10px] md:text-[11px] shadow-lg active:scale-95 transition-all">Statistical Chart</button>
                    <button onClick={() => handleTripSummaryDownload(false)} disabled={isGenerating} className="w-full bg-white/5 text-slate-300 py-4 rounded-xl font-black uppercase text-[10px] md:text-[11px] border border-white/10 active:scale-95 transition-all hover:bg-white/10">Data Table Only</button>
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