
import React, { useState, useEffect } from 'react';
import { LogOut, FileText, Loader2, ArrowLeft, Phone } from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, push, remove } from 'firebase/database';

import Calendar from './components/Calendar';
import Modal from './components/Modal';
import LoginModal from './components/LoginModal';
import BookingModal from './components/BookingModal';
import ViewBookingModal from './components/ViewBookingModal';
import ReportManager from './components/ReportManager';
import TripStats from './components/TripStats';
import { Booking } from './types';

const firebaseConfig = {
  apiKey: "AIzaSyAM6-aTpbyk7RIOUviQJAIcAJiH2Dp9eTY",
  authDomain: "projectby56-791ca.firebaseapp.com",
  databaseURL: "https://projectby56-791ca-default-rtdb.firebaseio.com",
  projectId: "projectby56-791ca",
  storageBucket: "projectby56-791ca.firebasestorage.app",
  messagingSenderId: "693393079621",
  appId: "1:693393079621:web:7430ac858d1a25e601522c"
};

const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(firebaseApp);

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[200] bg-[#062c1e] shadow-[inset_0_0_150px_rgba(0,0,0,0.6)] flex flex-col items-center p-6 text-center animate-in fade-in duration-300">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-sm:max-w-xs">
        <div className="relative mb-12">
          <div className="w-36 h-36 md:w-48 md:h-48 flex items-center justify-center animate-logo-glow overflow-hidden rounded-full border-2 border-white/20 relative z-10 bg-black/20">
            <img 
              src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" 
              alt="Logo" 
              className="w-full h-full object-cover rounded-full scale-110" 
            />
          </div>
          <div className="absolute inset-0 bg-emerald-500/20 blur-[80px] rounded-full -z-10 animate-pulse scale-150"></div>
        </div>
        
        <div className="space-y-6 w-full max-w-sm">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
              Microbus Schedule
            </h1>
            <p className="text-[11px] md:text-[13px] font-black text-emerald-400 tracking-[0.4em] uppercase opacity-90 drop-shadow-sm">
              Area HQ Barishal
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
              <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 animate-progress-fill shadow-[0_0_15px_rgba(16,185,129,0.8)]"></div>
            </div>
            <div className="flex items-center justify-center gap-2.5 text-[11px] font-black text-white/50 uppercase tracking-[0.2em] pt-1">
              <Loader2 size={14} className="animate-spin text-emerald-500" /> 
              <span>Synchronizing Data</span>
            </div>
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
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [pendingDateAfterLogin, setPendingDateAfterLogin] = useState<Date | undefined>();
  
  const [footerState, setFooterState] = useState(0); 

  useEffect(() => {
    const startTime = Date.now();
    try {
      const bookingsRef = ref(db, 'bookings');
      const unsubscribe = onValue(bookingsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const list = Object.keys(data).map(key => ({ ...data[key], id: key }));
          setBookings(list);
        } else {
          setBookings([]);
        }
        
        const elapsedTime = Date.now() - startTime;
        const minDuration = 3000;
        const remainingTime = Math.max(0, minDuration - elapsedTime);
        
        setTimeout(() => {
          setIsLoading(false);
        }, remainingTime);

      }, (error) => {
        console.error("Firebase load error:", error);
        setIsLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Database setup error:", e);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFooterState(prev => (prev === 0 ? 1 : 0));
    }, 5000);
    return () => clearInterval(interval);
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
      alert("সেভ করা সম্ভব হয়নি।");
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

  const logoStyles = "w-10 h-10 md:w-14 md:h-14 object-cover rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] scale-110";

  return (
    <>
      {isLoading && <LoadingScreen />}
      
      <div className={`flex flex-col bg-[#010409] text-white font-inter h-[100dvh] overflow-hidden transition-all duration-300 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] ${isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        <header className="bg-[#0a1128]/95 backdrop-blur-md border-b border-white/10 px-2 md:px-6 py-1.5 md:py-2 grid grid-cols-[1fr_auto_1fr] items-center sticky top-0 z-50 shadow-xl shrink-0">
          <section className="flex justify-start">
            {view === 'reports' ? (
              <button 
                onClick={() => setView('calendar')}
                className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center bg-white/5 text-slate-300 rounded-lg md:rounded-xl hover:bg-white/10 hover:text-white transition-all active:scale-90 shadow-sm border border-white/5"
              >
                <ArrowLeft size={20} className="md:w-6 md:h-6" />
              </button>
            ) : (
              <div className="flex items-center justify-center overflow-hidden rounded-full">
                <img src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" alt="Logo Left" className={logoStyles} />
              </div>
            )}
          </section>

          <div className="text-center px-2 flex flex-col justify-center">
            <h1 className="text-[14px] sm:text-lg md:text-[24px] font-black text-white tracking-tight uppercase leading-tight whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
              {view === 'reports' ? 'Report Center' : 'MICROBUS SCHEDULE'}
            </h1>
            <p className="text-[9px] sm:text-[10px] md:text-[12px] font-bold text-white tracking-[0.1em] md:tracking-[0.2em] uppercase mt-0.5 whitespace-nowrap leading-none opacity-90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              {view === 'reports' ? 'Data Analytics & PDF' : 'AREA HQ BARISHAL'}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            {isAdmin && (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-white text-[9px] font-bold uppercase tracking-wider bg-indigo-600 px-2 py-1 rounded-md shadow-sm border border-indigo-500">Admin</span>
                <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors p-1.5 md:p-2 bg-white/5 rounded-lg shadow-sm border border-white/5" title="Logout">
                  <LogOut size={16} />
                </button>
              </div>
            )}
            <div className="flex items-center justify-center overflow-hidden rounded-full">
              <img src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" alt="Logo Right" className={logoStyles} />
            </div>
          </div>
        </header>

        <main className="p-1 md:p-2 flex flex-col gap-1 md:gap-2 flex-1 overflow-hidden min-h-0 relative z-10">
          {view === 'calendar' ? (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300 min-h-0">
              <div className="bg-[#062c1e] rounded-2xl md:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] border border-white/10 overflow-hidden flex flex-col flex-1 min-h-0">
                <Calendar 
                  currentDate={currentDate} 
                  setCurrentDate={setCurrentDate} 
                  bookings={bookings} 
                  isAdmin={isAdmin} 
                  onDateClick={handleDateClick} 
                  onDateDoubleClick={handleDateDoubleClick}
                  onLoginClick={() => setShowLoginModal(true)}
                  onStatsClick={() => setShowStatsModal(true)}
                  onReportClick={() => setView('reports')}
                  isAppLoading={isLoading}
                />
              </div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto w-full h-full overflow-y-auto animate-in fade-in slide-in-from-right-4 duration-300 custom-scrollbar p-2">
              <ReportManager bookings={bookings} onBack={() => setView('calendar')} />
            </div>
          )}
        </main>

        {view === 'calendar' && (
          <footer className="px-6 h-8 border-t border-white/10 bg-[#0a1128]/95 backdrop-blur-sm flex items-center justify-center overflow-hidden shrink-0 z-50">
            <div key={footerState} className="animate-footer-wipe flex items-center justify-center gap-2 min-w-max">
              {footerState === 0 ? (
                <span className="text-[8px] md:text-[16px] text-white font-black uppercase tracking-[0.1em] md:tracking-[0.15em] whitespace-nowrap drop-shadow-md">
                  DEVELOPED BY CPL (CLK) BILLAL, ASC
                </span>
              ) : (
                <div className="flex items-center gap-2 text-white">
                  <Phone size={10} className="text-white drop-shadow-sm md:w-[16px] md:h-[16px]" />
                  <span className="text-[8px] md:text-[16px] font-black uppercase tracking-[0.1em] md:tracking-[0.15em] whitespace-nowrap drop-shadow-md">
                    01783413333
                  </span>
                </div>
              )}
            </div>
          </footer>
        )}

        <Modal isOpen={showLoginModal} onClose={closeLoginModal} title="Security Access" variant="dark">
          <LoginModal onLogin={handleLoginSuccess} onClose={closeLoginModal} />
        </Modal>

        <Modal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} title="Trip Statistics" variant="dark" size="max-w-full">
          <TripStats bookings={bookings} />
        </Modal>
        
        <Modal isOpen={showBookingModal} onClose={closeBookingModal} title={editingBooking ? 'Modify Entry' : 'New Reservation'} variant="dark">
          <BookingModal 
            isOpen={showBookingModal} 
            onClose={closeBookingModal} 
            onSave={handleSaveBooking} 
            onDelete={handleDeleteBooking} 
            initialDate={selectedDate} 
            existingBooking={editingBooking} 
          />
        </Modal>
        
        <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Booking Information" variant="dark">
          {editingBooking && <ViewBookingModal booking={editingBooking} />}
        </Modal>
      </div>
    </>
  );
};

export default App;
