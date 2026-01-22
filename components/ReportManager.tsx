import React, { useState } from 'react';
import { FileText, Table, CheckCircle2, ChevronDown, ChevronUp, Calendar as CalendarIcon, UserCheck, ShieldCheck, User, ArrowRight, History, FastForward } from 'lucide-react';
import { Booking, BookingField, HandoffInfo } from '../types';
import { generatePaymentSlip, generateOverallReport } from '../services/pdfService';
import { BOOKING_FIELDS } from '../constants';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import Modal from './Modal';

interface ReportManagerProps {
  bookings: Booking[];
}

const ReportManager: React.FC<ReportManagerProps> = ({ bookings }) => {
  const [range, setRange] = useState({ start: '', end: '' });
  const [selectedFields, setSelectedFields] = useState<BookingField[]>([]);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Flow States
  const [showPaymentDateModal, setShowPaymentDateModal] = useState(false);
  const [showHandoffPrompt, setShowHandoffPrompt] = useState(false);
  const [showHandoffForm, setShowHandoffForm] = useState(false);
  
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

  const handlePaymentDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRangeValid) return;
    setShowPaymentDateModal(false);
    setShowHandoffPrompt(true);
  };

  const handlePromptChoice = async (choice: 'yes' | 'no') => {
    setShowHandoffPrompt(false);
    if (choice === 'yes') {
      setShowHandoffForm(true);
    } else {
      setIsGenerating(true);
      await generatePaymentSlip(bookings, range.start, range.end);
      setIsGenerating(false);
    }
  };

  const handleHandoffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    await generatePaymentSlip(bookings, range.start, range.end, handoffData);
    setIsGenerating(false);
    setShowHandoffForm(false);
  };

  const handleDetailedReportClick = async () => {
    setIsGenerating(true);
    await generateOverallReport(bookings, range.start, range.end, selectedFields);
    setIsGenerating(false);
  };

  const handleDateContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const input = e.currentTarget.querySelector('input');
    if (input) {
      try {
        if ((input as any).showPicker) {
            (input as any).showPicker();
        } else {
            input.focus();
        }
      } catch (err) {
        input.focus();
      }
    }
  };

  const inputClasses = "w-full pl-10 pr-10 py-3.5 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all text-sm font-bold text-slate-800 cursor-pointer appearance-none shadow-sm hover:border-slate-300";
  const labelClasses = "text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block ml-1";

  const DateInput = ({ label, value, onChange, id }: any) => (
    <div className="relative group">
      <label className={labelClasses}>{label}</label>
      <div className="relative cursor-pointer" onClick={handleDateContainerClick}>
        <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors pointer-events-none" size={18} />
        <input 
          required
          type="date" 
          value={value}
          onChange={onChange}
          className={inputClasses}
        />
        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 pointer-events-none" size={18} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {/* Payment Slip Card */}
        <div className="p-5 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between gap-4 hover:border-indigo-200 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
              <FileText size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">Payment Slip</h4>
              <p className="text-xs text-slate-500 font-bold opacity-80">Generate hand-over documents</p>
            </div>
          </div>
          <button
            disabled={isGenerating}
            onClick={() => setShowPaymentDateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50"
          >
            Create PDF
          </button>
        </div>

        {/* Overall Data Card */}
        <div className="p-6 bg-white rounded-[2rem] border border-slate-200 shadow-sm flex flex-col gap-5 hover:border-slate-400 transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <Table size={28} strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">Overall Data</h4>
                <p className="text-xs text-slate-500 font-bold opacity-80">Comprehensive history export</p>
              </div>
            </div>
            <button 
              onClick={() => setShowFieldSelector(!showFieldSelector)}
              className="flex items-center gap-2 text-[10px] font-black text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all uppercase tracking-widest border border-indigo-100"
            >
              {showFieldSelector ? 'Close Setup' : 'Configure Table'}
              {showFieldSelector ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {showFieldSelector && (
            <div className="space-y-6 p-6 bg-slate-50/80 rounded-[1.5rem] border border-slate-200 animate-in slide-in-from-top-4 duration-500">
              {/* DATE SELECTION AT TOP AS REQUESTED */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={16} className="text-indigo-600" />
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Select Report Period</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setQuickRange('thisMonth')} className="text-[9px] font-black text-indigo-600 px-2 py-1 bg-white border border-indigo-100 rounded-md hover:bg-indigo-600 hover:text-white transition-all">THIS MONTH</button>
                    <button onClick={() => setQuickRange('lastMonth')} className="text-[9px] font-black text-slate-500 px-2 py-1 bg-white border border-slate-200 rounded-md hover:bg-slate-800 hover:text-white transition-all">LAST MONTH</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DateInput label="From Date" value={range.start} onChange={(e:any) => setRange(p => ({...p, start: e.target.value}))} />
                  <DateInput label="To Date" value={range.end} onChange={(e:any) => setRange(p => ({...p, end: e.target.value}))} />
                </div>
              </div>

              <div className="h-px bg-slate-200" />

              <div className="space-y-4">
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest block ml-1">Configure Table Columns</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BOOKING_FIELDS.map(f => (
                    <button
                      key={f.value}
                      onClick={() => toggleField(f.value as BookingField)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black transition-all border-2 ${
                        selectedFields.includes(f.value as BookingField) 
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' 
                        : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200 hover:text-indigo-600'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-md flex items-center justify-center border ${selectedFields.includes(f.value as BookingField) ? 'border-white bg-white/20' : 'border-slate-200'}`}>
                        {selectedFields.includes(f.value as BookingField) && <CheckCircle2 size={12} />}
                      </div>
                      {f.label.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={!isRangeValid || selectedFields.length === 0 || isGenerating}
                onClick={handleDetailedReportClick}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] transition-all disabled:opacity-30 disabled:grayscale shadow-2xl shadow-slate-200 active:scale-[0.98] mt-4"
              >
                {isGenerating ? 'Processing...' : 'Generate Detailed Report'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Date Modal */}
      <Modal isOpen={showPaymentDateModal} onClose={() => setShowPaymentDateModal(false)} title="Select Report Period">
        <form onSubmit={handlePaymentDateSubmit} className="space-y-8">
          <div className="flex flex-wrap gap-2 justify-center mb-2">
            <button type="button" onClick={() => setQuickRange('thisMonth')} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100">
               <FastForward size={14} /> This Month
            </button>
            <button type="button" onClick={() => setQuickRange('lastMonth')} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all border border-slate-200">
               <History size={14} /> Last Month
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-200">
            <DateInput label="Start Date" value={range.start} onChange={(e:any) => setRange(p => ({...p, start: e.target.value}))} />
            <DateInput label="End Date" value={range.end} onChange={(e:any) => setRange(p => ({...p, end: e.target.value}))} />
          </div>

          <button
            type="submit"
            disabled={!isRangeValid}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.3em] text-[11px] transition-all shadow-2xl shadow-indigo-100 active:scale-95 disabled:opacity-50"
          >
            Continue to Next Step <ArrowRight size={16} className="inline ml-2" strokeWidth={3} />
          </button>
        </form>
      </Modal>

      {/* Signature Prompt Modal */}
      <Modal isOpen={showHandoffPrompt} onClose={() => setShowHandoffPrompt(false)} title="Signature Options">
        <div className="text-center py-6 space-y-8">
          <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-2 shadow-inner">
            <UserCheck size={40} />
          </div>
          <div className="space-y-2">
            <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Add Personnel Info?</h4>
            <p className="text-sm text-slate-500 font-bold px-4 leading-relaxed">Include Provider and Receiver details for formal signatures on the final PDF document.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={() => handlePromptChoice('yes')}
              className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-100"
            >
              YES, ADD INFO
            </button>
            <button
              onClick={() => handlePromptChoice('no')}
              className="flex-1 bg-slate-200 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:bg-slate-300 active:scale-95 transition-all"
            >
              SKIP, JUST PDF
            </button>
          </div>
        </div>
      </Modal>

      {/* Handoff Details Modal */}
      <Modal isOpen={showHandoffForm} onClose={() => setShowHandoffForm(false)} title="Officer Details">
        <form onSubmit={handleHandoffSubmit} className="space-y-8">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-4 p-5 bg-slate-50 rounded-[2rem] border-2 border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={18} className="text-indigo-600" />
                <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest">Provider Credentials</h5>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelClasses}>Personal No / Army No</label>
                  <input required value={handoffData.providerArmyNo} onChange={e => setHandoffData({...handoffData, providerArmyNo: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700" placeholder="e.g. BA-1234" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClasses}>Rank</label>
                    <input required value={handoffData.providerRank} onChange={e => setHandoffData({...handoffData, providerRank: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700" placeholder="Rank" />
                  </div>
                  <div>
                    <label className={labelClasses}>Full Name</label>
                    <input required value={handoffData.providerName} onChange={e => setHandoffData({...handoffData, providerName: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700" placeholder="Name" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5 bg-indigo-50/50 rounded-[2rem] border-2 border-indigo-100/50">
              <div className="flex items-center gap-2 mb-2">
                <User size={18} className="text-indigo-600" />
                <h5 className="text-xs font-black text-slate-800 uppercase tracking-widest">Receiver Credentials</h5>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelClasses}>Personal No / Army No</label>
                  <input required value={handoffData.receiverArmyNo} onChange={e => setHandoffData({...handoffData, receiverArmyNo: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700" placeholder="e.g. BA-5678" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClasses}>Rank</label>
                    <input required value={handoffData.receiverRank} onChange={e => setHandoffData({...handoffData, receiverRank: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700" placeholder="Rank" />
                  </div>
                  <div>
                    <label className={labelClasses}>Full Name</label>
                    <input required value={handoffData.receiverName} onChange={e => setHandoffData({...handoffData, receiverName: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700" placeholder="Name" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-[0.3em] text-[11px] transition-all shadow-2xl shadow-slate-200 active:scale-95"
          >
            Finalize and Generate PDF
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default ReportManager;