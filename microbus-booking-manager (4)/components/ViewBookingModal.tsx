
import React from 'react';
import { Booking } from '../types';
import { User, Landmark, MapPin, Calendar, Clock, Banknote, Wallet, AlignLeft, Info, Shield } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

interface ViewBookingModalProps {
  booking: Booking;
}

const ViewBookingModal: React.FC<ViewBookingModalProps> = ({ booking }) => {
  const detailItem = (icon: React.ReactNode, label: string, value: string | number | undefined, colorClass: string = "text-slate-900") => (
    <div className="flex flex-col gap-1 p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-100 hover:border-indigo-100 transition-colors z-10">
      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {icon}
        {label}
      </div>
      <div className={`text-sm font-bold pl-5 ${colorClass}`}>
        {value || 'N/A'}
      </div>
    </div>
  );

  const fareValue = booking.isExempt ? "Not Required" : `৳ ${booking.fare}`;
  const fareColor = booking.isExempt ? "text-indigo-600 font-black" : "text-slate-900";

  return (
    <div className="space-y-6">
      {/* Branding Watermark - Fixed to modal viewport center */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.15]">
        <img 
          src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" 
          alt="Watermark" 
          className="w-48 md:w-64 object-contain mix-blend-multiply" 
        />
      </div>

      <div className="flex items-center gap-3 p-4 bg-indigo-50/80 backdrop-blur-sm border border-indigo-100 rounded-2xl z-10 relative">
        <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
          <Info size={20} />
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">Booking Details</h4>
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest truncate">Reserved Schedule Info</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {detailItem(<User size={12} className="text-indigo-500" />, "Rank and Name", booking.rankName)}
        {detailItem(<Landmark size={12} className="text-indigo-500" />, "Unit", booking.unit)}
        {detailItem(<Shield size={12} className="text-indigo-500" />, "Garrison Status", booking.garrisonStatus)}
        {detailItem(<MapPin size={12} className="text-indigo-500" />, "Destination", booking.destination)}
        {detailItem(<Calendar size={12} className="text-indigo-500" />, "Start Date", formatDate(booking.startDate))}
        {detailItem(<Calendar size={12} className="text-indigo-500" />, "End Date", formatDate(booking.endDate))}
        {detailItem(<Info size={12} className="text-indigo-500" />, "Duration", booking.duration)}
        {detailItem(<Clock size={12} className="text-indigo-500" />, "Out Time", booking.outTime)}
        {detailItem(<Clock size={12} className="text-indigo-500" />, "In Time", booking.inTime)}
        {detailItem(<Banknote size={12} className="text-indigo-500" />, "Fare", fareValue, fareColor)}
        {detailItem(
          <Wallet size={12} className="text-indigo-500" />, 
          "Payment Status", 
          booking.isExempt ? "Exempted" : booking.fareStatus,
          booking.isExempt ? "text-indigo-600" : (booking.fareStatus === 'Paid' ? 'text-green-600' : 'text-amber-600')
        )}
      </div>

      <div className="flex flex-col gap-1 p-4 bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-800 relative z-10">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <AlignLeft size={12} className="text-indigo-400" />
          Remarks
        </div>
        <div className="text-xs font-medium text-slate-300 pl-5 italic leading-relaxed">
          {booking.remarks || 'No additional remarks provided for this booking.'}
        </div>
      </div>

      <div className="pt-4 text-center relative z-10">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          This is a read-only view. Only administrators can modify entries.
        </p>
      </div>
    </div>
  );
};

export default ViewBookingModal;
