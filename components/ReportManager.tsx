
import React, { useState } from 'react';
import { FileText, Table, CheckCircle2, ChevronDown, Calendar as CalendarIcon, UserCheck, ShieldCheck, User, ArrowRight, History, FastForward, ArrowLeft, Settings2, FileCheck } from 'lucide-react';
import { Booking, BookingField, HandoffInfo } from '../types';
import { generatePaymentSlip, generateOverallReport } from '../services/pdfService';
import { BOOKING_FIELDS } from '../constants';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

interface ReportManagerProps {
  bookings: Booking[];
  onBack?: () => void;
}

type ReportStep = 'dashboard' | 'payment-slip-range' | 'handoff-prompt' | 'handoff-form' | 'detailed-setup';

const ReportManager: React.FC<ReportManagerProps> = ({ bookings, onBack }) => {
  const [activeStep, setActiveStep] = useState<ReportStep>('dashboard');
  
  // Initialize with current month start and end dates
  const [range, setRange] = useState(() => {
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

  const toggleField = (field: BookingField) => {
    setSelectedFields(prev => 
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  const isRangeValid = range.start && range.end;

  const setQuickRange = (type: 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    let start, end;
    if (type === 'thisMonth') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else {
      const lastMonth = subMonths(now, 1);
      start = startOfMonth(lastMonth);
      end = endOfMonth(lastMonth);
    }
    setRange({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd')
    });
  };

  const handlePaymentRangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRangeValid) setActiveStep('handoff-prompt');
  };

  const handlePromptChoice = async (choice: 'yes' | 'no') => {
    if (choice === 'yes') {
      setActiveStep('handoff-form');
    } else {
      setIsGenerating(true);
      await generatePaymentSlip(bookings, range.start, range.end);
      setIsGenerating(false);
      setActiveStep('dashboard');
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

  // Input styles adjusted for dark background visibility
  const inputClasses = "block w-full min-w-0 pl-8 md:pl-10 pr-2 md:pr-4 py-2.5 md:py-3 bg-white/5 border-2 border-white/10 rounded-lg md:rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all text-[11px] md:text-sm font-bold text-white shadow-sm hover:border-white/20 box-border appearance-none";
  const labelClasses = "text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1";

  const StepHeader = ({ title, subtitle, onBackStep }: { title: string, subtitle: string, onBackStep: () => void }) => (
    <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6 animate-in fade-in slide-in-from-left-4 duration-500">
      <button 
        onClick={onBackStep}
        className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-white/5 border border-white/10 text-slate-400 rounded-lg md:rounded-xl hover:bg-white hover:text-slate-900 transition-all active:scale-90 shadow-sm shrink-0"
      >
        <ArrowLeft size={16} className="md:w-5 md:h-5" />
      </button>
      <div className="min-w-0 flex-1">
        <h3 className="text-xs md:text-xl font-black text-white uppercase tracking-tight leading-none truncate">{title}</h3>
        <p className="text-slate-400 font-bold text-[7px] md:text-[10px] uppercase tracking-widest mt-0.5 truncate">{subtitle}</p>
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
    <div className="space-y-4 md:space-y-6 py-1 md:py-2 max-w-4xl mx-auto w-full px-4 md:px-0 box-border">
      {/* 1. DASHBOARD VIEW */}
      {activeStep === 'dashboard' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 md:space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg md:text-3xl font-black text-white uppercase tracking-tight truncate">Report Generator</h2>
              <p className="text-slate-400 font-bold mt-0.5 md:mt-1 uppercase text-[7px] md:text-[10px] tracking-[0.2em]">Choose a document type</p>
            </div>
            {onBack && (
              <button 
                onClick={onBack}
                className="flex items-center justify-center gap-2 text-[8px] md:text-[10px] font-black text-slate-300 hover:text-white transition-all uppercase tracking-widest bg-white/5 hover:bg-white/10 border border-white/10 px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl shadow-sm shrink-0"
              >
                <ArrowLeft size={12} /> Back
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Payment Slip Card */}
            <button
              onClick={() => setActiveStep('payment-slip-range')}
              className="p-4 md:p-6 bg-[#062c1e] rounded-2xl md:rounded-[2rem] border-2 border-white/5 shadow-[0_25px_60px_rgba(0,0,0,0.5)] hover:border-emerald-600 hover:shadow-emerald-900/10 transition-all group relative overflow-hidden text-left flex flex-col items-start"
            >
              <div className="w-10 h-10 md:w-14 md:h-14 bg-emerald-600 text-white rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-5 group-hover:scale-105 transition-transform shadow-lg">
                <FileText size={20} md:size={28} strokeWidth={2.5} />
              </div>
              <h4 className="text-sm md:text-xl font-black text-white uppercase tracking-tight mb-1 md:mb-2">Payment Slip</h4>
              <p className="text-slate-400 font-medium text-[9px] md:text-xs leading-relaxed mb-4 md:mb-6 opacity-80">Handover bills with automated calculations and officer details.</p>
              <div className="mt-auto flex items-center gap-2 text-emerald-400 font-black uppercase text-[8px] md:text-[10px] tracking-widest">
                Start Generation <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Detailed Data Card */}
            <button
              onClick={() => setActiveStep('detailed-setup')}
              className="p-4 md:p-6 bg-[#062c1e] rounded-2xl md:rounded-[2rem] border-2 border-white/5 shadow-[0_25px_60px_rgba(0,0,0,0.5)] hover:border-emerald-600 hover:shadow-emerald-900/10 transition-all group relative overflow-hidden text-left flex flex-col items-start"
            >
              <div className="w-10 h-10 md:w-14 md:h-14 bg-slate-700 text-white rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-5 group-hover:scale-105 transition-transform shadow-lg">
                <Table size={20} md:size={28} strokeWidth={2.5} />
              </div>
              <h4 className="text-sm md:text-xl font-black text-white uppercase tracking-tight mb-1 md:mb-2">Detailed Data</h4>
              <p className="text-slate-400 font-medium text-[9px] md:text-xs leading-relaxed mb-4 md:mb-6 opacity-80">Full export of booking history with fully custom columns.</p>
              <div className="mt-auto flex items-center gap-2 text-slate-400 font-black uppercase text-[8px] md:text-[10px] tracking-widest">
                Configure Table <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 2. PAYMENT SLIP RANGE SELECTION */}
      {activeStep === 'payment-slip-range' && (
        <div className="animate-in fade-in slide-in-from-right-6 duration-500 max-w-lg mx-auto w-full">
          <StepHeader 
            title="Step 1: Select Period" 
            subtitle="Choose date range" 
            onBackStep={() => setActiveStep('dashboard')} 
          />
          <form onSubmit={handlePaymentRangeSubmit} className="space-y-4 md:space-y-6 bg-[#062c1e] p-4 md:p-8 rounded-2xl md:rounded-[2rem] border-2 border-white/5 shadow-[0_25px_60px_rgba(0,0,0,0.5)] w-full box-border overflow-hidden">
             <div className="flex gap-2 justify-center mb-2">
                <button type="button" onClick={() => setQuickRange('thisMonth')} className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-[7px] md:text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-md">
                   This Month
                </button>
                <button type="button" onClick={() => setQuickRange('lastMonth')} className="flex items-center gap-1.5 px-3 md:px-4 py-1.5 bg-white/10 text-slate-300 rounded-lg text-[7px] md:text-[9px] font-black uppercase tracking-widest hover:bg-white/20 transition-all">
                   Last Month
                </button>
             </div>
             <div className="grid grid-cols-1 gap-3 md:gap-4 w-full">
               <DateInput label="From Date" value={range.start} onChange={(e:any) => setRange(p => ({...p, start: e.target.value}))} />
               <DateInput label="To Date" value={range.end} onChange={(e:any) => setRange(p => ({...p, end: e.target.value}))} />
             </div>
             <button
               type="submit"
               disabled={!isRangeValid}
               className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 md:py-4 rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[11px] transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 mt-2"
             >
               Next Step <ArrowRight size={14} className="inline ml-1" />
             </button>
          </form>
        </div>
      )}

      {/* 3. HANDOFF PROMPT */}
      {activeStep === 'handoff-prompt' && (
        <div className="animate-in fade-in zoom-in-95 duration-500 max-w-md mx-auto text-center space-y-4 md:space-y-6 py-6 md:py-10">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-600/10 text-emerald-500 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <UserCheck size={24} />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm md:text-xl font-black text-white uppercase tracking-tight">Personnel Signature?</h3>
            <p className="text-slate-400 font-bold text-[8px] md:text-xs uppercase tracking-widest leading-relaxed">Add officer details for formal signatures?</p>
          </div>
          <div className="flex flex-col gap-2 px-4">
            <button
              onClick={() => handlePromptChoice('yes')}
              className="w-full bg-emerald-600 text-white py-3 md:py-4 rounded-xl font-black uppercase tracking-widest text-[8px] md:text-[10px] hover:bg-emerald-500 transition-all shadow-lg"
            >
              Add Personnel Info
            </button>
            <button
              onClick={() => handlePromptChoice('no')}
              className="w-full bg-white/10 text-slate-300 py-3 md:py-4 rounded-xl font-black uppercase tracking-widest text-[8px] md:text-[10px] hover:bg-white/20 transition-all"
            >
              Skip and Generate
            </button>
          </div>
        </div>
      )}

      {/* 4. HANDOFF FORM */}
      {activeStep === 'handoff-form' && (
        <div className="animate-in fade-in slide-in-from-right-6 duration-500 max-w-lg mx-auto w-full">
          <StepHeader 
            title="Personnel Details" 
            subtitle="Officer info for signatures" 
            onBackStep={() => setActiveStep('handoff-prompt')} 
          />
          <form onSubmit={handleHandoffSubmit} className="space-y-4 md:space-y-6 w-full">
            <div className="space-y-4 bg-[#062c1e] p-4 md:p-6 rounded-2xl md:rounded-[2rem] border-2 border-white/5 shadow-[0_25px_60px_rgba(0,0,0,0.5)] w-full box-border">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={16} className="text-emerald-500" />
                <h5 className="text-[9px] md:text-xs font-black text-white uppercase tracking-widest">Provider (Handing Over)</h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="md:col-span-2">
                  <label className={labelClasses}>Army No</label>
                  <input required value={handoffData.providerArmyNo} onChange={e => setHandoffData({...handoffData, providerArmyNo: e.target.value})} className={inputClasses} placeholder="Example 1815124" />
                </div>
                <div>
                  <label className={labelClasses}>Rank</label>
                  <input required value={handoffData.providerRank} onChange={e => setHandoffData({...handoffData, providerRank: e.target.value})} className={inputClasses} placeholder="Rank" />
                </div>
                <div>
                  <label className={labelClasses}>Name</label>
                  <input required value={handoffData.providerName} onChange={e => setHandoffData({...handoffData, providerName: e.target.value})} className={inputClasses} placeholder="Example: Billal Hossain" />
                </div>
              </div>
            </div>

            <div className="space-y-4 bg-[#062c1e] p-4 md:p-6 rounded-2xl md:rounded-[2rem] border-2 border-white/5 shadow-[0_25px_60px_rgba(0,0,0,0.5)] w-full box-border">
              <div className="flex items-center gap-2 mb-1">
                <User size={16} className="text-emerald-500" />
                <h5 className="text-[9px] md:text-xs font-black text-white uppercase tracking-widest">Receiver (Taking Over)</h5>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="md:col-span-2">
                  <label className={labelClasses}>Army No</label>
                  <input required value={handoffData.receiverArmyNo} onChange={e => setHandoffData({...handoffData, receiverArmyNo: e.target.value})} className={inputClasses} placeholder="Example 1815124" />
                </div>
                <div>
                  <label className={labelClasses}>Rank</label>
                  <input required value={handoffData.receiverRank} onChange={e => setHandoffData({...handoffData, receiverRank: e.target.value})} className={inputClasses} placeholder="Rank" />
                </div>
                <div>
                  <label className={labelClasses}>Name</label>
                  <input required value={handoffData.receiverName} onChange={e => setHandoffData({...handoffData, receiverName: e.target.value})} className={inputClasses} placeholder="Example: Billal Hossain" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 md:py-4 rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[11px] transition-all shadow-xl active:scale-95"
            >
              {isGenerating ? 'Processing...' : 'Finalize PDF'}
            </button>
          </form>
        </div>
      )}

      {/* 5. DETAILED DATA SETUP */}
      {activeStep === 'detailed-setup' && (
        <div className="animate-in fade-in slide-in-from-right-6 duration-500 w-full max-w-2xl mx-auto">
          <StepHeader 
            title="Detailed Report" 
            subtitle="Configure columns" 
            onBackStep={() => setActiveStep('dashboard')} 
          />
          
          <div className="bg-[#062c1e] p-4 md:p-8 rounded-2xl md:rounded-[2rem] border-2 border-white/5 shadow-[0_25px_60px_rgba(0,0,0,0.5)] space-y-6 md:space-y-8 w-full box-border overflow-hidden">
            {/* Range Selection */}
            <div className="space-y-4 w-full">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="text-emerald-500" size={16} />
                  <h4 className="text-[10px] md:text-xs font-black text-white uppercase tracking-tight">1. Period</h4>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setQuickRange('thisMonth')} className="text-[7px] md:text-[8px] font-black text-white px-2 py-1 bg-emerald-600 rounded-md uppercase tracking-widest">This Month</button>
                  <button onClick={() => setQuickRange('lastMonth')} className="text-[7px] md:text-[8px] font-black text-slate-400 px-2 py-1 bg-white/5 rounded-md uppercase tracking-widest">Last Month</button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:gap-4 w-full">
                <DateInput label="From Date" value={range.start} onChange={(e:any) => setRange(p => ({...p, start: e.target.value}))} />
                <DateInput label="To Date" value={range.end} onChange={(e:any) => setRange(p => ({...p, end: e.target.value}))} />
              </div>
            </div>

            {/* Column Selection */}
            <div className="space-y-4 w-full">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Settings2 className="text-emerald-500" size={16} />
                <h4 className="text-[10px] md:text-xs font-black text-white uppercase tracking-tight">2. Columns</h4>
              </div>
              <div className="grid grid-cols-1 gap-1.5 w-full">
                {BOOKING_FIELDS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => toggleField(f.value as BookingField)}
                    className={`flex items-center gap-2 px-3 py-2.5 md:py-3 rounded-lg text-[9px] md:text-[10px] font-black transition-all border-2 w-full text-left ${
                      selectedFields.includes(f.value as BookingField) 
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' 
                      : 'bg-white/5 text-slate-400 border-white/5 hover:border-emerald-500/30 hover:text-white'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${selectedFields.includes(f.value as BookingField) ? 'border-white bg-white/20' : 'border-white/10'}`}>
                      {selectedFields.includes(f.value as BookingField) && <FileCheck size={8} />}
                    </div>
                    <span className="uppercase tracking-widest">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              disabled={!isRangeValid || selectedFields.length === 0 || isGenerating}
              onClick={handleDetailedReportExport}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 md:py-4 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-30 shadow-lg flex items-center justify-center gap-2"
            >
              {isGenerating ? 'Processing...' : 'Export Detailed PDF'}
              {!isGenerating && <ArrowRight size={14} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportManager;
