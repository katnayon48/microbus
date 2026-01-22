import React, { useState, useEffect } from 'react';
import { Booking, DurationType, GarrisonStatusType } from '../types';
import { Trash2, User, Landmark, MapPin, Calendar, Clock, Banknote, Wallet, AlignLeft, FileDown, Shield, CheckCircle2, Circle, X, Check } from 'lucide-react';
import { generateIndividualPaymentSlip } from '../services/pdfService';
import { differenceInDays, parseISO, format, isBefore } from 'date-fns';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (booking: Booking) => void;
  onDelete?: (id: string) => void;
  initialDate?: Date;
  existingBooking?: Booking | null;
}

const BookingModal: React.FC<BookingModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  initialDate, 
  existingBooking 
}) => {
  const [formData, setFormData] = useState<Partial<Booking>>({
    rankName: '',
    unit: '',
    garrisonStatus: 'In Garrison',
    startDate: '',
    endDate: '',
    duration: 'Full Day',
    destination: '',
    fare: undefined,
    fareStatus: 'Unpaid',
    inTime: '',
    outTime: '',
    remarks: '',
    isExempt: false
  });

  const [isDownloading, setIsDownloading] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsConfirmingDelete(false);
      if (existingBooking) {
        setFormData({ ...existingBooking });
      } else if (initialDate) {
        const dateStr = format(initialDate, 'yyyy-MM-dd');
        setFormData({
          rankName: '',
          unit: '',
          garrisonStatus: 'In Garrison',
          startDate: dateStr,
          endDate: dateStr,
          duration: 'Full Day',
          destination: '',
          fare: undefined,
          fareStatus: 'Unpaid',
          inTime: '',
          outTime: '',
          remarks: '',
          isExempt: false
        });
      }
    }
  }, [existingBooking, initialDate, isOpen]);

  useEffect(() => {
    if (!formData.isExempt && formData.startDate && formData.endDate && formData.garrisonStatus && formData.duration) {
      try {
        const start = parseISO(formData.startDate);
        const end = parseISO(formData.endDate);
        const days = differenceInDays(end, start) + 1;
        
        if (days > 0) {
          let rate = 0;
          if (formData.garrisonStatus === 'In Garrison') {
            rate = formData.duration === 'Full Day' ? 1200 : 800;
          } else {
            rate = formData.duration === 'Full Day' ? 1500 : 1000;
          }
          const calculatedFare = rate * days;
          
          if (formData.fare !== calculatedFare) {
            setFormData(prev => ({ ...prev, fare: calculatedFare }));
          }
        } else if (days <= 0 && formData.fare !== 0) {
          setFormData(prev => ({ ...prev, fare: 0 }));
        }
      } catch (e) {
        console.error("Fare calculation error:", e);
      }
    }
  }, [formData.startDate, formData.endDate, formData.garrisonStatus, formData.duration, formData.isExempt]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const nextData = { 
        ...prev, 
        [name]: name === 'fare' ? (value === '' ? undefined : parseFloat(value)) : value 
      };
      
      // Auto-update End Date when Start Date changes
      if (name === 'startDate') {
        // If end date is empty or before the new start date, set it to start date
        if (!prev.endDate || isBefore(parseISO(value), parseISO(prev.endDate as string))) {
            nextData.endDate = value;
        }
        // Force sync for simple bookings
        if (prev.startDate === prev.endDate) {
            nextData.endDate = value;
        }
      }
      return nextData;
    });
  };

  const handleToggle = (name: keyof Booking, val: any) => {
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleExemptToggle = () => {
    const nextExempt = !formData.isExempt;
    setFormData(prev => ({ 
      ...prev, 
      isExempt: nextExempt,
      fare: nextExempt ? 0 : undefined, 
      fareStatus: nextExempt ? 'Paid' : prev.fareStatus 
    }));
  };

  const handleDownloadSlip = async () => {
    const currentBooking: Booking = {
      ...formData,
      fare: formData.fare || 0,
      id: existingBooking?.id || 'TEMP',
    } as Booking;
    if (!currentBooking.rankName || !currentBooking.startDate) {
      alert("Please fill in at least Rank/Name and Dates before downloading slip.");
      return;
    }
    setIsDownloading(true);
    await generateIndividualPaymentSlip(currentBooking);
    setIsDownloading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      fare: formData.fare || 0,
      id: existingBooking?.id || '',
    } as Booking);
  };

  const handleConfirmDelete = () => {
    const idToDelete = existingBooking?.id || formData.id;
    if (idToDelete && onDelete) {
      onDelete(idToDelete);
    }
    setIsConfirmingDelete(false);
  };

  const handleDateClick = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      (e.target as any).showPicker();
    } catch (err) {
      // Fallback for older browsers
    }
  };

  const inputClasses = "w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400 placeholder:font-normal";
  const labelClasses = "flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-2">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="relative">
            <label className={labelClasses}><User size={12} className="text-indigo-500" /> Rank and Name</label>
            <div className="relative group">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={16} />
              <input required name="rankName" value={formData.rankName || ''} onChange={handleChange} className={inputClasses} placeholder="e.g., Maj John Doe" />
            </div>
          </div>
          <div className="relative">
            <label className={labelClasses}><Landmark size={12} className="text-indigo-500" /> Unit</label>
            <div className="relative group">
              <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={16} />
              <input required name="unit" value={formData.unit || ''} onChange={handleChange} className={inputClasses} placeholder="e.g., HQ Company" />
            </div>
          </div>
        </div>
        
        <div className="relative pt-2">
          <label className={labelClasses}><Shield size={12} className="text-indigo-500" /> Garrison Status</label>
          <div className="flex gap-4">
            {(['In Garrison', 'Out Garrison'] as GarrisonStatusType[]).map((s) => (
              <label key={s} className={`flex-1 flex items-center justify-center gap-2 cursor-pointer py-2.5 px-3 rounded-xl border transition-all ${formData.garrisonStatus === s ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-200'}`}>
                <input type="radio" name="garrisonStatus" checked={formData.garrisonStatus === s} onChange={() => handleToggle('garrisonStatus', s)} className="hidden" />
                <span className="text-xs font-bold">{s}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-2 border-t border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="relative">
            <label className={labelClasses}><Calendar size={12} className="text-indigo-500" /> Start Date</label>
            <div className="relative group">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={16} />
              <input 
                required 
                type="date" 
                name="startDate" 
                value={formData.startDate || ''} 
                onChange={handleChange} 
                onClick={handleDateClick}
                className={`${inputClasses} cursor-pointer`} 
              />
            </div>
          </div>
          <div className="relative">
            <label className={labelClasses}><Calendar size={12} className="text-indigo-500" /> End Date</label>
            <div className="relative group">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={16} />
              <input 
                required 
                type="date" 
                name="endDate" 
                value={formData.endDate || ''} 
                onChange={handleChange} 
                onClick={handleDateClick}
                min={formData.startDate}
                className={`${inputClasses} cursor-pointer`} 
              />
            </div>
          </div>
        </div>

        <div className="relative">
          <label className={labelClasses}><MapPin size={12} className="text-indigo-500" /> Destination</label>
          <div className="relative group">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={16} />
            <input required name="destination" value={formData.destination || ''} onChange={handleChange} className={inputClasses} placeholder="Enter travel destination..." />
          </div>
        </div>

        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-5">
          <div>
            <label className={labelClasses}>Duration Policy</label>
            <div className="flex gap-4">
              {(['Full Day', 'Half Day'] as DurationType[]).map((d) => (
                <label key={d} className={`flex-1 flex items-center justify-center gap-2 cursor-pointer py-2.5 px-3 rounded-lg border transition-all ${formData.duration === d ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm' : 'bg-transparent border-slate-200 text-slate-500 hover:border-indigo-200'}`}>
                  <input type="radio" name="duration" checked={formData.duration === d} onChange={() => handleToggle('duration', d)} className="hidden" />
                  <span className="text-xs font-bold">{d}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}><Clock size={12} className="text-indigo-500" /> Out Time</label>
              <input type="time" name="outTime" value={formData.outTime || ''} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-700" />
            </div>
            <div>
              <label className={labelClasses}><Clock size={12} className="text-indigo-500" /> In Time</label>
              <input type="time" name="inTime" value={formData.inTime || ''} onChange={handleChange} className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-2 border-t border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="relative">
            <label className={labelClasses}><Banknote size={12} className="text-indigo-500" /> Fare Amount</label>
            <div className="relative group">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">৳</span>
              {formData.isExempt ? (
                <div className="w-full pl-8 pr-4 py-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-sm font-black text-indigo-600 flex items-center">Not Required</div>
              ) : (
                <input required type="number" name="fare" value={formData.fare === undefined ? '' : formData.fare} onChange={handleChange} className={`${inputClasses} pl-8 font-black text-indigo-700 bg-indigo-50/30 border-indigo-100`} placeholder="0.00" />
              )}
            </div>
            <button type="button" onClick={handleExemptToggle} className={`mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border ${formData.isExempt ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}>
              {formData.isExempt ? <CheckCircle2 size={14} /> : <Circle size={14} />}
              <span className="text-[10px] font-black uppercase tracking-widest">Fare Exempt</span>
            </button>
          </div>
          
          <div className="relative">
            <label className={labelClasses}><Wallet size={12} className="text-indigo-500" /> Payment Status</label>
            <div className="relative group">
              <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <select name="fareStatus" value={formData.fareStatus || 'Unpaid'} onChange={handleChange} disabled={formData.isExempt} className={`${inputClasses} appearance-none cursor-pointer ${formData.isExempt ? 'bg-slate-100 opacity-60' : ''}`}>
                <option value="Paid">✅ Paid</option>
                <option value="Unpaid">❌ Unpaid</option>
              </select>
            </div>
          </div>
        </div>

        <div className="relative">
          <label className={labelClasses}><AlignLeft size={12} className="text-indigo-500" /> Additional Remarks</label>
          <div className="relative group">
            <textarea name="remarks" value={formData.remarks || ''} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium text-slate-700 min-h-[90px] resize-none" placeholder="Notes..." />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-6 border-t border-slate-100">
        <div className="flex gap-4 min-h-[50px]">
          {(existingBooking?.id || formData.id) && onDelete && (
            <div className={`flex gap-2 transition-all duration-300 ${isConfirmingDelete ? 'flex-[2]' : 'flex-initial'}`}>
              {!isConfirmingDelete ? (
                <button 
                  type="button" 
                  onClick={() => setIsConfirmingDelete(true)} 
                  className="px-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl hover:bg-rose-600 hover:text-white transition-all active:scale-90 flex items-center justify-center gap-2 group" 
                  title="Delete Entry"
                >
                  <Trash2 size={20} className="group-hover:animate-bounce" />
                  <span className="text-[10px] font-black uppercase tracking-widest sm:hidden lg:inline">Delete</span>
                </button>
              ) : (
                <div className="flex gap-2 w-full animate-in slide-in-from-left-2 duration-300">
                  <div className="flex flex-col gap-1 flex-1">
                     <p className="text-[8px] font-black text-rose-600 uppercase tracking-widest text-center mb-1 animate-pulse">Confirm Delete?</p>
                     <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={handleConfirmDelete} 
                          className="flex-1 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest py-3 flex items-center justify-center gap-1.5 hover:bg-rose-700 shadow-lg shadow-rose-100 active:scale-95 transition-all"
                        >
                          <Check size={14} /> YES
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setIsConfirmingDelete(false)} 
                          className="px-4 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest py-3 flex items-center justify-center gap-1.5 hover:bg-slate-200 active:scale-95 transition-all"
                        >
                          <X size={14} /> NO
                        </button>
                     </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {!isConfirmingDelete && (
            <button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-xl shadow-slate-200 active:scale-[0.98] flex items-center justify-center gap-2 animate-in fade-in zoom-in-95">
              {existingBooking ? 'Update Schedule' : 'Create Reservation'}
            </button>
          )}
        </div>
        
        <button type="button" disabled={isDownloading || isConfirmingDelete} onClick={handleDownloadSlip} className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 transition-all font-bold text-xs uppercase tracking-widest active:scale-[0.98] disabled:opacity-50">
          <FileDown size={16} />
          {isDownloading ? 'Generating PDF...' : 'Download Payment Slip'}
        </button>
      </div>
    </form>
  );
};

export default BookingModal;