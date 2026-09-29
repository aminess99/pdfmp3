import React from 'react';
import { LogIn, Sparkles, BookOpen, CheckCircle, ShieldCheck, X } from 'lucide-react';

interface BookUploadAuthPromptProps {
  isOpen: boolean;
  bookTitle: string;
  pagesCount: number;
  onLogin: () => void;
  onRegister: () => void;
  onClose: () => void;
}

export const BookUploadAuthPrompt: React.FC<BookUploadAuthPromptProps> = ({
  isOpen,
  bookTitle,
  pagesCount,
  onLogin,
  onRegister,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in" dir="rtl">
      <div className="relative w-full max-w-lg bg-[#0e1526] rounded-3xl border border-blue-500/40 shadow-2xl p-6 sm:p-8 text-white space-y-6 overflow-hidden">
        
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Book icon badge */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              تم استخراج وقراءة الكتاب بنجاح ✨
            </span>
            <h3 className="text-lg sm:text-xl font-black text-white font-['Tajawal'] mt-1 truncate max-w-xs">
              {bookTitle || 'كتابك الصوتي'}
            </h3>
          </div>
        </div>

        {/* Status Callout Card */}
        <div className="bg-[#131d33] border border-blue-900/50 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>عدد الصفحات المستخرجة:</span>
            <span className="font-bold text-white font-mono">{pagesCount} صفحة</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>جودة الإلقاء الصوتي:</span>
            <span className="text-cyan-400 font-bold">استوديو فائق النقاء (Fish Audio)</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>المكتبة السحابية:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> جاهزة للمزامنة
            </span>
          </div>
        </div>

        {/* Pitch / Message */}
        <div className="text-right space-y-2">
          <h4 className="text-sm font-bold text-slate-200">
            سجّل دخولك الآن للدخول مباشرة إلى استوديو الاستماع:
          </h4>
          <ul className="text-xs text-slate-400 space-y-1.5">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>شاشة استوديو موحدة وفاخرة بدون الحاجة لأي تمرير</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>متابعة حية للنص وتظليل الجمل المقروءة ومؤقت النوم</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>حفظ تقدمك وتحميل الكتاب بصيغة MP3 في أي وقت</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={onLogin}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول / إنشاء حساب مجاني للبدء</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            المتابعة كزائر مؤقتاً
          </button>
        </div>

      </div>
    </div>
  );
};
