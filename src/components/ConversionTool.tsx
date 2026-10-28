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
  const [selectedSampleBook, setSelectedSampleBook] = useState<SampleBook | null>(SAMPLE_BOOKS[0]);
  const [selectedDialect, setSelectedDialect] = useState<Dialect>(() => DIALECTS.find(d => d.id === initialDialectId) || DIALECTS[0]); // Moroccan Darija by default
  
  // Active Main Service Tab: 'audiobook' | 'chat' | 'summary' | 'writer'
  const [activeServiceTab, setActiveServiceTab] = useState<'audiobook' | 'chat' | 'summary' | 'writer'>('audiobook');
  
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
  const [extractedText, setExtractedText] = useState<string>(SAMPLE_BOOKS[0].sampleText);
  const [pageCount, setPageCount] = useState<number>(SAMPLE_BOOKS[0].pages);
  const [inputMode, setInputMode] = useState<'pdf' | 'text'>(initialInputMode || 'pdf');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [aiDetectedBookTitle, setAiDetectedBookTitle] = useState<string>('');
  const [showTextPreview, setShowTextPreview] = useState<boolean>(true);
  const [isPurifying, setIsPurifying] = useState<boolean>(false);
  const [purifiedNotification, setPurifiedNotification] = useState<string | null>(null);
  const [conversionError, setConversionError] = useState<string | null>(null);

  // Chat Modal on Direct Demand
  const [showInstantChatModal, setShowInstantChatModal] = useState<boolean>(false);

  // Listening Mode States (Full, Summary 10m, Key Points 50%)
  const [listeningMode, setListeningMode] = useState<ListeningMode>('summary');

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

  return (
    <div className="w-full bg-[#0d1322] border border-blue-900/40 rounded-3xl p-4 sm:p-7 shadow-2xl relative overflow-hidden space-y-6 font-['Cairo',sans-serif]" dir="rtl">
      
      {/* Decorative ambient gradient */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 🌟 1. Top Multi-Service Navigation Header (Interactive Tabs) */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-[#080d1a] border border-blue-900/50 shadow-inner">
        
        {/* Service 1: Audio / PDF to Speech */}
        <button
          type="button"
          onClick={() => {
            setActiveServiceTab('audiobook');
            setListeningMode('full');
          }}
          className={`px-3.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeServiceTab === 'audiobook'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40 ring-1 ring-blue-400/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Headphones className="w-4 h-4 text-cyan-300" />
          <span>كتاب صوتي (Audiobook)</span>
        </button>

        {/* Service 2: Chat with PDF */}
        <button
          type="button"
          onClick={() => {
            setActiveServiceTab('chat');
            if (extractedText.trim().length > 30) {
              setShowInstantChatModal(true);
            }
          }}
          className={`px-3.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeServiceTab === 'chat'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 ring-1 ring-purple-400/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-amber-300" />
          <span>اسأل وتحدث (Chat PDF)</span>
        </button>

        {/* Service 3: Summary in 10 Min */}
        <button
          type="button"
          onClick={() => {
            setActiveServiceTab('summary');
            setListeningMode('summary');
          }}
          className={`px-3.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeServiceTab === 'summary'
              ? 'bg-gradient-to-r from-amber-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/40 ring-1 ring-amber-400/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>ملخص بودكاست (10 د)</span>
        </button>

        {/* Service 4: Key Points */}
        <button
          type="button"
          onClick={() => {
            setActiveServiceTab('writer');
            setListeningMode('key_points');
          }}
          className={`px-3.5 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeServiceTab === 'writer'
              ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/40 ring-1 ring-teal-400/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Target className="w-4 h-4 text-emerald-300" />
          <span>النقاط الجوهرية (Key Points)</span>
        </button>

      </div>

      {/* Main Headline for Service */}
      <div className="text-center space-y-1">
        <h2 className="text-xl sm:text-2xl font-black text-white font-['Tajawal'] flex items-center justify-center gap-2">
          <span>
            {activeServiceTab === 'chat'
              ? 'تحدث واسأل أي ملف PDF أو نص بالذكاء الاصطناعي 💬'
              : activeServiceTab === 'summary'
              ? 'لخص أي كتاب في بودكاست صوتي مدته 10 دقائق ⏱️'
              : activeServiceTab === 'writer'
              ? 'استخرج أهم 7 دروس ونقاط جوهرية من كتابك 🎯'
              : 'حوّل أي كتاب PDF أو نص إلى صوت عربي فاخر 🎧'}
          </span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          اختر الطريقة الأنسب لرفع الملف أو لصق النص مباشرة أدناه للبدء الفوري
        </p>
      </div>

      {/* Non-blocking error alert */}
      {conversionError && (
        <div className="relative z-20 flex items-center justify-between p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-semibold animate-in fade-in" dir="rtl">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{conversionError}</span>
          </div>
          <button
            onClick={() => setConversionError(null)}
            className="p-1 hover:bg-rose-900/50 rounded-lg text-rose-300 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 🌟 2. Figma-Inspired 2-Column Split Dropzone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch relative z-10">
        
        {/* Column 1: Drop a file or upload */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center space-y-3 group ${
            isDragging
              ? 'border-blue-400 bg-blue-950/40 scale-[1.01]'
              : selectedFile
              ? 'border-emerald-500/60 bg-emerald-950/20'
              : 'border-blue-900/60 hover:border-blue-500/70 bg-[#0a0f1d]/90 hover:bg-[#0a0f1d]'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.epub,application/pdf,application/epub+zip"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
            <Upload className="w-6 h-6" />
          </div>

          {isExtracting ? (
            <div className="flex items-center gap-2 text-blue-300 font-bold text-xs animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>{extractionStatusText || 'جاري استخراج وقراءة نص الكتاب...'}</span>
            </div>
          ) : selectedFile ? (
            <div className="space-y-1">
              <p className="text-emerald-400 font-bold text-xs flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="truncate max-w-[200px]">{selectedFile.name}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {pageCount} صفحة
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-bold text-slate-200">
                اسحب وأفلت ملف الـ PDF هنا
              </p>
              <p className="text-[11px] text-slate-400">
                يدعم ملفات PDF و ePub حتى 50MB
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>اختر ملف من جهازك</span>
          </button>
        </div>

        {/* Column 2: Paste text directly / Quick Prompt */}
        <div className="border border-blue-900/60 rounded-3xl p-5 bg-[#0a0f1d]/90 flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <ClipboardPaste className="w-3.5 h-3.5 text-cyan-400" />
                <span>الصق النص أو المحتوى مباشرة:</span>
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono border border-slate-700">
                CTRL + V
              </span>
            </div>

            <textarea
              value={extractedText}
              onChange={(e) => {
                setExtractedText(e.target.value);
                setSelectedFile(null);
              }}
              rows={4}
              dir="rtl"
              className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none leading-relaxed font-['Tajawal']"
              placeholder="اكتب أو الصق نص الكتاب، المقال، أو السؤال هنا مباشرة..."
            />
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
            <span>
              {extractedText.split(/\s+/).filter(Boolean).length} كلمة (~{Math.max(1, Math.round(extractedText.split(/\s+/).filter(Boolean).length / 130))} دقيقة)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePurifyText}
                disabled={isPurifying || !extractedText.trim()}
                className="text-[10px] text-indigo-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                title="تنقية النص بالذكاء الاصطناعي"
              >
                <Wand2 className="w-3 h-3 text-indigo-400" />
                <span>تنقية الشوائب</span>
              </button>
              <button
                type="button"
                onClick={() => setExtractedText('')}
                className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
              >
                مسح
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* 🌟 3. Quick Sample Selector */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>أو اختر نموذجاً جاهزاً بنقرة واحدة:</span>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SAMPLE_BOOKS.map((book) => {
            const isSelected = selectedSampleBook?.id === book.id && !selectedFile;
            return (
              <button
                key={book.id}
                onClick={() => handleSelectSample(book)}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold text-right truncate border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600/25 border-blue-400 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                title={book.title}
              >
                📖 {book.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* 🌟 4. Voice Selection Bar with Live Voice Preview (Play/Pause Sample Button) */}
      <div className="p-4 rounded-2xl bg-[#0a0f1d]/90 border border-blue-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white">القارئ الصوتي:</span>
          <span className="text-xs text-cyan-300 font-bold bg-cyan-950/80 px-2.5 py-0.5 rounded-lg border border-cyan-800/60">
            {selectedVoice.name} ({selectedVoice.gender === 'female' ? 'أنثى' : 'ذكر'})
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Play/Pause Sample Button */}
          <button
            type="button"
            onClick={handleToggleVoicePreview}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isPlayingPreview
                ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                : 'bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border-slate-700'
            }`}
            title="استمع لعينة هذا الصوت"
          >
            {isPlayingPreview ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>إيقاف العينة</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>استمع للعينة</span>
              </>
            )}
          </button>

          {/* Quick Voice Dropdown */}
          <select
            value={selectedVoice.id}
            onChange={(e) => {
              const v = voicesPool.find((x) => x.id === e.target.value);
              if (v) setSelectedVoice(v);
            }}
            className="flex-1 sm:flex-none bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {voicesPool.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.gender === 'female' ? 'أنثى' : 'ذكر'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 🌟 5. Dynamic Action CTA Button */}
      <div className="pt-2">
        {activeServiceTab === 'chat' ? (
          <button
            type="button"
            onClick={() => setShowInstantChatModal(true)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-black text-sm shadow-xl shadow-purple-600/40 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageSquare className="w-5 h-5 text-amber-300" />
            <span>بدء التحدث ومحادثة هذا الكتاب الآن (Chat With PDF) ✨</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStartConversion}
            disabled={isConverting || isExtracting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-sm shadow-xl shadow-indigo-600/40 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isConverting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-cyan-300" />
                <span>جاري المعالجة والتحويل الصوتي...</span>
              </>
            ) : (
              <>
                <Headphones className="w-5 h-5 text-cyan-300" />
                <span>
                  {activeServiceTab === 'summary'
                    ? 'تحويل إلى ملخص بودكاست صوتي (10 دقائق) 🎧'
                    : activeServiceTab === 'writer'
                    ? 'تحويل واستماع للنقاط الجوهرية الـ 7 🎯'
                    : 'بدء التحويل الصوتي والاستماع الفوري 🎧'}
                </span>
              </>
            )}
          </button>
        )}
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

      {/* Chat With PDF Modal for Direct Chat Tab */}
      {showInstantChatModal && (
        <ChatPdfModal
          isOpen={showInstantChatModal}
          onClose={() => setShowInstantChatModal(false)}
          job={{
            id: `temp-${Date.now()}`,
            fileName: selectedFile ? selectedFile.name : selectedSampleBook ? selectedSampleBook.title : 'المستند المرفوع',
            fileSize: '1.5 MB',
            totalPages: pageCount,
            processedPages: pageCount,
            selectedDialect,
            selectedVoice,
            selectedStyle,
            status: 'completed',
            progress: 100,
            extractedText,
            textChunks: [extractedText],
            durationInSeconds: 300,
            createdAt: new Date().toLocaleTimeString('ar-SA'),
          }}
          availableVoices={voicesPool}
        />
      )}

    </div>
  );
};
