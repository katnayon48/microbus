import React, { useState } from 'react';
import { X, Calendar, Download, Loader2 } from 'lucide-react';
import { Booking, AppSettings } from '../types';
import { generateCalendarPDF } from '../services/pdfService';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface PrintPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookings: Booking[];
  appSettings: AppSettings;
}

const PrintPdfModal: React.FC<PrintPdfModalProps> = ({ isOpen, onClose, bookings, appSettings }) => {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!startDate || !endDate) return;
    setIsGenerating(true);
    try {
      await generateCalendarPDF(bookings, startDate, endDate, appSettings.ui.headerTitle, appSettings.ui.headerSubtitle);
      onClose();
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-center w-16 h-16 bg-white/10 rounded-full mx-auto mb-6">
        <Calendar size={32} className="text-white" />
      </div>
      
      <h3 className="text-xl font-bold text-white text-center mb-2">Download Bookings PDF</h3>
      <p className="text-slate-400 text-center mb-8 text-sm">
        Select a date range to generate a PDF report of bookings.
      </p>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={isGenerating || !startDate || !endDate}
            className="flex-1 flex items-center justify-center px-4 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Download size={20} className="mr-2" />
                Download PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintPdfModal;
