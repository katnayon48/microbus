
import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  variant?: 'light' | 'dark';
  size?: string; // e.g., 'max-w-xl', 'max-w-4xl', 'max-w-full'
  customBgColor?: string;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  variant = 'light',
  size = 'max-w-xl',
  customBgColor
}) => {
  if (!isOpen) return null;

  const isDark = variant === 'dark';
  const isFull = size === 'max-w-full';
  
  const bgColor = customBgColor || (isDark ? '#062c1e' : '#f8fafc');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className={`
          ${isDark 
            ? 'border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.7)]' 
            : 'border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.15)]'} 
          rounded-2xl md:rounded-3xl w-full ${size} overflow-hidden flex flex-col ${isFull ? 'h-[96vh]' : 'max-h-[92vh]'} border animate-in zoom-in-95 duration-200
        `}
        style={{ backgroundColor: bgColor }}
      >
        <div className={`px-4 md:px-8 py-3 md:py-5 border-b flex items-center justify-between shrink-0 ${isDark ? 'border-white/5 bg-black/20' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex flex-col">
            <h3 className={`text-sm md:text-lg font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
            <div className={`w-8 md:w-12 h-1 rounded-full mt-1 ${isDark ? 'bg-emerald-500' : 'bg-indigo-600'}`}></div>
          </div>
          <button 
            onClick={onClose}
            className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full transition-all active:scale-90 ${isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-900'}`}
          >
            <X size={18} />
          </button>
        </div>
        <div className={`p-4 md:p-8 flex-1 overflow-y-auto custom-scrollbar ${isFull ? 'flex flex-col' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
