import React from 'react';
import { Check, Loader2, X } from 'lucide-react';
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

const EXTRACT_STEPS = ['قراءة الملف', 'استخراج النص', 'اكتشاف العنوان والفصول'];
const CONVERT_STEPS = ['تجهيز النص', 'مواءمة النطق مع الصوت', 'توليد الصوت', 'فتح الاستوديو'];

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
  chapters,
  onCancel,
}) => {
  if (!isOpen) return null;

  const steps = mode === 'extracting' ? EXTRACT_STEPS : CONVERT_STEPS;
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const activeStep = Math.min(steps.length - 1, Math.floor((pct / 100) * steps.length));
  const meta = [pageCount ? `${pageCount} صفحة` : '', fileSize || '', chapters && chapters.length > 1 ? `${chapters.length} فصول` : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/85 flex items-center justify-center p-4 font-body" dir="rtl">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="processing-title"
        className="w-full max-w-[480px] max-h-[calc(100dvh-32px)] overflow-y-auto bg-card border border-line rounded-[20px] p-6 sm:p-7 flex flex-col gap-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <h2 id="processing-title" className="font-display font-extrabold text-2xl text-white">
              {mode === 'extracting' ? 'جاري قراءة كتابك' : 'جاري تجهيز الصوت'}
            </h2>
            <p className="text-slate-400 text-sm truncate">
              {fileName}
              {meta && ` · ${meta}`}
            </p>
          </div>
          <button type="button" onClick={onCancel} aria-label="إلغاء" className="w-11 h-11 shrink-0 rounded-full text-slate-400 hover:text-white hover:bg-raised flex items-center justify-center cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <ol className="flex flex-col gap-2" aria-label="مراحل التجهيز">
          {steps.map((step, i) => {
            const done = i < activeStep;
            const running = i === activeStep;
            return (
              <li key={step} className="flex items-center gap-3 min-h-12 px-4 rounded-xl bg-ink/60">
                {done ? (
                  <Check className="w-5 h-5 text-accent shrink-0" aria-hidden="true" />
                ) : running ? (
                  <Loader2 className="w-5 h-5 text-brand-soft animate-spin shrink-0" aria-hidden="true" />
                ) : (
                  <span className="w-5 h-5 rounded-full border-2 border-slate-700 shrink-0" aria-hidden="true" />
                )}
                <span className={done || running ? 'text-white' : 'text-slate-500'}>{step}</span>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col gap-2" role="status" aria-live="polite">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-300 truncate">{currentStatusText || steps[activeStep]}</span>
            <span className="text-white font-semibold tabular-nums">{pct}%</span>
          </div>
          <div className="relative h-1.5 rounded-full bg-line overflow-hidden">
            <div className="absolute top-0 right-0 h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {mode === 'converting' && voiceName && (
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="w-9 h-9 rounded-full bg-brand-deep text-indigo-200 flex items-center justify-center font-display font-extrabold shrink-0">
              {voiceName.charAt(0)}
            </span>
            <span>
              بصوت <strong className="text-white font-semibold">{voiceName.split(' - ')[0]}</strong>
              {dialectName && ` · ${dialectName}`}
            </span>
          </div>
        )}

        <button type="button" onClick={onCancel} className="self-start min-h-11 px-4 rounded-[10px] border border-line-strong text-slate-300 hover:text-white hover:bg-raised cursor-pointer">
          إلغاء
        </button>
      </div>
    </div>
  );
};
