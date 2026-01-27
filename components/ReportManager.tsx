import React, { useState, useMemo } from 'react';
import { FileText, Table, ChevronLeft, ChevronRight, Calendar as CalendarIcon, UserCheck, ArrowRight, ArrowLeft, BarChart3, TrendingUp, Download, BarChart } from 'lucide-react';
import { Booking, BookingField, HandoffInfo } from '../types';
import { generatePaymentSlip, generateOverallReport, generateTripSummaryReport } from '../services/pdfService';
import { BOOKING_FIELDS } from '../constants';
import { startOfMonth, endOfMonth, subMonths, format, parseISO, getYear, getMonth, startOfYear, endOfYear } from 'date-fns';

interface ReportManagerProps {
  bookings: Booking[];
  onBack?: () => void;
}

type ReportStep = 'dashboard' | 'payment-slip-range' | 'handoff-prompt' | 'handoff-form' | 'detailed-setup' | 'trip-summary' | 'summary-download-range' | 'graph-choice';

// 12 Distinct Premium Gradients for each month
const MONTH_COLORS = [
  'from-emerald-400 via-emerald-500 to-emerald-600', // Jan
  'from-cyan-400 via-cyan-500 to-cyan-600',       // Feb
  'from-blue-400 via-blue-500 to-blue-600',       // Mar
  'from-indigo-400 via-indigo-500 to-indigo-600', // Apr
  'from-violet-400 via-violet-500 to-violet-600', // May
  'from-fuchsia-400 via-fuchsia-500 to-fuchsia-600', // Jun
  'from-rose-400 via-rose-500 to-rose-600',       // Jul
  'from-orange-400 via-orange-500 to-orange-600', // Aug
  'from-amber-400 via-amber-500 to-amber-600',    // Sep
  'from-yellow-400 via-yellow-500 to-yellow-600', // Oct
  'from-lime-400 via-lime-500 to-lime-600',       // Nov
  'from-teal-400 via-teal-500 to-teal-600'        // Dec
];

