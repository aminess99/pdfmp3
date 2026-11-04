import React, { useEffect, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { BookChapter } from '../types';
import { chaptersAr, elapsedAr, pagesAr } from '../lib/arabicPlural';
import { tr, DIR } from '../lib/i18n';

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

const EXTRACT_STEPS = [tr('فتح الملف', 'Opening the file'), tr('قراءة الصفحات', 'Reading the pages'), tr('تنقية النص وترتيب الفصول', 'Cleaning the text and ordering the chapters'), tr('تجهيز الاستماع', 'Getting the listening ready')];

// Which step the reader is really on, from what it says it is doing
function extractStepOf(status: string, pct: number): number {
  if (/تنقية|الفصول|Cleaning|chapters/i.test(status)) return 2;
  if (/الصفحات|المسح|OCR|ePub|pages|scan/i.test(status)) return 1;
  if (pct >= 95) return 3;
  return pct > 8 ? 1 : 0;
}

const CONVERT_STEPS = [tr('تجهيز النص', 'Preparing the text'), tr('مواءمة النطق مع الصوت', 'Matching pronunciation to the voice'), tr('توليد الصوت', 'Generating audio'), tr('فتح الاستوديو', 'Opening the studio')];

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
  // Time since this window opened, so a long read never looks frozen
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isOpen) return;
    setElapsed(0);
    const t0 = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [isOpen, mode]);
  if (!isOpen) return null;

  const steps = mode === 'extracting' ? EXTRACT_STEPS : CONVERT_STEPS;
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const activeStep = mode === 'extracting'
    ? extractStepOf(currentStatusText || '', pct)
    : Math.min(steps.length - 1, Math.floor((pct / 100) * steps.length));
  const scanned = /مصوّر|المسح|OCR|scan/i.test(currentStatusText || '');
  const reassurance = elapsed >= 90
    ? tr('ما زلنا نعمل على كتابك، الكتب الكبيرة تحتاج وقتاً أطول. لا تغلق الصفحة.', 'Still working on your book; big books take longer. Keep this page open.')
    : elapsed >= 30 && scanned
      ? tr('الكتب المصوّرة تُقرأ صفحةً صفحة بالذكاء الاصطناعي، لذلك تأخذ وقتاً أطول قليلاً.', 'Scanned books are read page by page with AI, so they take a little longer.')
      : '';
  const meta = [pageCount ? pagesAr(pageCount) : '', fileSize || '', chapters && chapters.length > 1 ? chaptersAr(chapters.length) : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/85 flex items-center justify-center p-4 font-body" dir={DIR}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="processing-title"
        className="w-full max-w-[480px] max-h-[calc(100dvh-32px)] overflow-y-auto bg-card border border-line rounded-[20px] p-6 sm:p-7 flex flex-col gap-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <h2 id="processing-title" className="font-display font-extrabold text-2xl text-white">
              {mode === 'extracting' ? tr("جاري قراءة كتابك", "Reading your book") : tr("جاري تجهيز الصوت", "Preparing the audio")}
            </h2>
            <p className="text-slate-400 text-sm truncate">
              {fileName}
              {meta && ` · ${meta}`}
            </p>
          </div>
          <button type="button" onClick={onCancel} aria-label={tr("إلغاء", "Cancel")} className="w-11 h-11 shrink-0 rounded-full text-slate-400 hover:text-white hover:bg-raised flex items-center justify-center cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <ol className="flex flex-col gap-2" aria-label={tr("مراحل التجهيز", "Progress steps")}>
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
                <span className="flex flex-col min-w-0">
                  <span className={done || running ? 'text-white' : 'text-slate-500'}>{step}</span>
                  {running && currentStatusText && <span className="text-[12px] text-slate-400 truncate">{currentStatusText}</span>}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col gap-2" role="status" aria-live="polite">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400 tabular-nums">{tr('مضى', 'Elapsed')} {elapsedAr(elapsed)}</span>
            <span className="text-white font-semibold tabular-nums">{pct}%</span>
          </div>
          <div className="relative h-1.5 rounded-full bg-line overflow-hidden">
            <div className="absolute top-0 start-0 h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {reassurance && <p className="text-[13px] text-slate-400 leading-relaxed">{reassurance}</p>}

        {mode === 'converting' && voiceName && (
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="w-9 h-9 rounded-full bg-brand-deep text-indigo-200 flex items-center justify-center font-display font-extrabold shrink-0">
              {voiceName.charAt(0)}
            </span>
            <span>
              {tr('بصوت', 'Voice:')} <strong className="text-white font-semibold">{voiceName}</strong>
              {dialectName && ` · ${dialectName}`}
            </span>
          </div>
        )}

        <button type="button" onClick={onCancel} className="self-start min-h-11 px-4 rounded-[10px] border border-line-strong text-slate-300 hover:text-white hover:bg-raised cursor-pointer">
          {tr("إلغاء", "Cancel")}
        </button>
      </div>
    </div>
  );
};
