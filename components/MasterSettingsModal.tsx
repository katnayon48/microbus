
import React, { useState } from 'react';
import { 
  Banknote, Save, Lock, Type, Check, X, 
  ShieldAlert, Download, Palette, AlertTriangle, 
  Database, Trash2, Plus, Globe, Settings2, FileJson, 
  Sliders, Info, Layout, Clock, FileText, Monitor, ShieldCheck, 
  Hash, Zap, Activity, UserCog, Landmark, HardDrive, ListChecks, MessageSquare, PenTool, Key
} from 'lucide-react';
import { AppSettings, Booking } from '../types';

interface MasterSettingsModalProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  bookings: Booking[];
  onWipeData: () => void;
}

const MasterSettingsModal: React.FC<MasterSettingsModalProps> = ({ 
  settings, 
  onSave, 
  bookings, 
  onWipeData 
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'fares' | 'branding' | 'ui' | 'security' | 'system'>('fares');
  
  // States for secure deletion
  const [showDeleteAuth, setShowDeleteAuth] = useState(false);
  const [deleteInputPin, setDeleteInputPin] = useState('');
  const [deletePinError, setDeletePinError] = useState(false);

  const handleUpdate = (category: keyof AppSettings, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] as any),
        [field]: value
      }
    }));
  };

  const handleFooterLineChange = (index: number, value: string) => {
    const newLines = [...(formData.branding.footerLines || [])];
    newLines[index] = value;
    handleUpdate('branding', 'footerLines', newLines);
  };

  const addFooterLine = () => {
    const newLines = [...(formData.branding.footerLines || []), ""];
    handleUpdate('branding', 'footerLines', newLines);
  };

  const removeFooterLine = (index: number) => {
    const newLines = (formData.branding.footerLines || []).filter((_, i) => i !== index);
    handleUpdate('branding', 'footerLines', newLines);
  };

  const exportBackup = () => {
    const backupData = {
      settings: formData,
      bookings,
      exportDate: new Date().toISOString(),
      version: formData.branding.systemVersion || "4.2.0"
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `microbus_pro_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleSecureWipeInitiate = () => {
    if (deleteInputPin === "4848") {
      if (window.confirm("CRITICAL WARNING: This action will permanently delete all records. Are you absolutely sure?")) {
        onWipeData();
        setShowDeleteAuth(false);
        setDeleteInputPin('');
      }
    } else {
      setDeletePinError(true);
      setTimeout(() => setDeletePinError(false), 2000);
    }
  };

  const tabs = [
    { id: 'fares', label: 'Fare', icon: Banknote },
    { id: 'branding', label: 'Identity', icon: Globe },
    { id: 'ui', label: 'Visuals', icon: Palette },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'system', label: 'Operations', icon: Settings2 },
  ] as const;

  const inputClasses = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-600 shadow-inner";
  const labelClasses = "text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 block";
  const cardClasses = "bg-white/[0.03] border border-white/10 rounded-2xl p-4 md:p-6 shadow-xl space-y-4 mb-4";

  return (
    <div className="flex flex-col h-full max-h-[85vh] animate-in fade-in duration-500 overflow-hidden relative">
      <div className="flex items-center gap-1 md:gap-2 overflow-x-auto custom-scrollbar pb-3 border-b border-white/10 shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black uppercase text-[9px] md:text-[10px] tracking-widest transition-all whitespace-nowrap border ${activeTab === tab.id ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white hover:bg-white/10'}`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar mt-4 pr-1 pb-32">
        <div className="animate-in slide-in-from-bottom-2 duration-300">
          
          {activeTab === 'fares' && (
            <div className="space-y-4">
              <div className={cardClasses}>
                <h5 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Banknote size={16} /> Base Tariff Configuration
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClasses}>In-Garrison Full Day</label>
                    <input type="number" value={formData.fares.inGarrisonFull} onChange={e => handleUpdate('fares', 'inGarrisonFull', Number(e.target.value))} className={inputClasses} />
                  </div>
                  <div>
                    <label className={labelClasses}>In-Garrison Half Day</label>
                    <input type="number" value={formData.fares.inGarrisonHalf} onChange={e => handleUpdate('fares', 'inGarrisonHalf', Number(e.target.value))} className={inputClasses} />
                  </div>
                  <div>
                    <label className={labelClasses}>Out-Garrison Full Day</label>
                    <input type="number" value={formData.fares.outGarrisonFull} onChange={e => handleUpdate('fares', 'outGarrisonFull', Number(e.target.value))} className={inputClasses} />
                  </div>
                  <div>
                    <label className={labelClasses}>Out-Garrison Half Day</label>
                    <input type="number" value={formData.fares.outGarrisonHalf} onChange={e => handleUpdate('fares', 'outGarrisonHalf', Number(e.target.value))} className={inputClasses} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'branding' && (
            <div className="space-y-4">
              <div className={cardClasses}>
                <h5 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-6">System Identity</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-full">
                    <label className={labelClasses}>Main Application Title</label>
                    <input type="text" value={formData.branding.title} onChange={e => handleUpdate('branding', 'title', e.target.value)} className={inputClasses} />
                  </div>
                  <div className="col-span-full">
                    <label className={labelClasses}>Organization Subtitle</label>
                    <input type="text" value={formData.branding.subtitle} onChange={e => handleUpdate('branding', 'subtitle', e.target.value)} className={inputClasses} />
                  </div>
                </div>
              </div>

              <div className={cardClasses}>
                <div className="flex items-center justify-between mb-6">
                  <h5 className="text-[11px] font-black text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <ListChecks size={16} /> Footer Information Slides
                  </h5>
                  <button 
                    onClick={addFooterLine}
                    className="w-8 h-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center shadow-lg transition-all active:scale-90"
                    title="Add new footer line"
                  >
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>
                
                <div className="space-y-3">
                  {(formData.branding.footerLines || []).map((line, idx) => (
                    <div key={idx} className="flex gap-2 animate-in slide-in-from-right-2 duration-200">
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500">{idx + 1}</span>
                        <input 
                          type="text" 
                          value={line} 
                          onChange={e => handleFooterLineChange(idx, e.target.value)} 
                          className={`${inputClasses} pl-8`} 
                          placeholder="Enter footer text..."
                        />
                      </div>
                      <button 
                        onClick={() => removeFooterLine(idx)}
                        className="w-10 h-10 bg-rose-600/20 hover:bg-rose-600 text-rose-500 hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-90 shrink-0 border border-rose-500/20"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(formData.branding.footerLines || []).length === 0 && (
                    <div className="text-center py-4 text-slate-500 border-2 border-dashed border-white/5 rounded-2xl">
                      <p className="text-[10px] font-bold uppercase tracking-widest">No footer slides configured</p>
                    </div>
                  )}
                </div>
              </div>

              <div className={cardClasses}>
                <h5 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <PenTool size={16} /> PDF Signature Settings
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClasses}>Signature Label 1 (Driver)</label>
                    <input type="text" value={formData.branding.pdfSignatureLabel1} onChange={e => handleUpdate('branding', 'pdfSignatureLabel1', e.target.value)} className={inputClasses} placeholder="E.g. Driver" />
                  </div>
                  <div>
                    <label className={labelClasses}>Signature Label 2 (JCO/NCO)</label>
                    <input type="text" value={formData.branding.pdfSignatureLabel2} onChange={e => handleUpdate('branding', 'pdfSignatureLabel2', e.target.value)} className={inputClasses} placeholder="E.g. JCO/NCO" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ui' && (
            <div className="space-y-4">
              <div className={cardClasses}>
                <h5 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-8">Visual Aesthetics</h5>
                <div className="space-y-10 px-2">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>Watermark Transparency</span>
                      <span className="text-emerald-500">{Math.round(formData.ui.watermarkOpacity * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="0.5" step="0.01" value={formData.ui.watermarkOpacity} onChange={e => handleUpdate('ui', 'watermarkOpacity', Number(e.target.value))} className="w-full h-1.5 bg-black/60 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>Calendar Grid Visibility</span>
                      <span className="text-emerald-500">{Math.round(formData.ui.gridOpacity * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="0.3" step="0.01" value={formData.ui.gridOpacity} onChange={e => handleUpdate('ui', 'gridOpacity', Number(e.target.value))} className="w-full h-1.5 bg-black/60 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>Glassmorphism Blur</span>
                        <span className="text-emerald-500">{Math.round(formData.ui.glassIntensity * 100)}%</span>
                      </div>
                      <input type="range" min="0.1" max="1" step="0.1" value={formData.ui.glassIntensity} onChange={e => handleUpdate('ui', 'glassIntensity', Number(e.target.value))} className="w-full h-1.5 bg-black/60 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>Panel Corner Rounding</span>
                        <span className="text-emerald-500">{formData.ui.borderRadius}px</span>
                      </div>
                      <input type="range" min="0" max="40" step="2" value={formData.ui.borderRadius} onChange={e => handleUpdate('ui', 'borderRadius', Number(e.target.value))} className="w-full h-1.5 bg-black/60 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={cardClasses}>
                  <label className={labelClasses}>Primary System Theme Color</label>
                  <div className="flex gap-6 items-center pt-2">
                    <input type="color" value={formData.ui.themeColor} onChange={e => handleUpdate('ui', 'themeColor', e.target.value)} className="w-12 h-12 bg-transparent rounded-2xl cursor-pointer border-2 border-white/10" />
                    <div className="flex-1">
                      <input type="text" value={formData.ui.themeColor.toUpperCase()} onChange={e => handleUpdate('ui', 'themeColor', e.target.value)} className={`${inputClasses} font-mono tracking-widest text-center`} />
                    </div>
                  </div>
                </div>
                <div className={cardClasses}>
                  <label className={labelClasses}>Main Background Color</label>
                  <div className="flex gap-6 items-center pt-2">
                    <input type="color" value={formData.ui.bgColor} onChange={e => handleUpdate('ui', 'bgColor', e.target.value)} className="w-12 h-12 bg-transparent rounded-2xl cursor-pointer border-2 border-white/10" />
                    <div className="flex-1">
                      <input type="text" value={formData.ui.bgColor.toUpperCase()} onChange={e => handleUpdate('ui', 'bgColor', e.target.value)} className={`${inputClasses} font-mono tracking-widest text-center`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className={cardClasses}>
                <h5 className="text-[11px] font-black text-rose-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                  <ShieldCheck size={16} /> Encryption & Access Vault
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className={labelClasses}>Administrator Entry PIN</label>
                      <div className="relative">
                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input type="password" maxLength={4} value={formData.security.adminPin} onChange={e => handleUpdate('security', 'adminPin', e.target.value.replace(/\D/g, ''))} className={`${inputClasses} pl-12 tracking-[0.8em] font-mono`} placeholder="••••" />
                      </div>
                      <p className="text-[8px] font-bold text-slate-600 uppercase mt-2 ml-1">Daily operations access code</p>
                    </div>
                    <div>
                      <label className={labelClasses}>Master Control PIN</label>
                      <div className="relative">
                        <UserCog className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-500" size={14} />
                        <input type="password" maxLength={4} value={formData.security.masterPin} onChange={e => handleUpdate('security', 'masterPin', e.target.value.replace(/\D/g, ''))} className={`${inputClasses} pl-12 tracking-[0.8em] font-mono border-rose-500/20 focus:border-rose-500`} placeholder="••••" />
                      </div>
                      <p className="text-[8px] font-bold text-rose-500/40 uppercase mt-2 ml-1">Critical system settings code</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className={labelClasses}>Auto-Lock Timeout (Minutes)</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input type="number" value={formData.security.autoLockTimer} onChange={e => handleUpdate('security', 'autoLockTimer', Number(e.target.value))} className={`${inputClasses} pl-12`} />
                      </div>
                    </div>
                    <div className="pt-2 space-y-3">
                      <div className="space-y-3">
                        <button 
                          onClick={() => handleUpdate('security', 'maintenanceMode', !formData.security.maintenanceMode)}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${formData.security.maintenanceMode ? 'bg-amber-600/20 border-amber-500 shadow-xl' : 'bg-black/40 border-white/10 text-slate-500'}`}
                        >
                          <div className="flex items-center gap-3">
                            <ShieldAlert size={18} className={formData.security.maintenanceMode ? 'text-amber-500' : 'text-slate-600'} />
                            <span className="text-[10px] font-black uppercase tracking-widest">System Lockdown</span>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${formData.security.maintenanceMode ? 'bg-amber-500 border-amber-400' : 'border-slate-800'}`}>
                            {formData.security.maintenanceMode && <Check size={12} className="text-white" />}
                          </div>
                        </button>
                        
                        {formData.security.maintenanceMode && (
                          <div className="animate-in slide-in-from-top-2 duration-300">
                            <label className={labelClasses}>Custom Maintenance Message</label>
                            <div className="relative">
                              <MessageSquare className="absolute left-4 top-3 text-amber-500" size={14} />
                              <textarea 
                                value={formData.security.maintenanceMessage || ''} 
                                onChange={e => handleUpdate('security', 'maintenanceMessage', e.target.value)} 
                                className={`${inputClasses} pl-12 min-h-[80px] py-3 text-xs leading-relaxed`}
                                placeholder="E.g. System is currently being updated. Please check back later."
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={() => handleUpdate('security', 'maskPinInput', !formData.security.maskPinInput)}
                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${formData.security.maskPinInput ? 'bg-emerald-600/20 border-emerald-500 shadow-xl' : 'bg-black/40 border-white/10 text-slate-500'}`}
                      >
                        <div className="flex items-center gap-3">
                          <Monitor size={18} className={formData.security.maskPinInput ? 'text-emerald-500' : 'text-slate-600'} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Input Masking</span>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${formData.security.maskPinInput ? 'bg-emerald-500 border-amber-400' : 'border-slate-800'}`}>
                          {formData.security.maskPinInput && <Check size={12} className="text-white" />}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  onClick={exportBackup}
                  className="p-8 bg-blue-600/10 border-2 border-blue-500/20 rounded-[2rem] hover:bg-blue-600/20 hover:border-blue-500 transition-all text-left group flex flex-col items-center justify-center text-center gap-4"
                >
                  <div className="w-20 h-20 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                    <FileJson size={40} />
                  </div>
                  <div>
                    <p className="text-base font-black text-white uppercase tracking-tight">Generate Local Backup</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Snapshot of all database records</p>
                  </div>
                </button>
                <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col items-center justify-center text-center gap-4 shadow-xl">
                  <Activity size={48} className="text-emerald-500/30" />
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Operational Health</p>
                    <p className="text-xl font-black text-white mt-1">SYSTEM ONLINE</p>
                    <div className="flex items-center gap-2 mt-2 justify-center">
                       <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                       <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Real-time sync active</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-rose-950/20 rounded-[2.5rem] border-2 border-rose-900/40 space-y-8 shadow-2xl relative overflow-hidden">
                {/* Secure Wipe Overlay */}
                {showDeleteAuth && (
                  <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 space-y-6 animate-in fade-in duration-300">
                    <div className="w-16 h-16 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-2xl animate-pulse">
                      <Key size={32} />
                    </div>
                    <div className="text-center space-y-1">
                      <h4 className="text-lg font-black text-white uppercase tracking-tight">Security Verification</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Enter Deletion Authorization PIN</p>
                    </div>
                    
                    <div className={`space-y-4 w-full max-w-[200px] ${deletePinError ? 'animate-shake' : ''}`}>
                      <input 
                        type="password" 
                        maxLength={4} 
                        value={deleteInputPin} 
                        onChange={e => setDeleteInputPin(e.target.value.replace(/\D/g, ''))}
                        className={`w-full text-center text-3xl tracking-[0.6em] py-4 bg-white/5 border-2 rounded-2xl outline-none transition-all font-mono ${deletePinError ? 'border-rose-600 text-rose-600' : 'border-white/10 text-white focus:border-emerald-500'}`}
                        placeholder="••••"
                        autoFocus
                      />
                      {deletePinError && (
                        <p className="text-center text-[9px] font-black text-rose-500 uppercase animate-bounce">Access Denied: Invalid Pin</p>
                      )}
                    </div>
                    
                    <div className="flex gap-4 w-full max-w-[280px]">
                      <button 
                        onClick={() => { setShowDeleteAuth(false); setDeleteInputPin(''); }}
                        className="flex-1 py-3 bg-white/10 text-slate-300 rounded-xl font-black uppercase text-[10px] tracking-widest"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSecureWipeInitiate}
                        className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-rose-600 text-white rounded-2xl flex items-center justify-center border border-rose-400/30 shadow-2xl shrink-0">
                    <Trash2 size={32} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-black text-white uppercase tracking-tight">Factory State Reset</p>
                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-[0.2em] mt-1">This will permanently delete all {bookings.length} reservations</p>
                  </div>
                </div>
                <div className="p-4 bg-black/40 rounded-xl border border-rose-500/20 flex items-start gap-3">
                  <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                  <p className="text-[10px] font-medium text-rose-300 leading-relaxed uppercase">
                    Warning: A factory reset cannot be undone. All firebase records will be purged instantly. Authorization is required.
                  </p>
                </div>
                <button 
                  onClick={() => setShowDeleteAuth(true)}
                  className="w-full py-5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black uppercase text-[12px] tracking-[0.4em] transition-all active:scale-[0.98] shadow-2xl"
                >
                  DELETE ALL DATA
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 bg-gradient-to-t from-[#062c1e] via-[#062c1e] to-transparent shrink-0 z-40 pointer-events-none">
        <div className="flex justify-end pointer-events-auto">
          <button 
            onClick={() => onSave(formData)}
            className="px-14 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-xs tracking-[0.3em] shadow-[0_20px_50px_rgba(0,0,0,0.6)] active:scale-95 transition-all flex items-center gap-4 border border-emerald-400/30 ring-4 ring-black/20"
          >
            <Save size={20} />
            Update Entire System
          </button>
        </div>
      </div>
    </div>
  );
};

export default MasterSettingsModal;