const ReportManager: React.FC<ReportManagerProps> = ({ bookings, onBack }) => {
  const [activeStep, setActiveStep] = useState<ReportStep>('dashboard');
  const [selectedYear, setSelectedYear] = useState(() => getYear(new Date()));

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

  const monthlyStats = useMemo(() => {
    const statsArray = Array(12).fill(0).map((_, i) => ({
      month: format(new Date(selectedYear, i, 1), 'MMM'),
      count: 0,
      color: MONTH_COLORS[i]
    }));
    
    bookings.forEach(b => {
      if (b.isSpecialNote) return;
      try {
        const startDate = parseISO(b.startDate);
        if (getYear(startDate) === selectedYear) {
          const monthIndex = getMonth(startDate);
          if (monthIndex >= 0 && monthIndex < 12) {
            statsArray[monthIndex].count++;
          }
        }
      } catch (err) {}
    });
    
    return statsArray;
  }, [bookings, selectedYear]);

  const maxScale = 30;

  const toggleField = (field: BookingField) => {
    setSelectedFields(prev => 
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  const isRangeValid = range.start && range.end;
  const isSummaryRangeValid = summaryRange.start && summaryRange.end;

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

  const inputClasses = "block w-full min-w-0 pl-8 md:pl-10 pr-2 md:pr-4 py-2 bg-white/5 border-2 border-white/10 rounded-lg md:rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all text-[11px] md:text-sm font-bold text-white shadow-sm hover:border-white/20 box-border appearance-none";
  const labelClasses = "text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1";

  const StepHeader = ({ title, subtitle, onBackStep }: { title: string, subtitle: string, onBackStep: () => void }) => (
    <div className="flex items-center gap-3 md:gap-4 mb-1 md:mb-2 animate-in fade-in slide-in-from-left-4 duration-500">
      <button 
        onClick={onBackStep}
        className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center bg-white/5 border border-white/10 text-slate-400 rounded-lg md:rounded-xl hover:bg-white hover:text-slate-900 transition-all active:scale-90 shadow-sm shrink-0"
      >
        <ArrowLeft size={16} />
      </button>
      <div className="min-w-0 flex-1">
        <h3 className="text-xs md:text-lg font-black text-white uppercase tracking-tight leading-none truncate">{title}</h3>
        <p className="text-slate-400 font-bold text-[7px] md:text-[9px] uppercase tracking-widest mt-0.5 truncate">{subtitle}</p>
      </div>
    </div>
  );

  const DateInput = ({ label, value, onChange }: any) => (
    <div className="relative group w-full mb-1">
      <label className={labelClasses}>{label}</label>
      <div className="relative w-full overflow-hidden rounded-lg md:rounded-xl">
        <CalendarIcon className="absolute left-2.5 md:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none z-10" size={14} />
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
    <div className="flex flex-col max-w-4xl mx-auto w-full px-4 md:px-0 box-border min-h-0 h-full">
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

            <button onClick={() => setActiveStep('trip-summary')} className="p-4 md:p-6 bg-[#062c1e] rounded-2xl md:rounded-[2rem] border-2 border-white/5 shadow-xl hover:border-amber-500 transition-all group text-left flex flex-col items-start md:col-span-2">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
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

      {activeStep === 'trip-summary' && (
        <div className="animate-in fade-in zoom-in-95 duration-500 w-full flex flex-col py-1 md:py-2 h-full min-h-0 overflow-hidden">
          <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-1 shrink-0 mb-1">
            <StepHeader 
              title="Trip Statistics" 
              subtitle={`Annual Overview for ${selectedYear}`} 
              onBackStep={() => setActiveStep('dashboard')} 
            />
            <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/10 self-end md:self-center shadow-lg">
               <button onClick={() => setSelectedYear(y => y - 1)} className="p-1 hover:bg-white/10 rounded-lg text-slate-400 active:scale-90"><ChevronLeft size={16} /></button>
               <span className="text-xs font-black text-white min-w-[50px] text-center tracking-widest">{selectedYear}</span>
               <button onClick={() => setSelectedYear(y => y + 1)} className="p-1 hover:bg-white/10 rounded-lg text-slate-400 active:scale-90"><ChevronRight size={16} /></button>
            </div>
          </div>
          
          <div className="w-full bg-[#062c1e] p-3 md:p-6 rounded-2xl md:rounded-[2rem] border-2 border-white/5 shadow-2xl relative flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center gap-3 mb-4 md:mb-6 shrink-0">
               <div className="w-8 h-8 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center">
                  <TrendingUp size={18} />
               </div>
               <div>
                  <h3 className="text-sm md:text-lg font-black text-white uppercase tracking-tight">Monthly Trip Volume</h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Record Analysis for {selectedYear}</p>
               </div>
            </div>

            {/* Increased pt-16 to give enough room for labels without hitting the header */}
            <div className="flex items-end gap-1 md:gap-4 relative group flex-1 pt-16 pb-10 min-h-0">
              {/* Left Scale */}
              <div className="flex flex-col justify-between h-full text-right pr-1 md:pr-2 select-none border-r border-white/5 pb-8">
                 {[30, 20, 10, 0].map(val => (
                   <div key={`l-${val}`} className="flex items-center justify-end gap-1">
                     <span className="text-[8px] md:text-[10px] font-black text-slate-500">{val}</span>
                     <div className="w-1 h-[1px] bg-slate-600"></div>
                   </div>
                 ))}
              </div>

              {/* Chart */}
              <div className="flex-1 relative h-full flex items-end justify-between gap-1 md:gap-4 px-1 md:px-2 border-b-2 border-white/10 pb-8">
                 <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-[0.05] px-2 pb-8">
                    <div className="w-full border-t border-white"></div>
                    <div className="w-full border-t border-white"></div>
                    <div className="w-full border-t border-white"></div>
                    <div className="w-full"></div>
                 </div>

                 {monthlyStats.map((stat, i) => {
                   const heightPercent = (stat.count / maxScale) * 100;
                   return (
                     <div key={`${selectedYear}-${stat.month}`} className="flex-1 flex flex-col items-center group/bar relative z-10 h-full justify-end">
                        <div 
                          className={`w-full max-w-[20px] md:max-w-[48px] bg-gradient-to-t ${stat.color} rounded-t-sm md:rounded-t-lg shadow-lg animate-bar-grow transition-all cursor-default border-x border-t border-white/10 hover:brightness-125`}
                          style={{ 
                            height: `${Math.max(heightPercent, stat.count > 0 ? 3 : 0)}%`,
                            animationDelay: `${i * 60}ms`
                          }}
                        ></div>
                        <span className="absolute -bottom-7 text-[7px] md:text-[10px] font-black text-slate-400 uppercase tracking-tight group-hover/bar:text-white transition-colors">
                          {stat.month}
                        </span>
                        {stat.count > 0 && (
                          <span className="absolute -top-8 md:-top-11 text-[10px] md:text-[14px] font-black text-white bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-md z-30 shadow-sm border border-white/10">
                            {stat.count}
                          </span>
                        )}
                     </div>
                   );
                 })}
              </div>

              {/* Right Scale */}
              <div className="flex flex-col justify-between h-full text-left pl-1 md:pl-2 select-none border-l border-white/5 pb-8">
                 {[30, 20, 10, 0].map(val => (
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
                  <span className="text-[8px] font-black text-white uppercase tracking-widest">Overview</span>
               </div>
               <div className="px-4 py-1.5 bg-emerald-600/10 rounded-xl border border-emerald-500/20">
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                    <BarChart3 size={12} /> Annual Total: {monthlyStats.reduce((a, b) => a + b.count, 0)}
                  </span>
               </div>
            </div>
          </div>

          {/* Premium Emerald Green Button */}
          <div className="mt-2 flex flex-col items-center animate-in fade-in slide-in-from-top-2 duration-500 shrink-0 pb-4">
            <button
              onClick={() => setActiveStep('summary-download-range')}
              className="flex items-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 group border border-white/10"
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
        <div className="animate-in fade-in zoom-in-95 duration-500 max-w-md mx-auto text-center space-y-6 py-12">
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
        <div className="animate-in fade-in zoom-in-95 duration-500 max-w-md mx-auto text-center space-y-6 py-12">
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
    </div>
  );
};

export default ReportManager;