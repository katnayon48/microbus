
import React from 'react';
import { Booking, AppSettings } from '../types';
import { User, Landmark, MapPin, Calendar, Clock, Banknote, Wallet, AlignLeft, Info, Shield, Phone } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

interface ViewBookingModalProps {
  booking: Booking;
  appSettings: AppSettings;
}

const ViewBookingModal: React.FC<ViewBookingModalProps> = ({ booking, appSettings }) => {
  const themeColor = appSettings?.ui?.themeColor || "#10b981";

  const detailItem = (icon: React.ReactNode, label: string, value: string | number | undefined, colorClass: string = "text-white") => (
    <div className="flex flex-col gap-1 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/5 transition-colors z-10">
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
      <div className="sticky top-[35%] pointer-events-none z-0 flex justify-center h-0 overflow-visible opacity-[0.08]">
        <img 
          src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" 
          alt="Watermark" 
          className="w-44 h-44 md:w-64 md:h-64 object-cover rounded-full -translate-y-1/2" 
        />
      </div>

      <div className="relative z-10 space-y-6">
        <div 
          className="flex items-center gap-3 p-4 backdrop-blur-sm border rounded-2xl"
          style={{ backgroundColor: `${themeColor}22`, borderColor: `${themeColor}44` }}
        >
          <div 
            className="w-10 h-10 text-white rounded-xl flex items-center justify-center shadow-md shrink-0"
            style={{ backgroundColor: themeColor }}
          >
            <Info size={20} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-black text-white uppercase tracking-tight truncate">Booking Details</h4>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest truncate opacity-80">Reserved Schedule Info</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {detailItem(<User size={12} style={{ color: themeColor }} />, "Rank and Name", booking.rankName)}
          {detailItem(<Landmark size={12} style={{ color: themeColor }} />, "Unit", booking.unit)}
          {detailItem(<Phone size={12} style={{ color: themeColor }} />, "Mobile Number", booking.mobileNumber)}
          {detailItem(<Shield size={12} style={{ color: themeColor }} />, "Garrison Status", booking.garrisonStatus)}
          {detailItem(<MapPin size={12} style={{ color: themeColor }} />, "Destination", booking.destination)}
          {detailItem(<Calendar size={12} style={{ color: themeColor }} />, "Start Date", formatDate(booking.startDate))}
          {detailItem(<Calendar size={12} style={{ color: themeColor }} />, "End Date", formatDate(booking.endDate))}
          {detailItem(<Info size={12} style={{ color: themeColor }} />, "Duration", booking.duration)}
          {detailItem(<Clock size={12} style={{ color: themeColor }} />, "Out Time", booking.outTime)}
          {detailItem(<Clock size={12} style={{ color: themeColor }} />, "In Time", booking.inTime)}
          {detailItem(<Banknote size={12} style={{ color: themeColor }} />, "Fare", fareValue, fareColor)}
          {detailItem(
            <Wallet size={12} style={{ color: themeColor }} />, 
            "Payment Status", 
            booking.isExempt ? "Exempted" : booking.fareStatus,
            booking.isExempt ? "text-emerald-400" : (booking.fareStatus === 'Paid' ? 'text-green-400' : 'text-amber-400')
          )}
        </div>

        <div className="flex flex-col gap-1 p-4 bg-black/40 backdrop-blur-sm rounded-xl border border-white/5">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <AlignLeft size={12} style={{ color: themeColor }} />
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
