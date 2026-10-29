import React, { useEffect, useState } from 'react';
import { Headphones, Loader2, Play } from 'lucide-react';
import { getShare, SharedClip } from '../lib/shares';
import { audioEngine } from '../lib/audioEngine';
import { VOICES } from '../data/voices';
import { QuickResult } from './QuickResult';
import { NotFound } from './NotFound';
import { voiceLabel } from '../lib/voiceLabel';
import { tr, DIR, HOME_PATH } from '../lib/i18n';

interface SharePageProps {
  shareId: string;
}

// Public page for a shared clip: the quote, a player, and a way into the product
export const SharePage: React.FC<SharePageProps> = ({ shareId }) => {
  const [clip, setClip] = useState<SharedClip | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [audio, setAudio] = useState<{ url: string; blob: Blob | null } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getShare(shareId)
      .then((c) => {
        setClip(c);
        setStatus(c ? 'ready' : 'missing');
      })
      .catch(() => setStatus('error'));
  }, [shareId]);

  if (status === 'missing') return <NotFound />;
  if (status === 'error') {
    return (
      <div role="alert" className="py-28 px-4 flex flex-col items-center gap-4 text-center">
        <p className="text-white text-lg">{tr("تعذّر تحميل المقطع الآن.", "Couldn’t load this clip right now.")}</p>
        <button type="button" onClick={() => window.location.reload()} className="min-h-11 px-5 rounded-[10px] border border-line text-slate-200 hover:text-white cursor-pointer">
          {tr("إعادة المحاولة", "Try again")}
        </button>
      </div>
    );
  }
  if (status === 'loading' || !clip) {
    return (
      <div role="status" className="py-32 flex justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" aria-label={tr("جاري التحميل", "Loading")} />
      </div>
    );
  }

  const voice = VOICES.find((v) => v.id === clip.voiceId) || VOICES[0];
  const voiceName = voiceLabel(voice);

  const handleListen = async () => {
    setError(null);
    setIsGenerating(true);
    try {
      const url = await audioEngine.generateSpeechUrl(clip.text, voice, 1);
      if (!url) throw new Error('tts failed');
      setAudio({ url, blob: audioEngine.getCachedBlob(clip.text, voice, 1) });
    } catch {
      setError(tr("تعذّر تشغيل المقطع الآن، حاول بعد قليل.", "Couldn’t play the clip right now. Please try again shortly."));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="px-4 sm:px-6 py-14 sm:py-20" dir={DIR}>
      <div className="max-w-[680px] mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-brand-soft">{tr("مقطع مسموع من كتاب", "An audio clip from a book")}</span>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white leading-tight">{clip.bookTitle || tr("كتاب صوتي", "Audiobook")}</h1>
          {clip.chapterTitle && <p className="text-slate-400">{clip.chapterTitle}</p>}
        </div>

        <blockquote className="p-6 rounded-[20px] bg-card border border-line text-slate-100 text-lg sm:text-xl leading-[1.9]">
          «{clip.text}»
        </blockquote>

        {audio ? (
          <QuickResult url={audio.url} blob={audio.blob} voiceName={voiceName} fileName={clip.bookTitle || 'Hakawati-AI'} />
        ) : (
          <button
            type="button"
            onClick={handleListen}
            disabled={isGenerating}
            className="self-start min-h-[52px] px-6 rounded-xl bg-gradient-to-l from-[#8b5cf6] to-[#3b82f6] text-white font-bold flex items-center gap-2.5 cursor-pointer disabled:opacity-60"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
            {tr('استمع بصوت', 'Listen with')} {voiceName}
          </button>
        )}
        {error && <p role="alert" className="text-rose-300">{error}</p>}

        <div className="mt-6 p-6 rounded-[20px] border border-brand/40 bg-brand-deep/30 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <span className="flex items-start gap-3">
            <Headphones className="w-6 h-6 text-accent shrink-0 mt-0.5" />
            <span className="flex flex-col gap-1">
              <strong className="text-white text-lg">{tr("حوّل كتبك أنت أيضاً إلى صوت", "Turn your own books into audio")}</strong>
              <span className="text-slate-400 text-sm">{tr("30 صوتاً بـ14 لهجة عربية، وجرّب مجاناً.", "30 voices in 14 Arabic dialects. Try it free.")}</span>
            </span>
          </span>
          <a href={HOME_PATH} className="min-h-12 px-6 rounded-xl bg-brand hover:bg-indigo-500 text-white font-bold flex items-center justify-center shrink-0">
            {tr("جرّب Hakawati AI", "Try Hakawati AI")}
          </a>
        </div>
      </div>
    </section>
  );
};
