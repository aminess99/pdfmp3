import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Volume2, 
  Globe, 
  ShieldCheck, 
  Sliders, 
  Moon, 
  Bell, 
  Download, 
  Check, 
  Sparkles,
  Zap
} from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { name: string; email: string };
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const { lang, setLang } = useLanguage();
  const [defaultSpeed, setDefaultSpeed] = useState<string>(() => localStorage.getItem('app_default_speed') || '1.0');
  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(() => localStorage.getItem('app_auto_play_next') !== 'false');
  const [downloadQuality, setDownloadQuality] = useState<'standard' | 'hd'>(() => (localStorage.getItem('app_download_quality') as any) || 'hd');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('app_default_speed', defaultSpeed);
    localStorage.setItem('app_auto_play_next', autoPlayNext.toString());
    localStorage.setItem('app_download_quality', downloadQuality);
    
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-['Cairo',sans-serif]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="relative w-full max-w-lg bg-[#0c1220] border border-blue-500/40 rounded-3xl shadow-2xl overflow-hidden text-white space-y-0">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-950 via-indigo-950 to-blue-950 border-b border-blue-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-cyan-400 flex items-center justify-center font-bold shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white font-['Tajawal']">
                {lang === 'ar' ? 'إعدادات المشترك والتطبيق' : 'Account & App Settings'}
              </h3>
              <p className="text-xs text-slate-300">
                {lang === 'ar' ? 'تخصيص تجربة الاستماع واللغة والتحميل' : 'Customize listening, language & audio quality'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {/* User Account Info Pill */}
          <div className="p-3.5 rounded-2xl bg-[#11192b] border border-blue-900/40 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-black text-white">{user.name}</div>
              <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'حساب موثق' : 'Verified'}</span>
            </span>
          </div>

          {/* Section 1: Language Preference */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>{lang === 'ar' ? 'لغة واجهة التطبيق' : 'App Interface Language'}</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLang('ar')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  lang === 'ar'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>العربية (Arabic)</span>
                {lang === 'ar' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
              </button>

              <button
                type="button"
                onClick={() => setLang('en')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  lang === 'en'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>English (إنجليزية)</span>
                {lang === 'en' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
            </div>
          </div>

          {/* Section 2: Audio Player Defaults */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="text-xs font-bold text-indigo-300 flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              <span>{lang === 'ar' ? 'تفضيلات المشغل الصوتي' : 'Audio Player Preferences'}</span>
            </div>

            {/* Default Speed */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400 block font-medium">
                {lang === 'ar' ? 'السرعة الافتراضية عند بدء تشغيل أي فصل:' : 'Default audio playback speed:'}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['0.8', '1.0', '1.25', '1.5'].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setDefaultSpeed(spd)}
                    className={`py-2 rounded-xl border text-xs font-bold font-mono transition-all cursor-pointer ${
                      defaultSpeed === spd
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-Play Next Chapter Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-200">
                  {lang === 'ar' ? 'الانتقال التلقائي للفصل التالي' : 'Auto-play next chapter'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {lang === 'ar' ? 'تشغيل الفصل اللاحق تلقائياً بفاصل 0 ثانية' : 'Seamless transition without pausing'}
                </div>
              </div>

              <input
                type="checkbox"
                checked={autoPlayNext}
                onChange={(e) => setAutoPlayNext(e.target.checked)}
                className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
              />
            </div>

            {/* Audio Download Quality */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400 block font-medium">
                {lang === 'ar' ? 'جودة تحميل ملفات MP3:' : 'MP3 Download Audio Quality:'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDownloadQuality('hd')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    downloadQuality === 'hd'
                      ? 'bg-blue-600/20 border-blue-500 text-cyan-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>استوديو HD (320 kbps)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDownloadQuality('standard')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    downloadQuality === 'standard'
                      ? 'bg-blue-600/20 border-blue-500 text-cyan-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>قياسي مدمج (128 kbps)</span>
                </button>
              </div>
            </div>

          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>{lang === 'ar' ? 'تم حفظ التفضيلات بنجاح!' : 'Settings Saved Successfully!'}</span>
                </>
              ) : (
                <span>{lang === 'ar' ? 'حفظ التفضيلات' : 'Save Preferences'}</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
