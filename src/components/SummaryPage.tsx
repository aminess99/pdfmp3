import React, { useEffect, useRef, useState } from 'react';
import { tr, DIR, HOME_PATH } from '../lib/i18n';
import { ChevronLeft, Clock, Download, Headphones, Loader2, Mic, Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import {
  BOOK_SUMMARIES,
  BookSummary,
  SummaryText,
  SummaryAudioManifest,
  SUMMARIES_HUB_PATH,
  summaryName,
  summaryAudioUrl,
  summaryCoverUrl,
  summaryManifestUrl,
  summaryPath,
} from '../data/summaries';
import { VOICES } from '../data/voices';
import { voiceLabel } from '../lib/voiceLabel';
import { loadSummaryText } from '../lib/summaryLoader';

const fmt = (sec: number) => {
  if (!isFinite(sec) || sec < 0) sec = 0;
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
};

const SPEEDS = [1, 1.25, 1.5, 0.75];

const COVER_SIZE = { lg: 'w-[148px] h-[247px] sm:w-[180px] sm:h-[300px]', sm: 'w-full aspect-[3/5]' };

// The book's cover image when we have one, otherwise a typographic cover
export const SummaryCover: React.FC<{ summary: BookSummary; size?: 'sm' | 'lg' }> = ({ summary, size = 'sm' }) =>
  summary.textId && summary.hasCover ? (
    <img
      src={summaryCoverUrl(summary)}
      alt={tr(`غلاف كتاب ${summary.bookTitle}`, `${summary.bookTitle} book cover`)}
      width={480}
      height={800}
      loading={size === 'lg' ? 'eager' : 'lazy'}
      className={`rounded-2xl object-cover shrink-0 bg-raised shadow-lg shadow-black/40 ${COVER_SIZE[size]}`}
    />
  ) : (
  <div
    aria-hidden="true"
    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#312e81] via-[#4338ca] to-[#0e7490] flex flex-col justify-between shrink-0 p-4 ${COVER_SIZE[size]}`}
  >
    <span className="text-[11px] font-semibold text-cyan-100/80">{tr("ملخص صوتي", "Audio summary")}</span>
    <span className={`font-display font-extrabold text-white leading-tight ${size === 'lg' ? 'text-2xl sm:text-[28px]' : 'text-xl'}`}>
      {summary.bookTitle}
    </span>
    <span className="text-xs text-indigo-100/80">{summary.author}</span>
    <Headphones className="absolute -bottom-4 -start-4 w-24 h-24 text-white/10" />
  </div>
);

interface SummaryPageProps {
  summary: BookSummary;
}

// /ملخص-كتاب-<slug>: the narrated summary with a chapter-aware player, the text, and FAQs
export const SummaryPage: React.FC<SummaryPageProps> = ({ summary }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [manifest, setManifest] = useState<SummaryAudioManifest | null>(null);
  const [audioState, setAudioState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [text, setText] = useState<SummaryText | null>(null);
  const [textError, setTextError] = useState(false);

  const voice = VOICES.find((v) => v.id === summary.voiceId);
  const minutes = manifest ? Math.round(manifest.duration / 60) : summary.minutes;

  useEffect(() => {
    loadSummaryText(summary).then(setText, () => setTextError(true));
  }, [summary]);

  // The audio is generated offline; until it exists the page is text only
  useEffect(() => {
    fetch(summaryManifestUrl(summary))
      .then((res) => (res.ok ? res.json() : null))
      .then((m: SummaryAudioManifest | null) => {
        if (m && Array.isArray(m.sections)) {
          setManifest(m);
          setDuration(m.duration);
          setAudioState('ready');
        } else {
          setAudioState('missing');
        }
      })
      .catch(() => setAudioState('missing'));
  }, [summary]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = SPEEDS[speedIdx];
  }, [speedIdx, audioState]);

  const currentSection = manifest ? manifest.sections.reduce((cur, start, i) => (time + 0.25 >= start ? i : cur), 0) : -1;

  const play = () => audioRef.current?.play().catch(() => setPlaying(false));
  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) play();
    else audio.pause();
  };
  const seekTo = (sec: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(sec, (audio.duration || duration) - 0.5));
    setTime(audio.currentTime);
  };
  const playSection = (i: number) => {
    if (!manifest) return;
    seekTo(manifest.sections[i]);
    play();
    document.getElementById('summary-player')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const sections = text?.sections ?? [];
  // Same author first, then the same category, then the newest: the links a reader is most
  // likely to follow (and that tell search engines which pages belong together)
  const others = BOOK_SUMMARIES.filter((s) => s.slug !== summary.slug)
    .map((s, i) => ({ s, rank: (s.author === summary.author ? 0 : s.category === summary.category ? 1 : 2) * 1000 - i }))
    .sort((x, y) => x.rank - y.rank)
    .map((x) => x.s);

  return (
    <article className="px-4 sm:px-6 py-10 sm:py-14" dir={DIR}>
      <div className="max-w-[820px] mx-auto flex flex-col gap-8">
        <nav aria-label={tr("مسار التنقل", "Breadcrumb")} className="flex items-center gap-1.5 text-sm text-slate-400 flex-wrap">
          <a href={HOME_PATH} className="hover:text-white">{tr("الرئيسية", "Home")}</a>
          <ChevronLeft className="w-3.5 h-3.5 ltr:rotate-180" />
          <a href={SUMMARIES_HUB_PATH} className="hover:text-white">{tr("ملخصات كتب صوتية", "Audio book summaries")}</a>
          <ChevronLeft className="w-3.5 h-3.5 ltr:rotate-180" />
          <span className="text-slate-300">{summary.bookTitle}</span>
        </nav>

        <header className="flex flex-col sm:flex-row gap-6 sm:items-end">
          <SummaryCover summary={summary} size="lg" />
          <div className="flex flex-col gap-3">
            <span className="self-start px-3 py-1 rounded-full bg-raised text-brand-soft text-xs font-semibold">{summary.category}</span>
            <h1 className="font-display font-extrabold text-3xl sm:text-[40px] leading-tight text-white">{summaryName(summary)}</h1>
            <p className="text-slate-300">{tr("تأليف:", "By")} {summary.author}</p>
            <p className="text-slate-400 leading-[1.8]">{summary.lead}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{minutes} {tr("دقيقة استماع", "min listen")}</span>
              {voice && <span className="flex items-center gap-1.5"><Mic className="w-4 h-4" />{tr(`بصوت ${voiceLabel(voice)}`, "Narrated in English")}</span>}
            </div>
          </div>
        </header>

        {/* Player */}
        <section id="summary-player" aria-label={tr("الملخص الصوتي", "Audio summary")} className="rounded-[20px] border border-brand/50 bg-brand-deep/30 p-4 sm:p-5 flex flex-col gap-4 scroll-mt-24">
          {audioState === 'missing' ? (
            <p className="text-slate-300 leading-relaxed">{tr("النسخة الصوتية من هذا الملخص قيد التجهيز، وستكون متاحة قريباً. يمكنك قراءة الملخص كاملاً أدناه.", "The audio version of this summary is on its way. You can read the full summary below.")}</p>
          ) : (
            <>
              {audioState === 'ready' && (
                <audio
                  ref={audioRef}
                  src={summaryAudioUrl(summary)}
                  preload="metadata"
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                  onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                  onWaiting={() => setBuffering(true)}
                  onPlaying={() => setBuffering(false)}
                  onCanPlay={() => setBuffering(false)}
                />
              )}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggle}
                  disabled={audioState !== 'ready'}
                  aria-label={playing ? tr('إيقاف مؤقت', 'Pause') : tr('تشغيل الملخص', 'Play the summary')}
                  className="w-14 h-14 rounded-full bg-white text-ink flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-60"
                >
                  {audioState === 'loading' || (playing && buffering) ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : playing ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current" />
                  )}
                </button>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="text-sm text-white font-semibold truncate">
                    {manifest && currentSection >= 0 ? sections[currentSection]?.heading : summaryName(summary)}
                  </span>
                  <div className="flex items-center gap-2" dir="ltr">
                    <span className="text-[13px] text-slate-400 tabular-nums">{fmt(time)}</span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 0}
                      step={1}
                      value={time}
                      onChange={(e) => seekTo(Number(e.target.value))}
                      aria-label={tr("موضع التشغيل", "Playback position")}
                      className="flex-1 min-w-0 accent-accent cursor-pointer"
                    />
                    <span className="text-[13px] text-slate-400 tabular-nums">{fmt(duration)}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => seekTo(time - 15)} aria-label={tr("رجوع 15 ثانية", "Back 15 seconds")} className="w-11 h-11 rounded-[10px] bg-raised hover:bg-line-strong text-white flex items-center justify-center cursor-pointer">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => seekTo(time + 15)} aria-label={tr("تقديم 15 ثانية", "Forward 15 seconds")} className="w-11 h-11 rounded-[10px] bg-raised hover:bg-line-strong text-white flex items-center justify-center cursor-pointer">
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSpeedIdx((i) => (i + 1) % SPEEDS.length)}
                  aria-label={tr("سرعة التشغيل", "Playback speed")}
                  className="min-w-11 h-11 px-3 rounded-[10px] bg-raised hover:bg-line-strong text-white text-sm font-semibold tabular-nums cursor-pointer"
                >
                  {SPEEDS[speedIdx]}×
                </button>
                {audioState === 'ready' && (
                  <a
                    href={summaryAudioUrl(summary)}
                    download={`${summaryName(summary)}.mp3`}
                    className="min-h-11 px-4 rounded-[10px] border border-line text-slate-300 hover:text-white text-sm flex items-center gap-2 ms-auto"
                  >
                    <Download className="w-4 h-4" />
                    {tr("تحميل MP3", "Download MP3")}
                  </a>
                )}
              </div>
            </>
          )}

          <ol className="flex flex-col border-t border-line pt-2">
            {sections.map((sec, i) => (
              <li key={sec.heading}>
                <button
                  type="button"
                  onClick={() => (manifest ? playSection(i) : document.getElementById(`section-${i + 1}`)?.scrollIntoView({ behavior: 'smooth' }))}
                  aria-current={i === currentSection && playing ? 'true' : undefined}
                  className={`w-full min-h-11 px-2 rounded-lg flex items-center gap-3 text-start cursor-pointer hover:bg-raised ${
                    i === currentSection && (playing || time > 0) ? 'text-accent' : 'text-slate-300'
                  }`}
                >
                  <span className="w-6 text-sm text-slate-500 tabular-nums">{i + 1}</span>
                  <span className="flex-1 text-sm sm:text-[15px]">{sec.heading}</span>
                  {manifest && <span className="text-xs text-slate-500 tabular-nums" dir="ltr">{fmt(manifest.sections[i])}</span>}
                </button>
              </li>
            ))}
          </ol>
        </section>

        {/* The text (what search engines read, and the narration script) */}
        {!text && (
          <div role="status" className="py-10 flex justify-center text-slate-400">
            {textError ? (
              <button type="button" onClick={() => window.location.reload()} className="min-h-11 px-5 rounded-[10px] border border-line text-slate-200 cursor-pointer">{tr("تعذّر تحميل النص، أعد المحاولة", "Couldn’t load the text. Try again")}</button>
            ) : (
              <Loader2 className="w-7 h-7 animate-spin" aria-label={tr("جاري التحميل", "Loading")} />
            )}
          </div>
        )}
        <div className="flex flex-col gap-10">
          {sections.map((sec, i) => (
            <section key={sec.heading} id={`section-${i + 1}`} className="flex flex-col gap-3 scroll-mt-24">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display font-extrabold text-2xl sm:text-[28px] text-white leading-snug">{sec.heading}</h2>
                {manifest && (
                  <button
                    type="button"
                    onClick={() => playSection(i)}
                    aria-label={tr(`استمع إلى: ${sec.heading}`, `Listen: ${sec.heading}`)}
                    className="shrink-0 mt-1 min-h-10 px-3 rounded-full border border-line text-slate-300 hover:text-white text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {tr("استمع", "Listen")}
                  </button>
                )}
              </div>
              {sec.paragraphs.map((p, idx) => (
                <p key={idx} className="text-slate-300 text-base sm:text-[17px] leading-[1.95]">{p}</p>
              ))}
            </section>
          ))}
        </div>

        {text && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display font-extrabold text-2xl text-white">{tr(`أسئلة شائعة عن كتاب ${summary.bookTitle}`, `${summary.bookTitle}: frequently asked questions`)}</h2>
          {text.faqs.map((f) => (
            <div key={f.question} className="rounded-[14px] bg-card border border-line p-5 flex flex-col gap-2">
              <h3 className="text-[17px] font-semibold text-white">{f.question}</h3>
              <p className="text-slate-400 leading-[1.8]">{f.answer}</p>
            </div>
          ))}
        </section>
        )}

        <div className="p-6 rounded-[20px] border border-brand/40 bg-brand-deep/30 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <span className="flex flex-col gap-1">
            <strong className="text-white text-lg">{tr("عندك كتاب PDF تريد سماعه؟", "Have an Arabic PDF you want to hear?")}</strong>
            <span className="text-slate-400 text-sm">{tr("ارفعه واستمع إليه بنفس جودة هذا الملخص، بالفصحى أو بلهجتك.", "Upload it and listen in the same quality, in formal Arabic or a dialect.")}</span>
          </span>
          <a href={HOME_PATH} className="min-h-12 px-6 rounded-xl bg-brand hover:bg-indigo-500 text-white font-bold flex items-center justify-center shrink-0">
            {tr("حوّل كتابك إلى صوت", "Turn your book into audio")}
          </a>
        </div>

        {others.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="font-display font-extrabold text-2xl text-white">{tr("ملخصات أخرى", "More summaries")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {others.slice(0, 8).map((s) => (
                <a key={s.slug} href={summaryPath(s)} className="flex flex-col gap-2 group">
                  <SummaryCover summary={s} />
                  <span className="text-sm text-slate-200 group-hover:text-white">{s.bookTitle}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <a href={SUMMARIES_HUB_PATH} className="self-start text-brand-soft hover:text-indigo-200">{tr("← كل ملخصات الكتب الصوتية", "All audio book summaries →")}</a>
      </div>
    </article>
  );
};
