import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Download, 
  X, 
  Maximize2, 
  Minimize2, 
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
  Volume2
} from 'lucide-react';
import { ConversionJob, BookChapter } from '../types';
import { audioEngine } from '../lib/audioEngine';

interface AudioPlayerDrawerProps {
  job: ConversionJob | null;
  onClose: () => void;
}

// Clean book filename from ugly web artifacts, underscores, and random numbers
export function cleanBookTitle(rawName: string): string {
  if (!rawName) return 'كتاب صوتي';
  
  // If the title is just a raw hash (like 69fb610a9299e)
  if (/^[a-f0-9]{8,}$/i.test(rawName.trim())) {
    return 'كتاب صوتي عربي';
  }

  const cleaned = rawName
    .replace(/\.(pdf|epub)$/i, '')
    .replace(/_pdf$/i, '')
    .replace(/^https?:\/\/\S+/i, '')
    .replace(/^(foulabook\.com|kutub-pdf\.net|noor-book\.com|kotobati\.com)[_-]?/gi, '')
    .replace(/[_-]\d{3,10}/g, '') // remove random upload IDs like _23971
    .replace(/\(\d+\)/g, '') // remove (1)
    .replace(/[._-]+$/, '')
    .replace(/_+/g, ' ')
    .trim();

  // If after cleaning it's just a hex hash, return fallback
  if (/^[a-f0-9]{8,}$/i.test(cleaned)) {
    return 'كتاب صوتي عربي';
  }

  return cleaned || rawName;
}

