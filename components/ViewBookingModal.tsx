
import React from 'react';
import { Booking } from '../types';
import { User, Landmark, MapPin, Calendar, Clock, Banknote, Wallet, AlignLeft, Info, Shield, Phone } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

interface ViewBookingModalProps {
  booking: Booking;
}

const ViewBookingModal: React.FC<ViewBookingModalProps> = ({ booking }) => {
  const detailItem = (icon: React.ReactNode, label: string, value: string | number | undefined, colorClass: string = "text-white") => (
    <div className="flex flex-col gap-1 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/5 hover:border-emerald-500/30 transition-colors z-10">
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
  const fareColor = booking.isExempt ? "text-emerald-400 font-black" : "text-white";

  return (
    <div className="relative">
      {/* 
        Sticky Watermark: 
        This container stays fixed relative to the modal's scroll view.
        Using h-0 and overflow-visible ensures it doesn't displace the actual content.
        Opacity reduced from 0.12 to 0.08 for a lighter effect.
      */}
      <div className="sticky top-[35%] pointer-events-none z-0 flex justify-center h-0 overflow-visible opacity-[0.08]">
        <img 
          src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" 
          alt="Watermark" 
          className="w-44 h-44 md:w-64 md:h-64 object-cover rounded-full -translate-y-1/2" 
        />
      </div>

      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-3 p-4 bg-emerald-900/20 backdrop-blur-sm border border-emerald-500/20 rounded-2xl">
          <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
            <Info size={20} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-black text-white uppercase tracking-tight truncate">Booking Details</h4>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest truncate">Reserved Schedule Info</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {detailItem(<User size={12} className="text-emerald-500" />, "Rank and Name", booking.rankName)}
          {detailItem(<Landmark size={12} className="text-emerald-500" />, "Unit", booking.unit)}
          {detailItem(<Phone size={12} className="text-emerald-500" />, "Mobile Number", booking.mobileNumber)}
          {detailItem(<Shield size={12} className="text-emerald-500" />, "Garrison Status", booking.garrisonStatus)}
          {detailItem(<MapPin size={12} className="text-emerald-500" />, "Destination", booking.destination)}
          {detailItem(<Calendar size={12} className="text-emerald-500" />, "Start Date", formatDate(booking.startDate))}
          {detailItem(<Calendar size={12} className="text-emerald-500" />, "End Date", formatDate(booking.endDate))}
          {detailItem(<Info size={12} className="text-emerald-500" />, "Duration", booking.duration)}
          {detailItem(<Clock size={12} className="text-emerald-500" />, "Out Time", booking.outTime)}
          {detailItem(<Clock size={12} className="text-emerald-500" />, "In Time", booking.inTime)}
          {detailItem(<Banknote size={12} className="text-emerald-500" />, "Fare", fareValue, fareColor)}
          {detailItem(
            <Wallet size={12} className="text-emerald-500" />, 
            "Payment Status", 
            booking.isExempt ? "Exempted" : booking.fareStatus,
            booking.isExempt ? "text-emerald-400" : (booking.fareStatus === 'Paid' ? 'text-green-400' : 'text-amber-400')
          )}
        </div>

        <div className="flex flex-col gap-1 p-4 bg-black/40 backdrop-blur-sm rounded-xl border border-white/5">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <AlignLeft size={12} className="text-emerald-400" />
            Remarks
          </div>
          <div className="text-xs font-medium text-slate-300 pl-5 italic leading-relaxed">
            {booking.remarks || 'No additional remarks provided for this booking.'}
          </div>
        </div>

        <div className="pt-4 text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            This is a read-only view. Only administrators can modify entries.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ViewBookingModal;
