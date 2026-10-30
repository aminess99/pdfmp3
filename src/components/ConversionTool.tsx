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
import { ChatPdfModal } from './ChatPdfModal';
import { QuickResult } from './QuickResult';
import { toast } from '../lib/toast';
import { chaptersAr, minutesAr, pagesAr, wordsAr } from '../lib/arabicPlural';
import { voiceLabel, voiceInitial, dialectLabel, genderLabel } from '../lib/voiceLabel';
import { tr, DIR } from '../lib/i18n';
import { VoiceOptionGroups } from './VoiceOptions';

// "320 KB" under a megabyte, "2.4 MB" above it
const formatFileSize = (bytes: number): string =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSampleBook, setSelectedSampleBook] = useState<SampleBook | null>(null);
  const [pendingSampleStart, setPendingSampleStart] = useState(false);
  const [selectedDialect, setSelectedDialect] = useState<Dialect>(() => {
    let id = initialDialectId;
    if (!id) {
      try {
        id = voicesPool.find((v) => v.id === localStorage.getItem('app_default_voice'))?.dialectId;
      } catch {}
    }
    return DIALECTS.find(d => d.id === id) || DIALECTS[0]; // Moroccan Darija by default
  });
  
  // Voice Preview State
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  // Choose best initial voice
  const [selectedVoice, setSelectedVoice] = useState<Voice>(() => {
    // A landing page's dialect wins; otherwise the user's saved default voice
    if (!initialDialectId) {
      try {
        const saved = voicesPool.find((v) => v.id === localStorage.getItem('app_default_voice'));
        if (saved) return saved;
      } catch {}
    }
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
      const bookName = selectedFile ? selectedFile.name : selectedSampleBook ? selectedSampleBook.title : tr('الكتاب', 'Book');
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
      setConversionError(tr("يرجى رفع ملف بصيغة PDF أو ePub.", "Please upload a PDF or ePub file."));
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setConversionError(tr("حجم الملف يتجاوز الحد الأقصى المسموح به (50 ميجابايت).", "The file is larger than the 50 MB limit."));
      return;
    }

    setSelectedFile(file);
    setSelectedChapterMode('all');
    setSelectedSampleBook(null);
    setConversionError(null);
    setIsExtracting(true);
    setExtractionProgress(5);
    setExtractionStatusText(tr("جاري فحص وتجهيز الملف...", "Checking the file..."));
    extractionCancelledRef.current = false;

    try {
      if (isEpub) {
        setExtractionStatusText(tr("جاري استخراج نصوص وفصول كتاب ePub...", "Extracting the ePub text and chapters..."));
        const epubRes = await extractTextFromEpubFile(file);
        if (epubRes.text && epubRes.text.trim().length > 20) {
          setExtractedText(epubRes.text);
          setPageCount(epubRes.pagesCount || 10);
          const chaps = detectArabicChapters(epubRes.text, file.name);
          setDetectedChapters(chaps);
          setExtractionProgress(100);
        } else {
          throw new Error(tr("لم يتم العثور على نصوص قابلة للقراءة في كتاب ePub.", "No readable text was found in this ePub."));
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
      setConversionError(err.message || tr("حدث خطأ أثناء قراءة الملف.", "Something went wrong while reading the file."));
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
        setPurifiedNotification(tr("تمت تنقية وتصفية النص بنجاح!", "Text cleaned up."));
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
    setExtractionStatusText(tr('جاري المسح الضوئي العميق (OCR)...', 'Running a deep scan (OCR)...'));
    try {
      const ocrRes = await extractTextFromPDFFile(selectedFile, (pct) => setExtractionProgress(pct), true);
      if (ocrRes.text) {
        setExtractedText(ocrRes.text);
        setPageCount(ocrRes.pagesCount);
        setExtractionProgress(100);
      }
    } catch (e: any) {
      setConversionError(e.message || tr("تعذر استكمال المسح الضوئي.", "The scan could not be completed."));
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

  // Short pasted texts are read right here instead of opening the studio
  const QUICK_MAX_WORDS = 150;
  const [quickResult, setQuickResult] = useState<{ url: string; blob: Blob | null; voiceName: string } | null>(null);
  const [isQuickLoading, setIsQuickLoading] = useState(false);

  useEffect(() => {
    setQuickResult(null);
  }, [extractedText, selectedVoice, inputMode]);

  const handleQuickConvert = async () => {
    const text = extractedText.trim();
    setConversionError(null);
    setIsQuickLoading(true);
    audioEngine.stop();
    try {
      const url = await audioEngine.generateSpeechUrl(text, selectedVoice, 1);
      if (!url) throw new Error('tts failed');
      setQuickResult({ url, blob: audioEngine.getCachedBlob(text, selectedVoice, 1), voiceName: voiceLabel(selectedVoice) });
    } catch {
      setConversionError(tr("تعذّر توليد الصوت الآن. حاول مرة أخرى بعد قليل.", "Couldn’t generate the audio right now. Please try again shortly."));
    } finally {
      setIsQuickLoading(false);
    }
  };

  // Start conversion & Build audiobook
  const handleStartConversion = async (forceStudio = false) => {
    if (!extractedText.trim()) {
      setConversionError(tr("يرجى رفع ملف PDF أو كتابة نص أولاً.", "Upload a PDF or type some text first."));
      return;
    }

    if (!forceStudio && inputMode === 'text' && listeningMode === 'full' && wordCount <= QUICK_MAX_WORDS) {
      handleQuickConvert();
      return;
    }
    setQuickResult(null);

    setIsConverting(true);
    setConversionProgress(5);
    setConversionError(null);

    let processedText = extractedText;
    const baseFileName = inputMode === 'text'
      ? (customTitle.trim() || tr("نص عربي مخصص", "Custom Arabic text"))
      : (selectedFile ? selectedFile.name : selectedSampleBook ? selectedSampleBook.title : tr("كتاب PDF عربي", "Arabic PDF book"));

    // If summary mode, transform to executive summary first
    if (listeningMode === 'summary') {
      setConvertingChapterStatus(tr("جاري صياغة التلخيص التنفيذي والبودكاست بذكاء اصطناعي...", "Writing the summary..."));
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
        if (!data.success || !data.transformedText) throw new Error(data.error || 'summary failed');
        processedText = data.transformedText;
      } catch (e) {
        console.warn('Summary transformation error:', e);
        setIsConverting(false);
        setConversionProgress(0);
        setConvertingChapterStatus('');
        setConversionError(tr("تعذّر تجهيز الملخص الآن. حاول مرة أخرى أو اختر «الكتاب كاملاً».", "Couldn’t prepare the summary right now. Try again or choose “Whole book”."));
        return;
      }
    } else if (listeningMode === 'key_points') {
      setConvertingChapterStatus(tr("جاري استخراج أهم 5 إلى 7 نقاط محورية من الكتاب...", "Extracting the 5–7 key points..."));
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
        if (!data.success || !data.transformedText) throw new Error(data.error || 'key points failed');
        processedText = data.transformedText;
      } catch (e) {
        console.warn('Key points transformation error:', e);
        setIsConverting(false);
        setConversionProgress(0);
        setConvertingChapterStatus('');
        setConversionError(tr("تعذّر استخراج أهم النقاط الآن. حاول مرة أخرى أو اختر «الكتاب كاملاً».", "Couldn’t extract the key points right now. Try again or choose “Whole book”."));
        return;
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
            const prefix = listeningMode === 'summary' ? tr("ملخص: ", "Summary: ") : listeningMode === 'key_points' ? tr("النقاط الجوهرية: ", "Key points: ") : '';
            const fileName = targetChapter 
              ? `${prefix}${baseFileName} - (${targetChapter.title})` 
              : `${prefix}${baseFileName}`;

            const fileSize = inputMode === 'text'
              ? tr(`${activeText.length} حرف`, `${activeText.length} characters`)
              : (selectedFile ? formatFileSize(selectedFile.size) : '');
            
            const calculatedPages = inputMode === 'text'
              ? Math.max(1, Math.ceil(activeText.split(/\s+/).length / 250))
              : pageCount;

            let finalChapters: BookChapter[] = [];

            if (listeningMode === 'full') {
              finalChapters = targetChapter ? [targetChapter] : detectedChapters.length > 0 ? detectedChapters : [
                {
                  id: `chap_${Date.now()}_1`,
                  chapterNumber: 1,
                  title: tr("الفصل الأول: البداية", "Chapter 1"),
                  wordCount: activeText.split(/\s+/).filter(Boolean).length,
                  estimatedDurationMinutes: estimateDurationMinutes(activeText.split(/\s+/).filter(Boolean).length),
                  text: activeText,
                  status: 'completed',
                }
              ];
            } else if (listeningMode === 'key_points') {
              const pointsChaps = detectArabicChapters(processedText, tr('النقاط الجوهرية', 'Key points'));
              finalChapters = pointsChaps.length >= 2 ? pointsChaps : [
                {
                  id: `chap_${Date.now()}_1`,
                  chapterNumber: 1,
                  title: tr("أهم النقاط المستفادة", "Key takeaways"),
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
                  title: tr(`الملخص التنفيذي لـ ${baseFileName}`, `Summary of ${baseFileName}`),
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
                }).catch((err) => {
                  console.warn('Firestore audiobook save note:', err);
                  toast(tr("لم نتمكن من حفظ الكتاب في مكتبتك على السحابة، لكنه محفوظ في هذا المتصفح.", "We couldn’t save the book to your cloud library, but it is saved in this browser."), 'error');
                });
              } catch (cloudErr) {}
            }

            audioEngine.stop();
            onConversionStart(newJob);
          }, 400);
          return 100;
        }

        const nextVal = prev + 12;
        if (nextVal < 35) {
          setConvertingChapterStatus(tr("جاري مواءمة النبرة الصوتية وقواعد النطق...", "Tuning tone and pronunciation..."));
        } else if (nextVal < 70) {
          setConvertingChapterStatus(tr(`جاري توليد الصوت بصوت ${voiceLabel(selectedVoice)}...`, `Generating audio with ${voiceLabel(selectedVoice)}...`));
        } else {
          setConvertingChapterStatus(tr("جاري بناء الملف الصوتي وتجهيز مسار الاستماع...", "Preparing your listening session..."));
        }
        return nextVal;
      });
    }, 320);
  };

  const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
  const totalDetectedMinutes = detectedChapters.reduce((acc, c) => acc + (c.estimatedDurationMinutes || 0), 0);
  const hasInput = inputMode === 'text' ? extractedText.trim().length > 0 : Boolean(selectedFile || selectedSampleBook);
  const modeOptions: { id: ListeningMode; label: string }[] = [
    { id: 'full', label: tr("الكتاب كاملاً", "Whole book") },
    { id: 'summary', label: tr("ملخص 10 دقائق", "10-minute summary") },
    { id: 'key_points', label: tr("أهم النقاط", "Key points") },
  ];

  return (
    <div className="w-full font-body" dir={DIR}>
      <div className="w-full bg-card border border-line rounded-[20px] overflow-hidden">
        {/* Input type tabs */}
        <div role="tablist" aria-label={tr("نوع الإدخال", "Input type")} className="flex gap-1.5 p-3 pb-0">
          {([
            { id: 'pdf', label: tr("ملف PDF", "PDF file") },
            { id: 'text', label: tr("نص", "Text") },
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
              <button type="button" onClick={() => setConversionError(null)} aria-label={tr("إغلاق الرسالة", "Dismiss message")} className="p-1 rounded-lg text-rose-300 hover:bg-rose-900/50 cursor-pointer">
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
                  {extractionStatusText || tr("جاري قراءة الكتاب...", "Reading the book...")}
                </p>
              ) : selectedFile ? (
                <>
                  <CheckCircle2 className="w-8 h-8 text-accent" />
                  <p className="text-white font-semibold truncate max-w-full">{selectedFile.name}</p>
                  <p className="text-sm text-slate-400">
                    <bdi dir="ltr">{formatFileSize(selectedFile.size)}</bdi> · {pagesAr(pageCount)} ·{' '}
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-brand-soft hover:underline cursor-pointer">
                      {tr("تغيير الملف", "Change file")}
                    </button>
                  </p>
                  <button type="button" onClick={handleForceOcr} className="text-xs text-slate-400 hover:text-white cursor-pointer">
                    {tr("النص غير واضح؟ جرّب المسح العميق", "Text looks wrong? Try a deep scan")}
                  </button>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-accent" />
                  <p className="text-[17px] font-semibold text-white">{tr("اسحب ملف PDF هنا", "Drop a PDF here")}</p>
                  <p className="text-sm text-slate-400">
                    {tr('أو', 'or')}{' '}
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-brand-soft hover:underline cursor-pointer">
                      {tr("اختر ملفاً من جهازك", "choose a file")}
                    </button>{' '}
                    {tr("· PDF و ePub حتى 50MB", "· PDF and ePub up to 50 MB")}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="tts-text" className="block text-sm text-slate-400">{tr("الصق النص الذي تريد سماعه", "Paste the text you want to hear")}</label>
              <textarea
                id="tts-text"
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                rows={5}
                dir="auto"
                placeholder={tr("اكتب أو الصق نصك العربي هنا...", "Type or paste your Arabic text here...")}
                className="w-full rounded-xl bg-ink border border-line p-3.5 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand resize-y leading-relaxed"
              />
              <div className="flex items-center justify-between text-[13px] text-slate-400">
                <span>{wordCount === 0 ? tr('0 كلمة', '0 words') : wordsAr(wordCount)} · {tr('حوالي', 'about')} {minutesAr(Math.max(1, Math.round(wordCount / 130)))}</span>
                <button
                  type="button"
                  onClick={handlePurifyText}
                  disabled={isPurifying || !extractedText.trim()}
                  className="flex items-center gap-1 hover:text-white disabled:opacity-50 cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  {isPurifying ? tr("جاري التنقية...", "Cleaning...") : tr("تنقية النص", "Clean up text")}
                </button>
              </div>
              {purifiedNotification && <p role="status" className="text-[13px] text-accent">{purifiedNotification}</p>}
              {quickResult && (
                <QuickResult
                  url={quickResult.url}
                  blob={quickResult.blob}
                  voiceName={quickResult.voiceName}
                  fileName={customTitle.trim() || 'Hakawati-AI'}
                  onOpenStudio={() => handleStartConversion(true)}
                  onClose={() => setQuickResult(null)}
                />
              )}
            </div>
          )}

          {/* Listening mode */}
          <div>
            <div id="mode-label" className="text-sm text-slate-400 mb-2.5">{tr("ماذا تريد أن تسمع؟", "What do you want to hear?")}</div>
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

          {/* Confirm what will be converted once the book is read */}
          {inputMode === 'pdf' && selectedFile && !isExtracting && listeningMode === 'full' && detectedChapters.length > 1 && (
            <div className="flex flex-col gap-2">
              <label htmlFor="chapter-pick" className="text-sm text-slate-400">
                {tr('وجدنا', 'Found')} {chaptersAr(detectedChapters.length)} · {tr('حوالي', 'about')} {minutesAr(totalDetectedMinutes)}
              </label>
              <select
                id="chapter-pick"
                value={selectedChapterMode}
                onChange={(e) => setSelectedChapterMode(e.target.value)}
                className="w-full min-h-12 bg-ink border border-line rounded-[10px] px-3.5 text-[15px] text-white cursor-pointer focus:outline-none focus:border-brand"
              >
                <option value="all">{tr(tr("الكتاب كاملاً", "Whole book"), 'Whole book')}</option>
                {detectedChapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} · {c.estimatedDurationMinutes} {tr('د', 'min')}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Voice + convert */}
        <div className="border-t border-line px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-full bg-brand-deep text-indigo-200 flex items-center justify-center font-display font-extrabold shrink-0">
              {voiceInitial(selectedVoice)}
            </span>
            <label className="flex flex-col leading-tight min-w-0">
              <span className="sr-only">{tr('الصوت', 'Voice')}</span>
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
                <VoiceOptionGroups voices={voicesPool} optionClassName="bg-card" />
              </select>
              <span className="text-[13px] text-slate-400">
                {dialectLabel(selectedDialect)} · {genderLabel(selectedVoice)}
              </span>
            </label>
            <button
              type="button"
              onClick={handleToggleVoicePreview}
              aria-label={isPlayingPreview ? tr("إيقاف العينة", "Stop sample") : tr("استمع لعينة الصوت", "Play voice sample")}
              className="w-11 h-11 rounded-full border border-line-strong text-accent flex items-center justify-center shrink-0 cursor-pointer hover:bg-raised"
            >
              {isPlayingPreview ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => handleStartConversion()}
            disabled={isConverting || isExtracting || isQuickLoading || !hasInput}
            className="flex items-center justify-center gap-2.5 min-h-[52px] px-7 rounded-2xl bg-gradient-to-l from-[#8b5cf6] to-[#3b82f6] text-white font-bold text-[17px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {isConverting || isQuickLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
            {isConverting || isQuickLoading ? tr("جاري التحويل...", "Converting...") : tr("حوّل واستمع", "Convert & listen")}
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
          {tr('ليس لديك ملف الآن؟ اسمع مثالاً جاهزاً:', 'No file handy? Hear a ready example:')} {tr(SAMPLE_BOOKS[0].title, 'Ibn Khaldun’s Muqaddimah')}
        </button>
        <p className="text-sm text-slate-400">{tr("جرّب مجاناً: 30 دقيقة عند التسجيل، بدون بطاقة دفع.", "Try it free: 30 minutes when you sign up, no card needed.")}</p>
      </div>

      {/* Book Processing Modal */}
      <BookProcessingModal
        isOpen={isConverting || isExtracting}
        mode={isExtracting ? 'extracting' : 'converting'}
        fileName={selectedFile ? selectedFile.name : selectedSampleBook ? selectedSampleBook.title : tr("كتابك الصوتي", "Your audiobook")}
        fileSize={selectedFile ? formatFileSize(selectedFile.size) : undefined}
        pageCount={selectedFile ? pageCount : undefined}
        progress={isExtracting ? extractionProgress : conversionProgress}
        currentStatusText={isExtracting ? extractionStatusText : convertingChapterStatus}
        voiceName={voiceLabel(selectedVoice)}
        dialectName={dialectLabel(selectedDialect)}
        styleName={selectedStyle?.name}
        previewSnippet={extractedText}
        chapters={detectedChapters}
        activeChapterIndex={activeConvertingChapterIndex}
        onCancel={isExtracting ? handleCancelExtraction : handleCancelConversion}
      />

    </div>
  );
};