// Helper to format seconds as MM:SS
function formatTime(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.floor(Math.max(0, seconds) % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const AudioPlayerDrawer: React.FC<AudioPlayerDrawerProps> = ({ job, onClose }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(0);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [readerFontSize, setReaderFontSize] = useState<'sm' | 'base' | 'lg'>('base');

  // Sleep Timer States (15m, 30m, 45m, end of chapter)
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [sleepTimerRemainingSec, setSleepTimerRemainingSec] = useState<number | null>(null);
  const [showSleepMenu, setShowSleepMenu] = useState<boolean>(false);

  // Multi-chapter support
  const chapters = job?.chapters && job.chapters.length > 0 ? job.chapters : null;
  const initialChapterIndex = chapters 
    ? Math.max(0, chapters.findIndex(c => c.id === job?.activeChapterId))
    : 0;

  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(initialChapterIndex);
  const [showChaptersDrawer, setShowChaptersDrawer] = useState<boolean>(false);
  const [isGeneratingMp3, setIsGeneratingMp3] = useState<boolean>(false);
  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false);
  const [downloadProgressMsg, setDownloadProgressMsg] = useState<string>('');

  const activeSentenceRef = useRef<HTMLDivElement>(null);
  const activePlayIdRef = useRef<number>(0);

  useEffect(() => {
    if (job?.activeChapterId && chapters) {
      const idx = chapters.findIndex(c => c.id === job.activeChapterId);
      if (idx !== -1) {
        setActiveChapterIndex((prev) => (prev !== idx ? idx : prev));
      }
    }
  }, [job?.id, job?.activeChapterId]);

  const currentChapter = chapters ? chapters[activeChapterIndex] : null;

  // Split text into natural, coherent paragraphs/sentence groups to eliminate choppy playback
  const rawFullText = currentChapter?.text || job?.textChunks?.[0] || job?.extractedText || 'تم استخراج النص المكتوب بنجاح للقراءة الصوتية.';
  const fullText = rawFullText
    .replace(/---\s*الصفحة\s*\d+\s*---/gi, '')
    .replace(/\[\s*الصفحة\s*\d+\s*\]/gi, '')
    .replace(/^الصفحة\s*\d+$/gim, '')
    .trim();

  // Smart natural phrasing: combine sentences into fluent narrative segments of ~75 to 90 words each (~35 to 42s)
  const sentences = useMemo(() => {
    const rawUnits = fullText
      .split(/(?<=[.!?؟\n])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !/^الصفحة\s*\d+$/i.test(s) && !/^---\s*الصفحة/i.test(s));

    const merged: string[] = [];
    let currentChunk = '';

    for (const unit of rawUnits) {
      if (!currentChunk) {
        currentChunk = unit;
      } else {
        const currentWords = currentChunk.split(/\s+/).length;
        // Group into narrative paragraphs of ~80 words (~35-42 seconds of speech)
        if (currentWords < 80 || currentChunk.length < 380) {
          currentChunk += ' ' + unit;
        } else {
          merged.push(currentChunk);
          currentChunk = unit;
        }
      }
    }
    if (currentChunk) {
      merged.push(currentChunk);
    }

    return merged.length > 0 ? merged : [fullText];
  }, [fullText]);

  // Compute realistic duration for the current chapter
  const wordsCount = fullText.split(/\s+/).filter(Boolean).length;
  const estimatedTotalSeconds = currentChapter?.estimatedDurationMinutes 
    ? currentChapter.estimatedDurationMinutes * 60 
    : Math.max(30, Math.round(wordsCount * 0.4));

  const elapsedSeconds = Math.round(estimatedTotalSeconds * (progressPercent / 100));
  const remainingSeconds = Math.max(0, estimatedTotalSeconds - elapsedSeconds);

  // Auto-scroll active sentence smoothly into view
  useEffect(() => {
    if (activeSentenceRef.current && isExpanded) {
      activeSentenceRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeSentenceIndex, isExpanded]);

  // Sleep Timer Tick
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
      setSleepTimerRemainingSec((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerRemainingSec]);

  const handleSetSleepTimer = (minutes: number | null) => {
    setSleepTimerMinutes(minutes);
    setShowSleepMenu(false);
    if (minutes === null) {
      setSleepTimerRemainingSec(null);
    } else if (minutes === -1) {
      // End of chapter mode: flag handled on chapter finish
      setSleepTimerRemainingSec(remainingSeconds);
    } else {
      setSleepTimerRemainingSec(minutes * 60);
    }
  };

  useEffect(() => {
    if (!job) return;

    audioEngine.stop();
    if (sentences.length > 0) {
      startPlayback(0);
    }

    return () => {
      activePlayIdRef.current++;
      audioEngine.stop();
    };
  }, [job?.id, activeChapterIndex]);

  const startPlayback = (sentenceIdx: number) => {
    if (!job) return;

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

    // Sync with Native MediaSession (Lock Screen & Bluetooth Headsets)
    if (typeof window !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentChapter ? currentChapter.title : cleanBookTitle(job.fileName),
          artist: job.selectedVoice.name,
          album: 'PDFtoAudio - كتب مسموعة بالذكاء الاصطناعي',
          artwork: [
            {
              src: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=512&h=512&fit=crop&q=80',
              sizes: '512x512',
              type: 'image/jpeg',
            },
          ],
        });

        navigator.mediaSession.playbackState = 'playing';
        navigator.mediaSession.setActionHandler('play', () => {
          setIsPlaying(true);
          audioEngine.resume();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          setIsPlaying(false);
          audioEngine.pause();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          handlePrevChapter();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          handleNextChapter();
        });
      } catch (e) {
        // ignore mediaSession unsupported
      }
    }

    const currentText = sentences[sentenceIdx];
    const progress = Math.round(((sentenceIdx + 1) / sentences.length) * 100);
    setProgressPercent(progress);

    // Proactively pre-fetch the next 3 segments in parallel to ensure 0-second gap
    if (sentenceIdx + 1 < sentences.length) {
      const upcoming = sentences.slice(sentenceIdx + 1, sentenceIdx + 4);
      audioEngine.prefetchBatch(upcoming, job.selectedVoice, playbackRate, 3);
    } else if (chapters && activeChapterIndex < chapters.length - 1) {
      const nextChapter = chapters[activeChapterIndex + 1];
      if (nextChapter && nextChapter.text) {
        const nextSentences = nextChapter.text
          .split(/(?<=[.!?؟\n])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !/^الصفحة\s*\d+$/i.test(s))
          .slice(0, 3);
        if (nextSentences.length > 0) {
          audioEngine.prefetchBatch(nextSentences, job.selectedVoice, playbackRate, 2);
        }
      }
    }

    audioEngine.speak(
      currentText,
      job.selectedVoice,
      job.selectedStyle,
      playbackRate,
      undefined,
      () => {
        if (activePlayIdRef.current !== playId) return;
        if (sentenceIdx + 1 < sentences.length) {
          startPlayback(sentenceIdx + 1);
        } else {
          // Seamless Auto Next Chapter
          if (chapters && activeChapterIndex < chapters.length - 1) {
            if (sleepTimerMinutes === -1) {
              audioEngine.pause();
              setIsPlaying(false);
              setSleepTimerMinutes(null);
              setSleepTimerRemainingSec(null);
            } else {
              setActiveChapterIndex(activeChapterIndex + 1);
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

  const handlePrevChapter = () => {
    if (!chapters || activeChapterIndex <= 0) return;
    audioEngine.stop();
    setActiveChapterIndex(activeChapterIndex - 1);
  };

  const handleNextChapter = () => {
    if (!chapters || activeChapterIndex >= chapters.length - 1) return;
    audioEngine.stop();
    setActiveChapterIndex(activeChapterIndex + 1);
  };

  if (!job) return null;

  const handleTogglePlay = () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      if (activeSentenceIndex >= sentences.length) {
        startPlayback(0);
      } else {
        audioEngine.resume();
        setIsPlaying(true);
      }
    }
  };

  const handleSeekSentence = (idx: number) => {
    startPlayback(idx);
  };

  const handleRateCycle = () => {
    const rates = [1.0, 1.25, 1.5, 2.0, 0.75];
    const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(next);
    if (isPlaying) {
      startPlayback(activeSentenceIndex);
    }
  };

  // Download current active chapter
  const handleDownloadSingleChapter = async () => {
    setShowDownloadModal(false);
    setIsGeneratingMp3(true);
    setDownloadProgressMsg('جاري استخراج ودمج صوت الفصل الحالي...');
    const titleCleaned = cleanBookTitle(job.fileName);
    const chapterTitle = `${titleCleaned}_${currentChapter?.title || `الفصل_${activeChapterIndex + 1}`}`;

    // 1. FAST PATH: Assemble from already-heard audio segments directly with 0 wait time!
    try {
      if (sentences.length > 0) {
        const assembled = await audioEngine.assembleChapterAudio(
          sentences,
          job.selectedVoice,
          playbackRate
        );

        if (assembled && assembled.blob && assembled.blob.size > 1000) {
          const url = URL.createObjectURL(assembled.blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${chapterTitle}.${assembled.ext}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setIsGeneratingMp3(false);
          setDownloadProgressMsg('');
          return;
        }
      }
    } catch (e) {
      console.warn('Instant audio stitch fallback note:', e);
    }

    // 2. SERVER FALLBACK
    try {
      const textToDownload = currentChapter ? currentChapter.text : fullText;
      const res = await fetch('/api/tts/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToDownload,
          voiceId: job.selectedVoice.id,
          voice: job.selectedVoice,
          speed: playbackRate,
          title: chapterTitle,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const isWav = blob.type.includes('wav');
        a.download = `${chapterTitle}.${isWav ? 'wav' : 'mp3'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsGeneratingMp3(false);
        setDownloadProgressMsg('');
        return;
      }
    } catch (e) {
      console.warn('Server MP3 generation note:', e);
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
          job.selectedVoice,
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
          voiceId: job.selectedVoice.id,
          voice: job.selectedVoice,
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

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const cleanedTitle = cleanBookTitle(job.fileName);

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-2 sm:p-4 pointer-events-none" dir="rtl">
      <div className="max-w-2xl mx-auto w-full bg-[#0b101d]/95 rounded-3xl border border-blue-500/30 shadow-2xl shadow-blue-950/90 backdrop-blur-2xl p-4 sm:p-5 text-white pointer-events-auto space-y-3.5 animate-in slide-in-from-bottom duration-300 ring-1 ring-white/10">
        
        {/* Mobile Pull Handle - Visual affordance for touch drawer */}
        <div className="w-12 h-1 bg-slate-700/80 rounded-full mx-auto" />

        {/* 1. Header Bar: Compact, clean, uncluttered */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
          
          {/* Right side: Book artwork & clean title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Vinyl Disc / Mini Album Art */}
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 shrink-0 shadow-lg shadow-blue-600/30">
              <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center overflow-hidden relative">
                <img
                  src={job.selectedVoice.avatar}
                  alt={job.selectedVoice.name}
                  className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105' : 'scale-100 opacity-80'}`}
                />
                {isPlaying && (
                  <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="font-black text-sm sm:text-base text-white truncate max-w-[170px] sm:max-w-xs font-['Tajawal']">
                  {cleanedTitle}
                </h4>
                {job.listeningMode === 'summary' && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shrink-0">
                    ⚡ ملخص 10د
                  </span>
                )}
                {job.listeningMode === 'key_points' && (
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0">
                    🎯 نقاط جوهرية
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 truncate">
                {currentChapter ? (
                  <span className="text-cyan-400 font-bold truncate">
                    {currentChapter.title}
                  </span>
                ) : (
                  <span>{job.selectedVoice.name}</span>
                )}
                <span>•</span>
                <span className="text-slate-400">{job.selectedDialect.flag} {job.selectedDialect.name}</span>
              </div>
            </div>
          </div>

          {/* Left side: Minimal Tool Action Icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            
            {/* Sleep Timer Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSleepMenu(!showSleepMenu)}
                className={`p-2 rounded-xl transition-all ${
                  sleepTimerMinutes !== null
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                }`}
                title="مؤقت النوم"
              >
                <Moon className="w-4 h-4" />
              </button>

              {/* Sleep Timer Dropdown Popover */}
              {showSleepMenu && (
                <div className="absolute left-0 top-11 z-50 w-44 bg-slate-950 rounded-2xl border border-blue-500/30 p-2 shadow-2xl space-y-1 text-xs text-right animate-in fade-in">
                  <p className="px-2 py-1 font-bold text-slate-400 text-[10px] border-b border-slate-800">
                    مؤقت النوم (Sleep Timer)
                  </p>
                  {[
                    { label: 'إيقاف المؤقت', value: null },
                    { label: 'بعد 15 دقيقة', value: 15 },
                    { label: 'بعد 30 دقيقة', value: 30 },
                    { label: 'بعد 45 دقيقة', value: 45 },
                    { label: 'عند نهاية هذا الفصل 📖', value: -1 },
                  ].map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => handleSetSleepTimer(opt.value)}
                      className={`w-full text-right px-2.5 py-1.5 rounded-xl font-medium transition-colors ${
                        sleepTimerMinutes === opt.value
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chapters Toggle (if multi-chapter) */}
            {chapters && chapters.length > 1 && (
              <button
                type="button"
                onClick={() => setShowChaptersDrawer(!showChaptersDrawer)}
                className={`p-2 rounded-xl transition-all ${
                  showChaptersDrawer
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                }`}
                title="قائمة الفصول"
              >
                <Layers className="w-4 h-4" />
              </button>
            )}

            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
              title="مشاركة"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Expand / Minimize Reader */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
              title={isExpanded ? 'تصغير القارئ' : 'توسيع القارئ'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                audioEngine.stop();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer"
              title="إغلاق المشغل"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Multi-Chapter Drawer Quick Switcher (when opened) */}
        {showChaptersDrawer && chapters && chapters.length > 1 && (
          <div className="p-3 bg-slate-950 rounded-2xl border border-blue-500/30 space-y-2 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>فصول الكتاب ({chapters.length} فصول)</span>
              </span>
              <span className="text-[11px] text-slate-500">اختر الفصل للاستماع الفوري</span>
            </div>

            {/* Background Streaming Status Indicator */}
            {job?.isStreamingBackground && (
              <div className="p-2 rounded-xl bg-blue-950/70 border border-blue-500/30 text-[11px] text-cyan-300 flex items-center gap-2 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                <span className="truncate">{job.backgroundStatus || 'جاري تجهيز باقي الفصول في الخلفية...'}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {chapters.map((chap, idx) => {
                const isActive = idx === activeChapterIndex;
                return (
                  <button
                    key={chap.id}
                    onClick={() => {
                      audioEngine.stop();
                      setActiveChapterIndex(idx);
                    }}
                    className={`p-2 rounded-xl border text-right transition-all flex items-center justify-between gap-2 text-xs ${
                      isActive
                        ? 'bg-blue-600/25 border-blue-400 text-white font-bold ring-1 ring-blue-400'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="truncate flex items-center gap-2">
                      <span className={`w-4 h-4 rounded text-[10px] flex items-center justify-center font-bold ${
                        isActive ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="truncate">{chap.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">~{chap.estimatedDurationMinutes} د</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Interactive Time Slider & Scrubbing Bar */}
        <div className="space-y-1.5 px-1">
          {/* Dynamic Waveform Visualizer & Seek track */}
          <div className="relative group">
            {/* Waveform Bars */}
            <div className="flex items-end justify-between gap-0.5 sm:gap-1 h-7 px-1">
              {Array.from({ length: 28 }).map((_, i) => {
                const isPassed = (i / 28) * 100 <= progressPercent;
                const waveHeight = Math.sin((i / 28) * Math.PI) * 70 + (i % 3 === 0 ? 25 : 15);
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-all duration-200 ${
                      isPlaying && isPassed
                        ? 'bg-gradient-to-t from-blue-500 to-cyan-400 animate-pulse'
                        : isPassed
                        ? 'bg-blue-500'
                        : 'bg-slate-800'
                    }`}
                    style={{
                      height: `${isPlaying ? Math.max(20, waveHeight) : Math.max(15, waveHeight * 0.4)}%`,
                    }}
                  />
                );
              })}
            </div>

            {/* Invisible Range Input for Smooth Scrubbing */}
            <input
              type="range"
              min={0}
              max={100}
              value={progressPercent}
              onChange={(e) => {
                const pct = Number(e.target.value);
                const targetIdx = Math.min(
                  sentences.length - 1,
                  Math.floor((pct / 100) * sentences.length)
                );
                handleSeekSentence(targetIdx);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>

          {/* Time Stamps Display: Elapsed and Remaining */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-0.5">
            <span className="text-slate-300 font-bold">{formatTime(elapsedSeconds)}</span>
            
            {sleepTimerRemainingSec !== null && (
              <span className="text-indigo-400 font-sans text-[10px] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>نوم: {formatTime(sleepTimerRemainingSec)}</span>
              </span>
            )}

            <span className="text-slate-500">-{formatTime(remainingSeconds)}</span>
          </div>
        </div>

        {/* 3. Primary Playback Controls - Spacious & Ergonomic */}
        <div className="flex items-center justify-center gap-3 sm:gap-5 py-1">
          
          {/* Previous Chapter */}
          {chapters && chapters.length > 1 && (
            <button
              type="button"
              onClick={handlePrevChapter}
              disabled={activeChapterIndex <= 0}
              className="p-2 sm:p-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-25 transition-all cursor-pointer border border-slate-800/80"
              title="الفصل السابق"
            >
              <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Rewind 10s */}
          <button
            type="button"
            onClick={() => handleSeekSentence(Math.max(0, activeSentenceIndex - 1))}
            className="p-2 sm:p-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-800/80"
            title="رجوع 10 ثوانٍ"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Big Hero Play / Pause Button with Neon Glow */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-xl shadow-blue-600/40 transition-all transform hover:scale-105 active:scale-95 cursor-pointer ring-4 ring-blue-500/20"
            title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-white" />
            ) : (
              <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-white translate-x-[2px]" />
            )}
          </button>

          {/* Forward 10s */}
          <button
            type="button"
            onClick={() => handleSeekSentence(Math.min(sentences.length - 1, activeSentenceIndex + 1))}
            className="p-2 sm:p-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-800/80"
            title="تقديم 10 ثوانٍ"
          >
            <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Next Chapter */}
          {chapters && chapters.length > 1 && (
            <button
              type="button"
              onClick={handleNextChapter}
              disabled={activeChapterIndex >= chapters.length - 1}
              className="p-2 sm:p-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-25 transition-all cursor-pointer border border-slate-800/80"
              title="الفصل التالي"
            >
              <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

        </div>

        {/* 4. Compact Secondary Action Bar (Speed & Download & Font size) */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
          
          {/* Quick Speed Cycle Pill */}
          <button
            type="button"
            onClick={handleRateCycle}
            className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all font-bold flex items-center gap-1 cursor-pointer"
            title="انقر لتغيير سرعة الصوت"
          >
            <span className="text-[10px] text-slate-500 font-normal">السرعة:</span>
            <span className="text-blue-400 font-mono">{playbackRate}x</span>
          </button>

          {/* Font Size Toggle for Reader */}
          {isExpanded && (
            <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-xl border border-slate-800 text-slate-400">
              <span className="text-[10px] text-slate-500 ml-1">الخط:</span>
              <button
                type="button"
                onClick={() => setReaderFontSize('sm')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${readerFontSize === 'sm' ? 'bg-blue-600 text-white' : 'hover:text-white'}`}
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setReaderFontSize('base')}
                className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${readerFontSize === 'base' ? 'bg-blue-600 text-white' : 'hover:text-white'}`}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setReaderFontSize('lg')}
                className={`px-1.5 py-0.5 rounded text-[12px] font-bold ${readerFontSize === 'lg' ? 'bg-blue-600 text-white' : 'hover:text-white'}`}
              >
                A+
              </button>
            </div>
          )}

          {/* Download Button with choices modal trigger */}
          <button
            type="button"
            onClick={() => setShowDownloadModal(true)}
            disabled={isGeneratingMp3}
            className="px-3 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 border border-blue-500/30 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer"
          >
            {isGeneratingMp3 ? (
              <>
                <span className="animate-spin text-xs">⏳</span>
                <span>تجهيز...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>تحميل صوتي</span>
              </>
            )}
          </button>

        </div>

        {/* Download Choices Modal Popup */}
        {showDownloadModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0e1626] border border-blue-500/30 rounded-3xl p-5 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-white">خيارات تحميل الكتاب الصوتي</h3>
                    <p className="text-[10px] text-slate-400">اختر الملف الصوتي المراد تنزيله</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDownloadModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2.5">
                {/* Option 1: Current Chapter */}
                <button
                  type="button"
                  onClick={handleDownloadSingleChapter}
                  className="w-full p-3 rounded-2xl bg-slate-900 hover:bg-blue-950/40 border border-slate-800 hover:border-blue-500/40 text-right transition-all flex items-start justify-between group cursor-pointer"
                >
                  <div className="space-y-0.5 pr-1">
                    <div className="text-xs font-bold text-white group-hover:text-blue-300 flex items-center gap-1.5">
                      <span>📄 تحميل الفصل الحالي فقط</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                        {currentChapter?.title || `الفصل ${activeChapterIndex + 1}`}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      تحميل فوري وسريع للفصل المعروض حالياً بنفس نبرة القارئ وسرعته.
                    </p>
                  </div>
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-400 shrink-0 mt-1" />
                </button>

                {/* Option 2: Full Book */}
                <button
                  type="button"
                  onClick={handleDownloadFullBook}
                  className="w-full p-3 rounded-2xl bg-gradient-to-br from-blue-950/40 to-indigo-950/40 hover:from-blue-900/50 hover:to-indigo-900/50 border border-blue-500/30 hover:border-blue-400/60 text-right transition-all flex items-start justify-between group cursor-pointer"
                >
                  <div className="space-y-0.5 pr-1">
                    <div className="text-xs font-bold text-white group-hover:text-emerald-300 flex items-center gap-1.5">
                      <span>📚 تحميل الكتاب كاملاً (جميع الفصول)</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                        شامل
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      دمج جميع فصول الكتاب في ملف صوتي واحد متكامل للاستماع إليه دون انقطاع.
                    </p>
                  </div>
                  <Layers className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Generating Progress Overlay */}
        {isGeneratingMp3 && downloadProgressMsg && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0e1626] border border-blue-500/30 rounded-3xl p-5 max-w-xs w-full text-center space-y-3 shadow-2xl">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mx-auto text-blue-400 animate-pulse">
                <Download className="w-5 h-5 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white">جاري تجهيز الصوت...</h4>
                <p className="text-[11px] text-blue-300">{downloadProgressMsg}</p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full w-full animate-pulse" />
              </div>
            </div>
          </div>
        )}

        {/* 5. Synchronized Arabic Reader - Soft Glow, Clean Typography & Click-to-Jump */}
        {isExpanded && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-1">
              <span className="flex items-center gap-1.5 text-blue-300">
                <BookOpen className="w-3.5 h-3.5" />
                <span>المتابعة التزامنية (المس جملة للانتقال إليها)</span>
              </span>
              <span>جملة {activeSentenceIndex + 1} من {sentences.length}</span>
            </div>

            <div className="max-h-36 sm:max-h-44 overflow-y-auto p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-2 font-['Tajawal'] text-right">
              {sentences.map((sent, idx) => {
                const isActive = idx === activeSentenceIndex;
                const fontSizeClass = 
                  readerFontSize === 'sm' ? 'text-xs' : 
                  readerFontSize === 'lg' ? 'text-base' : 'text-sm';

                return (
                  <div
                    key={idx}
                    ref={isActive ? activeSentenceRef : null}
                    onClick={() => handleSeekSentence(idx)}
                    className={`p-2.5 sm:p-3 rounded-xl transition-all duration-300 cursor-pointer leading-relaxed ${
                      isActive
                        ? 'bg-blue-950/50 border-r-4 border-blue-400 text-white font-medium shadow-md shadow-blue-950/40 ring-1 ring-blue-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    } ${fontSizeClass}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`w-4 h-4 rounded text-[9px] font-mono flex items-center justify-center shrink-0 mt-0.5 ${
                        isActive ? 'bg-blue-500 text-white font-bold' : 'text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <p className="flex-1">{sent}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
