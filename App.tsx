import React, { useState, useEffect } from 'react';
import { LogOut, FileText, Loader2, ArrowLeft, Phone, Settings, ShieldAlert, Lock } from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, push, remove, update } from 'firebase/database';

import Calendar from './components/Calendar';
import Modal from './components/Modal';
import LoginModal from './components/LoginModal';
import BookingModal from './components/BookingModal';
import ViewBookingModal from './components/ViewBookingModal';
import ReportManager from './components/ReportManager';
import AttendanceViewer from './components/AttendanceViewer';
import MasterSettingsModal from './components/MasterSettingsModal';
import TripStats from './components/TripStats';
import { Booking, AppSettings, UserRole } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { parseISO, isWithinInterval } from 'date-fns';

const firebaseConfig = {
  apiKey: process.env.API_KEY || "AIzaSyAM6-aTpbyk7RIOUviQJAIcAJiH2Dp9eTY",
  authDomain: "projectby56-791ca.firebaseapp.com",
  databaseURL: "https://projectby56-791ca-default-rtdb.firebaseio.com",
  projectId: "projectby56-791ca",
  storageBucket: "projectby56-791ca.firebasestorage.app",
  messagingSenderId: "693393079621",
  appId: "1:693393079621:web:7430ac858d1a25e601522c"
};

let db: any;
try {
  const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getDatabase(firebaseApp);
} catch (error) {
  console.error("Firebase initialization failed:", error);
}

const SETTINGS_CACHE_KEY = 'microbus_app_settings_cache';

const deepMerge = (target: any, source: any) => {
  const output = { ...target };
  if (source && typeof source === 'object') {
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        output[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        output[key] = source[key];
      }
    });
  }
  return output;
};

const getInitialSettings = (): AppSettings => {
  try {
    const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (cached) {
      return deepMerge(DEFAULT_SETTINGS, JSON.parse(cached));
    }
  } catch (e) {
    console.error("Failed to load cached settings:", e);
  }
  return DEFAULT_SETTINGS;
};

