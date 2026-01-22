import React, { useState, useEffect } from 'react';
import { LogOut, FileText, Loader2 } from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set, push, remove } from 'firebase/database';

// সংশোধিত ইম্পোর্ট পাথ (এক্সটেনশন ছাড়া)
import Calendar from './components/Calendar';
import Modal from './components/Modal';
import LoginModal from './components/LoginModal';
import BookingModal from './components/BookingModal';
import ViewBookingModal from './components/ViewBookingModal';
import ReportManager from './components/ReportManager';
import { Booking } from './types';

// আপনার ফায়ারবেজ কনফিগারেশন
const firebaseConfig = {
  apiKey: "AIzaSyAM6-aTpbyk7RIOUviQJAIcAJiH2Dp9eTY",
  authDomain: "projectby56-791ca.firebaseapp.com",
  databaseURL: "https://projectby56-791ca-default-rtdb.firebaseio.com",
  projectId: "projectby56-791ca",
  storageBucket: "projectby56-791ca.firebasestorage.app",
  messagingSenderId: "693393079621",
  appId: "1:693393079621:web:7430ac858d1a25e601522c"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[200] bg-slate-100 flex flex-col items-center p-6 text-center animate-in fade-in duration-500">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-sm:w-full">
        <div className="relative mb-8">
          <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-[2rem] shadow-2xl border border-slate-200/50 flex items-center justify-center p-5 animate-logo-pulse overflow-hidden">
            <img src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" alt="Logo" className="w-full h-full object-contain mix-blend-multiply rounded-2xl" />
          </div>
        </div>
        <div className="space-y-4 w-full px-4">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Microbus Schedule</h1>
          <p className="text-[10px] md:text-xs font-black text-indigo-600 tracking-[0.3em] uppercase opacity-90">Area HQ Barishal</p>
          <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 animate-progress-fill"></div>
          </div>
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2">
            <Loader2 size={12} className="animate-spin text-indigo-500" /> Preparing Schedule...
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  useEffect(() => {
    const bookingsRef = ref(db, 'bookings');
    const unsubscribe = onValue(bookingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ ...data[key], id: key }));
        setBookings(list);
      } else {
        setBookings([]);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Firebase load error:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSaveBooking = async (booking: Booking) => {
    try {
      let id = booking.id;
      if (!id || id.startsWith('TEMP')) {
        const newRef = push(ref(db, 'bookings'));
        id = newRef.key as string;
      }
      await set(ref(db, `bookings/${id}`), { ...booking, id });
      setShowBookingModal(false);
      setEditingBooking(null);
    } catch (e) {
      alert("সেভ করা সম্ভব হয়নি।");
    }
  };

  const handleDeleteBooking = async (id: string) => {
    try {
      await remove(ref(db, `bookings/${id}`));
      setShowBookingModal(false);
      setEditingBooking(null);
    } catch (e) {
      alert("মুছে ফেলা সম্ভব হয়নি।");
    }
  };

  const handleDateClick = (date: Date, existing?: Booking) => {
    if (isAdmin) {
      setSelectedDate(date);
      setEditingBooking(existing || null);
      setShowBookingModal(true);
    } else if (existing) {
      setEditingBooking(existing);
      setShowViewModal(true);
    }
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
    setEditingBooking(null);
    setSelectedDate(undefined);
  };

  return (
    <>
      {isLoading && <LoadingScreen />}
      
      <div className={`flex flex-col bg-slate-100 text-slate-900 font-inter transition-all duration-500 ${isAdmin ? 'min-h-screen' : 'h-screen overflow-hidden'} ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
          <section className="flex items-center gap-3">
            <img src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" alt="Logo" className="w-10 h-10 object-contain mix-blend-multiply" />
            <div>
              <h1 className="text-sm md:text-base font-black text-slate-900 tracking-tight uppercase">MICROBUS SCHEDULE</h1>
              <p className="text-[9px] font-bold text-indigo-600 tracking-[0.2em] uppercase">AREA HQ BARISHAL</p>
            </div>
          </section>

          <div className="flex items-center gap-4">
            {isAdmin ? (
              <div className="flex items-center gap-3">
                <span className="text-indigo-700 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">Admin Active</span>
                <button onClick={() => setIsAdmin(false)} className="text-slate-400 hover:text-red-600 transition-colors p-1" title="Logout"><LogOut size={18} /></button>
              </div>
            ) : (
              <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-md hover:bg-slate-800 transition-all">Login</button>
            )}
          </div>
        </header>

        <main className={`p-4 flex flex-col gap-6 ${isAdmin ? '' : 'flex-1 overflow-hidden'}`}>
          <div className={`bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-200 overflow-hidden flex flex-col ${isAdmin ? 'h-[650px]' : 'flex-1'}`}>
            <Calendar currentDate={currentDate} setCurrentDate={setCurrentDate} bookings={bookings} isAdmin={isAdmin} onDateClick={handleDateClick} />
          </div>

          {isAdmin && (
            <div className="flex justify-center py-8">
              <button onClick={() => setShowReportModal(true)} className="flex items-center gap-4 bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all active:scale-95">
                <FileText size={24} /> Report Management
              </button>
            </div>
          )}
        </main>

        <footer className="px-6 py-4 border-t border-slate-200 bg-white flex justify-center text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">
          DEVELOPED BY 1815124 CPL (CLK) BILLAL, ASC &copy; {new Date().getFullYear()}
        </footer>

        <Modal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} title="Security Access">
          <LoginModal onLogin={setIsAdmin} onClose={() => setShowLoginModal(false)} />
        </Modal>
        
        <Modal isOpen={showBookingModal} onClose={closeBookingModal} title={editingBooking ? 'Modify Entry' : 'New Reservation'}>
          <BookingModal 
            isOpen={showBookingModal} 
            onClose={closeBookingModal} 
            onSave={handleSaveBooking} 
            onDelete={handleDeleteBooking} 
            initialDate={selectedDate} 
            existingBooking={editingBooking} 
          />
        </Modal>
        
        <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Booking Information">
          {editingBooking && <ViewBookingModal booking={editingBooking} />}
        </Modal>
        
        <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} title="Report Center">
          <ReportManager bookings={bookings} />
        </Modal>
      </div>
    </>
  );
};

export default App;
