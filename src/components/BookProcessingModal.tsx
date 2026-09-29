import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  Wand2,
  Layers,
  Volume2,
  CheckCircle2,
  Clock,
  X,
  BookOpen,
  Eye,
  Radio,
  Quote,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { BookChapter } from '../types';

interface BookProcessingModalProps {
  isOpen: boolean;
  mode: 'extracting' | 'converting';
  fileName: string;
  fileSize?: string;
  pageCount?: number;
  progress: number;
  currentStatusText?: string;
  voiceName?: string;
  dialectName?: string;
  styleName?: string;
  previewSnippet?: string;
  chapters?: BookChapter[];
  activeChapterIndex?: number;
  onCancel: () => void;
}

const LITERARY_QUOTES = [
  {
    quote: 'أعزُّ مكانٍ في الدُّنى سَرجُ سابحٍ ... وخيرُ جليسٍ في الزمانِ كتابُ',
    author: 'أبو الطيب المتنبي',
    category: 'شعر عربي',
  },
  {
    quote: 'الكتب هي ثروة العالم المخزونة وأفضل إرث للأجيال والبلدان.',
    author: 'هنري ديفيد ثورو',
    category: 'فلسفة القراءة',
  },
  {
    quote: 'القراءة في الكتب الصوتية تحول أوقات التنقل والانتظار إلى كنز فكري لا ينضب.',
    author: 'نصيحة استماع',
    category: 'تطوير الذات',
  },
  {
    quote: 'من لم يذق مرارة التعلم ساعة، تجرع ذل الجهل طول حياته.',
    author: 'الإمام الشافعي',
    category: 'حكمة مأثورة',
  },
  {
    quote: 'الاستماع بتركيز إلى النصوص المتقنة ينشط مناطق التخيل البصري في الدماغ مثل القراءة المباشرة.',
    author: 'دراسة في علم الأعصاب الإدراكي',
    category: 'حقيقة علمية',
  },
  {
    quote: 'الكتاب الصوتي هو رفيق السفر المثالي، يُعيد إحياء تقليد الحكايات الصوتية التراثية بنقاء رقمي.',
    author: 'فريق PDFtoAudio',
    category: 'تجربة صوتية',
  },
];

