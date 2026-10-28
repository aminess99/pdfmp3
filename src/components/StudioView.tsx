import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Download, 
  X, 
  Sparkles, 
  BookOpen, 
  Share2, 
  Check,
  SkipBack,
  SkipForward,
  Layers,
  Moon,
  Clock,
  ChevronDown,
  Volume2,
  SlidersHorizontal,
  ArrowRight,
  Maximize2,
  Minimize2,
  Bookmark,
  FileText,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { ConversionJob, Voice, AudioStyle, Dialect } from '../types';
import { audioEngine } from '../lib/audioEngine';
import { DIALECTS, VOICES, AUDIO_STYLES } from '../data/voices';
import { cleanBookTitle } from './AudioPlayerDrawer';
import { ChatPdfModal } from './ChatPdfModal';

interface StudioViewProps {
  job: ConversionJob;
  onExit: () => void;
  availableVoices?: Voice[];
  isUserLoggedIn?: boolean;
  onRequestAuth?: (mode: 'login' | 'register') => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.floor(Math.max(0, seconds) % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const StudioView: React.FC<StudioViewProps> = ({
  job,
  onExit,
  availableVoices,
  isUserLoggedIn,
  onRequestAuth,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [readerFontSize, setReaderFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');

  // Multi-chapter handling
  const chapters = job.chapters && job.chapters.length > 0 ? job.chapters : null;
  const initialChapterIndex = chapters 
    ? Math.max(0, chapters.findIndex(c => c.id === job.activeChapterId))
    : 0;

  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(initialChapterIndex);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(job.selectedVoice);
  const [selectedStyle, setSelectedStyle] = useState<AudioStyle>(job.selectedStyle);
  const [selectedDialect, setSelectedDialect] = useState<Dialect>(job.selectedDialect);
  const [showVoicePicker, setShowVoicePicker] = useState<boolean>(false);
  const [isGeneratingMp3, setIsGeneratingMp3] = useState<boolean>(false);
  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);
  const [downloadProgressMsg, setDownloadProgressMsg] = useState<string>('');

  // Sleep timer
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemainingSec, setSleepTimerRemainingSec] = useState<number | null>(null);
  const [showSleepMenu, setShowSleepMenu] = useState<boolean>(false);

  const activeSentenceRef = useRef<HTMLButtonElement>(null);

  // Reader panels (listen / AI summary / key points), cached per chapter
  const [panel, setPanel] = useState<'listen' | 'summary' | 'key_points'>('listen');
  const [panelCache, setPanelCache] = useState<Record<string, string>>({});
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelPlaying, setPanelPlaying] = useState(false);
  const [hideText, setHideText] = useState(false);
  const [chaptersOpen, setChaptersOpen] = useState(false);

  // Resume where the listener stopped last time (per book, in this browser)
  const positionKey = `studio_pos_${job.id}`;
  const [resumePoint, setResumePoint] = useState<{ chapter: number; sentence: number } | null>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`studio_pos_${job.id}`) || 'null');
      return saved && (saved.chapter > 0 || saved.sentence > 0) ? saved : null;
    } catch {
      return null;
    }
  });
  const resumeSentenceRef = useRef<number | null>(null);
  const activePlayIdRef = useRef<number>(0);

  const voicesPool = availableVoices && availableVoices.length > 0 ? availableVoices : VOICES;
  const currentChapter = chapters ? chapters[activeChapterIndex] : null;

  const rawFullText = currentChapter?.text || job.textChunks?.[0] || job.extractedText || '';
  const fullText = useMemo(() => {
    return rawFullText
      .replace(/---\s*الصفحة\s*\d+\s*---/gi, '')
      .replace(/\[\s*الصفحة\s*\d+\s*\]/gi, '')
      .replace(/^الصفحة\s*\d+$/gim, '')
      .trim();
  }, [rawFullText]);

  // Split text into natural coherent chunks of ~75 to 90 words (~35 to 40 seconds of continuous speech)
  const sentences = useMemo(() => {
    const rawUnits = fullText
      .split(/(?<=[.!?؟\n])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !/^الصفحة\s*\d+$/i.test(s));

    const merged: string[] = [];
    let currentChunk = '';

    for (const unit of rawUnits) {
      if (!currentChunk) {
        currentChunk = unit;
      } else {
        const currentWords = currentChunk.split(/\s+/).length;
        // Group sentences into substantive narrative paragraphs of ~75-90 words (~35-42 seconds)
        if (currentWords < 80 || currentChunk.length < 380) {
          currentChunk += ' ' + unit;
        } else {
          merged.push(currentChunk);
          currentChunk = unit;
        }
      }
    }
    if (currentChunk) merged.push(currentChunk);
    return merged.length > 0 ? merged : [fullText || 'نص الكتاب جاهز للاستماع.'];
  }, [fullText]);

  // Duration calculations
  const wordsCount = useMemo(() => fullText.split(/\s+/).filter(Boolean).length, [fullText]);
  const estimatedTotalSeconds = currentChapter?.estimatedDurationMinutes 
    ? currentChapter.estimatedDurationMinutes * 60 
    : Math.max(30, Math.round(wordsCount * 0.4));

  const elapsedSeconds = Math.round(estimatedTotalSeconds * (progressPercent / 100));
  const remainingSeconds = Math.max(0, estimatedTotalSeconds - elapsedSeconds);

  // Auto-scroll active text into view smoothly
  useEffect(() => {
    if (activeSentenceRef.current) {
      activeSentenceRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeSentenceIndex]);

  // Sleep timer interval
  useEffect(() => {
    if (sleepTimerRemainingSec === null) return;
    if (sleepTimerRemainingSec <= 0) {
      audioEngine.pause();
      setIsPlaying(false);
      setSleepTimerMinutes(null);
      setSleepTimerRemainingSec(null);
      return;
    }
    const timer = setInterval(() => {
      setSleepTimerRemainingSec((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(timer);
  }, [sleepTimerRemainingSec]);

  // Remember the current position
  useEffect(() => {
    if (activeSentenceIndex === 0 && activeChapterIndex === 0) return;
    try {
      localStorage.setItem(positionKey, JSON.stringify({ chapter: activeChapterIndex, sentence: activeSentenceIndex }));
    } catch {}
  }, [positionKey, activeChapterIndex, activeSentenceIndex]);

  // Start playback whenever chapter or job changes
  useEffect(() => {
    audioEngine.stop();
    if (sentences.length > 0) {
      const startAt = resumeSentenceRef.current ?? 0;
      resumeSentenceRef.current = null;
      startPlayback(Math.min(startAt, sentences.length - 1));
    }
    return () => {
      activePlayIdRef.current++;
      audioEngine.stop();
    };
  }, [job.id, activeChapterIndex, selectedVoice.id]);

  const startPlayback = (sentenceIdx: number) => {
    const playId = ++activePlayIdRef.current;

    if (sentenceIdx >= sentences.length) {
      setIsPlaying(false);
      setProgressPercent(100);
      if (sleepTimerMinutes === -1) {
        setSleepTimerMinutes(null);
        setSleepTimerRemainingSec(null);
      }
      return;
    }

    setActiveSentenceIndex(sentenceIdx);
    setIsPlaying(true);

    const currentText = sentences[sentenceIdx];
    const progress = Math.round(((sentenceIdx + 1) / sentences.length) * 100);
    setProgressPercent(progress);

    // Lookahead pre-fetch next segments
    if (sentenceIdx + 1 < sentences.length) {
      const upcoming = sentences.slice(sentenceIdx + 1, sentenceIdx + 4);
      audioEngine.prefetchBatch(upcoming, selectedVoice, playbackRate, 3);
    } else if (chapters && activeChapterIndex < chapters.length - 1) {
      // Near end of current chapter: pre-fetch first 3 segments of NEXT chapter for 0-second seamless transition!
      const nextChapter = chapters[activeChapterIndex + 1];
      if (nextChapter && nextChapter.text) {
        const nextSentences = nextChapter.text
          .split(/(?<=[.!?؟\n])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !/^الصفحة\s*\d+$/i.test(s))
          .slice(0, 3);
        if (nextSentences.length > 0) {
          audioEngine.prefetchBatch(nextSentences, selectedVoice, playbackRate, 2);
        }
      }
    }

    audioEngine.speak(
      currentText,
      selectedVoice,
      selectedStyle,
      playbackRate,
      undefined,
      () => {
        if (activePlayIdRef.current !== playId) return;
        if (sentenceIdx + 1 < sentences.length) {
          startPlayback(sentenceIdx + 1);
        } else {
          // Chapter finished -> Auto-advance to next chapter smoothly!
          if (chapters && activeChapterIndex < chapters.length - 1) {
            if (sleepTimerMinutes === -1) {
              audioEngine.pause();
              setIsPlaying(false);
              setSleepTimerMinutes(null);
              setSleepTimerRemainingSec(null);
            } else {
              // Seamless Auto Next Chapter
              setActiveChapterIndex((prev) => prev + 1);
              setActiveSentenceIndex(0);
              setProgressPercent(0);
            }
          } else {
            setIsPlaying(false);
            setProgressPercent(100);
          }
        }
      }
    );
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      if (activeSentenceIndex >= sentences.length - 1 && progressPercent >= 99) {
        startPlayback(0);
      } else {
        startPlayback(activeSentenceIndex);
      }
    }
  };

  const handleResume = () => {
    if (!resumePoint) return;
    const { chapter, sentence } = resumePoint;
    setResumePoint(null);
    if (chapters && chapter !== activeChapterIndex && chapters[chapter]) {
      resumeSentenceRef.current = sentence;
      setActiveChapterIndex(chapter);
    } else {
      handleSeekSentence(sentence);
    }
  };

  const panelKey = `${panel}_${activeChapterIndex}`;
  const panelText = panelCache[panelKey] || '';

  const openPanel = async (next: 'listen' | 'summary' | 'key_points') => {
    setPanel(next);
    if (next === 'listen') return;
    const key = `${next}_${activeChapterIndex}`;
    if (panelCache[key]) return;
    setPanelLoading(true);
    try {
      const res = await fetch('/api/ai/transform-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: fullText, mode: next, bookTitle: cleanBookTitle(job.fileName) }),
      });
      const data = await res.json();
      if (data.success && data.transformedText) {
        setPanelCache((prev) => ({ ...prev, [key]: data.transformedText }));
      }
    } catch (e) {
      console.warn('Panel transform error:', e);
    } finally {
      setPanelLoading(false);
    }
  };

  const handleListenPanel = () => {
    if (panelPlaying) {
      audioEngine.stop();
      setPanelPlaying(false);
      return;
    }
    activePlayIdRef.current++;
    audioEngine.stop();
    setIsPlaying(false);
    setPanelPlaying(true);
    audioEngine.speak(panelText, selectedVoice, selectedStyle, playbackRate, undefined, () => setPanelPlaying(false));
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleSeekSentence = (targetIdx: number) => {
    const safeIdx = Math.max(0, Math.min(sentences.length - 1, targetIdx));
    audioEngine.stop();
    startPlayback(safeIdx);
  };

  const handleSkipSeconds = (deltaSeconds: number) => {
    const sentencesToJump = Math.round(deltaSeconds / 35) || (deltaSeconds > 0 ? 1 : -1);
    const newIdx = Math.max(0, Math.min(sentences.length - 1, activeSentenceIndex + sentencesToJump));
    handleSeekSentence(newIdx);
  };

  // Download current active chapter
  const handleDownloadSingleChapter = async () => {
    setShowDownloadModal(false);
    try {
      setIsGeneratingMp3(true);
      setDownloadProgressMsg('جاري استخراج ودمج صوت الفصل الحالي...');
      const titleCleaned = cleanBookTitle(job.fileName);
      const chapterLabel = currentChapter?.title || `الفصل_${activeChapterIndex + 1}`;

      // 1. FAST PATH: Instant assemble from listened/cached segments
      if (sentences.length > 0) {
        const assembled = await audioEngine.assembleChapterAudio(
          sentences,
          selectedVoice,
          playbackRate
        );

        if (assembled && assembled.blob && assembled.blob.size > 1000) {
          const url = URL.createObjectURL(assembled.blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${titleCleaned}_${chapterLabel}.${assembled.ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setIsGeneratingMp3(false);
          setDownloadProgressMsg('');
          return;
        }
      }

      // 2. SERVER FALLBACK
      const textToDownload = currentChapter ? currentChapter.text : fullText;
      const res = await fetch('/api/tts/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToDownload,
          voiceId: selectedVoice.id,
          voice: selectedVoice,
          speed: playbackRate,
          title: `${titleCleaned}_${chapterLabel}`,
        }),
      });

      if (!res.ok) throw new Error('فشل توليد ملف الصوت');
      const blob = await res.blob();
      const isWav = blob.type.includes('wav');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${titleCleaned}_${chapterLabel}.${isWav ? 'wav' : 'mp3'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('MP3 chapter download note:', err);
    } finally {
      setIsGeneratingMp3(false);
      setDownloadProgressMsg('');
    }
  };

  // Download entire audiobook (All chapters merged)
  const handleDownloadFullBook = async () => {
    setShowDownloadModal(false);
    try {
      setIsGeneratingMp3(true);
      setDownloadProgressMsg('جاري تجهيز وتوليد الكتاب الصوتي كاملاً...');
      const titleCleaned = cleanBookTitle(job.fileName);

      const allChaptersList = chapters && chapters.length > 0 ? chapters : [{ text: fullText, title: 'كامل الكتاب' }];
      const allSentences: string[] = [];

      for (const ch of allChaptersList) {
        const chClean = ch.text
          .replace(/---\s*الصفحة\s*\d+\s*---/gi, '')
          .replace(/\[\s*الصفحة\s*\d+\s*\]/gi, '')
          .replace(/^الصفحة\s*\d+$/gim, '')
          .trim();

        const rawUnits = chClean.split(/(?<=[.!?؟\n])\s+/).map((s) => s.trim()).filter((s) => s.length > 0);
        let cur = '';
        for (const u of rawUnits) {
          if (!cur) cur = u;
          else if (cur.split(/\s+/).length < 80 || cur.length < 380) cur += ' ' + u;
          else {
            allSentences.push(cur);
            cur = u;
          }
        }
        if (cur) allSentences.push(cur);
      }

      if (allSentences.length > 0) {
        const assembled = await audioEngine.assembleChapterAudio(
          allSentences,
          selectedVoice,
          playbackRate,
          (pct) => setDownloadProgressMsg(`جاري دمج الفصول بالكامل (${pct}%)...`)
        );

        if (assembled && assembled.blob && assembled.blob.size > 1000) {
          const url = URL.createObjectURL(assembled.blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${titleCleaned}_الكتاب_كاملاً.${assembled.ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setIsGeneratingMp3(false);
          setDownloadProgressMsg('');
          return;
        }
      }

      // Server fallback for whole book
      const fullMergedText = allChaptersList.map(c => c.text).join('\n\n');
      const res = await fetch('/api/tts/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: fullMergedText,
          voiceId: selectedVoice.id,
          voice: selectedVoice,
          speed: playbackRate,
          title: `${titleCleaned}_الكتاب_كاملاً`,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const isWav = blob.type.includes('wav');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${titleCleaned}_الكتاب_كاملاً.${isWav ? 'wav' : 'mp3'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.warn('MP3 full book download note:', err);
    } finally {
      setIsGeneratingMp3(false);
      setDownloadProgressMsg('');
    }
  };

  const cleanTitle = cleanBookTitle(job.fileName);
  const totalBookMinutes = chapters
    ? chapters.reduce((acc, c) => acc + (c.estimatedDurationMinutes || 0), 0)
    : Math.round(estimatedTotalSeconds / 60);
  const fontClass = { sm: 'text-base', base: 'text-lg', lg: 'text-xl', xl: 'text-2xl' }[readerFontSize];
  const fontSteps: Array<'sm' | 'base' | 'lg' | 'xl'> = ['sm', 'base', 'lg', 'xl'];
  const closeMenus = () => {
    setShowVoicePicker(false);
    setShowDownloadModal(false);
    setShowSleepMenu(false);
  };

  const chapterList = (
    <>
      <div className="text-[13px] text-slate-400 px-2 pb-2">الفصول</div>
      {(chapters || []).map((chap, idx) => {
        const isActive = idx === activeChapterIndex;
        const status = chap.status || 'completed';
        const ready = status === 'completed';
        return (
          <button
            key={chap.id}
            type="button"
            disabled={!ready}
            aria-current={isActive}
            onClick={() => {
              setChaptersOpen(false);
              if (ready && activeChapterIndex !== idx) {
                setActiveChapterIndex(idx);
                setActiveSentenceIndex(0);
              }
            }}
            className={`w-full min-h-[52px] flex items-center justify-between gap-2 px-3 rounded-[10px] text-right text-[15px] transition-colors ${
              isActive ? 'bg-raised text-white' : ready ? 'text-slate-300 hover:bg-raised/60 cursor-pointer' : 'text-slate-500 cursor-default'
            }`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              {status === 'completed' && <Check className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />}
              {status === 'converting' && <Loader2 className="w-4 h-4 text-brand-soft animate-spin shrink-0" aria-hidden="true" />}
              {status === 'pending' && <span className="w-4 h-4 rounded-full border-2 border-slate-600 shrink-0" aria-hidden="true" />}
              {status === 'error' && <span className="w-4 text-rose-400 font-extrabold text-center shrink-0" aria-hidden="true">!</span>}
              <span className="truncate">{chap.title}</span>
            </span>
            <span className="text-[13px] text-slate-400 shrink-0">
              {status === 'converting' ? `يُجهَّز ${chap.progress ?? 0}%` : status === 'pending' ? 'في الانتظار' : status === 'error' ? 'تعذّر' : `${chap.estimatedDurationMinutes} د`}
            </span>
          </button>
        );
      })}
      {job.isStreamingBackground && (
        <div className="mt-3 p-3.5 rounded-xl bg-card text-[13px] text-slate-400">
          {job.backgroundStatus || 'ابدأ الاستماع الآن، وتُجهَّز الفصول التالية في الخلفية.'}
        </div>
      )}
    </>
  );

  return (
    <div className="fixed inset-0 z-50 bg-ink text-slate-200 flex flex-col h-[100dvh] w-screen overflow-hidden font-body" dir="rtl">
      {/* Top bar */}
      <header className="h-16 px-3 sm:px-6 border-b border-raised flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={() => {
            audioEngine.stop();
            onExit();
          }}
          className="flex items-center gap-1.5 min-h-11 px-2 text-slate-300 hover:text-white cursor-pointer shrink-0"
        >
          <ArrowRight className="w-[18px] h-[18px]" />
          <span className="hidden sm:inline">{isUserLoggedIn ? 'مكتبتي' : 'رجوع'}</span>
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <span aria-hidden="true" className="hidden sm:block w-9 h-12 rounded-md bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-800 shrink-0" />
          <span className="flex flex-col leading-tight min-w-0">
            <span className="font-display font-extrabold text-base sm:text-lg text-white truncate">{cleanTitle}</span>
            <span className="text-[13px] text-slate-400 truncate">
              {job.listeningMode === 'summary' ? 'ملخص · ' : job.listeningMode === 'key_points' ? 'أهم النقاط · ' : ''}
              {chapters ? (chapters.length === 1 ? 'فصل واحد · ' : `${chapters.length} فصول · `) : ''}حوالي {Math.max(1, totalBookMinutes)} دقيقة
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {chapters && chapters.length > 1 && (
            <button type="button" onClick={() => setChaptersOpen(true)} className="md:hidden min-h-11 px-3 text-sm text-brand-soft cursor-pointer">
              الفصول
            </button>
          )}
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 min-h-11 px-3 text-sm text-brand-soft hover:text-indigo-200 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{copied ? 'تم نسخ الرابط' : 'مشاركة'}</span>
          </button>
        </div>
      </header>

      {/* Guest banner */}
      {!isUserLoggedIn && (
        <div className="shrink-0 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 bg-brand-deep text-indigo-100 text-sm">
          <span>تستمع كضيف. سجّل مجاناً لتحفظ الكتاب ومكان توقفك وتحصل على 30 دقيقة.</span>
          {onRequestAuth && (
            <button
              type="button"
              onClick={() => {
                audioEngine.pause();
                setIsPlaying(false);
                onRequestAuth('register');
              }}
              className="min-h-9 px-3.5 rounded-lg bg-brand text-white font-semibold cursor-pointer"
            >
              سجّل مجاناً
            </button>
          )}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-h-0 flex">
        {chapters && chapters.length > 1 && (
          <aside aria-label="الفصول" className="hidden md:flex w-[300px] shrink-0 border-l border-raised p-4 flex-col gap-1 overflow-y-auto">
            {chapterList}
          </aside>
        )}

        <section className="flex-1 min-w-0 flex flex-col">
          {/* Tabs + reader tools */}
          <div className="flex flex-wrap items-end justify-between gap-2 px-3 sm:px-8 pt-3 border-b border-raised">
            <div role="tablist" aria-label="أدوات الكتاب" className="flex gap-1 overflow-x-auto no-scrollbar">
              {([
                { id: 'listen', label: 'استماع' },
                { id: 'summary', label: 'الملخص' },
                { id: 'key_points', label: 'أهم النقاط' },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={panel === t.id}
                  onClick={() => openPanel(t.id)}
                  className={`min-h-12 px-4 -mb-px border-b-2 text-[15px] font-semibold whitespace-nowrap cursor-pointer ${
                    panel === t.id ? 'border-accent text-white' : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  audioEngine.pause();
                  setIsPlaying(false);
                  setShowChatModal(true);
                }}
                className="min-h-12 px-4 -mb-px border-b-2 border-transparent text-[15px] font-semibold text-slate-400 hover:text-white whitespace-nowrap cursor-pointer"
              >
                اسأل الكتاب
              </button>
            </div>
            {panel === 'listen' && (
              <div className="flex items-center gap-1.5 pb-1.5 relative">
                <button
                  type="button"
                  aria-label="تصغير الخط"
                  onClick={() => setReaderFontSize(fontSteps[Math.max(0, fontSteps.indexOf(readerFontSize) - 1)])}
                  className="w-10 h-10 rounded-lg border border-line text-slate-300 text-sm cursor-pointer hover:bg-raised"
                >
                  أ-
                </button>
                <button
                  type="button"
                  aria-label="تكبير الخط"
                  onClick={() => setReaderFontSize(fontSteps[Math.min(fontSteps.length - 1, fontSteps.indexOf(readerFontSize) + 1)])}
                  className="w-10 h-10 rounded-lg border border-line text-slate-300 text-lg cursor-pointer hover:bg-raised"
                >
                  أ+
                </button>
                <button
                  type="button"
                  aria-pressed={hideText}
                  onClick={() => setHideText(!hideText)}
                  className="min-h-10 px-3 rounded-lg border border-line text-slate-300 text-sm cursor-pointer hover:bg-raised"
                >
                  {hideText ? 'إظهار النص' : 'إخفاء النص'}
                </button>
                <button
                  type="button"
                  aria-expanded={showSleepMenu}
                  onClick={() => {
                    const open = !showSleepMenu;
                    closeMenus();
                    setShowSleepMenu(open);
                  }}
                  className={`min-h-10 flex items-center gap-1.5 px-3 rounded-lg border text-sm cursor-pointer ${
                    sleepTimerRemainingSec !== null ? 'border-accent text-accent' : 'border-line text-slate-300 hover:bg-raised'
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  <span className="hidden sm:inline">{sleepTimerRemainingSec !== null ? formatTime(sleepTimerRemainingSec) : 'مؤقت النوم'}</span>
                </button>
                {showSleepMenu && (
                  <div className="absolute top-12 left-0 z-20 w-48 bg-card border border-line rounded-xl p-1.5 shadow-2xl shadow-black/50">
                    {[15, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          setSleepTimerMinutes(mins);
                          setSleepTimerRemainingSec(mins * 60);
                          setShowSleepMenu(false);
                        }}
                        className="w-full min-h-10 px-3 rounded-lg text-right text-slate-200 hover:bg-raised flex items-center justify-between cursor-pointer"
                      >
                        بعد {mins} دقيقة
                        {sleepTimerMinutes === mins && <Check className="w-4 h-4 text-accent" />}
                      </button>
                    ))}
                    {sleepTimerMinutes !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          setSleepTimerMinutes(null);
                          setSleepTimerRemainingSec(null);
                          setShowSleepMenu(false);
                        }}
                        className="w-full min-h-10 px-3 rounded-lg text-right text-rose-300 hover:bg-raised cursor-pointer"
                      >
                        إيقاف المؤقت
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-12 py-6">
            {resumePoint && panel === 'listen' && (
              <div className="max-w-[760px] mb-5 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border border-line bg-card">
                <span className="text-[15px]">
                  أكمل من حيث توقفت:{' '}
                  <strong className="text-white">
                    {chapters?.[resumePoint.chapter]?.title || 'الكتاب'} · فقرة {resumePoint.sentence + 1}
                  </strong>
                </span>
                <span className="flex gap-2">
                  <button type="button" onClick={handleResume} className="min-h-10 px-3.5 rounded-lg bg-brand text-white font-semibold cursor-pointer">
                    أكمل
                  </button>
                  <button type="button" onClick={() => setResumePoint(null)} className="min-h-10 px-3.5 rounded-lg border border-line-strong text-slate-300 cursor-pointer">
                    من البداية
                  </button>
                </span>
              </div>
            )}

            {panel === 'listen' && !hideText && (
              <div className="max-w-[760px] flex flex-col gap-1">
                <p className="text-[13px] text-slate-400 mb-2">اضغط على أي فقرة لتبدأ الاستماع منها</p>
                {sentences.map((sent, idx) => {
                  const isActive = idx === activeSentenceIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      ref={isActive ? activeSentenceRef : null}
                      aria-current={isActive}
                      onClick={() => handleSeekSentence(idx)}
                      className={`block w-full text-right px-3 py-2 rounded-lg leading-[2] cursor-pointer transition-colors ${fontClass} ${
                        isActive ? 'bg-accent/10 text-white' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {sent}
                    </button>
                  );
                })}
              </div>
            )}

            {panel === 'listen' && hideText && (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
                <span aria-hidden="true" className="w-[200px] h-[280px] rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-800 flex items-end justify-center p-5 font-display font-extrabold text-xl text-indigo-100">
                  {cleanTitle}
                </span>
                <span className="text-slate-400">{currentChapter?.title || 'وضع الاستماع فقط'}</span>
              </div>
            )}

            {panel !== 'listen' && (
              <div className="max-w-[760px] flex flex-col gap-4">
                <h2 className="font-display font-extrabold text-2xl text-white">
                  {panel === 'summary' ? 'ملخص' : 'أهم النقاط'} {currentChapter ? `· ${currentChapter.title}` : ''}
                </h2>
                {panelLoading ? (
                  <p className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" /> جاري التلخيص بالذكاء الاصطناعي...
                  </p>
                ) : panelText ? (
                  <>
                    <p className="text-slate-300 text-lg leading-[2] whitespace-pre-line">{panelText}</p>
                    <button
                      type="button"
                      onClick={handleListenPanel}
                      className="self-start flex items-center gap-2 min-h-11 px-4 rounded-[10px] border border-line-strong text-white hover:bg-raised cursor-pointer"
                    >
                      {panelPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                      {panelPlaying ? 'إيقاف' : 'استمع إليه'}
                    </button>
                  </>
                ) : (
                  <p className="text-slate-400">تعذّر إنشاء {panel === 'summary' ? 'الملخص' : 'النقاط'} الآن. حاول مرة أخرى.</p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Player bar */}
      <footer className="relative shrink-0 border-t border-raised bg-card px-3 sm:px-6 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-1.5 order-1">
          <button type="button" onClick={() => handleSkipSeconds(-10)} aria-label="الفقرة السابقة" className="w-11 h-11 rounded-full text-slate-300 hover:text-white flex items-center justify-center cursor-pointer">
            <SkipForward className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            className="w-14 h-14 rounded-full bg-gradient-to-l from-[#8b5cf6] to-[#3b82f6] text-white flex items-center justify-center cursor-pointer"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
          <button type="button" onClick={() => handleSkipSeconds(10)} aria-label="الفقرة التالية" className="w-11 h-11 rounded-full text-slate-300 hover:text-white flex items-center justify-center cursor-pointer">
            <SkipBack className="w-5 h-5" />
          </button>
        </div>

        <div className="order-3 sm:order-2 basis-full sm:basis-auto flex-1 flex items-center gap-3 min-w-[200px]">
          <span className="text-[13px] text-slate-400 tabular-nums">{formatTime(elapsedSeconds)}</span>
          <div className="relative flex-1 h-1.5 rounded-full bg-line">
            <div className="absolute top-0 right-0 h-1.5 rounded-full bg-accent" style={{ width: `${progressPercent}%` }} />
            <label className="sr-only" htmlFor="studio-seek">موضع الاستماع</label>
            <input
              id="studio-seek"
              type="range"
              min={0}
              max={100}
              value={progressPercent}
              onChange={(e) => {
                const pct = Number(e.target.value);
                handleSeekSentence(Math.min(sentences.length - 1, Math.floor((pct / 100) * sentences.length)));
              }}
              className="absolute inset-x-0 -top-2 h-6 w-full opacity-0 cursor-pointer"
              style={{ direction: 'rtl' }}
            />
          </div>
          <span className="text-[13px] text-slate-400 tabular-nums">{formatTime(estimatedTotalSeconds)}</span>
        </div>

        <div className="order-2 sm:order-3 flex items-center gap-2 mr-auto sm:mr-0">
          <button
            type="button"
            aria-expanded={showVoicePicker}
            onClick={() => {
              const open = !showVoicePicker;
              closeMenus();
              setShowVoicePicker(open);
            }}
            className="min-h-11 flex items-center gap-2 px-3 rounded-[10px] border border-line-strong text-white text-sm cursor-pointer hover:bg-raised"
          >
            <span className="w-[26px] h-[26px] rounded-full bg-brand-deep text-indigo-200 flex items-center justify-center text-[13px] font-bold">
              {selectedVoice.name.charAt(0)}
            </span>
            <span className="hidden sm:inline">{selectedVoice.name.split(' - ')[0]}</span>
          </button>
          <button
            type="button"
            aria-label="سرعة التشغيل"
            onClick={() => {
              const rates = [1.0, 1.25, 1.5, 2.0, 0.8];
              const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length] || 1.0;
              setPlaybackRate(next);
              if (isPlaying) {
                audioEngine.stop();
                startPlayback(activeSentenceIndex);
              }
            }}
            className="min-w-14 min-h-11 rounded-[10px] border border-line-strong text-white font-semibold text-sm cursor-pointer hover:bg-raised"
          >
            {playbackRate}x
          </button>
          <button
            type="button"
            aria-expanded={showDownloadModal}
            disabled={isGeneratingMp3}
            onClick={() => {
              const open = !showDownloadModal;
              closeMenus();
              setShowDownloadModal(open);
            }}
            className="min-h-11 flex items-center gap-2 px-4 rounded-[10px] bg-brand text-white font-semibold text-sm cursor-pointer hover:bg-indigo-500 disabled:opacity-60"
          >
            {isGeneratingMp3 ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <Download className="w-[18px] h-[18px]" />}
            <span className="hidden sm:inline">{isGeneratingMp3 ? 'جاري التجهيز' : 'تحميل'}</span>
          </button>
        </div>

        {showVoicePicker && (
          <div className="absolute bottom-full mb-2 left-3 sm:left-40 z-30 w-[300px] max-h-[60vh] overflow-y-auto bg-card border border-line rounded-[14px] p-2 shadow-2xl shadow-black/50">
            <div className="text-[13px] text-slate-400 px-2.5 py-1.5">غيّر الصوت دون إعادة التحويل</div>
            {voicesPool.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={selectedVoice.id === v.id}
                onClick={() => {
                  setSelectedVoice(v);
                  setShowVoicePicker(false);
                }}
                className={`w-full min-h-12 flex items-center justify-between px-2.5 rounded-[10px] text-white cursor-pointer ${
                  selectedVoice.id === v.id ? 'bg-raised' : 'hover:bg-raised/60'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-[30px] h-[30px] rounded-full bg-brand-deep text-indigo-200 flex items-center justify-center font-bold">{v.name.charAt(0)}</span>
                  {v.name.split(' - ')[0]}
                </span>
                <span className="text-[13px] text-slate-400">{v.gender === 'female' ? 'امرأة' : 'رجل'}</span>
              </button>
            ))}
          </div>
        )}

        {showDownloadModal && (
          <div className="absolute bottom-full mb-2 left-3 z-30 w-[280px] bg-card border border-line rounded-[14px] p-2 shadow-2xl shadow-black/50">
            <button type="button" onClick={handleDownloadSingleChapter} className="w-full min-h-[52px] px-3 rounded-[10px] text-right text-white hover:bg-raised flex flex-col justify-center leading-snug cursor-pointer">
              <span>هذا الفصل</span>
              <span className="text-xs text-slate-400">{currentChapter?.title || 'الفصل الحالي'}</span>
            </button>
            <button type="button" onClick={handleDownloadFullBook} className="w-full min-h-[52px] px-3 rounded-[10px] text-right text-white hover:bg-raised flex flex-col justify-center leading-snug cursor-pointer">
              <span>الكتاب كاملاً</span>
              <span className="text-xs text-slate-400">كل الفصول في ملف واحد</span>
            </button>
            <p className="px-3 pt-1 pb-1.5 text-[11px] text-slate-500">بصوت {selectedVoice.name.split(' - ')[0]} وسرعة {playbackRate}x</p>
          </div>
        )}
      </footer>

      {/* Download progress */}
      {isGeneratingMp3 && downloadProgressMsg && (
        <div role="status" className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-raised border border-line shadow-2xl shadow-black/50 text-white text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-accent" />
          {downloadProgressMsg}
        </div>
      )}

      {/* Mobile chapters sheet */}
      {chaptersOpen && chapters && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/80" onClick={() => setChaptersOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 inset-x-0 max-h-[70vh] overflow-y-auto bg-card border-t border-line rounded-t-2xl p-4 flex flex-col gap-1"
          >
            {chapterList}
          </div>
        </div>
      )}

      {showChatModal && (
        <ChatPdfModal isOpen={showChatModal} onClose={() => setShowChatModal(false)} job={job} availableVoices={voicesPool} />
      )}
    </div>
  );
};
