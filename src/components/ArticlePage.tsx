import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Clock, Headphones, Loader2, Pause, Play } from 'lucide-react';
import { ARTICLES, ARTICLES_HUB_PATH, Article, ArticleText, articlePath, splitLinks, plainText } from '../data/articles';
import { SUMMARIES_HUB_PATH } from '../data/summaries';
import { VOICES } from '../data/voices';
import { voiceLabel } from '../lib/voiceLabel';
import { audioEngine } from '../lib/audioEngine';
import { loadArticleText } from '../lib/articleLoader';
import { toast } from '../lib/toast';

const dateAr = (iso: string) => new Date(iso).toLocaleDateString('ar', { day: 'numeric', month: 'long', year: 'numeric' });

// Paragraph text with its [text](/path) links
const Rich: React.FC<{ text: string }> = ({ text }) => (
  <>
    {splitLinks(text).map((p, i) =>
      'href' in p ? (
        <a key={i} href={p.href} className="text-brand-soft underline underline-offset-4 hover:text-indigo-200">
          {p.text}
        </a>
      ) : (
        <React.Fragment key={i}>{p.text}</React.Fragment>
      )
    )}
  </>
);

// The pieces the narrator reads, in order: heading, paragraphs, steps of each section
const narration = (t: ArticleText) => t.sections.flatMap((s) => [s.heading, ...s.paragraphs.map(plainText), ...(s.steps || []).map(plainText)]);

