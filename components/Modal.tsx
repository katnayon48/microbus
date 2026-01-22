
import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="bg-slate-50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] border border-white/40 animate-in zoom-in-95 duration-200"
      >
        <div className="px-8 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex flex-col">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{title}</h3>
            <div className="w-12 h-1 bg-indigo-600 rounded-full mt-1"></div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-slate-200 rounded-full transition-all text-slate-400 hover:text-slate-900 active:scale-90"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-8 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
