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
  MessageSquare
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

  const activeSentenceRef = useRef<HTMLDivElement>(null);
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

  // Start playback whenever chapter or job changes
  useEffect(() => {
    audioEngine.stop();
    if (sentences.length > 0) {
      startPlayback(0);
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

  return (
    <div className="fixed inset-0 z-50 bg-[#090d16] text-white flex flex-col h-screen w-screen overflow-hidden font-['Cairo',sans-serif]" dir="rtl">
      
      {/* 1. Top Navbar Header */}
      <header className="h-16 px-4 sm:px-6 bg-[#0c1220] border-b border-blue-900/40 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => {
              audioEngine.stop();
              onExit();
            }}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold shrink-0"
            title={isUserLoggedIn ? 'الرجوع إلى لوحة التحكم' : 'الرجوع للرئيسية'}
          >
            <ArrowRight className="w-4 h-4" />
            <span className="hidden sm:inline">{isUserLoggedIn ? 'لوحة التحكم' : 'الرئيسية'}</span>
          </button>

          <div className="h-6 w-[1px] bg-slate-800 shrink-0" />

          {/* Book Title & Chapter status */}
          <div className="truncate min-w-0">
            <h1 className="text-sm sm:text-base font-black text-white truncate flex items-center gap-2">
              <span className="truncate">{cleanTitle}</span>
              {job.listeningMode === 'summary' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                  ملخص مركز (10 د)
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-400 truncate">
              {currentChapter ? currentChapter.title : 'قراءة صوتية كاملة'} • {wordsCount} كلمة • {formatTime(estimatedTotalSeconds)}
            </p>
          </div>
        </div>

        {/* Actions on Left (Voice Selector & Download) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Quick Voice Selector Badge */}
          <div className="relative">
            <button
              onClick={() => setShowVoicePicker(!showVoicePicker)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-950/80 to-indigo-950/80 border border-blue-500/40 hover:border-blue-400 flex items-center gap-2 text-xs font-bold text-white transition-all shadow-sm"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] text-white">
                {selectedVoice.name.slice(0, 1)}
              </div>
              <span className="hidden sm:inline text-blue-200">القارئ:</span>
              <span className="truncate max-w-[90px]">{selectedVoice.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-blue-300" />
            </button>

            {/* Voice Dropdown */}
            {showVoicePicker && (
              <div className="absolute left-0 mt-2 w-72 max-h-80 overflow-y-auto bg-[#0d1424] border border-blue-500/40 rounded-2xl shadow-2xl p-2 z-50 space-y-1.5 custom-scrollbar">
                <div className="p-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>اختر القارئ الصوتي ({voicesPool.length} صوتاً)</span>
                </div>
                {voicesPool.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVoice(v);
                      setShowVoicePicker(false);
                    }}
                    className={`w-full text-right p-2.5 rounded-xl text-xs flex items-center justify-between transition-all ${
                      selectedVoice.id === v.id
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-xs shrink-0">
                        {v.avatar ? (
                          <img src={v.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{v.gender === 'female' ? '👩' : '👨'}</span>
                        )}
                      </div>
                      <div className="truncate">
                        <div className="font-bold flex items-center gap-1.5">
                          <span className="truncate">{v.name}</span>
                          <span className="text-[10px] text-slate-400">
                            {v.gender === 'female' ? 'أنثى' : 'ذكر'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{v.recommendedFor || v.description}</div>
                      </div>
                    </div>
                    {selectedVoice.id === v.id && <Check className="w-4 h-4 text-white shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat with PDF / Book AI Assistant */}
          <button
            onClick={() => {
              audioEngine.pause();
              setIsPlaying(false);
              setShowChatModal(true);
            }}
            className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-950/90 to-indigo-950/90 hover:from-purple-900 hover:to-indigo-900 border border-purple-500/40 text-purple-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-purple-950/40 cursor-pointer"
            title="تحدث واسأل كتابك بالذكاء الاصطناعي"
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">اسأل الكتاب (Chat)</span>
          </button>

          {/* Download Audio Button with Choice Menu */}
          <button
            onClick={() => setShowDownloadModal(true)}
            disabled={isGeneratingMp3}
            className="px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
            title="خيارات تحميل الكتاب الصوتي"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isGeneratingMp3 ? 'جاري التجهيز...' : 'تحميل صوتي'}</span>
          </button>
        </div>
      </header>

      {/* Download Choice Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1626] border border-blue-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">خيارات تحميل الكتاب الصوتي</h3>
                  <p className="text-[11px] text-slate-400">اختر ما ترغب في تنزيله إلى جهازك</p>
                </div>
              </div>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 pt-1">
              {/* Option 1: Current Chapter */}
              <button
                onClick={handleDownloadSingleChapter}
                className="w-full p-4 rounded-2xl bg-slate-900/90 hover:bg-blue-900/30 border border-slate-700/70 hover:border-blue-500/50 text-right transition-all flex items-start justify-between group"
              >
                <div className="space-y-1 pr-2">
                  <div className="text-xs font-bold text-white group-hover:text-blue-300 flex items-center gap-1.5">
                    <span>📄 تحميل الفصل الحالي فقط</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                      {currentChapter?.title || `الفصل ${activeChapterIndex + 1}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    تحميل فوري وسريع للفصل المعروض حالياً بنفس نبرة القارئ والسرعة.
                  </p>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-400 shrink-0 mt-1" />
              </button>

              {/* Option 2: Full Book */}
              <button
                onClick={handleDownloadFullBook}
                className="w-full p-4 rounded-2xl bg-gradient-to-br from-blue-950/40 to-indigo-950/40 hover:from-blue-900/50 hover:to-indigo-900/50 border border-blue-500/30 hover:border-blue-400/60 text-right transition-all flex items-start justify-between group"
              >
                <div className="space-y-1 pr-2">
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300 flex items-center gap-1.5">
                    <span>📚 تحميل الكتاب كاملاً (جميع الفصول)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                      شامل
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    دمج جميع فصول الكتاب في ملف صوتي واحد متكامل للاستماع إليه دون انقطاع.
                  </p>
                </div>
                <Layers className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
              </button>
            </div>

            <div className="pt-2 text-[10px] text-slate-500 text-center">
              الصوت المحمل يطابق تماماً القارئ ({selectedVoice.name}) والسرعة ({playbackRate}x).
            </div>
          </div>
        </div>
      )}

      {/* Generating Progress Overlay */}
      {isGeneratingMp3 && downloadProgressMsg && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e1626] border border-blue-500/30 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mx-auto text-blue-400 animate-pulse">
              <Download className="w-6 h-6 animate-bounce" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">جاري تحضير ملف الصوت...</h4>
              <p className="text-xs text-blue-300">{downloadProgressMsg}</p>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full w-full animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* 2. Middle Body: Dual Canvas (Left: Chapters, Center/Right: Synced Text Canvas) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Chapters Sidebar (Collapsible or visible if multiple chapters) */}
        {chapters && chapters.length > 1 && (
          <aside className="w-64 sm:w-72 bg-[#0a0f1d] border-l border-blue-900/30 flex flex-col shrink-0 overflow-hidden hidden md:flex">
            <div className="p-3 border-b border-blue-900/30 flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>فهرس فصول الكتاب ({chapters.length})</span>
              </span>
            </div>

            {/* Background Streaming Progress Indicator */}
            {job.isStreamingBackground && (
              <div className="m-2 p-2.5 rounded-xl bg-gradient-to-r from-blue-950/80 to-indigo-950/80 border border-blue-500/40 text-[11px] text-blue-200 flex items-center gap-2 shadow-lg animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                <span className="truncate">{job.backgroundStatus || 'جاري تجهيز باقي الفصول في الخلفية...'}</span>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
              {chapters.map((chap, idx) => {
                const isActive = idx === activeChapterIndex;
                return (
                  <button
                    key={chap.id}
                    onClick={() => {
                      if (activeChapterIndex !== idx) {
                        setActiveChapterIndex(idx);
                        setActiveSentenceIndex(0);
                      }
                    }}
                    className={`w-full text-right p-3 rounded-xl transition-all text-xs flex items-center justify-between gap-2 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isActive ? 'bg-white text-blue-700' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="truncate">{chap.title}</span>
                    </div>
                    <span className="text-[10px] opacity-75 shrink-0">~{chap.estimatedDurationMinutes} د</span>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* Center Reader Canvas: 0-Scroll Studio experience with synchronized active sentence highlight */}
        <section className="flex-1 flex flex-col bg-[#0b101c] overflow-hidden relative">
          
          {/* Reader Top Controls (Font size, Text share) */}
          <div className="h-10 px-4 sm:px-6 bg-[#0c1222]/80 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400 shrink-0">
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>وضع القراءة والمتابعة الحية</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">حجم الخط:</span>
              <button
                onClick={() => setReaderFontSize('sm')}
                className={`px-1.5 py-0.5 rounded text-[11px] ${readerFontSize === 'sm' ? 'bg-blue-600 text-white font-bold' : 'hover:text-white'}`}
              >
                صغير
              </button>
              <button
                onClick={() => setReaderFontSize('base')}
                className={`px-1.5 py-0.5 rounded text-[11px] ${readerFontSize === 'base' ? 'bg-blue-600 text-white font-bold' : 'hover:text-white'}`}
              >
                متوسط
              </button>
              <button
                onClick={() => setReaderFontSize('lg')}
                className={`px-1.5 py-0.5 rounded text-[11px] ${readerFontSize === 'lg' ? 'bg-blue-600 text-white font-bold' : 'hover:text-white'}`}
              >
                كبير
              </button>
            </div>
          </div>

          {/* Reader Text Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-10 max-w-4xl mx-auto w-full space-y-4 custom-scrollbar">
            {sentences.map((sent, idx) => {
              const isActive = idx === activeSentenceIndex;
              return (
                <div
                  key={idx}
                  ref={isActive ? activeSentenceRef : null}
                  onClick={() => handleSeekSentence(idx)}
                  className={`p-3.5 sm:p-4 rounded-2xl transition-all duration-300 cursor-pointer leading-relaxed ${
                    readerFontSize === 'sm' ? 'text-sm' : readerFontSize === 'base' ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl leading-loose'
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-900/50 via-indigo-900/40 to-blue-900/50 text-cyan-200 border border-blue-500/50 shadow-xl shadow-blue-950/50 font-bold scale-[1.01]'
                      : 'text-slate-300 hover:bg-slate-800/40 hover:text-white border border-transparent'
                  }`}
                >
                  <p>{sent}</p>
                </div>
              );
            })}
          </div>

        </section>

      </div>

      {/* 3. Bottom Player Bar - Sleek, Fixed, No-Scroll Controls */}
      <footer className="h-28 sm:h-24 bg-[#0a0e1a] border-t border-blue-900/50 px-4 sm:px-8 flex flex-col justify-center shrink-0 z-30 space-y-2">
        
        {/* Waveform & Scrubber Slider */}
        <div className="w-full max-w-4xl mx-auto space-y-1">
          <div className="relative group">
            {/* Waveform Bars */}
            <div className="flex items-end justify-between gap-0.5 sm:gap-1 h-6 px-1">
              {Array.from({ length: 42 }).map((_, i) => {
                const isPassed = (i / 42) * 100 <= progressPercent;
                const waveHeight = Math.sin((i / 42) * Math.PI) * 75 + (i % 3 === 0 ? 25 : 15);
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-full transition-all duration-150 ${
                      isPlaying && isPassed
                        ? 'bg-gradient-to-t from-blue-500 to-cyan-400'
                        : isPassed
                        ? 'bg-blue-600'
                        : 'bg-slate-800'
                    }`}
                    style={{
                      height: `${isPlaying ? Math.max(20, waveHeight) : Math.max(15, waveHeight * 0.35)}%`,
                    }}
                  />
                );
              })}
            </div>

            {/* Scrub Input */}
            <input
              type="range"
              min={0}
              max={100}
              value={progressPercent}
              onChange={(e) => {
                const pct = Number(e.target.value);
                const targetIdx = Math.min(sentences.length - 1, Math.floor((pct / 100) * sentences.length));
                handleSeekSentence(targetIdx);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>

          {/* Time & Progress Info */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="text-slate-200 font-bold">{formatTime(elapsedSeconds)}</span>
            <span className="text-blue-400 font-sans font-bold text-[10px]">
              فقرة {activeSentenceIndex + 1} من {sentences.length}
            </span>
            <span className="text-slate-400">-{formatTime(remainingSeconds)}</span>
          </div>
        </div>

        {/* Primary Controls Row */}
        <div className="w-full max-w-4xl mx-auto flex items-center justify-between">
          
          {/* Left: Speed selector */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500 hidden sm:inline ml-1">السرعة:</span>
            {[0.8, 1.0, 1.2, 1.5, 2.0].map((rate) => (
              <button
                key={rate}
                onClick={() => {
                  setPlaybackRate(rate);
                  if (isPlaying) {
                    audioEngine.stop();
                    startPlayback(activeSentenceIndex);
                  }
                }}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-all ${
                  playbackRate === rate
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white bg-slate-800/60'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Center: Playback Buttons */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Skip -10s */}
            <button
              onClick={() => handleSkipSeconds(-10)}
              className="p-2 text-slate-400 hover:text-white transition-transform active:scale-95"
              title="تراجع 10 ثوانٍ"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Play / Pause Primary Button */}
            <button
              onClick={handleTogglePlay}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 transition-transform active:scale-95"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-white" />
              ) : (
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white translate-x-[-1px]" />
              )}
            </button>

            {/* Skip +10s */}
            <button
              onClick={() => handleSkipSeconds(10)}
              className="p-2 text-slate-400 hover:text-white transition-transform active:scale-95"
              title="تقديم 10 ثوانٍ"
            >
              <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Right: Sleep Timer Menu */}
          <div className="relative">
            <button
              onClick={() => setShowSleepMenu(!showSleepMenu)}
              className={`p-2 rounded-xl text-xs flex items-center gap-1.5 transition-all ${
                sleepTimerRemainingSec !== null
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-white bg-slate-800/60'
              }`}
              title="مؤقت النوم"
            >
              <Moon className="w-4 h-4" />
              <span className="hidden sm:inline">
                {sleepTimerRemainingSec !== null ? formatTime(sleepTimerRemainingSec) : 'مؤقت النوم'}
              </span>
            </button>

            {showSleepMenu && (
              <div className="absolute left-0 bottom-full mb-2 w-48 bg-[#0d1424] border border-blue-500/30 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
                <div className="text-[10px] text-slate-400 px-2 py-1">إيقاف القراءة تلقائياً بعد:</div>
                {[15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => {
                      setSleepTimerMinutes(mins);
                      setSleepTimerRemainingSec(mins * 60);
                      setShowSleepMenu(false);
                    }}
                    className="w-full text-right p-2 rounded-lg text-xs hover:bg-slate-800 text-slate-300 flex items-center justify-between"
                  >
                    <span>{mins} دقيقة</span>
                    {sleepTimerMinutes === mins && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setSleepTimerMinutes(null);
                    setSleepTimerRemainingSec(null);
                    setShowSleepMenu(false);
                  }}
                  className="w-full text-right p-2 rounded-lg text-xs hover:bg-red-950/40 text-red-400 border-t border-slate-800 mt-1"
                >
                  تعطيل المؤقت
                </button>
              </div>
            )}
          </div>

        </div>

      </footer>

      {/* Chat With PDF Modal */}
      {showChatModal && (
        <ChatPdfModal
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
          job={job}
          availableVoices={voicesPool}
        />
      )}

    </div>
  );
};