const LoadingScreen: React.FC<{ bgColor: string }> = ({ bgColor }) => {
  return (
    <div 
      className="fixed inset-0 z-[200] shadow-[inset_0_0_150px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300"
      style={{ backgroundColor: bgColor }}
    >
      <div className="flex flex-col items-center w-full max-sm">
        <div className="relative mb-12 logo-3d-container">
          <div className="logo-3d-card">
            {/* Multiple depth layers for a thick gold bevel effect */}
            {[...Array(31)].map((_, i) => {
              const z = i - 15;
              const isRim = i === 0 || i === 30;
              return (
                <div 
                  key={i} 
                  className={isRim ? "logo-3d-rim" : "logo-3d-depth"} 
                  style={{ transform: `translateZ(${z}px)` }}
                />
              );
            })}
            <img 
              src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" 
              alt="Logo Back" 
              className="logo-3d-back" 
            />
            <img 
              src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" 
              alt="Logo Front" 
              className="logo-3d-face" 
            />
          </div>
        </div>
        
        <div className="space-y-6 w-full">
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
  const [view, setView] = useState<'calendar' | 'reports' | 'attendance'>('calendar');
  const [reportInitialStep, setReportInitialStep] = useState<any>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('viewer');
  const [settings, setSettings] = useState<AppSettings>(getInitialSettings());
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [pendingDateAfterLogin, setPendingDateAfterLogin] = useState<Date | undefined>();
  const [pendingReportStep, setPendingReportStep] = useState<string | null>(null);
  
  const [footerIndex, setFooterIndex] = useState(0); 

  useEffect(() => {
    const startTime = Date.now();
    
    if (!db) {
      console.error("Database connection not available");
      setTimeout(() => setIsLoading(false), 3000);
      return;
    }

    document.body.style.backgroundColor = settings.ui.bgColor;

    const unsubscribeSettings = onValue(ref(db, 'settings'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const mergedSettings = deepMerge(DEFAULT_SETTINGS, data);
        setSettings(mergedSettings);
        localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(mergedSettings));
        document.body.style.backgroundColor = mergedSettings.ui.bgColor;
      }
    });

    const bookingsRef = ref(db, 'bookings');
    const unsubscribeBookings = onValue(bookingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data)
          .map(key => ({ ...data[key], id: key }))
          .filter(b => b.startDate); // Filter invalid bookings
        setBookings(list);
      } else {
        setBookings([]);
      }
      
      const elapsedTime = Date.now() - startTime;
      const minDuration = 5500; // Show 3D animation for at least 5.5 seconds (animation is 5s)
      const remainingTime = Math.max(0, minDuration - elapsedTime);
      
      setTimeout(() => {
        setIsLoading(false);
      }, remainingTime);
    }, (error) => {
      console.error("Firebase fetch error:", error);
      setTimeout(() => setIsLoading(false), 3000);
    });

    return () => {
      unsubscribeSettings();
      unsubscribeBookings();
    };
  }, []);

  const footerLines = settings.branding.footerLines || [settings.branding.footerText, settings.branding.footerPhone];

  useEffect(() => {
    const interval = setInterval(() => {
      if (footerLines.length > 0) {
        setFooterIndex(prev => (prev + 1) % footerLines.length);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [footerLines.length]);

  const isAdmin = userRole === 'admin' || userRole === 'master';
  const isMaster = userRole === 'master';

  const handleSaveBooking = async (booking: Booking) => {
    if (!db) return;
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
    if (!db) return;
    try {
      await remove(ref(db, `bookings/${id}`));
      closeBookingModal();
    } catch (e) {
      alert("মুছে ফেলা সম্ভব হয়নি।");
    }
  };

  const handleWipeData = async (range?: { start: string, end: string }) => {
    if (!db) return;
    try {
      if (range) {
        const start = parseISO(range.start);
        const end = parseISO(range.end);
        
        const updates: any = {};
        bookings.forEach(b => {
          if (b.startDate) {
            const bDate = parseISO(b.startDate);
            if (isWithinInterval(bDate, { start, end })) {
              updates[`bookings/${b.id}`] = null;
            }
          }
        });
        
        if (Object.keys(updates).length > 0) {
          await update(ref(db), updates);
        }
      } else {
        await remove(ref(db, 'bookings'));
      }
      setShowSettingsModal(false);
    } catch (e) {
      alert("ডেটা মুছতে সমস্যা হয়েছে।");
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

  const handleLoginSuccess = (role: UserRole) => {
    setUserRole(role);
    if (pendingDateAfterLogin) {
      setSelectedDate(pendingDateAfterLogin);
      setEditingBooking(null);
      setShowBookingModal(true);
      setPendingDateAfterLogin(undefined);
    } else if (pendingReportStep) {
      setReportInitialStep(pendingReportStep);
      setView('reports');
      setPendingReportStep(null);
    }
  };

  const handleAttendanceLoginRedirect = () => {
    if (isAdmin) {
      setReportInitialStep('driver-attendance');
      setView('reports');
    } else {
      setPendingReportStep('driver-attendance');
      setShowLoginModal(true);
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
    setPendingReportStep(null);
  };

  const handleLogout = () => {
    setUserRole('viewer');
    setView('calendar');
    setReportInitialStep('dashboard');
  };

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    if (!db) return;
    await set(ref(db, 'settings'), newSettings);
    setSettings(newSettings);
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(newSettings));
    setShowSettingsModal(false); 
  };

  const logoStyles = "w-10 h-10 md:w-14 md:h-14 object-cover rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] scale-110";

  if (!isLoading && settings?.security?.maintenanceMode && userRole === 'viewer') {
    return (
      <div 
        className="fixed inset-0 z-[300] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 shadow-[inset_0_0_200px_rgba(0,0,0,0.8)]"
        style={{ backgroundColor: settings.ui.bgColor }}
      >
        <div className="relative mb-10">
          <div className="w-40 h-40 md:w-56 md:h-56 flex items-center justify-center animate-logo-glow overflow-hidden rounded-full border-2 border-white/20 relative z-10 bg-black/40">
            <img 
              src="https://i.ibb.co.com/mrKzTCgt/IMG-0749.jpg" 
              alt="Logo" 
              className="w-full h-full object-cover rounded-full scale-110" 
            />
          </div>
          <div className="absolute inset-0 bg-amber-500/10 blur-[100px] rounded-full -z-10 animate-pulse scale-125"></div>
          
          <div className="absolute -bottom-2 -right-2 w-12 h-12 border-2 border-amber-500/40 rounded-2xl flex items-center justify-center text-amber-500 shadow-2xl z-20 animate-bounce" style={{ backgroundColor: settings.ui.bgColor }}>
            <ShieldAlert size={24} />
          </div>
        </div>

        <div className="space-y-4 max-w-lg">
          <h1 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter drop-shadow-lg">Under Maintenance</h1>
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-px w-10 bg-amber-500/50"></div>
            <Lock size={14} className="text-amber-500" />
            <div className="h-px w-10 bg-amber-500/50"></div>
          </div>
          <p className="text-slate-300 font-bold text-sm md:text-base uppercase tracking-widest leading-relaxed opacity-80 px-4">
            {settings.security.maintenanceMessage || "The system is currently undergoing critical updates for better performance."}
          </p>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
          <button 
            onClick={() => setShowLoginModal(true)} 
            className="group relative px-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 hover:text-white hover:bg-white/10 hover:border-emerald-500/50 transition-all shadow-xl active:scale-95"
          >
            Terminal Access
          </button>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] opacity-40">Unauthorized usage is strictly prohibited</p>
        </div>

        <Modal isOpen={showLoginModal} onClose={closeLoginModal} title="Security Access" variant="dark" customBgColor={settings.ui.bgColor}>
          <LoginModal onLogin={handleLoginSuccess} onClose={closeLoginModal} currentSettings={settings} />
        </Modal>
      </div>
    );
  }

  const currentLine = footerLines[footerIndex];
  const isPhoneLine = /01[3-9]\d{8}/.test(currentLine);

  return (
    <>
      {isLoading && <LoadingScreen bgColor={settings.ui.bgColor} />}
      
      <div 
        className={`flex flex-col text-white font-inter h-[100dvh] overflow-hidden transition-all duration-300 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] ${isLoading ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}
        style={{ backgroundColor: settings.ui.bgColor }}
      >
        <header 
          className="backdrop-blur-md border-b border-white/10 px-2 md:px-6 py-1.5 md:py-2 grid grid-cols-[1fr_auto_1fr] items-center sticky top-0 z-50 shadow-xl shrink-0"
          style={{ backgroundColor: `${settings.ui.bgColor}F2` }}
        >
          <section className="flex justify-start">
            {view !== 'calendar' ? (
              <button 
                onClick={() => { setView('calendar'); setReportInitialStep('dashboard'); }}
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
            <h1 className="text-[14px] sm:text-lg md:text-[24px] font-black text-white tracking-tight uppercase leading-tight whitespace-nowrap drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
              {view === 'reports' ? 'Report Center' : view === 'attendance' ? "Driver's Attendance Log" : (settings?.branding?.title || "MICROBUS SCHEDULE")}
            </h1>
            <p className="text-[9px] sm:text-[10px] md:text-[12px] font-bold text-white tracking-[0.1em] md:tracking-[0.2em] uppercase mt-0.5 whitespace-nowrap leading-none opacity-90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              {view === 'reports' ? 'Data Analytics & PDF' : view === 'attendance' ? 'Driver Timing History' : (settings?.branding?.subtitle || "AREA HQ BARISHAL")}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            {isAdmin && (
              <div className="flex items-center gap-2">
                <span className={`hidden sm:inline text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm border ${isMaster ? 'bg-amber-600 border-amber-500' : 'bg-indigo-600 border-indigo-500'}`}>
                  {isMaster ? 'Master' : 'Admin'}
                </span>
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
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300 min-h-0">
            <div 
              className="rounded-2xl md:rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] border border-white/10 overflow-hidden flex flex-col flex-1 min-h-0"
              style={{ backgroundColor: settings.ui.bgColor }}
            >
              {view === 'calendar' ? (
                <Calendar 
                  currentDate={currentDate} 
                  setCurrentDate={setCurrentDate} 
                  bookings={bookings} 
                  isAdmin={isAdmin} 
                  isMaster={isMaster}
                  onDateClick={handleDateClick} 
                  onDateDoubleClick={handleDateDoubleClick}
                  onLoginClick={() => setShowLoginModal(true)}
                  onStatsClick={() => setShowStatsModal(true)}
                  onAttendanceViewerClick={() => setView('attendance')}
                  onReportClick={() => { setView('reports'); setReportInitialStep('dashboard'); }}
                  onSettingsClick={() => setShowSettingsModal(true)}
                  isAppLoading={isLoading}
                  appSettings={settings}
                />
              ) : view === 'attendance' ? (
                <AttendanceViewer isAdmin={isAdmin} onLoginClick={handleAttendanceLoginRedirect} appSettings={settings} />
              ) : (
                <ReportManager bookings={bookings} appSettings={settings} onBack={() => { setView('calendar'); setReportInitialStep('dashboard'); }} initialStep={reportInitialStep} />
              )}
            </div>
          </div>
        </main>

        {view === 'calendar' && (
          <footer 
            className="px-6 h-8 border-t border-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden shrink-0 z-50"
            style={{ backgroundColor: `${settings.ui.bgColor}F2` }}
          >
            <div key={footerIndex} className="animate-footer-wipe flex items-center justify-center gap-2 min-w-max">
              {isPhoneLine && (
                <Phone size={10} className="text-white drop-shadow-md md:w-[16px] md:h-[16px]" />
              )}
              <span className="text-[8px] md:text-[16px] text-white font-black uppercase tracking-[0.1em] md:tracking-[0.15em] whitespace-nowrap drop-shadow-md">
                {currentLine}
              </span>
            </div>
          </footer>
        )}

        <Modal isOpen={showLoginModal} onClose={closeLoginModal} title="Security Access" variant="dark" customBgColor={settings.ui.bgColor}>
          <LoginModal onLogin={handleLoginSuccess} onClose={closeLoginModal} currentSettings={settings} />
        </Modal>

        <Modal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} title="Master Control Panel" variant="dark" size="max-w-4xl" customBgColor={settings.ui.bgColor}>
          <MasterSettingsModal 
            settings={settings} 
            onSave={handleUpdateSettings} 
            bookings={bookings} 
            onWipeData={handleWipeData}
          />
        </Modal>

        <Modal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} title="Trip Statistics" variant="dark" size="max-w-full" customBgColor={settings.ui.bgColor}>
          <TripStats bookings={bookings} appSettings={settings} />
        </Modal>
        
        <Modal isOpen={showBookingModal} onClose={closeBookingModal} title={editingBooking ? 'Modify Entry' : 'New Reservation'} variant="dark" customBgColor={settings.ui.bgColor}>
          <BookingModal 
            isOpen={showBookingModal} 
            onClose={closeBookingModal} 
            onSave={handleSaveBooking} 
            onDelete={handleDeleteBooking} 
            initialDate={selectedDate} 
            existingBooking={editingBooking}
            bookings={bookings} 
            appSettings={settings}
          />
        </Modal>
        
        <Modal isOpen={showViewModal} onClose={() => setShowViewModal(false)} title="Booking Information" variant="dark" customBgColor={settings.ui.bgColor}>
          {editingBooking && <ViewBookingModal booking={editingBooking} appSettings={settings} />}
        </Modal>
      </div>
    </>
  );
};

export default App;