
import React, { useState, useEffect } from 'react';
import { Booking, DurationType, GarrisonStatusType, FuelPurchase, AppSettings } from '../types';
import { Trash2, User, Landmark, MapPin, Calendar, Clock, Banknote, Wallet, AlignLeft, FileDown, Shield, Check, Phone, Loader2, X, Gauge, Droplets, CircleDollarSign, Fuel, RotateCw, PlusCircle, AlertTriangle } from 'lucide-react';
import { generateIndividualPaymentSlip } from '../services/pdfService';
import { differenceInDays, parseISO, format, isBefore } from 'date-fns';
import Modal from './Modal';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (booking: Booking) => void;
  onDelete?: (id: string) => void;
  initialDate?: Date;
  existingBooking?: Booking | null;
  bookings?: Booking[];
  appSettings: AppSettings;
}

const BookingModal: React.FC<BookingModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  initialDate, 
  existingBooking,
  bookings = [],
  appSettings
}) => {
  const [formData, setFormData] = useState<Partial<Booking>>({
    rankName: '',
    unit: '',
    mobileNumber: '',
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
    isExempt: false,
    isSpecialNote: false,
    isFuelEntry: false,
    kmStart: undefined,
    kmEnd: undefined,
    totalKm: undefined,
    fuelPurchases: [{ id: Math.random().toString(), purchasedFuel: undefined, fuelRate: undefined, totalFuelPrice: undefined }],
  });

  const [isDownloading, setIsDownloading] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const themeColor = appSettings?.ui?.themeColor || "#10b981";

  const getLastKmEnd = (currentStartDateStr: string) => {
    if (!currentStartDateStr || !bookings || bookings.length === 0) return 0;
    const currentStart = parseISO(currentStartDateStr);
    const precedingBookings = bookings
      .filter(b => {
        if (!b.startDate || b.id === existingBooking?.id) return false;
        const bEnd = parseISO(b.endDate || b.startDate);
        return isBefore(bEnd, currentStart);
      })
      .filter(b => b.isFuelEntry && b.kmEnd !== undefined)
      .sort((a, b) => parseISO(b.endDate || b.startDate).getTime() - parseISO(a.endDate || a.startDate).getTime());
    return precedingBookings.length > 0 ? precedingBookings[0].kmEnd : 0;
  };

  useEffect(() => {
    if (isOpen) {
      if (existingBooking) {
        setFormData({ ...existingBooking });
      } else if (initialDate) {
        const dateStr = format(initialDate, 'yyyy-MM-dd');
        setFormData(prev => ({
          ...prev,
          startDate: dateStr,
          endDate: dateStr,
          kmStart: getLastKmEnd(dateStr)
        }));
      }
    }
  }, [existingBooking, initialDate, isOpen]);

  useEffect(() => {
    if (!formData.isSpecialNote && !formData.isExempt && formData.startDate && formData.endDate) {
      const start = parseISO(formData.startDate);
      const end = parseISO(formData.endDate);
      const days = differenceInDays(end, start) + 1;
      if (days > 0) {
        let rate = 0;
        if (formData.garrisonStatus === 'In Garrison') {
          rate = formData.duration === 'Full Day' ? appSettings.fares.inGarrisonFull : appSettings.fares.inGarrisonHalf;
        } else {
          rate = formData.duration === 'Full Day' ? appSettings.fares.outGarrisonFull : appSettings.fares.outGarrisonHalf;
        }
        setFormData(prev => ({ ...prev, fare: rate * days }));
      }
    }
  }, [formData.startDate, formData.endDate, formData.garrisonStatus, formData.duration, formData.isExempt, formData.isSpecialNote, appSettings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggle = (name: keyof Booking, val: any) => {
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Booking);
  };

  const inputClasses = "w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:border-white outline-none transition-all text-sm font-medium text-white placeholder:text-slate-500";
  const labelClasses = "flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="relative">
      <div className="flex bg-black/20 p-1 rounded-2xl mb-8 border border-white/5 shadow-inner">
        <button 
            type="button" 
            onClick={() => handleToggle('isSpecialNote', false)} 
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl transition-all font-black uppercase tracking-widest text-[10px] ${!formData.isSpecialNote ? 'text-white shadow-lg' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
            style={!formData.isSpecialNote ? { backgroundColor: themeColor } : {}}
        >
            Reservation
        </button>
        <button 
            type="button" 
            onClick={() => handleToggle('isSpecialNote', true)} 
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl transition-all font-black uppercase tracking-widest text-[10px] ${formData.isSpecialNote ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5 hover:text-amber-500'}`}
        >
            Special Note
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClasses}><Calendar size={12} style={{ color: themeColor }} /> Date</label>
            <div className="relative"><Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className={inputClasses} style={{ focusRingColor: `${themeColor}33`, focusBorderColor: themeColor }} /></div>
          </div>
          {!formData.isSpecialNote && (
            <div>
              <label className={labelClasses}><Calendar size={12} style={{ color: themeColor }} /> End Date</label>
              <div className="relative"><Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className={inputClasses} style={{ focusRingColor: `${themeColor}33`, focusBorderColor: themeColor }} /></div>
            </div>
          )}
        </div>

        {!formData.isSpecialNote && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClasses}><User size={12} style={{ color: themeColor }} /> Rank and Name</label>
                <div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input name="rankName" value={formData.rankName} onChange={handleChange} className={inputClasses} style={{ focusRingColor: `${themeColor}33`, focusBorderColor: themeColor }} /></div>
              </div>
              <div>
                <label className={labelClasses}><Landmark size={12} style={{ color: themeColor }} /> Unit</label>
                <div className="relative"><Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input name="unit" value={formData.unit} onChange={handleChange} className={inputClasses} style={{ focusRingColor: `${themeColor}33`, focusBorderColor: themeColor }} /></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClasses}><Shield size={12} style={{ color: themeColor }} /> Garrison Status</label>
                <div className="flex gap-4">
                  {(['In Garrison', 'Out Garrison'] as GarrisonStatusType[]).map((s) => (
                    <button 
                        key={s} 
                        type="button" 
                        onClick={() => handleToggle('garrisonStatus', s)} 
                        className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${formData.garrisonStatus === s ? 'text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}
                        style={formData.garrisonStatus === s ? { backgroundColor: `${themeColor}22`, borderColor: themeColor } : {}}
                    >
                        {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClasses}><Clock size={12} style={{ color: themeColor }} /> Duration</label>
                <div className="flex gap-4">
                  {(['Full Day', 'Half Day'] as DurationType[]).map((d) => (
                    <button 
                        key={d} 
                        type="button" 
                        onClick={() => handleToggle('duration', d)} 
                        className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${formData.duration === d ? 'text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}
                        style={formData.duration === d ? { backgroundColor: `${themeColor}22`, borderColor: themeColor } : {}}
                    >
                        {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClasses}><Banknote size={12} style={{ color: themeColor }} /> Fare Amount</label>
                <div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold" style={{ color: themeColor }}>৳</span><input type="number" name="fare" value={formData.fare} onChange={handleChange} className={`${inputClasses} pl-8 font-black`} style={{ color: themeColor }} /></div>
              </div>
              <div>
                <label className={labelClasses}><Wallet size={12} style={{ color: themeColor }} /> Status</label>
                <select name="fareStatus" value={formData.fareStatus} onChange={handleChange} className={inputClasses}>
                  <option value="Unpaid" className="bg-[#062c1e]">Unpaid</option>
                  <option value="Paid" className="bg-[#062c1e]">Paid</option>
                </select>
              </div>
            </div>
          </>
        )}

        <div>
          <label className={labelClasses}><AlignLeft size={12} style={{ color: themeColor }} /> Remarks</label>
          <textarea name="remarks" value={formData.remarks} onChange={handleChange} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-sm text-white min-h-[80px]" style={{ focusBorderColor: themeColor }} />
        </div>

        <button 
            type="submit" 
            className="w-full py-4 rounded-xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all text-white"
            style={{ backgroundColor: themeColor }}
        >
            Save Reservation
        </button>
      </form>
    </div>
  );
};

export default BookingModal;
