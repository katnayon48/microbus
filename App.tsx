
import React, { useState, useEffect } from 'react';
import { LogOut, FileText, Loader2, ArrowLeft } from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, onValue, set, push, remove } from 'firebase/database';

import Calendar from './components/Calendar';
import Modal from './components/Modal';
import LoginModal from './components/LoginModal';
import BookingModal from './components/BookingModal';
import ViewBookingModal from './components/ViewBookingModal';
import ReportManager from './components/ReportManager';
import { Booking } from './types';

// আপনার নতুন ফায়ারবেজ কনফিগারেশন
const firebaseConfig = {
  apiKey: "AIzaSyAM6-aTpbyk7RIOUviQJAIcAJiH2Dp9eTY",
  authDomain: "projectby56-791ca.firebaseapp.com",
  databaseURL: "https://projectby56-791ca-default-rtdb.firebaseio.com",
  projectId: "projectby56-791ca",
  storageBucket: "projectby56-791ca.firebasestorage.app",
  messagingSenderId: "693393079621",
  appId: "1:693393079621:web:7430ac858d1a25e601522c"
};

// ফায়ারবেজ ইনিশিয়ালাইজেশন
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[200] bg-slate-100 flex flex-col items-center p-6 text-center animate-in fade-in duration-500">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
        <div className="relative mb-8">
          <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-[2rem] shadow-2xl border border-slate-200/50 flex items-center justify-center p-5 animate-logo-pulse overflow-hidden">
            <img src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" alt="Logo" className="w-full h-full object-contain mix-blend-multiply rounded-2xl" />
          </div>
        </div>
        <div className="space-y-4 w-full">
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
  const [view, setView] = useState<'calendar' | 'reports'>('calendar');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [pendingDateAfterLogin, setPendingDateAfterLogin] = useState<Date | undefined>();

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
      closeBookingModal();
    } catch (e) {
      alert("সেভ করা সম্ভব হয়নি। ইন্টারনেট কানেকশন চেক করুন।");
    }
  };

  const handleDeleteBooking = async (id: string) => {
    try {
      await remove(ref(db, `bookings/${id}`));
      closeBookingModal();
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

  const handleDateDoubleClick = (date: Date) => {
    if (!isAdmin) {
      setPendingDateAfterLogin(date);
      setShowLoginModal(true);
    }
  };

  const handleLoginSuccess = (success: boolean) => {
    if (success) {
      setIsAdmin(true);
      if (pendingDateAfterLogin) {
        setSelectedDate(pendingDateAfterLogin);
        setEditingBooking(null);
        setShowBookingModal(true);
        setPendingDateAfterLogin(undefined);
      }
    }
  };

  const closeBookingModal = () => {
    setShowBookingModal(false);
    setEditingBooking(null);
    setSelectedDate(undefined);
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setPendingDateAfterLogin(undefined);
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setView('calendar');
  };

  return (
    <>
      {isLoading && <LoadingScreen />}
      
      <div className={`flex flex-col bg-slate-100 text-slate-900 font-inter h-[100dvh] overflow-hidden transition-all duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        <header className="bg-white border-b border-slate-200 px-2 md:px-6 py-1 md:py-1.5 grid grid-cols-[1fr_auto_1fr] items-center sticky top-0 z-50 shadow-sm shrink-0">
          {/* Left: Back Button or Logo */}
          <section className="flex justify-start">
            {view === 'reports' ? (
              <button 
                onClick={() => setView('calendar')}
                className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg md:rounded-xl hover:bg-slate-900 hover:text-white transition-all active:scale-90 shadow-sm"
              >
                <ArrowLeft size={20} className="md:w-6 md:h-6" />
              </button>
            ) : (
              <img src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" alt="Logo Left" className="w-10 h-10 md:w-16 md:h-16 object-contain mix-blend-multiply" />
            )}
          </section>

          {/* Center: Title and Subtitle */}
          <div className="text-center px-2 flex flex-col justify-center">
            <h1 className="text-[14px] sm:text-lg md:text-[24px] font-black text-slate-900 tracking-tight uppercase leading-tight whitespace-nowrap">
              {view === 'reports' ? 'Report Center' : 'MICROBUS SCHEDULE'}
            </h1>
            <p className="text-[9px] sm:text-[10px] md:text-[12px] font-bold text-indigo-600 tracking-[0.1em] md:tracking-[0.2em] uppercase mt-0.5 whitespace-nowrap leading-none">
              {view === 'reports' ? 'Data Analytics & PDF' : 'AREA HQ BARISHAL'}
            </p>
          </div>

          {/* Right: Admin Actions and Mirror Logo */}
          <div className="flex items-center justify-end gap-2">
            {isAdmin && (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-indigo-700 text-[9px] font-bold uppercase tracking-wider bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">Admin</span>
                <button onClick={handleLogout} className="text-slate-400 hover:text-red-600 transition-colors p-1.5 md:p-2 bg-slate-50 rounded-lg shadow-sm" title="Logout">
                  <LogOut size={16} />
                </button>
              </div>
            )}
            <img src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" alt="Logo Right" className="w-10 h-10 md:w-16 md:h-16 object-contain mix-blend-multiply" />
          </div>
        </header>

        <main className="p-2 md:p-4 flex flex-col gap-2 md:gap-4 flex-1 overflow-hidden min-h-0">
          {view === 'calendar' ? (
            <div className="flex flex-col gap-2 md:gap-4 h-full animate-in fade-in slide-in-from-bottom-2 duration-500 min-h-0">
              <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl shadow-slate-200 border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                <Calendar 
                  currentDate={currentDate} 
                  setCurrentDate={setCurrentDate} 
                  bookings={bookings} 
                  isAdmin={isAdmin} 
                  onDateClick={handleDateClick} 
                  onDateDoubleClick={handleDateDoubleClick}
                  onLoginClick={() => setShowLoginModal(true)}
                />
              </div>

              {isAdmin && (
                <div className="flex justify-center shrink-0 pb-1">
                  <button 
                    onClick={() => setView('reports')} 
                    className="flex items-center gap-2 md:gap-4 bg-indigo-600 text-white px-6 md:px-10 py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all active:scale-95 group text-[10px] md:text-sm"
                  >
                    <FileText size={16} className="md:w-6 md:h-6" /> 
                    Report Manager
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-5xl mx-auto w-full h-full overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-500 custom-scrollbar">
              <ReportManager bookings={bookings} onBack={() => setView('calendar')} />
            </div>
          )}
        </main>

        <footer className="px-4 py-1.5 md:py-2 border-t border-slate-200 bg-white flex items-center justify-between text-[7px] md:text-[9px] text-black font-bold uppercase tracking-[0.2em] shrink-0">
          <div className="w-12 md:w-16"></div> 
          
          <div className="flex items-center justify-center gap-2">
            <img src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" alt="Logo" className="w-4 h-4 md:w-6 md:h-6 object-contain mix-blend-multiply" />
            <span>DEVELOPED BY 1815124 CPL (CLK) BILLAL, ASC &copy; 2026</span>
            <img src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" alt="Logo" className="w-4 h-4 md:w-6 md:h-6 object-contain mix-blend-multiply" />
          </div>

          <div className="w-12 md:w-16"></div>
        </footer>

        <Modal isOpen={showLoginModal} onClose={closeLoginModal} title="Security Access">
          <LoginModal onLogin={handleLoginSuccess} onClose={closeLoginModal} />
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
      </div>
    </>
  );
};

export default App;
