import React, { useEffect, useRef, useState } from 'react';
import { tr, DIR, HOME_PATH } from '../lib/i18n';
import { ChevronLeft, Clock, Loader2, Pause, Play } from 'lucide-react';
import { BOOK_SUMMARIES, BookSummary, SUMMARIES_HUB, SUMMARIES_HUB_PATH, UPCOMING_SUMMARIES, summaryAudioUrl, summaryName, summaryPath } from '../data/summaries';
import { SummaryCover } from './SummaryPage';
import { toast } from '../lib/toast';

const PREVIEW_SECONDS = 30;

// One shared player for the 30-second previews on the covers
function usePreview() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<{ slug: string; state: 'loading' | 'playing' } | null>(null);

  useEffect(() => () => audioRef.current?.pause(), []);

  const toggle = (s: BookSummary) => {
    const playingThis = current?.slug === s.slug;
    audioRef.current?.pause();
    audioRef.current = null;
    if (playingThis) {
      setCurrent(null);
      return;
    }
    const audio = new Audio(summaryAudioUrl(s));
    audioRef.current = audio;
    setCurrent({ slug: s.slug, state: 'loading' });
    audio.ontimeupdate = () => {
      if (audio.currentTime >= PREVIEW_SECONDS) {
        audio.pause();
        setCurrent(null);
      }
    };
    audio.onplaying = () => setCurrent({ slug: s.slug, state: 'playing' });
    audio.onended = () => setCurrent(null);
    audio.onerror = () => {
      setCurrent(null);
      toast(tr('النسخة الصوتية من هذا الملخص قيد التجهيز، ويمكنك قراءته الآن.', 'The audio for this summary is on its way; you can read it now.'), 'info');
    };
    audio.play().catch(() => setCurrent(null));
  };

  return { current, toggle };
}

// A cover card: the cover and title link to the summary, the round button plays a preview
const SummaryCard: React.FC<{ summary: BookSummary; preview: ReturnType<typeof usePreview> }> = ({ summary: s, preview }) => {
  const state = preview.current?.slug === s.slug ? preview.current.state : null;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="relative group">
        <a href={summaryPath(s)} aria-label={summaryName(s)} className="block transition-transform group-hover:-translate-y-1">
          <SummaryCover summary={s} />
        </a>
        <button
          type="button"
          onClick={() => preview.toggle(s)}
          aria-label={state ? tr(`إيقاف مقطع ${s.bookTitle}`, `Stop the ${s.bookTitle} preview`) : tr(`استمع إلى أول 30 ثانية من ملخص ${s.bookTitle}`, `Hear the first 30 seconds of the ${s.bookTitle} summary`)}
          className="absolute bottom-2.5 end-2.5 w-11 h-11 rounded-full bg-white text-ink shadow-lg shadow-black/40 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
        >
          {state === 'loading' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : state === 'playing' ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ms-0.5" />
          )}
        </button>
      </div>
      <a href={summaryPath(s)} className="flex flex-col gap-1 group">
        <span className="text-white font-semibold group-hover:text-brand-soft">{summaryName(s)}</span>
        <span className="text-sm text-slate-400">{s.author}</span>
        <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{s.minutes} {tr("دقيقة", "min")} · {s.category}</span>
      </a>
    </div>
  );
};

const CATEGORIES = Array.from(new Set(BOOK_SUMMARIES.map((s) => s.category)));

