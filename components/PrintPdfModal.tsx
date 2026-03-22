
import React, { useState } from 'react';
import { CalendarDays, Download, Loader2, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Booking, AppSettings } from '../types';
import { generateCalendarPDF } from '../services/pdfService';

interface PrintPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: Booking[];
  appSettings: AppSettings;
  currentDate: Date;
}

const PrintPdfModal: React.FC<PrintPdfModalProps> = ({ isOpen, onClose, bookings, appSettings, currentDate }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [customHeader, setCustomHeader] = useState('');
  const [range, setRange] = useState({
    start: format(startOfMonth(currentDate), 'yyyy-MM-dd'),
    end: format(endOfMonth(currentDate), 'yyyy-MM-dd')
  });

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await generateCalendarPDF(bookings, range.start, range.end, customHeader || appSettings.branding.title);
      onClose();
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col gap-6 p-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="w-16 h-16 bg-emerald-600/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20 shadow-inner">
        <CalendarDays size={32} />
      </div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Start Date</label>
            <input 
              type="date" 
              value={range.start} 
              onChange={e => setRange({...range, start: e.target.value})} 
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-black text-white outline-none focus:border-emerald-500 transition-all box-border" 
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">End Date</label>
            <input 
              type="date" 
              value={range.end} 
              onChange={e => setRange({...range, end: e.target.value})} 
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-black text-white outline-none focus:border-emerald-500 transition-all box-border" 
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Custom Header (Optional)</label>
          <input 
            type="text" 
            value={customHeader} 
            onChange={e => setCustomHeader(e.target.value)} 
            placeholder="MICROBUS SCHEDULE" 
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-black text-white outline-none focus:border-emerald-500 transition-all box-border" 
          />
        </div>
      </div>

      <button 
        onClick={handleDownload} 
        disabled={isGenerating} 
        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-xs shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2.5 border border-emerald-400/20 disabled:opacity-50"
      >
        {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
        <span>{isGenerating ? 'Generating...' : 'Download Calendar PDF'}</span>
      </button>
    </div>
  );
};

export default PrintPdfModal;
