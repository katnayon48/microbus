
import React, { useState } from 'react';
import { ADMIN_PIN } from '../constants';
import { ShieldCheck } from 'lucide-react';

interface LoginModalProps {
  onLogin: (success: boolean) => void;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onLogin, onClose }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      onLogin(true);
      onClose();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-4">
      <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-2">
        <ShieldCheck size={32} />
      </div>
      <div className="text-center">
        <h4 className="text-xl font-bold text-slate-800">Admin Login</h4>
        <p className="text-sm text-slate-500 mt-1">Enter PIN to access admin dashboard</p>
      </div>
      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <div>
          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              setError(false);
              setPin(e.target.value.replace(/\D/g, ''));
            }}
            autoFocus
            className={`w-full text-center text-3xl tracking-[1em] py-3 bg-white text-slate-900 border ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 focus:ring-indigo-500'} rounded-xl outline-none focus:ring-2 transition-all font-mono`}
            placeholder="••••"
          />
          {error && <p className="text-red-500 text-xs mt-2 text-center font-medium">Invalid PIN. Please try again.</p>}
        </div>
        <button
          type="submit"
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-sm active:scale-[0.98]"
        >
          Verify Identity
        </button>
      </form>
    </div>
  );
};

export default LoginModal;
