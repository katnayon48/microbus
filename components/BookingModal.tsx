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
    purchasedFuel: undefined,
    fuelRate: undefined,
    totalFuelPrice: undefined
  });

  const [isDownloading, setIsDownloading] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [showReceivedByModal, setShowReceivedByModal] = useState(false);
  const [receivedByName, setReceivedByName] = useState('');

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
      .sort((a, b) => {
        const dateA = parseISO(a.endDate || a.startDate).getTime();
        const dateB = parseISO(b.endDate || b.startDate).getTime();
        return dateB - dateA;
      });
    return precedingBookings.length > 0 ? precedingBookings[0].kmEnd : 0;
  };

  const handleSyncKmStart = () => {
    if (formData.startDate) {
      const syncVal = getLastKmEnd(formData.startDate);
      setFormData(prev => {
        const next = { ...prev, kmStart: syncVal };
        if (typeof next.kmEnd === 'number' && typeof next.kmStart === 'number') {
          next.totalKm = parseFloat((next.kmEnd - next.kmStart).toFixed(2));
        }
        return next;
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsConfirmingDelete(false);
      setShowReceivedByModal(false);
      setReceivedByName('');
      
      if (existingBooking) {
        setFormData({ 
          ...existingBooking,
          fuelPurchases: existingBooking.fuelPurchases || [{ id: Math.random().toString(), purchasedFuel: undefined, fuelRate: undefined, totalFuelPrice: undefined }]
        });
      } else if (initialDate) {
        const dateStr = format(initialDate, 'yyyy-MM-dd');
        const autoKmStart = getLastKmEnd(dateStr);
        setFormData({
          rankName: '',
          unit: '',
          mobileNumber: '',
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
          isExempt: false,
          isSpecialNote: false,
          isFuelEntry: false,
          kmStart: autoKmStart,
          kmEnd: undefined,
          totalKm: undefined,
          fuelPurchases: [{ id: Math.random().toString(), purchasedFuel: undefined, fuelRate: undefined, totalFuelPrice: undefined }],
          purchasedFuel: undefined,
          fuelRate: undefined,
          totalFuelPrice: undefined
        });
      }
    }
  }, [existingBooking, initialDate, isOpen, bookings]);

  useEffect(() => {
    if (!formData.isSpecialNote && !formData.isExempt && formData.startDate && formData.endDate && formData.garrisonStatus && formData.duration) {
      try {
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
  }, [formData.startDate, formData.endDate, formData.garrisonStatus, formData.duration, formData.isExempt, formData.isSpecialNote, appSettings]);

  const calculateSummaries = (purchases: FuelPurchase[]) => {
    let totalFuel = 0;
    let sumRate = 0;
    let countRate = 0;
    let totalPrice = 0;
    let hasData = false;

    purchases.forEach(p => {
      if (p.purchasedFuel !== undefined || p.fuelRate !== undefined || p.totalFuelPrice !== undefined) {
        hasData = true;
        totalFuel += p.purchasedFuel || 0;
        totalPrice += p.totalFuelPrice || 0;
        
        if (typeof p.fuelRate === 'number') {
          sumRate += p.fuelRate;
          countRate++;
        }
      }
    });

    const averageRate = countRate > 0 ? sumRate / countRate : 0;

    return {
      purchasedFuel: hasData ? parseFloat(totalFuel.toFixed(2)) : undefined,
      fuelRate: hasData ? parseFloat(averageRate.toFixed(2)) : undefined,
      totalFuelPrice: hasData ? parseFloat(totalPrice.toFixed(2)) : undefined
    };
  };

  const handleFuelPurchaseChange = (index: number, name: keyof FuelPurchase, value: string) => {
    const numericVal = value === '' ? undefined : parseFloat(value);
    
    setFormData(prev => {
      const purchases = [...(prev.fuelPurchases || [])];
      const item = { ...purchases[index], [name]: numericVal };
      
      if (name === 'purchasedFuel' || name === 'fuelRate') {
        const fuel = name === 'purchasedFuel' ? numericVal : item.purchasedFuel;
        const rate = name === 'fuelRate' ? numericVal : item.fuelRate;
        if (typeof fuel === 'number' && typeof rate === 'number') {
          item.totalFuelPrice = parseFloat((fuel * rate).toFixed(2));
        }
      }
      
      purchases[index] = item;
      const summaries = calculateSummaries(purchases);
      
      return {
        ...prev,
        fuelPurchases: purchases,
        ...summaries
      };
    });
  };

  const addAnotherFuelPurchase = () => {
    setFormData(prev => ({
      ...prev,
      fuelPurchases: [
        ...(prev.fuelPurchases || []),
        { id: Math.random().toString(), purchasedFuel: undefined, fuelRate: undefined, totalFuelPrice: undefined }
      ]
    }));
  };

  const removeFuelPurchase = (index: number) => {
    setFormData(prev => {
      const purchases = (prev.fuelPurchases || []).filter((_, i) => i !== index);
      const summaries = calculateSummaries(purchases);
      return {
        ...prev,
        fuelPurchases: purchases.length > 0 ? purchases : [{ id: Math.random().toString(), purchasedFuel: undefined, fuelRate: undefined, totalFuelPrice: undefined }],
        ...summaries
      };
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const nextData = { ...prev };
      const isNumericField = ['fare', 'kmStart', 'kmEnd', 'totalKm', 'purchasedFuel', 'fuelRate', 'totalFuelPrice'].includes(name);
      let numericVal: number | undefined = undefined;
      if (isNumericField && value !== '') {
        const parsed = parseFloat(value);
        if (!isNaN(parsed)) numericVal = parsed;
      }
      (nextData as any)[name] = isNumericField ? numericVal : value;
      if (name === 'kmStart' || name === 'kmEnd') {
        const start = name === 'kmStart' ? numericVal : prev.kmStart;
        const end = name === 'kmEnd' ? numericVal : prev.kmEnd;
        if (typeof start === 'number' && typeof end === 'number') {
          nextData.totalKm = parseFloat((end - start).toFixed(2));
        } else if (value === '') {
          nextData.totalKm = undefined;
        }
      }
      if (name === 'startDate' && value) {
        if (!prev.endDate || isBefore(parseISO(value), parseISO(prev.endDate as string))) {
            nextData.endDate = value;
        }
      }
      return nextData;
    });
  };

  const handleToggle = (name: keyof Booking, val: any) => {
    setFormData(prev => {
      const next = { ...prev, [name]: val };
      if (name === 'isExempt' && val === true) {
        next.fare = 0;
        next.fareStatus = 'Paid';
      }
      return next;
    });
  };

  const setMode = (mode: 'reservation' | 'special') => {
    setFormData(prev => ({
      ...prev,
      isSpecialNote: mode === 'special',
      fare: mode === 'reservation' ? prev.fare : 0,
      fareStatus: mode === 'reservation' ? prev.fareStatus : 'Paid',
    }));
  };

  const handleDownloadSlip = async () => {
    if (formData.isSpecialNote) return;
    if (!formData.rankName || !formData.startDate) {
      alert("Please fill in Rank/Name and Date before downloading.");
      return;
    }
    setShowReceivedByModal(true);
  };

  const confirmDownload = async () => {
    const currentBooking: Booking = {
      ...formData,
      fare: formData.fare || 0,
      id: existingBooking?.id || 'TEMP',
    } as Booking;
    setIsDownloading(true);
    setShowReceivedByModal(false);
    await generateIndividualPaymentSlip(currentBooking, receivedByName);
    setIsDownloading(false);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.isSpecialNote && !formData.rankName) {
      alert("Please enter Rank and Name.");
      return;
    }
    if (!formData.startDate) {
      alert("Please select a date.");
      return;
    }

    const rawBooking: any = {
      id: existingBooking?.id || '',
      rankName: formData.rankName || (formData.isSpecialNote ? 'SPECIAL NOTE' : 'N/A'),
      unit: formData.unit || '',
      mobileNumber: formData.mobileNumber || '',
      garrisonStatus: formData.garrisonStatus || 'In Garrison',
      startDate: formData.startDate,
      endDate: formData.endDate || formData.startDate,
      duration: formData.duration || 'Full Day',
      destination: formData.destination || '',
      fare: formData.fare || 0,
      fareStatus: formData.fareStatus || 'Unpaid',
      inTime: formData.inTime || '',
      outTime: formData.outTime || '',
      remarks: formData.remarks || '',
      isExempt: !!formData.isExempt,
      isSpecialNote: !!formData.isSpecialNote,
      isFuelEntry: !!formData.isFuelEntry,
    };

    if (formData.isFuelEntry) {
      if (formData.kmStart !== undefined) rawBooking.kmStart = formData.kmStart;
      if (formData.kmEnd !== undefined) rawBooking.kmEnd = formData.kmEnd;
      if (formData.totalKm !== undefined) rawBooking.totalKm = formData.totalKm;
      if (formData.purchasedFuel !== undefined) rawBooking.purchasedFuel = formData.purchasedFuel;
      if (formData.fuelRate !== undefined) rawBooking.fuelRate = formData.fuelRate;
      if (formData.totalFuelPrice !== undefined) rawBooking.totalFuelPrice = formData.totalFuelPrice;

      if (formData.fuelPurchases && formData.fuelPurchases.length > 0) {
        const cleanedPurchases = formData.fuelPurchases
          .filter(p => p.purchasedFuel !== undefined || p.fuelRate !== undefined || p.totalFuelPrice !== undefined)
          .map(p => {
            const cleaned: any = { id: p.id };
            if (p.purchasedFuel !== undefined) cleaned.purchasedFuel = p.purchasedFuel;
            if (p.fuelRate !== undefined) cleaned.fuelRate = p.fuelRate;
            if (p.totalFuelPrice !== undefined) cleaned.totalFuelPrice = p.totalFuelPrice;
            return cleaned;
          });
        
        if (cleanedPurchases.length > 0) {
          rawBooking.fuelPurchases = cleanedPurchases;
        }
      }
    }

    const finalBooking = Object.fromEntries(
      Object.entries(rawBooking).filter(([_, value]) => value !== undefined && value !== null)
    ) as unknown as Booking;
    
    onSave(finalBooking);
  };

  const handleConfirmDelete = () => {
    const idToDelete = existingBooking?.id || formData.id;
    if (idToDelete && onDelete) onDelete(idToDelete);
    setIsConfirmingDelete(false);
  };

  const inputClasses = "w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-medium text-white placeholder:text-slate-500 placeholder:font-normal";
  const labelClasses = "flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="relative">
      <div className="flex bg-black/20 p-1 rounded-2xl mb-8 border border-white/5 shadow-inner">
        <button type="button" onClick={() => setMode('reservation')} className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl transition-all duration-300 font-black uppercase tracking-widest text-[10px] ${!formData.isSpecialNote ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>Reservation</button>
        <button type="button" onClick={() => setMode('special')} className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl transition-all duration-300 font-black uppercase tracking-widest text-[10px] ${formData.isSpecialNote ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5 hover:text-amber-500'}`}>Special Note</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-2" noValidate>
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="relative">
              <label className={labelClasses}><Calendar size={12} className="text-emerald-500" /> Date</label>
              <div className="relative group">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors pointer-events-none group-focus-within:text-emerald-500" size={16} />
                <input type="date" name="startDate" value={formData.startDate || ''} onChange={handleChange} className={inputClasses} />
              </div>
            </div>
            {!formData.isSpecialNote && (
              <div className="relative">
                <label className={labelClasses}><Calendar size={12} className="text-emerald-500" /> End Date</label>
                <div className="relative group">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors pointer-events-none" size={16} />
                  <input type="date" name="endDate" value={formData.endDate || ''} onChange={handleChange} min={formData.startDate} className={inputClasses} />
                </div>
              </div>
            )}
          </div>

          {!formData.isSpecialNote && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in slide-in-from-top-2 duration-300">
                <div className="relative">
                  <label className={labelClasses}><User size={12} className="text-emerald-500" /> Rank and Name</label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors pointer-events-none group-focus-within:text-emerald-500" size={16} />
                    <input name="rankName" value={formData.rankName || ''} onChange={handleChange} className={inputClasses} placeholder="Example: Billal Hossain" />
                  </div>
                </div>
                <div className="relative">
                  <label className={labelClasses}><Landmark size={12} className="text-emerald-500" /> Unit</label>
                  <div className="relative group">
                    <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors pointer-events-none group-focus-within:text-emerald-500" size={16} />
                    <input name="unit" value={formData.unit || ''} onChange={handleChange} className={inputClasses} placeholder="e.g., HQ Company" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="relative">
                    <label className={labelClasses}><Phone size={12} className="text-emerald-500" /> Mobile Number</label>
                    <div className="relative group">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors pointer-events-none" size={16} />
                      <input name="mobileNumber" value={formData.mobileNumber || ''} onChange={handleChange} className={inputClasses} placeholder="Optional" />
                    </div>
                  </div>
                  <div className="relative">
                     <label className={labelClasses}><Shield size={12} className="text-emerald-500" /> Garrison Status</label>
                     <div className="flex gap-4">
                       {(['In Garrison', 'Out Garrison'] as GarrisonStatusType[]).map((s) => (
                         <label key={s} className={`flex-1 flex items-center justify-center gap-2 cursor-pointer py-2.5 px-3 rounded-xl border transition-all ${formData.garrisonStatus === s ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm' : 'bg-white/5 border-white/10 text-slate-500 hover:border-emerald-500/50'}`}>
                           <input type="radio" name="garrisonStatus" checked={formData.garrisonStatus === s} onChange={() => handleToggle('garrisonStatus', s)} className="hidden" />
                           <span className="text-xs font-bold">{s}</span>
                         </label>
                       ))}
                     </div>
                  </div>
                </div>

                <div className="relative">
                  <label className={labelClasses}><MapPin size={12} className="text-emerald-500" /> Destination</label>
                  <div className="relative group">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors pointer-events-none" size={16} />
                    <input name="destination" value={formData.destination || ''} onChange={handleChange} className={inputClasses} placeholder="Destination" />
                  </div>
                </div>

                <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className={labelClasses}>Duration</label>
                      <div className="flex gap-4">
                        {(['Full Day', 'Half Day'] as DurationType[]).map((d) => (
                          <label key={d} className={`flex-1 flex items-center justify-center gap-2 cursor-pointer py-2.5 px-3 rounded-lg border transition-all ${formData.duration === d ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm' : 'bg-transparent border-white/10 text-slate-500 hover:border-emerald-500/50'}`}>
                            <input type="radio" name="duration" checked={formData.duration === d} onChange={() => handleToggle('duration', d)} className="hidden" />
                            <span className="text-xs font-bold">{d}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="ml-6 flex items-end pb-1">
                      <label className="flex items-center gap-2 cursor-pointer bg-emerald-950/20 border border-emerald-500/20 px-4 py-2.5 rounded-xl hover:bg-emerald-600/10 transition-all">
                        <input type="checkbox" checked={formData.isExempt} onChange={e => handleToggle('isExempt', e.target.checked)} className="w-4 h-4 rounded border-white/10 accent-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Exempt Fare</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClasses}><Clock size={12} className="text-emerald-500" /> Out Time</label>
                      <input type="time" name="outTime" value={formData.outTime || ''} onChange={handleChange} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg outline-none text-xs font-bold text-white" />
                    </div>
                    <div>
                      <label className={labelClasses}><Clock size={12} className="text-emerald-500" /> In Time</label>
                      <input type="time" name="inTime" value={formData.inTime || ''} onChange={handleChange} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg outline-none text-xs font-bold text-white" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="relative">
                    <label className={labelClasses}><Banknote size={12} className="text-emerald-500" /> Fare Amount</label>
                    <div className="relative group">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm pointer-events-none">৳</span>
                      {formData.isExempt ? (
                        <div className="w-full pl-8 pr-4 py-2.5 bg-emerald-900/20 border border-emerald-500/20 rounded-xl text-sm font-black text-emerald-400">Exempted</div>
                      ) : (
                        <input type="number" name="fare" value={formData.fare === undefined ? '' : formData.fare} onChange={handleChange} className={`${inputClasses} pl-8 font-black text-emerald-400`} />
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <label className={labelClasses}><Wallet size={12} className="text-emerald-500" /> Status</label>
                    <select name="fareStatus" value={formData.fareStatus || 'Unpaid'} onChange={handleChange} disabled={formData.isExempt} className={`${inputClasses} ${formData.isExempt ? 'opacity-50 grayscale' : ''}`}>
                      <option value="Paid" className="bg-[#062c1e]">Paid</option>
                      <option value="Unpaid" className="bg-[#062c1e]">Unpaid</option>
                    </select>
                  </div>
                </div>
              </>
            )}
        </div>

        <div className="pt-4 space-y-4">
          <button type="button" onClick={() => handleToggle('isFuelEntry', !formData.isFuelEntry)} className={`flex items-center gap-3 w-full p-4 rounded-xl border transition-all ${formData.isFuelEntry ? 'bg-emerald-600/20 border-emerald-500/50 shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:border-emerald-500/30'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${formData.isFuelEntry ? 'bg-emerald-500 border-emerald-400' : 'border-slate-600'}`}>
              {formData.isFuelEntry && <Check size={14} className="text-white" />}
            </div>
            <div className="flex-1 text-left">
              <span className={`text-xs font-black uppercase tracking-widest ${formData.isFuelEntry ? 'text-emerald-400' : 'text-slate-500'}`}>Add Fuel Consumption Details</span>
            </div>
            <Fuel size={18} className={formData.isFuelEntry ? 'text-emerald-400' : 'text-slate-600'} />
          </button>

          {formData.isFuelEntry && (
            <div className="bg-emerald-950/20 p-5 rounded-2xl border border-emerald-500/10 space-y-5 animate-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <label className={labelClasses}><Gauge size={12} className="text-emerald-500" /> Kilometer Start</label>
                  <div className="relative group">
                    <Gauge className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                    <input type="number" step="0.01" name="kmStart" value={formData.kmStart === undefined ? '' : formData.kmStart} onChange={handleChange} className={inputClasses} placeholder="0" />
                    <button type="button" onClick={handleSyncKmStart} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-white/10 rounded-lg transition-all" title="Sync with previous KM End">
                      <RotateCw size={14} />
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <label className={labelClasses}><Gauge size={12} className="text-emerald-500" /> Kilometer End</label>
                  <div className="relative group">
                    <Gauge className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                    <input type="number" step="0.01" name="kmEnd" value={formData.kmEnd === undefined ? '' : formData.kmEnd} onChange={handleChange} className={inputClasses} placeholder="Optional" />
                  </div>
                </div>
                <div className="relative">
                  <label className={labelClasses}><Gauge size={12} className="text-emerald-500" /> Total Kilometer</label>
                  <div className="relative group">
                    <Gauge className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" size={16} />
                    <input type="number" step="0.01" name="totalKm" value={formData.totalKm === undefined ? '' : formData.totalKm} onChange={handleChange} className={`${inputClasses} bg-emerald-900/10 font-black text-emerald-400`} placeholder="Calculated" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <h6 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Fuel Purchase Entries</h6>
                  <button type="button" onClick={addAnotherFuelPurchase} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 rounded-lg border border-emerald-500/30 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600/30 transition-all active:scale-95">
                    <PlusCircle size={12} /> ADD ANOTHER FUEL PURCHASE
                  </button>
                </div>

                {formData.fuelPurchases?.map((purchase, index) => (
                  <div key={purchase.id} className="relative bg-black/40 p-4 rounded-xl border border-white/5 space-y-4 group/purchase animate-in slide-in-from-left-2">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="relative">
                        <label className={labelClasses}><Droplets size={12} className="text-emerald-500" /> Purchased Fuel</label>
                        <div className="relative group">
                          <Droplets className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                          <input type="number" step="0.01" value={purchase.purchasedFuel === undefined ? '' : purchase.purchasedFuel} onChange={(e) => handleFuelPurchaseChange(index, 'purchasedFuel', e.target.value)} className={inputClasses} placeholder="Liters" />
                        </div>
                      </div>
                      <div className="relative">
                        <label className={labelClasses}><CircleDollarSign size={12} className="text-emerald-500" /> Rate</label>
                        <div className="relative group">
                          <CircleDollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                          <input type="number" step="0.01" value={purchase.fuelRate === undefined ? '' : purchase.fuelRate} onChange={(e) => handleFuelPurchaseChange(index, 'fuelRate', e.target.value)} className={inputClasses} placeholder="Rate" />
                        </div>
                      </div>
                      <div className="relative">
                        <label className={labelClasses}><Banknote size={12} className="text-emerald-500" /> Total Taka</label>
                        <div className="relative group">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-sm pointer-events-none">৳</span>
                          <input type="number" step="0.01" value={purchase.totalFuelPrice === undefined ? '' : purchase.totalFuelPrice} onChange={(e) => handleFuelPurchaseChange(index, 'totalFuelPrice', e.target.value)} className={`${inputClasses} pl-8 bg-emerald-900/10 font-black text-emerald-400`} placeholder="Total" />
                        </div>
                      </div>
                    </div>
                    {index > 0 && (
                      <button type="button" onClick={() => removeFuelPurchase(index)} className="absolute -right-2 -top-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform opacity-0 group-hover/purchase:opacity-100">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}

                <div className="bg-emerald-900/10 p-5 rounded-2xl border border-emerald-500/20 space-y-4 shadow-inner">
                  <h6 className="text-[10px] font-black text-white/50 uppercase tracking-widest text-center">Summary (Editable)</h6>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <label className={labelClasses}>TOTAL PURCHASED FUEL</label>
                      <div className="relative group">
                         <Droplets className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500/40" size={16} />
                         <input type="number" step="0.01" name="purchasedFuel" value={formData.purchasedFuel === undefined ? '' : formData.purchasedFuel} onChange={handleChange} className={`${inputClasses} bg-emerald-900/20 font-black text-emerald-400`} />
                      </div>
                    </div>
                    <div className="relative">
                      <label className={labelClasses}>AVERAGE RATE</label>
                      <div className="relative group">
                        <CircleDollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500/40" size={16} />
                        <input type="number" step="0.01" name="fuelRate" value={formData.fuelRate === undefined ? '' : formData.fuelRate} onChange={handleChange} className={`${inputClasses} bg-emerald-900/20 font-black text-emerald-400`} />
                      </div>
                    </div>
                    <div className="relative">
                      <label className={labelClasses}>TOTAL FUEL PURCHASED</label>
                      <div className="relative group">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500/40 font-bold text-sm pointer-events-none">৳</span>
                        <input type="number" step="0.01" name="totalFuelPrice" value={formData.totalFuelPrice === undefined ? '' : formData.totalFuelPrice} onChange={handleChange} className={`${inputClasses} pl-8 bg-emerald-900/20 font-black text-emerald-400`} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <label className={labelClasses}><AlignLeft size={12} className="text-emerald-500" /> Remarks / Notes</label>
          <textarea name="remarks" value={formData.remarks || ''} onChange={handleChange} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none text-sm font-medium text-white min-h-[100px] resize-none focus:border-emerald-500" placeholder="Notes..." />
        </div>
      </form>

      {isConfirmingDelete && (
        <div className="absolute inset-x-0 bottom-0 bg-[#062c1e] p-6 border-t border-rose-500/30 animate-in slide-in-from-bottom duration-300 z-[60] shadow-[0_-15px_35px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col items-center text-center space-y-5">
            <div className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-500/20 shadow-inner">
              <AlertTriangle size={28} />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-lg font-black text-white uppercase tracking-tight">Delete this booking?</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-[200px] leading-relaxed">
                This entry will be permanently removed. This action cannot be undone.
              </p>
            </div>

            <div className="flex w-full gap-3">
              <button 
                type="button"
                onClick={() => setIsConfirmingDelete(false)} 
                className="flex-1 py-3.5 bg-white/5 text-slate-300 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleConfirmDelete} 
                className="flex-1 py-3.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-900/20 hover:bg-rose-500 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={showReceivedByModal} onClose={() => setShowReceivedByModal(false)} title="Payment Collector" variant="dark">
        <div className="space-y-6">
          <div className="relative group">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors pointer-events-none" size={16} />
            <input autoFocus value={receivedByName} onChange={(e) => setReceivedByName(e.target.value)} className={inputClasses} placeholder="Receiver Name" />
          </div>
          <button onClick={confirmDownload} className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-black uppercase text-[11px] shadow-xl">Download Slip</button>
        </div>
      </Modal>
      
      <div className="flex flex-col gap-3 pt-6 border-t border-white/5">
        <div className="flex gap-4">
          {(existingBooking?.id || formData.id) && onDelete && (
            <button 
              type="button" 
              onClick={() => setIsConfirmingDelete(true)} 
              className="px-4 rounded-xl border bg-rose-500/10 text-rose-500 border-rose-500/20 transition-all flex items-center justify-center gap-2 hover:bg-rose-500/20"
            >
              <Trash2 size={18} />
            </button>
          )}
          {!formData.isSpecialNote && (
            <button type="button" onClick={handleDownloadSlip} disabled={isDownloading} className="flex items-center justify-center gap-2 px-6 bg-emerald-700 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-xl transition-all active:scale-95 disabled:opacity-50">
              {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
              Download Slip
            </button>
          )}
          <button type="button" onClick={() => handleSubmit()} className={`flex-1 font-bold py-3.5 rounded-xl shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 ${formData.isSpecialNote ? 'bg-amber-500' : 'bg-emerald-600'} text-white uppercase tracking-widest text-xs`}>
            {existingBooking ? 'Update Entry' : 'Save Entry'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;