// Reads the article aloud piece by piece; each piece is generated once on the server, then cached
const ListenBar: React.FC<{ article: Article; text: ArticleText }> = ({ article, text }) => {
  const voice = VOICES.find((v) => v.id === article.voiceId) || VOICES[0];
  const pieces = narration(text);
  const [index, setIndex] = useState(-1);
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const runRef = useRef(0);

  useEffect(() => () => {
    runRef.current++;
    audioRef.current?.pause();
  }, []);

  const playFrom = async (start: number) => {
    const run = ++runRef.current;
    audioRef.current?.pause();
    for (let i = start; i < pieces.length; i++) {
      if (run !== runRef.current) return;
      setIndex(i);
      setState('loading');
      const url = await audioEngine.generateSpeechUrl(pieces[i], voice, 1).catch(() => null);
      if (run !== runRef.current) return;
      if (!url) {
        setState('idle');
        toast('تعذّر تشغيل الصوت الآن، حاول بعد قليل.', 'error');
        return;
      }
      // Warm up the next piece while this one plays
      if (pieces[i + 1]) audioEngine.generateSpeechUrl(pieces[i + 1], voice, 1).catch(() => null);
      const audio = new Audio(url);
      audioRef.current = audio;
      setState('playing');
      const finished = await new Promise<boolean>((resolve) => {
        audio.onended = () => resolve(true);
        audio.onerror = () => resolve(false);
        audio.play().catch(() => resolve(false));
      });
      if (!finished) {
        if (run === runRef.current) setState('idle');
        return;
      }
    }
    if (run === runRef.current) {
      setState('idle');
      setIndex(-1);
    }
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (state === 'playing' && audio) {
      audio.pause();
      setState('paused');
    } else if (state === 'paused' && audio) {
      audio.play().catch(() => {});
      setState('playing');
    } else if (state === 'idle') {
      playFrom(index >= 0 ? index : 0);
    }
  };

  return (
    <div className="sticky top-[72px] z-20 rounded-[16px] border border-brand/50 bg-card/95 backdrop-blur p-3 sm:p-4 flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        aria-label={state === 'playing' ? 'إيقاف مؤقت' : 'استمع للمقالة'}
        className="w-12 h-12 rounded-full bg-white text-ink flex items-center justify-center shrink-0 cursor-pointer"
      >
        {state === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : state === 'playing' ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ms-0.5" />}
      </button>
      <span className="flex flex-col min-w-0 flex-1">
        <span className="text-white font-semibold text-sm sm:text-base">{index >= 0 ? 'يُقرأ الآن' : 'استمع للمقالة بدل قراءتها'}</span>
        <span className="text-xs text-slate-400 truncate">{index >= 0 ? pieces[index] : `بصوت ${voiceLabel(voice)} · مجاناً`}</span>
      </span>
      {index >= 0 && (
        <span className="text-xs text-slate-500 tabular-nums shrink-0" dir="ltr">
          {index + 1}/{pieces.length}
        </span>
      )}
    </div>
  );
};

// /مقالات/<slug>
export const ArticlePage: React.FC<{ article: Article }> = ({ article }) => {
  const [text, setText] = useState<ArticleText | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadArticleText(article).then(setText, () => setFailed(true));
  }, [article]);

  const others = ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 3);

  return (
    <article className="px-4 sm:px-6 py-10 sm:py-14" dir="rtl">
      <div className="max-w-[760px] mx-auto flex flex-col gap-8">
        <nav aria-label="مسار التنقل" className="flex items-center gap-1.5 text-sm text-slate-400 flex-wrap">
          <a href="/" className="hover:text-white">الرئيسية</a>
          <ChevronLeft className="w-3.5 h-3.5" />
          <a href={ARTICLES_HUB_PATH} className="hover:text-white">المقالات</a>
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="text-slate-300 truncate">{article.category}</span>
        </nav>

        <header className="flex flex-col gap-4">
          <span className="self-start px-3 py-1 rounded-full bg-raised text-brand-soft text-xs font-semibold">{article.category}</span>
          <h1 className="font-display font-extrabold text-3xl sm:text-[42px] leading-tight text-white">{article.h1}</h1>
          <p className="text-slate-300 text-lg leading-[1.8]">{article.lead}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-400">
            <span>فريق Hakawati AI</span>
            <time dateTime={article.updatedAt}>آخر تحديث: {dateAr(article.updatedAt)}</time>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{article.readMinutes} دقائق قراءة</span>
          </div>
        </header>

        {text && <ListenBar article={article} text={text} />}

        {!text && (
          <div role="status" className="py-10 flex justify-center text-slate-400">
            {failed ? (
              <button type="button" onClick={() => window.location.reload()} className="min-h-11 px-5 rounded-[10px] border border-line text-slate-200 cursor-pointer">تعذّر تحميل المقالة، أعد المحاولة</button>
            ) : (
              <Loader2 className="w-7 h-7 animate-spin" aria-label="جاري التحميل" />
            )}
          </div>
        )}

        {text && (
          <>
            {/* Table of contents */}
            <nav aria-label="محتويات المقالة" className="p-5 rounded-[16px] bg-card border border-line flex flex-col gap-2">
              <strong className="text-white">في هذه المقالة</strong>
              <ol className="flex flex-col gap-1.5 list-decimal ps-5 text-slate-300">
                {text.sections.map((s, i) => (
                  <li key={s.heading}><a href={`#s${i + 1}`} className="hover:text-white">{s.heading}</a></li>
                ))}
              </ol>
            </nav>

            {text.sections.map((s, i) => (
              <section key={s.heading} id={`s${i + 1}`} className="flex flex-col gap-4 scroll-mt-40">
                <h2 className="font-display font-extrabold text-2xl sm:text-[28px] text-white leading-snug">{s.heading}</h2>
                {s.paragraphs.map((p, k) => (
                  <p key={k} className="text-slate-300 text-base sm:text-[17px] leading-[1.95]"><Rich text={p} /></p>
                ))}
                {s.steps && (
                  <ol className="flex flex-col gap-3">
                    {s.steps.map((st, k) => (
                      <li key={k} className="flex gap-3 p-4 rounded-[14px] bg-card border border-line">
                        <span className="w-8 h-8 rounded-full bg-brand text-white font-bold flex items-center justify-center shrink-0">{k + 1}</span>
                        <span className="text-slate-200 leading-[1.85]"><Rich text={st} /></span>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ))}

            <section className="flex flex-col gap-4">
              <h2 className="font-display font-extrabold text-2xl text-white">أسئلة شائعة</h2>
              {text.faqs.map((f) => (
                <div key={f.question} className="rounded-[14px] bg-card border border-line p-5 flex flex-col gap-2">
                  <h3 className="text-[17px] font-semibold text-white">{f.question}</h3>
                  <p className="text-slate-400 leading-[1.8]">{f.answer}</p>
                </div>
              ))}
            </section>
          </>
        )}

        <div className="p-6 rounded-[20px] border border-brand/40 bg-brand-deep/30 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <span className="flex items-start gap-3">
            <Headphones className="w-6 h-6 text-accent shrink-0 mt-0.5" />
            <span className="flex flex-col gap-1">
              <strong className="text-white text-lg">جرّب الآن مع كتابك</strong>
              <span className="text-slate-400 text-sm">ثلاثون دقيقة مجانية عند التسجيل، بلا بطاقة.</span>
            </span>
          </span>
          <a href="/" className="min-h-12 px-6 rounded-xl bg-brand hover:bg-indigo-500 text-white font-bold flex items-center justify-center shrink-0">حوّل كتابك إلى صوت</a>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-extrabold text-xl text-white">اقرأ أيضاً</h2>
          <div className="flex flex-col gap-2">
            {others.map((a) => (
              <a key={a.slug} href={articlePath(a)} className="p-4 rounded-[14px] bg-card border border-line hover:border-line-strong text-white">{a.h1}</a>
            ))}
            <a href={SUMMARIES_HUB_PATH} className="p-4 rounded-[14px] bg-card border border-line hover:border-line-strong text-white">ملخصات كتب صوتية مجانية</a>
          </div>
        </section>
      </div>
    </article>
  );
};
