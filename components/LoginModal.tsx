import React, { useState, useEffect } from 'react';
import { ADMIN_PIN } from '../constants';
import { ShieldCheck, Lock, Fingerprint, Info, CheckCircle2, ShieldAlert } from 'lucide-react';

interface LoginModalProps {
  onLogin: (success: boolean) => void;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onClose }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Slight delay to simulate verification for a more "professional" feel
    setTimeout(() => {
      if (pin === ADMIN_PIN) {
        onLogin(true);
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
      {/* Top Security Status Bar */}
      <div className="w-full flex items-center justify-between px-4 py-2 bg-black/40 rounded-full border border-white/5 mb-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
          <span className="text-[8px] font-black text-emerald-500/80 uppercase tracking-[0.2em]">Secure Session</span>
        </div>
        <div className="flex items-center gap-1.5 opacity-40">
          <Fingerprint size={10} className="text-slate-400" />
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">SSL 256</span>
        </div>
      </div>

      {/* Main Header Icon Section */}
      <div className="relative group">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-600/10 to-teal-600/5 text-emerald-500 rounded-2xl flex items-center justify-center shadow-[inset_0_0_15px_rgba(16,185,129,0.1)] border border-emerald-500/20 group-hover:scale-105 transition-transform duration-500">
          <ShieldCheck size={32} strokeWidth={1.5} className="animate-logo-pulse" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#062c1e] border-2 border-emerald-500/30 rounded-lg flex items-center justify-center text-emerald-400 shadow-xl group-hover:rotate-12 transition-transform duration-500">
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
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#062c1e] px-2 z-10">
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
                ${error ? 'border-rose-500/50 focus:border-rose-500 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'border-white/10 focus:border-emerald-600'} 
                rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-mono shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]
              `}
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
            ${isSubmitting 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30'}
          `}
        >
          {isSubmitting ? (
            <>
              <div className="w-3 h-3 border-2 border-slate-400/30 border-t-emerald-400 rounded-full animate-spin"></div>
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
      
      <div className="pt-4 w-full border-t border-white/5 flex flex-col items-center gap-2 opacity-30">
        <p className="text-[7px] font-bold text-slate-500 uppercase tracking-[0.15em] text-center italic">
          Authorized Credentials Required
        </p>
      </div>
    </div>
  );
};

export default LoginModal;