// /ملخصات-كتب-صوتية: every published summary by category, plus what is coming next
export const SummariesHub: React.FC = () => {
  const preview = usePreview();
  const [category, setCategory] = useState<string | null>(null);
  const shown = category ? BOOK_SUMMARIES.filter((s) => s.category === category) : BOOK_SUMMARIES;

  return (
    <section className="px-4 sm:px-6 py-10 sm:py-14" dir={DIR}>
      <div className="max-w-[960px] mx-auto flex flex-col gap-8">
        <nav aria-label={tr("مسار التنقل", "Breadcrumb")} className="flex items-center gap-1.5 text-sm text-slate-400">
          <a href={HOME_PATH} className="hover:text-white">{tr("الرئيسية", "Home")}</a>
          <ChevronLeft className="w-3.5 h-3.5 ltr:rotate-180" />
          <span className="text-slate-300">{SUMMARIES_HUB.h1}</span>
        </nav>

        <header className="flex flex-col gap-3 max-w-[680px]">
          <h1 className="font-display font-extrabold text-3xl sm:text-[44px] leading-tight text-white">{SUMMARIES_HUB.h1}</h1>
          <p className="text-slate-400 text-lg leading-[1.8]">{SUMMARIES_HUB.lead}</p>
        </header>

        {CATEGORIES.length > 1 && (
          <div role="group" aria-label={tr("التصنيفات", "Categories")} className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-1">
            {[null, ...CATEGORIES].map((c) => (
              <button
                key={c ?? 'all'}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={`shrink-0 min-h-10 px-4 rounded-full border text-sm cursor-pointer ${
                  category === c ? 'bg-brand border-brand text-white' : 'border-line text-slate-300 hover:text-white hover:border-line-strong'
                }`}
              >
                {c ?? `${tr("الكل", "All")} (${BOOK_SUMMARIES.length})`}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-5 gap-y-8">
          {shown.map((s) => (
            <SummaryCard key={s.slug} summary={s} preview={preview} />
          ))}
        </div>

        {UPCOMING_SUMMARIES.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display font-extrabold text-xl text-white">{tr("قريباً", "Coming soon")}</h2>
            <ul className="flex flex-wrap gap-2">
              {UPCOMING_SUMMARIES.map((t) => (
                <li key={t} className="px-3 py-1.5 rounded-full border border-line text-sm text-slate-400">{t}</li>
              ))}
            </ul>
          </section>
        )}

        <div className="p-6 rounded-[20px] border border-brand/40 bg-brand-deep/30 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <span className="flex flex-col gap-1">
            <strong className="text-white text-lg">{tr("تريد سماع كتاب غير موجود هنا؟", "Want to hear a book that isn’t here?")}</strong>
            <span className="text-slate-400 text-sm">{tr("ارفع ملف PDF واستمع إليه كاملاً، أو اطلب ملخصاً له من الاستوديو.", "Upload an Arabic PDF and listen to all of it, or ask the studio for a summary.")}</span>
          </span>
          <a href={HOME_PATH} className="min-h-12 px-6 rounded-xl bg-brand hover:bg-indigo-500 text-white font-bold flex items-center justify-center shrink-0">
            {tr("حوّل كتابك إلى صوت", "Turn your book into audio")}
          </a>
        </div>
      </div>
    </section>
  );
};

// Home page teaser: the latest summaries, with previews, and a link to the hub
export const SummariesShowcase: React.FC = () => {
  const preview = usePreview();
  return (
    <section id="summaries" className="border-t border-raised py-[72px] px-4 sm:px-6" dir={DIR}>
      <div className="max-w-[1160px] mx-auto flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-white">{tr("ملخصات كتب صوتية مجانية", "Free audio book summaries")}</h2>
            <p className="text-slate-400 text-lg">{tr("أهم أفكار أشهر الكتب في ربع ساعة، بصوت عربي فصيح. اضغط ▶ لتسمع مقطعاً.", "The key ideas of famous books in fifteen minutes. Press ▶ to hear a preview.")}</p>
          </div>
          <a href={SUMMARIES_HUB_PATH} className="self-start sm:self-auto min-h-11 px-5 rounded-xl border border-line text-slate-200 hover:text-white hover:border-line-strong flex items-center gap-1.5 shrink-0">
            {tr("كل الملخصات", "All summaries")}
            <ChevronLeft className="w-4 h-4 ltr:rotate-180" />
          </a>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-5 gap-y-8">
          {BOOK_SUMMARIES.slice(-6).reverse().map((s) => (
            <SummaryCard key={s.slug} summary={s} preview={preview} />
          ))}
        </div>
      </div>
    </section>
  );
};
