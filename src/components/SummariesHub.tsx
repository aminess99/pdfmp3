import React from 'react';
import { ChevronLeft, Clock } from 'lucide-react';
import { BOOK_SUMMARIES, SUMMARIES_HUB, UPCOMING_SUMMARIES, summaryPath } from '../data/summaries';
import { SummaryCover } from './SummaryPage';

// /ملخصات-كتب-صوتية: every published summary, plus what is coming next
export const SummariesHub: React.FC = () => (
  <section className="px-4 sm:px-6 py-10 sm:py-14" dir="rtl">
    <div className="max-w-[960px] mx-auto flex flex-col gap-10">
      <nav aria-label="مسار التنقل" className="flex items-center gap-1.5 text-sm text-slate-400">
        <a href="/" className="hover:text-white">الرئيسية</a>
        <ChevronLeft className="w-3.5 h-3.5" />
        <span className="text-slate-300">{SUMMARIES_HUB.h1}</span>
      </nav>

      <header className="flex flex-col gap-3 max-w-[680px]">
        <h1 className="font-display font-extrabold text-3xl sm:text-[44px] leading-tight text-white">{SUMMARIES_HUB.h1}</h1>
        <p className="text-slate-400 text-lg leading-[1.8]">{SUMMARIES_HUB.lead}</p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
        {BOOK_SUMMARIES.map((s) => (
          <a key={s.slug} href={summaryPath(s)} className="flex flex-col gap-2.5 group">
            <SummaryCover summary={s} />
            <span className="flex flex-col gap-1">
              <span className="text-white font-semibold group-hover:text-brand-soft">ملخص كتاب {s.bookTitle}</span>
              <span className="text-sm text-slate-400">{s.author}</span>
              <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{s.minutes} دقيقة · {s.category}</span>
            </span>
          </a>
        ))}
      </div>

      {UPCOMING_SUMMARIES.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display font-extrabold text-xl text-white">قريباً</h2>
          <ul className="flex flex-wrap gap-2">
            {UPCOMING_SUMMARIES.map((t) => (
              <li key={t} className="px-3 py-1.5 rounded-full border border-line text-sm text-slate-400">{t}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="p-6 rounded-[20px] border border-brand/40 bg-brand-deep/30 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <span className="flex flex-col gap-1">
          <strong className="text-white text-lg">تريد سماع كتاب غير موجود هنا؟</strong>
          <span className="text-slate-400 text-sm">ارفع ملف PDF واستمع إليه كاملاً، أو اطلب ملخصاً له من الاستوديو.</span>
        </span>
        <a href="/" className="min-h-12 px-6 rounded-xl bg-brand hover:bg-indigo-500 text-white font-bold flex items-center justify-center shrink-0">
          حوّل كتابك إلى صوت
        </a>
      </div>
    </div>
  </section>
);
