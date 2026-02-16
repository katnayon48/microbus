
import React, { useState } from 'react';
import { ShieldCheck, Lock, Fingerprint, Info, CheckCircle2, ShieldAlert } from 'lucide-react';
import { AppSettings, UserRole } from '../types';

interface LoginModalProps {
  onLogin: (role: UserRole) => void;
  onClose: () => void;
  currentSettings: AppSettings;
}

const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onClose, currentSettings }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const themeColor = currentSettings?.ui?.themeColor || "#10b981";
  const bgColor = currentSettings?.ui?.bgColor || "#062c1e";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    setTimeout(() => {
      if (pin === currentSettings.security.masterPin) {
        onLogin('master');
        onClose();
      } else if (pin === currentSettings.security.adminPin) {
        onLogin('admin');
        onClose();
      } else {
        setError(true);
        setPin('');
        setIsSubmitting(false);
      }
    }, 600);
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-5 py-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-full flex items-center justify-between px-4 py-2 bg-black/40 rounded-full border border-white/5 mb-1">
        <div className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: themeColor, boxShadow: `0 0 8px ${themeColor}cc` }}
          ></div>
          <span className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: `${themeColor}cc` }}>Secure Session</span>
        </div>
        <div className="flex items-center gap-1.5 opacity-40">
          <Fingerprint size={10} className="text-slate-400" />
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">SSL 256</span>
        </div>
      </div>

      <div className="relative group">
        <div 
          className="w-16 h-16 bg-white/[0.03] rounded-2xl flex items-center justify-center shadow-[inset_0_0_15px_rgba(255,255,255,0.05)] border group-hover:scale-105 transition-transform duration-500"
          style={{ borderColor: `${themeColor}44` }}
        >
          <ShieldCheck size={32} strokeWidth={1.5} style={{ color: themeColor }} />
        </div>
        <div 
          className="absolute -bottom-1 -right-1 w-7 h-7 border-2 rounded-lg flex items-center justify-center shadow-xl group-hover:rotate-12 transition-transform duration-500"
          style={{ backgroundColor: bgColor, borderColor: `${themeColor}66`, color: themeColor }}
        >
          <Lock size={12} />
        </div>
      </div>
      
      <div className="text-center space-y-1.5">
        <h4 className="text-lg font-black text-white uppercase tracking-tight leading-none">Terminal Access</h4>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] max-w-[180px] mx-auto leading-relaxed opacity-60">
          Enter Authorization Pin
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`w-full max-w-[220px] space-y-7 ${error ? 'animate-shake' : ''}`}>
        <div className="space-y-3">
          <div className="relative group flex flex-col items-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 z-10" style={{ backgroundColor: bgColor }}>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Pin Code</span>
            </div>
            <input
              type="password"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                setError(false);
                setPin(e.target.value.replace(/\D/g, ''));
              }}
              autoFocus
              className={`
                w-32 text-center text-2xl tracking-[0.5em] py-3 bg-black/40 text-white border-2 
                ${error ? 'border-rose-500/50 focus:border-rose-500 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'border-white/10'} 
                rounded-xl outline-none transition-all font-mono shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]
              `}
              style={!error ? { borderFocusColor: themeColor } : {}}
              placeholder="••••"
            />
            
            {error ? (
              <div className="absolute inset-x-0 -bottom-6 flex items-center justify-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                <ShieldAlert size={10} className="text-rose-500" />
                <p className="text-rose-500 text-[8px] font-black uppercase tracking-widest">Invalid Pin</p>
              </div>
            ) : (
              <div className="absolute inset-x-0 -bottom-6 flex items-center justify-center gap-1.5 opacity-30 group-focus-within:opacity-60 transition-opacity">
                <Info size={10} className="text-slate-400" />
                <p className="text-slate-400 text-[8px] font-bold uppercase tracking-widest">4-Digits Only</p>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={pin.length < 4 || isSubmitting}
          className={`
            w-full py-3 px-4 rounded-xl transition-all shadow-lg font-black uppercase tracking-[0.15em] text-[10px] flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-30 disabled:grayscale
          `}
          style={{ 
            backgroundColor: themeColor, 
            color: '#fff',
            boxShadow: `0 10px 25px ${themeColor}44` 
          }}
        >
          {isSubmitting ? (
            <>
              <div className="w-3 h-3 border-2 border-slate-400/30 border-t-white rounded-full animate-spin"></div>
              Verifying
            </>
          ) : (
            <>
              Verify & Enter
              <CheckCircle2 size={13} />
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default LoginModal;