export const BookProcessingModal: React.FC<BookProcessingModalProps> = ({
  isOpen,
  mode,
  fileName,
  fileSize,
  pageCount,
  progress,
  currentStatusText,
  voiceName,
  dialectName,
  styleName,
  previewSnippet,
  chapters,
  activeChapterIndex = 0,
  onCancel,
}) => {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Rotating quotes timer
  useEffect(() => {
    if (!isOpen) {
      setElapsedSeconds(0);
      return;
    }

    const quoteTimer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % LITERARY_QUOTES.length);
    }, 4500);

    const secondsTimer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(quoteTimer);
      clearInterval(secondsTimer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate remaining estimated time
  const estimatedTotal = mode === 'extracting' ? 18 : 25;
  const remainingSeconds = Math.max(1, Math.round(estimatedTotal * ((100 - progress) / 100)));

  // Stages configuration based on mode
  const extractionStages = [
    {
      id: 1,
      title: 'تفكيك المستند',
      desc: 'قراءة طبقات الـ PDF والصفحات',
      icon: FileText,
      activeThreshold: 0,
      completedThreshold: 25,
    },
    {
      id: 2,
      title: 'التعرف الضوئي البصري',
      desc: 'Gemini 3.8 Flash Vision OCR للنصوص والصور',
      icon: Eye,
      activeThreshold: 25,
      completedThreshold: 60,
    },
    {
      id: 3,
      title: 'تصفية الشوائب',
      desc: 'تجريد الهوامش، أرقام الصفحات، والترويسات',
      icon: Wand2,
      activeThreshold: 60,
      completedThreshold: 85,
    },
    {
      id: 4,
      title: 'فهرسة الفصول',
      desc: 'الكشف التلقائي عن بنية وأبواب الكتاب',
      icon: Layers,
      activeThreshold: 85,
      completedThreshold: 98,
    },
  ];

  const conversionStages = [
    {
      id: 1,
      title: 'الضبط والتشكيل',
      desc: 'تهيئة النص العربي وقواعد النطق الصوتي',
      icon: Sparkles,
      activeThreshold: 0,
      completedThreshold: 20,
    },
    {
      id: 2,
      title: 'هندسة الفصول',
      desc: 'تقسيم المسارات الصوتية وحساب الفترات',
      icon: Layers,
      activeThreshold: 20,
      completedThreshold: 45,
    },
    {
      id: 3,
      title: 'توليد النبرة البشرية',
      desc: `${voiceName || 'المحرك الصوتي'} (${dialectName || 'الفصحى'})`,
      icon: Volume2,
      activeThreshold: 45,
      completedThreshold: 80,
    },
    {
      id: 4,
      title: 'الترميز والتصدير',
      desc: 'بناء ملفات MP3 فائقة النقاء وتخزينها بالمكتبة',
      icon: Radio,
      activeThreshold: 80,
      completedThreshold: 98,
    },
  ];

  const currentStages = mode === 'extracting' ? extractionStages : conversionStages;
  const activeQuote = LITERARY_QUOTES[quoteIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0f172a] to-[#090d16] border border-blue-500/30 rounded-3xl shadow-2xl p-5 sm:p-7 text-white space-y-5 overflow-hidden ring-1 ring-blue-500/20 max-h-[92vh] flex flex-col justify-between">
        
        {/* Background Ambient Glow */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-0" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -z-0" />

        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              {mode === 'extracting' ? (
                <BookOpen className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 font-['Tajawal']">
                <span>
                  {mode === 'extracting'
                    ? 'جاري فحص واستخراج محتوى الكتاب'
                    : 'جاري إنتاج الكتاب الصوتي الفائق'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                  {mode === 'extracting' ? 'Gemini 3.8 Vision OCR' : 'AI Speech Engine'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {currentStatusText || (mode === 'extracting' ? 'يتم قراءة النصوص والصور بدقة...' : 'يتم توليد الترددات الصوتية...')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer"
            title="إلغاء المعالجة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Book Metadata Snapshot */}
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs relative z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-950 border border-blue-700/50 flex items-center justify-center text-blue-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <p className="font-bold text-white truncate max-w-xs sm:max-w-sm">
                {fileName || 'كتاب صوتي'}
              </p>
              <p className="text-[11px] text-slate-400">
                {fileSize ? `الحجم: ${fileSize}` : ''} {pageCount ? `• ${pageCount} صفحة` : ''}
              </p>
            </div>
          </div>

          {mode === 'converting' && voiceName && (
            <div className="flex items-center gap-2 bg-[#0a0f1d] px-3 py-1.5 rounded-xl border border-slate-800 shrink-0">
              <span className="text-[11px] text-slate-400">الصوت:</span>
              <span className="font-bold text-blue-300 text-[11px]">{voiceName}</span>
              {dialectName && (
                <span className="text-[10px] text-indigo-400 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">
                  {dialectName}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Dynamic 4-Stage Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 relative z-10">
          {currentStages.map((stage) => {
            const isCompleted = progress >= stage.completedThreshold;
            const isActive = progress >= stage.activeThreshold && !isCompleted;
            const Icon = stage.icon;

            return (
              <div
                key={stage.id}
                className={`p-2.5 sm:p-3 rounded-2xl border transition-all text-right space-y-1.5 ${
                  isCompleted
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-200'
                    : isActive
                    ? 'bg-blue-950/40 border-blue-400 text-white shadow-lg shadow-blue-900/30 ring-1 ring-blue-400/50'
                    : 'bg-slate-900/30 border-slate-800/60 text-slate-500 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isCompleted
                        ? 'bg-emerald-500 text-slate-950'
                        : isActive
                        ? 'bg-blue-600 text-white animate-pulse'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : stage.id}
                  </div>
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isCompleted
                        ? 'text-emerald-400'
                        : isActive
                        ? 'text-blue-400 animate-spin-slow'
                        : 'text-slate-600'
                    }`}
                  />
                </div>
                <div>
                  <h4 className="text-xs font-bold truncate">{stage.title}</h4>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{stage.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Audio Frequency Spectrum / Animated Visualizer */}
        <div className="p-3.5 rounded-2xl bg-[#070b14] border border-blue-900/40 space-y-2.5 relative z-10 overflow-hidden">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>
                {mode === 'extracting' ? 'موجات المسح والتعرف الضوئي:' : 'توليد النبرة والترددات الصوتية:'}
              </span>
            </span>
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>مستغرق: {elapsedSeconds} ثانية</span>
              </span>
              <span>•</span>
              <span className="text-blue-300 font-semibold">
                متبقي تقديري: ~{remainingSeconds} ثانية
              </span>
            </div>
          </div>

          {/* Dancing Waveform Bars */}
          <div className="flex items-end justify-center gap-1 h-12 py-1 px-2 overflow-hidden">
            {Array.from({ length: 32 }).map((_, i) => {
              // Create dynamic wave height simulation
              const heightMultiplier = Math.sin((i / 32) * Math.PI) * 0.8 + 0.2;
              const randomFactor = ((i * 17 + elapsedSeconds * 5) % 10) / 10;
              const barHeight = Math.max(15, Math.min(100, (heightMultiplier * 70 + randomFactor * 30)));

              return (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-blue-600 via-indigo-500 to-purple-400 rounded-full transition-all duration-150"
                  style={{
                    height: `${barHeight}%`,
                    opacity: 0.4 + (heightMultiplier * 0.6),
                  }}
                />
              );
            })}
          </div>

          {/* Main Progress Bar & Percentage */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-blue-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>التقدم الإجمالي:</span>
              </span>
              <span className="text-white font-mono text-sm bg-blue-950/80 px-2 py-0.5 rounded-lg border border-blue-500/30">
                {Math.round(progress)}%
              </span>
            </div>

            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-300 relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-shimmer" />
              </div>
            </div>
          </div>
        </div>

        {/* Live Snippet Preview (if available) */}
        {previewSnippet && (
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-right space-y-1 relative z-10">
            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <Eye className="w-3 h-3 text-emerald-400" />
              <span>مقتطف من النص الجاري معالجته الآن:</span>
            </span>
            <p className="text-xs text-slate-300 font-['Tajawal'] line-clamp-2 leading-relaxed italic">
              "...{previewSnippet.slice(0, 140)}..."
            </p>
          </div>
        )}

        {/* Multi-Chapter Live Matrix (if chapters exist) */}
        {chapters && chapters.length > 1 && (
          <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-900/40 text-right space-y-1.5 relative z-10">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
              <span className="flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>حالة الفصول ({chapters.length} فصول):</span>
              </span>
              <span className="text-[11px] text-slate-400">
                الفصل الجاري: {activeChapterIndex + 1} من {chapters.length}
              </span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {chapters.map((chap, idx) => {
                const isChapDone = idx < activeChapterIndex || (idx === activeChapterIndex && progress >= 95);
                const isChapActive = idx === activeChapterIndex && progress < 95;
                return (
                  <div
                    key={chap.id}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap border shrink-0 transition-all ${
                      isChapDone
                        ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                        : isChapActive
                        ? 'bg-indigo-600/30 border-indigo-400 text-white animate-pulse'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    <span>فصل {idx + 1}: </span>
                    <span className="truncate max-w-[90px] inline-block align-bottom">{chap.title}</span>
                    <span className="mr-1">{isChapDone ? '✓' : isChapActive ? '⏳' : '•'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Inspiring Literary Quotes Box */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/40 to-indigo-950/30 border border-blue-900/30 relative z-10 transition-all duration-500">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shrink-0">
              <Quote className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-right">
              <p className="text-xs sm:text-sm text-slate-200 font-medium font-['Tajawal'] leading-relaxed animate-in fade-in duration-300">
                "{activeQuote.quote}"
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="text-blue-300 font-bold">— {activeQuote.author}</span>
                <span>•</span>
                <span className="text-slate-500">{activeQuote.category}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs relative z-10">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>معالجة آمنة ومشفرة بالكامل دون الاحتفاظ بملفاتك الأصلية</span>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-all cursor-pointer font-bold"
          >
            إلغاء المعالجة
          </button>
        </div>

      </div>
    </div>
  );
};
