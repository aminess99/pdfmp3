import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Play, 
  Pause, 
  CheckCircle2, 
  Volume2, 
  Sparkles, 
  FolderOpen, 
  SlidersHorizontal, 
  Loader2, 
  ChevronDown, 
  Plus, 
  X, 
  Check, 
  Mic, 
  Headphones, 
  Type, 
  FileEdit, 
  AlignRight, 
  Trash2, 
  Wand2, 
  Filter, 
  Layers, 
  ListOrdered, 
  BookOpenCheck, 
  Target, 
  BookOpen, 
  AlertCircle, 
  MessageSquare, 
  ClipboardPaste, 
  FileCheck,
  Zap,
  Radio
} from 'lucide-react';
import { DIALECTS, VOICES, AUDIO_STYLES } from '../data/voices';
import { SAMPLE_BOOKS } from '../data/sampleBooks';
import { Dialect, Voice, AudioStyle, SampleBook, ConversionJob, BookChapter, ListeningMode } from '../types';
import { extractTextFromPDFFile, purifyTextWithAI, startProgressivePdfExtraction, ProgressivePdfSession, cleanArabicExtractedText } from '../lib/pdfUtils';
import { extractTextFromEpubFile } from '../lib/epubUtils';
import { detectArabicChapters, detectArabicChaptersWithAI, estimateDurationMinutes } from '../lib/chapterUtils';
import { audioEngine } from '../lib/audioEngine';
import { useAuth } from '../lib/AuthContext';
import { db, doc, setDoc, serverTimestamp } from '../lib/firebase';
import { BookProcessingModal } from './BookProcessingModal';
import { BookUploadAuthPrompt } from './BookUploadAuthPrompt';
import { ChatPdfModal } from './ChatPdfModal';

interface ConversionToolProps {
  onConversionStart: (job: ConversionJob) => void;
  onPreviewVoiceSample: (voice: Voice) => void;
  availableVoicesList?: Voice[];
  onRequestAuth?: (mode: 'login' | 'register') => void;
  initialDialectId?: string;
  initialInputMode?: 'pdf' | 'text';
}

