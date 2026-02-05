import React, { useState, useEffect } from 'react';
import { Booking, DurationType, GarrisonStatusType } from '../types';
import { Trash2, User, Landmark, MapPin, Calendar, Clock, Banknote, Wallet, AlignLeft, FileDown, Shield, CheckCircle2, Circle, X, Check, UserPlus, StickyNote, Phone } from 'lucide-react';
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
    isSpecialNote: false
  });

  const [isDownloading, setIsDownloading] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  
  const [showReceivedByModal, setShowReceivedByModal] = useState(false);
  const [receivedByName, setReceivedByName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsConfirmingDelete(false);
      setShowReceivedByModal(false);
      setReceivedByName('');
      if (existingBooking) {
        setFormData({ ...existingBooking });
      } else if (initialDate) {
        const dateStr = format(initialDate, 'yyyy-MM-dd');
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
          isSpecialNote: false
        });
      }
    }
  }, [existingBooking, initialDate, isOpen]);

  useEffect(() => {
    if (!formData.isSpecialNote && !formData.isExempt && formData.startDate && formData.endDate && formData.garrisonStatus && formData.duration) {
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
  }, [formData.startDate, formData.endDate, formData.garrisonStatus, formData.duration, formData.isExempt, formData.isSpecialNote]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const nextData = { 
        ...prev, 
        [name]: name === 'fare' ? (value === '' ? undefined : parseFloat(value)) : value 
      };
      
      if (name === 'startDate') {
        if (!prev.endDate || isBefore(parseISO(value), parseISO(prev.endDate as string))) {
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

  const setMode = (isSpecial: boolean) => {
    if (isSpecial) {
      setFormData(prev => ({
        ...prev,
        isSpecialNote: true,
        rankName: '',
        unit: '',
        mobileNumber: '',
        garrisonStatus: 'In Garrison',
        duration: 'Full Day',
        destination: '',
        fare: 0,
        fareStatus: 'Paid',
        inTime: '',
        outTime: '',
        isExempt: false
      }));
    } else {
      setFormData(prev => ({ ...prev, isSpecialNote: false }));
    }
  };

  const handleDownloadSlip = async () => {
    if (formData.isSpecialNote) {
      alert("Special notes do not have payment slips.");
      return;
    }
    const currentBooking: Booking = {
      ...formData,
      fare: formData.fare || 0,
      id: existingBooking?.id || 'TEMP',
    } as Booking;
    if (!currentBooking.rankName || !currentBooking.startDate) {
      alert("Please fill in at least Rank/Name and Dates before downloading slip.");
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

  const inputClasses = "w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-medium text-white placeholder:text-slate-500 placeholder:font-normal";
  const labelClasses = "flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <>
      {/* Form Type Selector - Tabs */}
      <div className="flex bg-black/20 p-1.5 rounded-2xl mb-8 border border-white/5 shadow-inner">
        <button 
          type="button" 
          onClick={() => setMode(false)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300 font-black uppercase tracking-widest text-[11px] ${!formData.isSpecialNote ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
        >
          Reservation
        </button>
        <button 
          type="button" 
          onClick={() => setMode(true)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-all duration-300 font-black uppercase tracking-widest text-[11px] ${formData.isSpecialNote ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5 hover:text-amber-500'}`}
        >
          Special Note
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-2">
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="relative">
              <label className={labelClasses}><Calendar size={12} className="text-emerald-500" /> Start Date</label>
              <div className="relative group">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors pointer-events-none" size={16} />
                <input 
                  required 
                  type="date" 
                  name="startDate" 
                  value={formData.startDate || ''} 
                  onChange={handleChange} 
                  className={inputClasses} 
                />
              </div>
            </div>
            <div className="relative">
              <label className={labelClasses}><Calendar size={12} className="text-emerald-500" /> End Date</label>
              <div className="relative group">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors pointer-events-none" size={16} />
                <input 
                  required 
                  type="date" 
                  name="endDate" 
                  value={formData.endDate || ''} 
                  onChange={handleChange} 
                  min={formData.startDate}
                  className={inputClasses} 
                />
              </div>
            </div>
          </div>

          {!formData.isSpecialNote ? (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="relative">
                  <label className={labelClasses}><User size={12} className="text-emerald-500" /> Rank and Name</label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors pointer-events-none" size={16} />
                    <input required name="rankName" value={formData.rankName || ''} onChange={handleChange} className={inputClasses} placeholder="Example: Billal Hossain" />
                  </div>
                </div>
                <div className="relative">
                  <label className={labelClasses}><Landmark size={12} className="text-emerald-500" /> Unit</label>
                  <div className="relative group">
                    <Landmark className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors pointer-events-none" size={16} />
                    <input required name="unit" value={formData.unit || ''} onChange={handleChange} className={inputClasses} placeholder="e.g., HQ Company" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="relative">
                  <label className={labelClasses}><Phone size={12} className="text-emerald-500" /> Mobile Number</label>
                  <div className="relative group">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors pointer-events-none" size={16} />
                    <input 
                      name="mobileNumber" 
                      value={formData.mobileNumber || ''} 
                      onChange={handleChange} 
                      className={inputClasses} 
                      placeholder="Optional - Mobile Number" 
                    />
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
                  <input name="destination" value={formData.destination || ''} onChange={handleChange} className={inputClasses} placeholder="Enter travel destination (Optional)" />
                </div>
              </div>

              <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-5">
                <div>
                  <label className={labelClasses}>Duration Policy</label>
                  <div className="flex gap-4">
                    {(['Full Day', 'Half Day'] as DurationType[]).map((d) => (
                      <label key={d} className={`flex-1 flex items-center justify-center gap-2 cursor-pointer py-2.5 px-3 rounded-lg border transition-all ${formData.duration === d ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm' : 'bg-transparent border-white/10 text-slate-500 hover:border-emerald-500/50'}`}>
                        <input type="radio" name="duration" checked={formData.duration === d} onChange={() => handleToggle('duration', d)} className="hidden" />
                        <span className="text-xs font-bold">{d}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClasses}><Clock size={12} className="text-emerald-500" /> Out Time</label>
                    <input type="time" name="outTime" value={formData.outTime || ''} onChange={handleChange} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold text-white" />
                  </div>
                  <div>
                    <label className={labelClasses}><Clock size={12} className="text-emerald-500" /> In Time</label>
                    <input type="time" name="inTime" value={formData.inTime || ''} onChange={handleChange} className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold text-white" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="relative">
                  <label className={labelClasses}><Banknote size={12} className="text-emerald-500" /> Fare Amount</label>
                  <div className="relative group">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm pointer-events-none">৳</span>
                    {formData.isExempt ? (
                      <div className="w-full pl-8 pr-4 py-2.5 bg-emerald-900/20 border border-emerald-500/20 rounded-xl text-sm font-black text-emerald-400 flex items-center">Not Required</div>
                    ) : (
                      <input required type="number" name="fare" value={formData.fare === undefined ? '' : formData.fare} onChange={handleChange} className={`${inputClasses} pl-8 font-black text-emerald-400 bg-emerald-900/10 border-emerald-500/30`} placeholder="0.00" />
                    )}
                  </div>
                  <button type="button" onClick={handleExemptToggle} className={`mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border ${formData.isExempt ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white/5 text-slate-400 border-white/10 hover:border-emerald-500/30'}`}>
                    {formData.isExempt ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    <span className="text-[10px] font-black uppercase tracking-widest">Fare Exempt</span>
                  </button>
                </div>
                
                <div className="relative">
                  <label className={labelClasses}><Wallet size={12} className="text-emerald-500" /> Payment Status</label>
                  <div className="relative group">
                    <Wallet className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                    <select name="fareStatus" value={formData.fareStatus || 'Unpaid'} onChange={handleChange} disabled={formData.isExempt} className={`${inputClasses} appearance-none cursor-pointer ${formData.isExempt ? 'bg-black/40 opacity-60' : ''}`}>
                      <option value="Paid" className="bg-[#062c1e]">✅ Paid</option>
                      <option value="Unpaid" className="bg-[#062c1e]">❌ Unpaid</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-500/10 p-6 rounded-2xl border-2 border-amber-500/20 border-dashed animate-in slide-in-from-bottom-2 duration-300">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-900/20">
                     <StickyNote size={20} />
                  </div>
                  <div>
                    <h5 className="text-[11px] font-black text-amber-500 uppercase tracking-widest">Special Note Entry</h5>
                    <p className="text-[9px] font-bold text-amber-500/60 uppercase">Displayed exclusively on calendar</p>
                  </div>
               </div>
               <p className="text-[10px] text-amber-200/50 font-medium italic mb-4">Note: Special notes are for organization only and do not appear in reports or generate payment slips.</p>
            </div>
          )}

          <div className="relative">
            <label className={labelClasses}><AlignLeft size={12} className="text-emerald-500" /> {formData.isSpecialNote ? 'Special Note Text' : 'Additional Remarks'}</label>
            <div className="relative group">
              <textarea 
                required={formData.isSpecialNote}
                name="remarks" 
                value={formData.remarks || ''} 
                onChange={handleChange} 
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm font-medium text-white min-h-[120px] resize-none" 
                placeholder={formData.isSpecialNote ? "Enter note to display on calendar..." : "Notes..."} 
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-6 border-t border-white/5">
          <div className="flex gap-4 min-h-[50px]">
            {(existingBooking?.id || formData.id) && onDelete && (
              <div className={`flex gap-2 transition-all duration-300 ${isConfirmingDelete ? 'flex-[2]' : 'flex-initial'}`}>
                {!isConfirmingDelete ? (
                  <button 
                    type="button" 
                    onClick={() => setIsConfirmingDelete(true)} 
                    className="px-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl hover:bg-rose-600 hover:text-white transition-all active:scale-90 flex items-center justify-center gap-2 group" 
                    title="Delete Entry"
                  >
                    <Trash2 size={20} className="group-hover:animate-bounce" />
                    <span className="text-[10px] font-black uppercase tracking-widest sm:hidden lg:inline">Delete</span>
                  </button>
                ) : (
                  <div className="flex gap-2 w-full animate-in slide-in-from-left-2 duration-300">
                    <div className="flex flex-col gap-1 flex-1">
                       <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest text-center mb-1 animate-pulse">Confirm Delete?</p>
                       <div className="flex gap-2">
                          <button 
                            type="button" 
                            onClick={handleConfirmDelete} 
                            className="flex-1 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest py-3 flex items-center justify-center gap-1.5 hover:bg-rose-700 shadow-lg shadow-rose-900/20 active:scale-95 transition-all"
                          >
                            <Check size={14} /> YES
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setIsConfirmingDelete(false)} 
                            className="px-4 bg-white/10 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest py-3 flex items-center justify-center gap-1.5 hover:bg-white/20 active:scale-95 transition-all"
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
              <button 
                type="submit" 
                className={`flex-1 font-bold py-3.5 rounded-xl transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 animate-in fade-in zoom-in-95 ${formData.isSpecialNote ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-900/20' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'}`}
              >
                {existingBooking ? 'Update Schedule' : (formData.isSpecialNote ? 'Add Special Note' : 'Create Reservation')}
              </button>
            )}
          </div>
          
          {!formData.isSpecialNote && (
            <button type="button" disabled={isDownloading || isConfirmingDelete} onClick={handleDownloadSlip} className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-emerald-400 rounded-xl border border-white/5 transition-all font-bold text-xs uppercase tracking-widest active:scale-[0.98] disabled:opacity-50">
              <FileDown size={16} />
              {isDownloading ? 'Generating PDF...' : 'Download Payment Slip'}
            </button>
          )}
        </div>
      </form>

      <Modal isOpen={showReceivedByModal} onClose={() => setShowReceivedByModal(false)} title="Payment Collector" variant="dark">
        <div className="space-y-6">
          <div className="bg-emerald-900/20 p-4 rounded-xl border border-emerald-500/20 flex items-center gap-4">
             <div className="w-10 h-10 bg-emerald-600 text-white rounded-lg flex items-center justify-center">
                <UserPlus size={20} />
             </div>
             <div>
                <p className="text-xs font-black text-white uppercase tracking-tight">Payment Received By</p>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Enter name for PDF slip</p>
             </div>
          </div>
          <div className="relative group">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors pointer-events-none" size={16} />
            <input 
              autoFocus
              value={receivedByName} 
              onChange={(e) => setReceivedByName(e.target.value)} 
              className={inputClasses} 
              placeholder="Example: Billal Hossain" 
            />
          </div>
          <button 
            onClick={confirmDownload}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all shadow-xl shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-2"
          >
            <FileDown size={16} />
            Download Payment Slip
          </button>
        </div>
      </Modal>
    </>
  );
};

export default BookingModal;