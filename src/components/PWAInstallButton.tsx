import React, { useState } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';
import { usePWAInstall } from '../lib/usePWAInstall';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Hide if already running in standalone PWA mode
  if (isInstalled) {
    return null;
  }

  // Android / Chrome / Desktop PWA Flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition duration-200 shadow-sm ${className}`}
        title="تثبيت التطبيق على جهازك"
      >
        <Download className="w-3.5 h-3.5 text-indigo-400 animate-bounce" />
        <span>تثبيت التطبيق</span>
      </button>
    );
  }

  // iOS Safari Flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition duration-200 ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
          <span>تثبيت على iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-right">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">تثبيت التطبيق على iPhone</h3>
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-sm text-slate-300 mb-6">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">1</span>
                  <p>اضغط على زر **مشاركة (Share)** في شريط أدوات متصفح Safari السفلي.</p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">2</span>
                  <p>مرر للأسفل واضغط على **إضافة إلى الشاشة الرئيسية (Add to Home Screen)**.</p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">3</span>
                  <p>اضغط على **إضافة (Add)** في الزاوية العلوية ليظهر التطبيق في شاشتك الرئيسية فوراً!</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white text-sm transition"
              >
                فهمت ذلك
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