export const ConversionTool: React.FC<ConversionToolProps> = ({
  onConversionStart,
  onPreviewVoiceSample,
  availableVoicesList,
  onRequestAuth,
  initialDialectId,
  initialInputMode,
}) => {
  const voicesPool = availableVoicesList && availableVoicesList.length > 0 ? availableVoicesList : VOICES;
  const { user } = useAuth();
  const [showUploadAuthPrompt, setShowUploadAuthPrompt] = useState(false);
  const [pendingAutoConvertAfterAuth, setPendingAutoConvertAfterAuth] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSampleBook, setSelectedSampleBook] = useState<SampleBook | null>(null);
  const [pendingSampleStart, setPendingSampleStart] = useState(false);
  const [selectedDialect, setSelectedDialect] = useState<Dialect>(() => DIALECTS.find(d => d.id === initialDialectId) || DIALECTS[0]); // Moroccan Darija by default
  
  // Voice Preview State
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  // Choose best initial voice
  const [selectedVoice, setSelectedVoice] = useState<Voice>(() => {
    return voicesPool.find(v => v.dialectId === (initialDialectId || DIALECTS[0].id)) || 
           voicesPool[0];
  });
  
  const [selectedStyle, setSelectedStyle] = useState<AudioStyle>(AUDIO_STYLES[0]);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [extractedText, setExtractedText] = useState<string>('');
  const [pageCount, setPageCount] = useState<number>(SAMPLE_BOOKS[0].pages);
  const [inputMode, setInputMode] = useState<'pdf' | 'text'>(initialInputMode || 'pdf');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [aiDetectedBookTitle, setAiDetectedBookTitle] = useState<string>('');
  const [showTextPreview, setShowTextPreview] = useState<boolean>(true);
  const [isPurifying, setIsPurifying] = useState<boolean>(false);
  const [purifiedNotification, setPurifiedNotification] = useState<string | null>(null);
  const [conversionError, setConversionError] = useState<string | null>(null);

  // Listening Mode States (Full, Summary 10m, Key Points 50%)
  const [listeningMode, setListeningMode] = useState<ListeningMode>('full');

  // Multi-Chapter Batching States
  const [detectedChapters, setDetectedChapters] = useState<BookChapter[]>([]);
  const [selectedChapterMode, setSelectedChapterMode] = useState<'all' | string>('all');
  const [convertingChapterStatus, setConvertingChapterStatus] = useState<string>('');
  const [activeConvertingChapterIndex, setActiveConvertingChapterIndex] = useState<number>(0);

  // Extraction Progress & Cancel States
  const [extractionProgress, setExtractionProgress] = useState<number>(0);
  const [extractionStatusText, setExtractionStatusText] = useState<string>('');
  const conversionIntervalRef = useRef<any>(null);
  const extractionCancelledRef = useRef<boolean>(false);
  const progressiveSessionRef = useRef<ProgressivePdfSession | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto trigger conversion after user logs in if they previously attempted conversion
  useEffect(() => {
    if (user && pendingAutoConvertAfterAuth) {
      setPendingAutoConvertAfterAuth(false);
      handleStartConversion();
    }
  }, [user, pendingAutoConvertAfterAuth]);

  // "Try a sample" starts converting once the sample text is in state
  useEffect(() => {
    if (pendingSampleStart && selectedSampleBook && extractedText === selectedSampleBook.sampleText) {
      setPendingSampleStart(false);
      handleStartConversion();
    }
  }, [pendingSampleStart, selectedSampleBook, extractedText]);

  // A voice picked in the voice gallery becomes the tool's voice
  useEffect(() => {
    const onSelectVoice = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      const v = voicesPool.find((x) => x.id === id);
      if (!v) return;
      setSelectedVoice(v);
      const d = DIALECTS.find((x) => x.id === v.dialectId);
      if (d) setSelectedDialect(d);
    };
    window.addEventListener('select_voice', onSelectVoice);
    return () => window.removeEventListener('select_voice', onSelectVoice);
  }, [voicesPool]);

  // Keep detected chapters in sync
  useEffect(() => {
    if (extractedText && extractedText.trim().length > 60) {
      const bookName = selectedFile ? selectedFile.name : selectedSampleBook ? selectedSampleBook.title : 'الكتاب';
      const localChaps = detectArabicChapters(extractedText, bookName);
      setDetectedChapters(localChaps);
    }
  }, [extractedText, selectedFile, selectedSampleBook]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // Upload and process PDF or ePub
  const handleFileUpload = async (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isEpub = file.name.toLowerCase().endsWith('.epub') || file.type === 'application/epub+zip';

    if (!isPdf && !isEpub) {
      setConversionError('يرجى رفع ملف بصيغة PDF أو ePub.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setConversionError('حجم الملف يتجاوز الحد الأقصى المسموح به (50 ميجابايت).');
      return;
    }

    setSelectedFile(file);
    setSelectedSampleBook(null);
    setConversionError(null);
    setIsExtracting(true);
    setExtractionProgress(5);
    setExtractionStatusText('جاري فحص وتجهيز الملف...');
    extractionCancelledRef.current = false;

    try {
      if (isEpub) {
        setExtractionStatusText('جاري استخراج نصوص وفصول كتاب ePub...');
        const epubRes = await extractTextFromEpubFile(file);
        if (epubRes.text && epubRes.text.trim().length > 20) {
          setExtractedText(epubRes.text);
          setPageCount(epubRes.pagesCount || 10);
          const chaps = detectArabicChapters(epubRes.text, file.name);
          setDetectedChapters(chaps);
          setExtractionProgress(100);
        } else {
          throw new Error('لم يتم العثور على نصوص قابلة للقراءة في كتاب ePub.');
        }
      } else {
        // Fast progressive reader for PDF
        const session = await startProgressivePdfExtraction(file, 6);

        progressiveSessionRef.current = session;
        setPageCount(session.totalPages);
        setExtractedText(session.initialText);
        setExtractionProgress(100);
      }
    } catch (err: any) {
      console.warn('File extraction note:', err);
      setConversionError(err.message || 'حدث خطأ أثناء قراءة الملف.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Switch Sample Book
  const handleSelectSample = (sample: SampleBook) => {
    setSelectedSampleBook(sample);
    setSelectedFile(null);
    setExtractedText(sample.sampleText);
    setPageCount(sample.pages);
    setConversionError(null);
  };

  const handleTrySample = () => {
    setInputMode('pdf');
    handleSelectSample(SAMPLE_BOOKS[0]);
    setPendingSampleStart(true);
  };

  // AI Purify text
  const handlePurifyText = async () => {
    if (!extractedText.trim() || isPurifying) return;
    setIsPurifying(true);
    setPurifiedNotification(null);
    try {
      const purified = await purifyTextWithAI(extractedText);
      if (purified && purified.length > 20) {
        setExtractedText(purified);
        setPurifiedNotification('تمت تنقية وتصفية النص بنجاح!');
      }
    } catch (e: any) {
      console.warn('Purify error:', e);
    } finally {
      setIsPurifying(false);
    }
  };

  // Handle Voice Sample Preview playback
  const handleToggleVoicePreview = () => {
    if (isPlayingPreview) {
      audioEngine.stop();
      setIsPlayingPreview(false);
      return;
    }

    setIsPlayingPreview(true);
    audioEngine.playVoicePreview(selectedVoice, () => setIsPlayingPreview(false));
  };

  // Handle OCR Rescan
  const handleForceOcr = async () => {
    if (!selectedFile || isExtracting) return;
    setIsExtracting(true);
    setExtractionProgress(10);
    setExtractionStatusText('جاري المسح الضوئي العميق عبر Gemini 3.8 OCR...');
    try {
      const ocrRes = await extractTextFromPDFFile(selectedFile, (pct) => setExtractionProgress(pct), true);
      if (ocrRes.text) {
        setExtractedText(ocrRes.text);
        setPageCount(ocrRes.pagesCount);
        setExtractionProgress(100);
      }
    } catch (e: any) {
      setConversionError(e.message || 'تعذر استكمال المسح الضوئي.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Cancel in-progress extraction
  const handleCancelExtraction = () => {
    extractionCancelledRef.current = true;
    setIsExtracting(false);
    setExtractionStatusText('');
    setExtractionProgress(0);
  };

  // Cancel in-progress conversion
  const handleCancelConversion = () => {
    if (conversionIntervalRef.current) {
      clearInterval(conversionIntervalRef.current);
      conversionIntervalRef.current = null;
    }
    setIsConverting(false);
    setConversionProgress(0);
    setConvertingChapterStatus('');
  };

  // Start conversion & Build audiobook
  const handleStartConversion = async () => {
    if (!extractedText.trim()) {
      setConversionError('يرجى رفع ملف PDF أو كتابة نص أولاً.');
      return;
    }

    setIsConverting(true);
    setConversionProgress(5);
    setConversionError(null);

    let processedText = extractedText;
    const baseFileName = inputMode === 'text'
      ? (customTitle.trim() || 'نص عربي مخصص')
      : (selectedFile ? selectedFile.name : selectedSampleBook ? selectedSampleBook.title : 'كتاب PDF عربي');

    // If summary mode, transform to executive summary first
    if (listeningMode === 'summary') {
      setConvertingChapterStatus('جاري صياغة التلخيص التنفيذي والبودكاست بذكاء اصطناعي...');
      try {
        const res = await fetch('/api/ai/transform-book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: extractedText,
            mode: 'summary',
            bookTitle: baseFileName,
          }),
        });
        const data = await res.json();
        if (data.success && data.transformedText) {
          processedText = data.transformedText;
        }
      } catch (e) {
        console.warn('Summary transformation error:', e);
      }
    } else if (listeningMode === 'key_points') {
      setConvertingChapterStatus('جاري استخراج أهم 5 إلى 7 نقاط محورية من الكتاب...');
      try {
        const res = await fetch('/api/ai/transform-book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: extractedText,
            mode: 'key_points',
            bookTitle: baseFileName,
          }),
        });
        const data = await res.json();
        if (data.success && data.transformedText) {
          processedText = data.transformedText;
        }
      } catch (e) {
        console.warn('Key points transformation error:', e);
      }
    }

    conversionIntervalRef.current = setInterval(() => {
      setConversionProgress((prev) => {
        if (prev >= 92) {
          if (conversionIntervalRef.current) {
            clearInterval(conversionIntervalRef.current);
            conversionIntervalRef.current = null;
          }
          setTimeout(() => {
            setIsConverting(false);
            setConvertingChapterStatus('');
            
            const targetChapter = (selectedChapterMode !== 'all' && listeningMode === 'full')
              ? detectedChapters.find(c => c.id === selectedChapterMode) 
              : null;

            const activeText = targetChapter ? targetChapter.text : processedText;
            const prefix = listeningMode === 'summary' ? 'ملخص: ' : listeningMode === 'key_points' ? 'النقاط الجوهرية: ' : '';
            const fileName = targetChapter 
              ? `${prefix}${baseFileName} - (${targetChapter.title})` 
              : `${prefix}${baseFileName}`;

            const fileSize = inputMode === 'text'
              ? `${activeText.length} حرف`
              : (selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} ميجابايت` : '2.4 ميجابايت');
            
            const calculatedPages = inputMode === 'text'
              ? Math.max(1, Math.ceil(activeText.split(/\s+/).length / 250))
              : pageCount;

            let finalChapters: BookChapter[] = [];

            if (listeningMode === 'full') {
              finalChapters = detectedChapters.length > 0 ? detectedChapters : [
                {
                  id: `chap_${Date.now()}_1`,
                  chapterNumber: 1,
                  title: 'الفصل الأول: البداية',
                  wordCount: activeText.split(/\s+/).filter(Boolean).length,
                  estimatedDurationMinutes: estimateDurationMinutes(activeText.split(/\s+/).filter(Boolean).length),
                  text: activeText,
                  status: 'completed',
                }
              ];
            } else if (listeningMode === 'key_points') {
              const pointsChaps = detectArabicChapters(processedText, 'النقاط الجوهرية');
              finalChapters = pointsChaps.length >= 2 ? pointsChaps : [
                {
                  id: `chap_${Date.now()}_1`,
                  chapterNumber: 1,
                  title: 'أهم النقاط المستفادة',
                  wordCount: activeText.split(/\s+/).filter(Boolean).length,
                  estimatedDurationMinutes: estimateDurationMinutes(activeText.split(/\s+/).filter(Boolean).length),
                  text: activeText,
                  status: 'completed',
                }
              ];
            } else {
              // Summary
              finalChapters = [
                {
                  id: `chap_${Date.now()}_summary`,
                  chapterNumber: 1,
                  title: `الملخص التنفيذي لـ ${baseFileName}`,
                  wordCount: activeText.split(/\s+/).filter(Boolean).length,
                  estimatedDurationMinutes: Math.max(2, Math.round(activeText.split(/\s+/).filter(Boolean).length / 130)),
                  text: activeText,
                  status: 'completed',
                }
              ];
            }

            const isStreaming = Boolean(progressiveSessionRef.current && listeningMode === 'full');

            const newJob: ConversionJob = {
              id: `job_${Date.now()}`,
              fileName,
              fileSize,
              totalPages: calculatedPages,
              processedPages: isStreaming ? progressiveSessionRef.current!.initialPagesRead : calculatedPages,
              selectedDialect,
              selectedVoice,
              selectedStyle,
              status: 'completed',
              progress: 100,
              extractedText: activeText,
              textChunks: [activeText],
              chapters: finalChapters,
              activeChapterId: finalChapters[0]?.id,
              durationInSeconds: finalChapters.reduce((acc, c) => acc + (c.estimatedDurationMinutes || 5) * 60, 0),
              listeningMode,
              createdAt: new Date().toLocaleTimeString('ar-SA'),
            };

            // Save to localStorage library
            try {
              const existing = JSON.parse(localStorage.getItem('pdf_audio_library') || '[]');
              const updated = [newJob, ...existing.filter((j: any) => j.id !== newJob.id)];
              localStorage.setItem('pdf_audio_library', JSON.stringify(updated));
            } catch (e) {}

            // Save to Firebase Firestore if user is authenticated
            if (user && user.uid) {
              try {
                setDoc(doc(db, 'audiobooks', newJob.id), {
                  userId: user.uid,
                  fileName: newJob.fileName,
                  fileSize: newJob.fileSize,
                  totalPages: newJob.totalPages,
                  processedPages: newJob.processedPages,
                  extractedText: newJob.extractedText,
                  selectedDialect: newJob.selectedDialect,
                  selectedVoice: newJob.selectedVoice,
                  selectedStyle: newJob.selectedStyle,
                  chapters: newJob.chapters,
                  durationInSeconds: newJob.durationInSeconds,
                  status: newJob.status,
                  listeningMode: newJob.listeningMode,
                  createdAt: serverTimestamp(),
                  createdAtStr: newJob.createdAt,
                }).catch((err) => console.warn('Firestore audiobook save note:', err));
              } catch (cloudErr) {}
            }

            audioEngine.stop();
            onConversionStart(newJob);
          }, 400);
          return 100;
        }

        const nextVal = prev + 12;
        if (nextVal < 35) {
          setConvertingChapterStatus('جاري مواءمة النبرة الصوتية وقواعد النطق...');
        } else if (nextVal < 70) {
          setConvertingChapterStatus(`جاري توليد الترددات الصوتية بصوت: ${selectedVoice.name}...`);
        } else {
          setConvertingChapterStatus('جاري بناء الملف الصوتي وتجهيز مسار الاستماع...');
        }
        return nextVal;
      });
    }, 320);
  };

  const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
  const hasInput = inputMode === 'text' ? extractedText.trim().length > 0 : Boolean(selectedFile || selectedSampleBook);
  const modeOptions: { id: ListeningMode; label: string }[] = [
    { id: 'full', label: 'الكتاب كاملاً' },
    { id: 'summary', label: 'ملخص 10 دقائق' },
    { id: 'key_points', label: 'أهم النقاط' },
  ];

  return (
    <div className="w-full font-body" dir="rtl">
      <div className="w-full bg-card border border-line rounded-[20px] overflow-hidden">
        {/* Input type tabs */}
        <div role="tablist" aria-label="نوع الإدخال" className="flex gap-1.5 p-3 pb-0">
          {([
            { id: 'pdf', label: 'ملف PDF' },
            { id: 'text', label: 'نص' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={inputMode === tab.id}
              onClick={() => {
                setInputMode(tab.id);
                setConversionError(null);
                if (tab.id === 'text' && !selectedFile && selectedSampleBook) {
                  setSelectedSampleBook(null);
                  setExtractedText('');
                }
              }}
              className={`min-h-11 px-5 rounded-[10px] text-[15px] font-semibold cursor-pointer transition-colors ${
                inputMode === tab.id ? 'bg-raised text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-5 space-y-5">
          {conversionError && (
            <div role="alert" className="flex items-center justify-between gap-3 p-3 rounded-xl bg-rose-950/60 border border-rose-900 text-rose-200 text-sm">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                {conversionError}
              </span>
              <button type="button" onClick={() => setConversionError(null)} aria-label="إغلاق الرسالة" className="p-1 rounded-lg text-rose-300 hover:bg-rose-900/50 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {inputMode === 'pdf' ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-[1.5px] border-dashed rounded-2xl px-5 py-9 flex flex-col items-center gap-2 text-center transition-colors ${
                isDragging ? 'border-accent bg-raised/60' : selectedFile ? 'border-brand' : 'border-line-strong'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.epub,application/pdf,application/epub+zip"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                className="hidden"
              />
              {isExtracting ? (
                <p className="flex items-center gap-2 text-brand-soft text-sm font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {extractionStatusText || 'جاري قراءة الكتاب...'}
                </p>
              ) : selectedFile ? (
                <>
                  <CheckCircle2 className="w-8 h-8 text-accent" />
                  <p className="text-white font-semibold truncate max-w-full">{selectedFile.name}</p>
                  <p className="text-sm text-slate-400">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · {pageCount} صفحة ·{' '}
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-brand-soft hover:underline cursor-pointer">
                      تغيير الملف
                    </button>
                  </p>
                  <button type="button" onClick={handleForceOcr} className="text-xs text-slate-400 hover:text-white cursor-pointer">
                    النص غير واضح؟ جرّب المسح العميق
                  </button>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-accent" />
                  <p className="text-[17px] font-semibold text-white">اسحب ملف PDF هنا</p>
                  <p className="text-sm text-slate-400">
                    أو{' '}
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-brand-soft hover:underline cursor-pointer">
                      اختر ملفاً من جهازك
                    </button>{' '}
                    · PDF و ePub حتى 50MB
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="tts-text" className="block text-sm text-slate-400">الصق النص الذي تريد سماعه</label>
              <textarea
                id="tts-text"
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                rows={5}
                dir="rtl"
                placeholder="اكتب أو الصق نصك العربي هنا..."
                className="w-full rounded-xl bg-ink border border-line p-3.5 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand resize-y leading-relaxed"
              />
              <div className="flex items-center justify-between text-[13px] text-slate-400">
                <span>{wordCount} كلمة · حوالي {Math.max(1, Math.round(wordCount / 130))} دقيقة</span>
                <button
                  type="button"
                  onClick={handlePurifyText}
                  disabled={isPurifying || !extractedText.trim()}
                  className="flex items-center gap-1 hover:text-white disabled:opacity-50 cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  {isPurifying ? 'جاري التنقية...' : 'تنقية النص'}
                </button>
              </div>
              {purifiedNotification && <p role="status" className="text-[13px] text-accent">{purifiedNotification}</p>}
            </div>
          )}

          {/* Listening mode */}
          <div>
            <div id="mode-label" className="text-sm text-slate-400 mb-2.5">ماذا تريد أن تسمع؟</div>
            <div role="radiogroup" aria-labelledby="mode-label" className="flex flex-wrap gap-2">
              {modeOptions.map((m) => {
                const active = listeningMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setListeningMode(m.id)}
                    className={`flex items-center gap-2 min-h-11 px-4 rounded-full text-[15px] border cursor-pointer transition-colors ${
                      active ? 'border-brand bg-brand-deep text-white' : 'border-line text-slate-300 hover:text-white'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full border-2 ${active ? 'border-accent bg-accent' : 'border-slate-600'}`} />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Voice + convert */}
        <div className="border-t border-line px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-full bg-brand-deep text-indigo-200 flex items-center justify-center font-display font-extrabold shrink-0">
              {selectedVoice.name.charAt(0)}
            </span>
            <label className="flex flex-col leading-tight min-w-0">
              <span className="sr-only">الصوت</span>
              <select
                value={selectedVoice.id}
                onChange={(e) => {
                  const v = voicesPool.find((x) => x.id === e.target.value);
                  if (v) {
                    setSelectedVoice(v);
                    const d = DIALECTS.find((x) => x.id === v.dialectId);
                    if (d) setSelectedDialect(d);
                  }
                }}
                className="bg-transparent text-white font-semibold text-[15px] focus:outline-none cursor-pointer max-w-[220px]"
              >
                {voicesPool.map((v) => (
                  <option key={v.id} value={v.id} className="bg-card">
                    {v.name.split(' - ')[0]}
                  </option>
                ))}
              </select>
              <span className="text-[13px] text-slate-400">
                {selectedDialect?.name} · {selectedVoice.gender === 'female' ? 'امرأة' : 'رجل'}
              </span>
            </label>
            <button
              type="button"
              onClick={handleToggleVoicePreview}
              aria-label={isPlayingPreview ? 'إيقاف العينة' : 'استمع لعينة الصوت'}
              className="w-11 h-11 rounded-full border border-line-strong text-accent flex items-center justify-center shrink-0 cursor-pointer hover:bg-raised"
            >
              {isPlayingPreview ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
          </div>
          <button
            type="button"
            onClick={handleStartConversion}
            disabled={isConverting || isExtracting || !hasInput}
            className="flex items-center justify-center gap-2.5 min-h-[52px] px-7 rounded-2xl bg-gradient-to-l from-[#8b5cf6] to-[#3b82f6] text-white font-bold text-[17px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {isConverting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
            {isConverting ? 'جاري التحويل...' : 'حوّل واستمع'}
          </button>
        </div>
      </div>

      {/* Sample book: try without uploading */}
      <div className="flex flex-col items-center gap-1.5 mt-5">
        <button
          type="button"
          onClick={handleTrySample}
          className="flex items-center gap-2.5 min-h-12 px-5 rounded-xl border border-line text-slate-200 text-[15px] hover:border-line-strong hover:text-white cursor-pointer"
        >
          <Headphones className="w-[18px] h-[18px] text-accent" />
          ليس لديك ملف الآن؟ اسمع مثالاً جاهزاً: {SAMPLE_BOOKS[0].title}
        </button>
        <p className="text-sm text-slate-400">جرّب مجاناً: 30 دقيقة عند التسجيل، بدون بطاقة دفع.</p>
      </div>

      {/* Book Processing Modal */}
      <BookProcessingModal
        isOpen={isConverting || isExtracting}
        mode={isExtracting ? 'extracting' : 'converting'}
        fileName={selectedFile ? selectedFile.name : selectedSampleBook ? selectedSampleBook.title : 'كتابك الصوتي'}
        fileSize={selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : '2.4 MB'}
        pageCount={pageCount}
        progress={isExtracting ? extractionProgress : conversionProgress}
        currentStatusText={isExtracting ? extractionStatusText : convertingChapterStatus}
        voiceName={selectedVoice?.name}
        dialectName={selectedDialect?.name}
        styleName={selectedStyle?.name}
        previewSnippet={extractedText}
        chapters={detectedChapters}
        activeChapterIndex={activeConvertingChapterIndex}
        onCancel={isExtracting ? handleCancelExtraction : handleCancelConversion}
      />

      {/* Book Upload Auth Prompt */}
      <BookUploadAuthPrompt
        isOpen={showUploadAuthPrompt && !user}
        bookTitle={selectedFile ? selectedFile.name : 'كتابك الصوتي'}
        pagesCount={pageCount}
        onLogin={() => {
          setShowUploadAuthPrompt(false);
          setPendingAutoConvertAfterAuth(true);
          onRequestAuth?.('login');
        }}
        onRegister={() => {
          setShowUploadAuthPrompt(false);
          setPendingAutoConvertAfterAuth(true);
          onRequestAuth?.('register');
        }}
        onClose={() => setShowUploadAuthPrompt(false)}
      />
    </div>
  );
};
