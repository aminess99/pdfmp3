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
  ChevronUp,
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
import { cleanBookTitle } from '../lib/bookTitle';
import { toast } from '../lib/toast';
import { createShare, shareUrl } from '../lib/shares';
import { ChatPdfModal } from './ChatPdfModal';
import { chaptersAr, minutesAr } from '../lib/arabicPlural';
import { voiceLabel, voiceInitial, genderLabel, dialectLabel } from '../lib/voiceLabel';
import { tr, DIR } from '../lib/i18n';
import { VoiceOptionGroups, groupVoicesByDialect } from './VoiceOptions';

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
  const [playbackRate, setPlaybackRate] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('app_default_speed')) || 1.0;
    } catch {
      return 1.0;
    }
  });
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
  // Full-screen player on phones
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);

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
    return merged.length > 0 ? merged : [fullText || tr("نص الكتاب جاهز للاستماع.", "The book text is ready to listen to.")];
  }, [fullText]);

  // Duration calculations
  const wordsCount = useMemo(() => fullText.split(/\s+/).filter(Boolean).length, [fullText]);
  // ~130 words per minute of Arabic narration (chapter minutes are rounded, too coarse for short texts)
  const estimatedTotalSeconds = Math.max(5, Math.round((wordsCount / 130) * 60));

  // progressPercent marks where the current paragraph starts; add how far into it the audio is
  const [clipFraction, setClipFraction] = useState(0);
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => setClipFraction(audioEngine.getCurrentClipProgress()), 250);
    return () => clearInterval(timer);
  }, [isPlaying]);
  const shownPercent = Math.min(100, progressPercent + (clipFraction * 100) / Math.max(1, sentences.length));

  const elapsedSeconds = Math.round(estimatedTotalSeconds * (shownPercent / 100));
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
    setProgressPercent((sentenceIdx / sentences.length) * 100);
    setClipFraction(0);

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
            const autoNext = (() => {
              try {
                return localStorage.getItem('app_auto_play_next') !== 'false';
              } catch {
                return true;
              }
            })();
            if (sleepTimerMinutes === -1 || !autoNext) {
              audioEngine.pause();
              setIsPlaying(false);
              if (sleepTimerMinutes === -1) {
                setSleepTimerMinutes(null);
                setSleepTimerRemainingSec(null);
              }
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
      },
      () => {
        // The AI voice failed: stop here instead of skipping ahead through the text
        if (activePlayIdRef.current !== playId) return;
        setIsPlaying(false);
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
      } else {
        throw new Error(data.error || 'transform failed');
      }
    } catch (e) {
      console.warn('Panel transform error:', e);
      toast(next === 'summary' ? tr('تعذّر تجهيز الملخص، حاول مرة أخرى.', 'Couldn’t prepare the summary. Please try again.') : tr('تعذّر استخراج أهم النقاط، حاول مرة أخرى.', 'Couldn’t extract the key points. Please try again.'), 'error');
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

  // Share the paragraph being listened to as a public clip page (/s/<id>)
  const [isSharing, setIsSharing] = useState(false);
  const handleShare = async () => {
    if (!isUserLoggedIn) {
      toast(tr("سجّل مجاناً لتشارك مقاطع من كتبك.", "Sign up free to share clips from your books."), 'info');
      if (onRequestAuth) {
        audioEngine.pause();
        setIsPlaying(false);
        onRequestAuth('register');
      }
      return;
    }
    const text = sentences[activeSentenceIndex] || sentences[0] || '';
    if (!text.trim() || isSharing) return;
    setIsSharing(true);
    try {
      const id = await createShare({
        text,
        voiceId: selectedVoice.id,
        bookTitle: cleanTitle,
        chapterTitle: currentChapter?.title || '',
      });
      const url = shareUrl(id);
      if (navigator.share) {
        await navigator.share({ title: cleanTitle, text: tr("استمع لهذا المقطع:", "Listen to this clip:"), url }).catch(() => {});
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast(tr("نسخنا رابط المقطع، الصقه حيث تريد.", "Clip link copied. Paste it anywhere."), 'success');
      }
    } catch (err) {
      console.warn('Share error:', err);
      toast(tr("تعذّر إنشاء رابط المشاركة، حاول مرة أخرى.", "Couldn’t create the share link. Please try again."), 'error');
    } finally {
      setIsSharing(false);
    }
  };

  const cycleSpeed = () => {
    const rates = [1.0, 1.25, 1.5, 2.0, 0.8];
    const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length] || 1.0;
    setPlaybackRate(next);
    if (isPlaying) {
      audioEngine.stop();
      startPlayback(activeSentenceIndex);
    }
  };

  const SLEEP_STEPS: (number | null)[] = [null, 15, 30, 45, 60];
  const cycleSleep = () => {
    const next = SLEEP_STEPS[(SLEEP_STEPS.indexOf(sleepTimerMinutes) + 1) % SLEEP_STEPS.length];
    setSleepTimerMinutes(next);
    setSleepTimerRemainingSec(next === null ? null : next * 60);
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
      setDownloadProgressMsg(tr("جاري استخراج ودمج صوت الفصل الحالي...", "Preparing this chapter’s audio..."));
      const titleCleaned = cleanBookTitle(job.fileName);
      const chapterLabel = currentChapter?.title || tr(`الفصل_${activeChapterIndex + 1}`, `chapter_${activeChapterIndex + 1}`);

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

      if (!res.ok) throw new Error(tr("فشل توليد ملف الصوت", "Audio generation failed"));
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
      toast(tr("تعذّر تجهيز ملف الصوت للتحميل، حاول مرة أخرى.", "Couldn’t prepare the audio file. Please try again."), 'error');
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
      setDownloadProgressMsg(tr("جاري تجهيز وتوليد الكتاب الصوتي كاملاً...", "Preparing the full audiobook..."));
      const titleCleaned = cleanBookTitle(job.fileName);

      const allChaptersList = chapters && chapters.length > 0 ? chapters : [{ text: fullText, title: tr("كامل الكتاب", "Whole book") }];
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
          (pct) => setDownloadProgressMsg(tr(`جاري دمج الفصول بالكامل (${pct}%)...`, `Merging chapters (${pct}%)...`))
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

      if (!res.ok) throw new Error(tr("فشل توليد ملف الصوت", "Audio generation failed"));
      {
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
      toast(tr("تعذّر تجهيز ملف الكتاب كاملاً، جرّب تحميل الفصول واحداً واحداً.", "Couldn’t prepare the whole book. Try downloading chapters one at a time."), 'error');
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
      <div className="text-[13px] text-slate-400 px-2 pb-2">{tr("الفصول", "Chapters")}</div>
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
            className={`w-full min-h-[52px] flex items-center justify-between gap-2 px-3 rounded-[10px] text-start text-[15px] transition-colors ${
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
              {status === 'converting' ? tr(`يُجهَّز ${chap.progress ?? 0}%`, `Preparing ${chap.progress ?? 0}%`) : status === 'pending' ? tr('في الانتظار', 'Queued') : status === 'error' ? tr('تعذّر', 'Failed') : `${chap.estimatedDurationMinutes} ${tr('د', 'min')}`}
            </span>
          </button>
        );
      })}
      {job.isStreamingBackground && (
        <div className="mt-3 p-3.5 rounded-xl bg-card text-[13px] text-slate-400">
          {job.backgroundStatus || tr("ابدأ الاستماع الآن، وتُجهَّز الفصول التالية في الخلفية.", "Start listening now; the next chapters are prepared in the background.")}
        </div>
      )}
    </>
  );

  return (
    <div className="fixed inset-0 z-50 bg-ink text-slate-200 flex flex-col h-[100dvh] w-screen overflow-hidden font-body" dir={DIR}>
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
          <ArrowRight className="w-[18px] h-[18px] ltr:rotate-180" />
          <span className="hidden sm:inline">{isUserLoggedIn ? tr('مكتبتي', 'My library') : tr('رجوع', 'Back')}</span>
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <span aria-hidden="true" className="hidden sm:block w-9 h-12 rounded-md bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-800 shrink-0" />
          <span className="flex flex-col leading-tight min-w-0">
            <span className="font-display font-extrabold text-base sm:text-lg text-white truncate">{cleanTitle}</span>
            <span className="text-[13px] text-slate-400 truncate">
              {job.listeningMode === 'summary' ? tr('ملخص · ', 'Summary · ') : job.listeningMode === 'key_points' ? tr('أهم النقاط · ', 'Key points · ') : ''}
              {chapters ? `${chaptersAr(chapters.length)} · ` : ''}{tr('حوالي', 'about')} {minutesAr(Math.max(1, totalBookMinutes))}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {chapters && chapters.length > 1 && (
            <button type="button" onClick={() => setChaptersOpen(true)} className="md:hidden min-h-11 px-3 text-sm text-brand-soft cursor-pointer">
              {tr("الفصول", "Chapters")}
            </button>
          )}
          <button
            type="button"
            onClick={handleShare}
            disabled={isSharing}
            title={tr("شارك الفقرة الحالية برابط", "Share the current paragraph as a link")}
            className="flex items-center gap-1.5 min-h-11 px-3 text-sm text-brand-soft hover:text-indigo-200 cursor-pointer disabled:opacity-60"
          >
            {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? tr("تم نسخ الرابط", "Link copied") : tr("مشاركة المقطع", "Share clip")}</span>
          </button>
        </div>
      </header>

      {/* Guest banner */}
      {!isUserLoggedIn && (
        <div className="shrink-0 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 bg-brand-deep text-indigo-100 text-sm">
          <span>{tr("تستمع كضيف. سجّل مجاناً لتحفظ الكتاب ومكان توقفك وتحصل على 30 دقيقة.", "You’re listening as a guest. Sign up free to save the book and your place, and get 30 minutes.")}</span>
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
              {tr("سجّل مجاناً", "Sign up free")}
            </button>
          )}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 min-h-0 flex">
        {chapters && chapters.length > 1 && (
          <aside aria-label={tr("الفصول", "Chapters")} className="hidden md:flex w-[300px] shrink-0 border-e border-raised p-4 flex-col gap-1 overflow-y-auto">
            {chapterList}
          </aside>
        )}

        <section className="flex-1 min-w-0 flex flex-col">
          {/* Tabs + reader tools */}
          <div className="flex flex-wrap items-end justify-between gap-2 px-3 sm:px-8 pt-3 border-b border-raised">
            <div role="tablist" aria-label={tr("أدوات الكتاب", "Book tools")} className="flex gap-1 overflow-x-auto no-scrollbar">
              {([
                { id: 'listen', label: tr("استماع", "Listen") },
                { id: 'summary', label: tr("الملخص", "Summary") },
                { id: 'key_points', label: tr("أهم النقاط", "Key points") },
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
                {tr("اسأل الكتاب", "Ask the book")}
              </button>
            </div>
            {panel === 'listen' && (
              <div className="flex items-center gap-1.5 pb-1.5 relative">
                <button
                  type="button"
                  aria-label={tr("تصغير الخط", "Smaller text")}
                  onClick={() => setReaderFontSize(fontSteps[Math.max(0, fontSteps.indexOf(readerFontSize) - 1)])}
                  className="w-10 h-10 rounded-lg border border-line text-slate-300 text-sm cursor-pointer hover:bg-raised"
                >
                  {tr('أ-', 'A-')}
                </button>
                <button
                  type="button"
                  aria-label={tr("تكبير الخط", "Larger text")}
                  onClick={() => setReaderFontSize(fontSteps[Math.min(fontSteps.length - 1, fontSteps.indexOf(readerFontSize) + 1)])}
                  className="w-10 h-10 rounded-lg border border-line text-slate-300 text-lg cursor-pointer hover:bg-raised"
                >
                  {tr('أ+', 'A+')}
                </button>
                <button
                  type="button"
                  aria-pressed={hideText}
                  onClick={() => setHideText(!hideText)}
                  className="min-h-10 px-3 rounded-lg border border-line text-slate-300 text-sm cursor-pointer hover:bg-raised"
                >
                  {hideText ? tr('إظهار النص', 'Show text') : tr('إخفاء النص', 'Hide text')}
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
                  <span className="hidden sm:inline">{sleepTimerRemainingSec !== null ? formatTime(sleepTimerRemainingSec) : tr(tr("مؤقت النوم", "Sleep timer"), 'Sleep timer')}</span>
                </button>
                {showSleepMenu && (
                  <div className="absolute top-12 end-0 z-20 w-48 bg-card border border-line rounded-xl p-1.5 shadow-2xl shadow-black/50">
                    {[15, 30, 45, 60].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          setSleepTimerMinutes(mins);
                          setSleepTimerRemainingSec(mins * 60);
                          setShowSleepMenu(false);
                        }}
                        className="w-full min-h-10 px-3 rounded-lg text-start text-slate-200 hover:bg-raised flex items-center justify-between cursor-pointer"
                      >
                        {tr(`بعد ${mins} دقيقة`, `In ${mins} minutes`)}
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
                        className="w-full min-h-10 px-3 rounded-lg text-start text-rose-300 hover:bg-raised cursor-pointer"
                      >
                        {tr("إيقاف المؤقت", "Turn off timer")}
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
                  {tr('أكمل من حيث توقفت:', 'Continue where you left off:')}{' '}
                  <strong className="text-white">
                    {chapters?.[resumePoint.chapter]?.title || tr('الكتاب', 'Book')} · {tr('فقرة', 'paragraph')} {resumePoint.sentence + 1}
                  </strong>
                </span>
                <span className="flex gap-2">
                  <button type="button" onClick={handleResume} className="min-h-10 px-3.5 rounded-lg bg-brand text-white font-semibold cursor-pointer">
                    {tr("أكمل", "Continue")}
                  </button>
                  <button type="button" onClick={() => setResumePoint(null)} className="min-h-10 px-3.5 rounded-lg border border-line-strong text-slate-300 cursor-pointer">
                    {tr("من البداية", "From the start")}
                  </button>
                </span>
              </div>
            )}

            {panel === 'listen' && !hideText && (
              <div className="max-w-[760px] flex flex-col gap-1">
                <p className="text-[13px] text-slate-400 mb-2">{tr("اضغط على أي فقرة لتبدأ الاستماع منها", "Tap any paragraph to start listening from there")}</p>
                {sentences.map((sent, idx) => {
                  const isActive = idx === activeSentenceIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      ref={isActive ? activeSentenceRef : null}
                      aria-current={isActive}
                      onClick={() => handleSeekSentence(idx)}
                      dir="auto"
                      className={`block w-full text-start px-3 py-2 rounded-lg leading-[2] cursor-pointer transition-colors ${fontClass} ${
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
                <span className="text-slate-400">{currentChapter?.title || tr("وضع الاستماع فقط", "Listening mode")}</span>
              </div>
            )}

            {panel !== 'listen' && (
              <div className="max-w-[760px] flex flex-col gap-4">
                <h2 className="font-display font-extrabold text-2xl text-white">
                  {panel === 'summary' ? tr('ملخص', 'Summary') : tr(tr("أهم النقاط", "Key points"), 'Key points')} {currentChapter ? `· ${currentChapter.title}` : ''}
                </h2>
                {panelLoading ? (
                  <p className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" /> {tr('جاري التلخيص بالذكاء الاصطناعي...', 'Summarizing with AI...')}
                  </p>
                ) : panelText ? (
                  <>
                    <p dir="auto" className="text-slate-300 text-lg leading-[2] whitespace-pre-line">{panelText}</p>
                    <button
                      type="button"
                      onClick={handleListenPanel}
                      className="self-start flex items-center gap-2 min-h-11 px-4 rounded-[10px] border border-line-strong text-white hover:bg-raised cursor-pointer"
                    >
                      {panelPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                      {panelPlaying ? tr('إيقاف', 'Stop') : tr('استمع إليه', 'Listen to it')}
                    </button>
                  </>
                ) : (
                  <p className="text-slate-400">{panel === 'summary' ? tr('تعذّر إنشاء الملخص الآن. حاول مرة أخرى.', 'Couldn’t create the summary right now. Please try again.') : tr('تعذّر إنشاء النقاط الآن. حاول مرة أخرى.', 'Couldn’t create the key points right now. Please try again.')}</p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Player bar */}
      <footer className="relative shrink-0 border-t border-raised bg-card px-3 sm:px-6 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {/* Phone: compact bar that opens the full-screen player */}
        <div className="md:hidden w-full flex items-center gap-3">
          <button
            type="button"
            onClick={() => setNowPlayingOpen(true)}
            aria-label={tr("فتح المشغّل", "Open player")}
            className="flex-1 min-w-0 flex items-center gap-3 text-start cursor-pointer"
          >
            <span aria-hidden="true" className="w-11 h-11 rounded-lg bg-gradient-to-br from-indigo-700 to-slate-900 border border-indigo-800 flex items-center justify-center shrink-0">
              <ChevronUp className="w-5 h-5 text-indigo-200" />
            </span>
            <span className="flex flex-col leading-tight min-w-0">
              <span className="text-white text-[15px] font-semibold truncate">{currentChapter?.title || cleanTitle}</span>
              <span className="text-[13px] text-slate-400 tabular-nums">
                <bdi dir="ltr">{formatTime(elapsedSeconds)} / {formatTime(estimatedTotalSeconds)}</bdi> · {voiceLabel(selectedVoice)}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={isPlaying ? tr("إيقاف مؤقت", "Pause") : tr("تشغيل", "Play")}
            className="w-12 h-12 rounded-full bg-gradient-to-l from-[#8b5cf6] to-[#3b82f6] text-white flex items-center justify-center shrink-0 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
          <span className="absolute top-0 inset-x-0 h-0.5 bg-line" aria-hidden="true">
            <span className="absolute top-0 start-0 h-0.5 bg-accent" style={{ width: `${shownPercent}%` }} />
          </span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 order-1">
          <button type="button" onClick={() => handleSkipSeconds(-10)} aria-label={tr("الفقرة السابقة", "Previous paragraph")} className="w-11 h-11 rounded-full text-slate-300 hover:text-white flex items-center justify-center cursor-pointer">
            <SkipForward className="w-5 h-5 ltr:rotate-180" />
          </button>
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={isPlaying ? tr("إيقاف مؤقت", "Pause") : tr("تشغيل", "Play")}
            className="w-14 h-14 rounded-full bg-gradient-to-l from-[#8b5cf6] to-[#3b82f6] text-white flex items-center justify-center cursor-pointer"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
          <button type="button" onClick={() => handleSkipSeconds(10)} aria-label={tr("الفقرة التالية", "Next paragraph")} className="w-11 h-11 rounded-full text-slate-300 hover:text-white flex items-center justify-center cursor-pointer">
            <SkipBack className="w-5 h-5 ltr:rotate-180" />
          </button>
        </div>

        <div className="hidden md:flex order-2 flex-1 items-center gap-3 min-w-[200px]">
          <span className="text-[13px] text-slate-400 tabular-nums">{formatTime(elapsedSeconds)}</span>
          <div className="relative flex-1 h-1.5 rounded-full bg-line">
            <div className="absolute top-0 start-0 h-1.5 rounded-full bg-accent" style={{ width: `${shownPercent}%` }} />
            <label className="sr-only" htmlFor="studio-seek">{tr("موضع الاستماع", "Listening position")}</label>
            <input
              id="studio-seek"
              type="range"
              min={0}
              max={100}
              value={Math.round(shownPercent)}
              onChange={(e) => {
                const pct = Number(e.target.value);
                handleSeekSentence(Math.min(sentences.length - 1, Math.floor((pct / 100) * sentences.length)));
              }}
              className="absolute inset-x-0 -top-2 h-6 w-full opacity-0 cursor-pointer"
              style={{ direction: DIR }}
            />
          </div>
          <span className="text-[13px] text-slate-400 tabular-nums">{formatTime(estimatedTotalSeconds)}</span>
        </div>

        <div className="hidden md:flex order-3 items-center gap-2">
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
              {voiceInitial(selectedVoice)}
            </span>
            <span className="hidden sm:inline">{voiceLabel(selectedVoice)}</span>
          </button>
          <button
            type="button"
            aria-label={tr("سرعة التشغيل", "Playback speed")}
            onClick={cycleSpeed}
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
            <span className="hidden sm:inline">{isGeneratingMp3 ? tr('جاري التجهيز', 'Preparing') : tr(tr("تحميل", "Download"), 'Download')}</span>
          </button>
        </div>

        {showVoicePicker && (
          <div className="absolute bottom-full mb-2 end-3 sm:end-40 z-30 w-[300px] max-h-[60vh] overflow-y-auto bg-card border border-line rounded-[14px] p-2 shadow-2xl shadow-black/50">
            <div className="text-[13px] text-slate-400 px-2.5 py-1.5">{tr("غيّر الصوت دون إعادة التحويل", "Change the voice without converting again")}</div>
            {groupVoicesByDialect(voicesPool).map(({ dialect, voices: list }) => (
              <div key={dialect.id} role="group" aria-label={dialectLabel(dialect)}>
                <div className="sticky top-0 bg-card text-[12px] font-semibold text-slate-400 px-2.5 pt-2.5 pb-1">
                  {dialect.flag} {dialectLabel(dialect)}
                </div>
                {list.map((v) => (
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
                  <span className="w-[30px] h-[30px] rounded-full bg-brand-deep text-indigo-200 flex items-center justify-center font-bold">{voiceInitial(v)}</span>
                  {voiceLabel(v)}
                </span>
                <span className="text-[13px] text-slate-400">{genderLabel(v)}</span>
              </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {showDownloadModal && (
          <div className="absolute bottom-full mb-2 end-3 z-30 w-[280px] bg-card border border-line rounded-[14px] p-2 shadow-2xl shadow-black/50">
            <button type="button" onClick={handleDownloadSingleChapter} className="w-full min-h-[52px] px-3 rounded-[10px] text-start text-white hover:bg-raised flex flex-col justify-center leading-snug cursor-pointer">
              <span>{tr("هذا الفصل", "This chapter")}</span>
              <span className="text-xs text-slate-400">{currentChapter?.title || tr("الفصل الحالي", "Current chapter")}</span>
            </button>
            <button type="button" onClick={handleDownloadFullBook} className="w-full min-h-[52px] px-3 rounded-[10px] text-start text-white hover:bg-raised flex flex-col justify-center leading-snug cursor-pointer">
              <span>{tr("الكتاب كاملاً", "Whole book")}</span>
              <span className="text-xs text-slate-400">{tr("كل الفصول في ملف واحد", "All chapters in one file")}</span>
            </button>
            <p className="px-3 pt-1 pb-1.5 text-[11px] text-slate-500">{tr('بصوت', 'Voice:')} {voiceLabel(selectedVoice)} · {tr(tr("السرعة", "Speed"), 'speed')} {playbackRate}x</p>
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

      {/* Phone: full-screen now playing */}
      {nowPlayingOpen && (
        <div role="dialog" aria-modal="true" aria-label={tr("المشغّل", "Player")} className="md:hidden fixed inset-0 z-[55] bg-ink flex flex-col px-5 pt-3 pb-6 overflow-y-auto">
          <div className="flex items-center justify-between shrink-0">
            <button type="button" onClick={() => setNowPlayingOpen(false)} aria-label={tr("إغلاق المشغّل", "Close player")} className="w-11 h-11 -ms-2 rounded-full text-slate-300 flex items-center justify-center cursor-pointer">
              <ChevronDown className="w-6 h-6" />
            </button>
            <span className="text-sm text-slate-400">{tr("يُشغَّل الآن", "Now playing")}</span>
            {chapters && chapters.length > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setNowPlayingOpen(false);
                  setChaptersOpen(true);
                }}
                className="min-h-11 px-2 text-sm text-brand-soft cursor-pointer"
              >
                {tr("الفصول", "Chapters")}
              </button>
            ) : (
              <span className="w-11" />
            )}
          </div>

          <div className="flex-1 flex flex-col justify-center gap-6 py-4">
            <div
              aria-hidden="true"
              className="w-full max-w-[260px] aspect-square mx-auto rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-900 to-slate-900 border border-indigo-800 flex flex-col items-center justify-center gap-3 p-6 text-center shadow-2xl shadow-indigo-950/60"
            >
              <img src="/brand/icon-192.png" alt="" width={64} height={64} className="w-16 h-16 opacity-90" />
              <span className="font-display font-extrabold text-xl text-white leading-snug line-clamp-3">{cleanTitle}</span>
            </div>

            <div className="flex flex-col gap-1 text-center">
              <span className="font-display font-extrabold text-xl text-white truncate">{currentChapter?.title || cleanTitle}</span>
              <span className="text-sm text-slate-400">{voiceLabel(selectedVoice)}</span>
            </div>

            {!hideText && sentences[activeSentenceIndex] && (
              <p dir="auto" className="text-slate-300 text-[17px] leading-[1.9] text-center line-clamp-4">{sentences[activeSentenceIndex]}</p>
            )}

            <div className="flex flex-col gap-1.5">
              <div className="relative h-1.5 rounded-full bg-line">
                <div className="absolute top-0 start-0 h-1.5 rounded-full bg-accent" style={{ width: `${shownPercent}%` }} />
                <label className="sr-only" htmlFor="np-seek">{tr("موضع الاستماع", "Listening position")}</label>
                <input
                  id="np-seek"
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(shownPercent)}
                  onChange={(e) => {
                    const pct = Number(e.target.value);
                    handleSeekSentence(Math.min(sentences.length - 1, Math.floor((pct / 100) * sentences.length)));
                  }}
                  className="absolute inset-x-0 -top-3 h-8 w-full opacity-0 cursor-pointer"
                  style={{ direction: DIR }}
                />
              </div>
              <div className="flex justify-between text-[13px] text-slate-400 tabular-nums">
                <span>{formatTime(elapsedSeconds)}</span>
                <span>{formatTime(estimatedTotalSeconds)}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6">
              <button type="button" onClick={() => handleSkipSeconds(-10)} aria-label={tr("الفقرة السابقة", "Previous paragraph")} className="w-14 h-14 rounded-full text-slate-200 flex items-center justify-center cursor-pointer">
                <SkipForward className="w-7 h-7 ltr:rotate-180" />
              </button>
              <button
                type="button"
                onClick={handleTogglePlay}
                aria-label={isPlaying ? tr("إيقاف مؤقت", "Pause") : tr("تشغيل", "Play")}
                className="w-20 h-20 rounded-full bg-white text-ink flex items-center justify-center cursor-pointer"
              >
                {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current" />}
              </button>
              <button type="button" onClick={() => handleSkipSeconds(10)} aria-label={tr("الفقرة التالية", "Next paragraph")} className="w-14 h-14 rounded-full text-slate-200 flex items-center justify-center cursor-pointer">
                <SkipBack className="w-7 h-7 ltr:rotate-180" />
              </button>
            </div>
          </div>

          <div className="shrink-0 grid grid-cols-4 gap-2">
            <label className="relative min-h-14 rounded-xl bg-card border border-line flex flex-col items-center justify-center text-[12px] text-slate-400 cursor-pointer">
              <span className="w-6 h-6 rounded-full bg-brand-deep text-indigo-200 flex items-center justify-center text-[12px] font-bold">{voiceInitial(selectedVoice)}</span>
              {tr("الصوت", "Voice")}
              <select
                value={selectedVoice.id}
                onChange={(e) => {
                  const v = voicesPool.find((x) => x.id === e.target.value);
                  if (v) setSelectedVoice(v);
                }}
                aria-label={tr("الصوت", "Voice")}
                className="absolute inset-0 opacity-0 cursor-pointer"
              >
                <VoiceOptionGroups voices={voicesPool} />
              </select>
            </label>
            <button type="button" onClick={cycleSpeed} aria-label={tr("سرعة التشغيل", "Playback speed")} className="min-h-14 rounded-xl bg-card border border-line flex flex-col items-center justify-center text-[12px] text-slate-400 cursor-pointer">
              <span className="text-white font-semibold text-[15px]">{playbackRate}x</span>
              {tr("السرعة", "Speed")}
            </button>
            <button
              type="button"
              onClick={cycleSleep}
              aria-label={tr("مؤقت النوم", "Sleep timer")}
              className={`min-h-14 rounded-xl bg-card border flex flex-col items-center justify-center text-[12px] cursor-pointer ${
                sleepTimerRemainingSec !== null ? 'border-accent text-accent' : 'border-line text-slate-400'
              }`}
            >
              <Moon className="w-5 h-5" />
              {sleepTimerRemainingSec !== null ? formatTime(sleepTimerRemainingSec) : tr("النوم", "Sleep")}
            </button>
            <button
              type="button"
              onClick={handleDownloadSingleChapter}
              disabled={isGeneratingMp3}
              aria-label={tr("تحميل هذا الفصل", "Download this chapter")}
              className="min-h-14 rounded-xl bg-card border border-line flex flex-col items-center justify-center text-[12px] text-slate-400 cursor-pointer disabled:opacity-60"
            >
              {isGeneratingMp3 ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              {tr("تحميل", "Download")}
            </button>
          </div>
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
