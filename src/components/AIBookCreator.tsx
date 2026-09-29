import React, { useState } from 'react';
import { 
  Wand2, 
  BookOpen, 
  Sparkles, 
  Layers, 
  Palette, 
  FileDown, 
  Headphones, 
  CheckCircle2, 
  Clock, 
  Users, 
  Volume2, 
  ArrowLeft, 
  ArrowRight,
  RefreshCw,
  Eye,
  AlertCircle,
  Globe,
  MessageSquare,
  Baby,
  Feather
} from 'lucide-react';
import { GeneratedBookStructure, createProfessionalArabicPdf } from '../lib/bookPdfGenerator';
import { generateCrispBookCoverPng } from '../lib/bookCoverCanvas';
import { ConversionJob, Voice } from '../types';

interface AIBookCreatorProps {
  onStartAudioJob: (job: ConversionJob) => void;
  availableVoices: Voice[];
  onBackToLibrary?: () => void;
}

export const AIBookCreator: React.FC<AIBookCreatorProps> = ({
  onStartAudioJob,
  availableVoices,
  onBackToLibrary,
}) => {
  // Wizard Step: 1 (Form Questionnaire or Prompt Mode) -> 2 (Generating) -> 3 (Preview & Download/Listen)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Creation Mode State: 'questionnaire' | 'freeform_prompt'
  const [creationMode, setCreationMode] = useState<'questionnaire' | 'freeform_prompt'>('questionnaire');

  // Book Language State: 'ar' | 'en' | 'fr' | 'es' | 'de'
  const [language, setLanguage] = useState<string>('ar');

  // Questionnaire Form State
  const [topic, setTopic] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [authorName, setAuthorName] = useState('الكاتب المبدع');
  const [genre, setGenre] = useState('تنمية ذاتية وإنتاجية');
  const [targetAudience, setTargetAudience] = useState('الشباب والرواد والمهتمون بالنجاح');
  const [targetPages, setTargetPages] = useState<number>(15);
  const [tone, setTone] = useState('ملهم وعميق مع أمثلة عملية');
  const [coverStyle, setCoverStyle] = useState<'cinematic' | 'minimal' | 'vintage' | 'fantasy'>('cinematic');

  // Freeform Prompt State
  const [freeformPrompt, setFreeformPrompt] = useState('');

  // Generation & Results State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState<string>('');
  const [generatedBook, setGeneratedBook] = useState<GeneratedBookStructure | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<Voice>(availableVoices[0] || {} as Voice);

  // Quick Preset Ideas (Including Kids Story, Self-Help, Sci-Fi, Business)
  const presets = [
    {
      title: 'مغامرة الأرنوب سمسم في الغابة العجيبة 🦄',
      genre: 'قصص أطفال صغار ومغامرات',
      pages: 10,
      tone: 'مسلٍ، حنون، وبسيط ملائم للأطفال من 3-8 سنوات',
      targetAudience: 'الأطفال الصغار والأمهات والأباء',
      coverStyle: 'fantasy' as const,
      isKids: true,
      freeformSample: 'اكتب قصة أطفال مشوقة ولطيفة عن الأرنوب سمسم الذي يتعلم أهمية الصدق ومساعدة الأصدقاء في الغابة السحرية، بكلمات بسيطة ورسوم ملونة مبهجة.'
    },
    {
      title: 'عادات التركيز الفائق في عصر التشتت',
      genre: 'تنمية ذاتية وإنتاجية',
      pages: 15,
      tone: 'علمي وعملي مدعوم بأمثلة حية',
      targetAudience: 'الشباب والرواد',
      coverStyle: 'cinematic' as const,
      isKids: false,
      freeformSample: 'صغ كتاباً ملهماً عن بناء تركيز عميق وإنجاز المهام الصعبة بدون توتر، مع 5 فصول واستراتيجيات عملية.'
    },
    {
      title: 'أسرار بناء المشاريع الناشئة والذكاء المالي',
      genre: 'ريادة أعمال واستثمار',
      pages: 20,
      tone: 'تحفيزي واستراتيجي لرواد الأعمال',
      targetAudience: 'رواد الأعمال والمستثمرون',
      coverStyle: 'minimal' as const,
      isKids: false,
      freeformSample: 'كتاب استراتيجي لشرح أساسيات إطلاق الابتكارات، جذب المستثمرين، وإدارة التدفقات المالية.'
    },
    {
      title: 'رحلة إلى ما وراء النجوم (رواية خيال علمي)',
      genre: 'أدب وروايات وخيال',
      pages: 12,
      tone: 'روائي مشوق ومليء بالإثارة والغموض',
      targetAudience: 'عشاق الروايات الخيالية',
      coverStyle: 'fantasy' as const,
      isKids: false,
      freeformSample: 'رواية مشوقة عن رحلة استكشافية للفضاء واكتشاف كوكب جديد مليء بالأسرار.'
    },
  ];

  const handleApplyPreset = (p: typeof presets[0]) => {
    setTopic(p.title);
    setCustomTitle(p.title);
    setGenre(p.genre);
    setTargetPages(p.pages);
    setTone(p.tone);
    setTargetAudience(p.targetAudience);
    setCoverStyle(p.coverStyle);
    setFreeformPrompt(p.freeformSample);
  };

  const handleStartGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeInput = creationMode === 'freeform_prompt' ? freeformPrompt : topic;
    
    if (!activeInput.trim()) {
      setErrorMsg('يرجى كتابة فكرة أو برومبت الوصف الخاص بالكتاب للبدء.');
      return;
    }

    setErrorMsg('');
    setIsGenerating(true);
    setStep(2);

    try {
      // Phase 1: Generating Book Chapters & Deep Content with Selected Language & Mode
      setGenerationPhase('جاري تحليل البرومبت وصياغة الفصول والمحتوى الذكي بذكاء Gemini 3.8 Flash...');
      
      const bookRes = await fetch('/api/ai/generate-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          customTitle: customTitle || topic,
          genre,
          targetAudience,
          tone,
          targetPages,
          authorName: authorName || 'الكاتب المبدع',
          language,
          creationMode,
          freeformPrompt,
        }),
      });

      const bookData = await bookRes.json();
      if (!bookData.success || !bookData.book) {
        throw new Error(bookData.error || 'تعذر توليد فصول الكتاب');
      }

      const book: GeneratedBookStructure = bookData.book;
      book.author = authorName || book.author || 'الكاتب المبدع';
      book.coverStyle = coverStyle;
      book.language = language;

      // Phase 2: Generating 8K Realistic AI Book Cover
      setGenerationPhase('جاري رسم وتصميم غلاف الكتاب الاحترافي بواسطة الذكاء الاصطناعي...');
      
      let coverImg = '';
      
      // Try AI cover from backend first
      try {
        const coverRes = await fetch('/api/ai/generate-cover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: book.title,
            genre: book.genre,
            author: book.author,
            synopsis: book.synopsis,
            targetAudience: book.targetAudience,
            coverPrompt: (book as any).coverPrompt || activeInput,
            style: coverStyle,
          }),
        });
        const coverData = await coverRes.json();
        if (coverData.success && coverData.imageUrl && !coverData.imageUrl.includes('svg')) {
          coverImg = coverData.imageUrl;
          book.coverImageBase64 = coverImg;
        }
      } catch (coverErr) {
        console.warn('Backend cover gen note:', coverErr);
      }

      // If backend AI cover not reached, generate clean canvas PNG as fallback
      if (!coverImg) {
        try {
          coverImg = generateCrispBookCoverPng(
            book.title,
            book.author,
            book.genre,
            coverStyle
          );
          book.coverImageBase64 = coverImg;
        } catch (coverCanvasErr) {
          console.warn('Canvas cover gen fallback:', coverCanvasErr);
        }
      }

      setCoverImageUrl(coverImg);
      setGeneratedBook(book);
      setGenerationPhase('تم تأليف الكتاب وتنسيقه بنجاح! 🎉');
      setStep(3);
    } catch (err: any) {
      console.error('Book Generation Error:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء توليد الكتاب. يرجى إعادة المحاولة.');
      setStep(1);
    } finally {
      setIsGenerating(false);
    }
  };

  // Re-generate AI Cover Image on demand
  const [isRegeneratingCover, setIsRegeneratingCover] = useState(false);
  const handleRegenerateAICover = async () => {
    if (!generatedBook || isRegeneratingCover) return;
    setIsRegeneratingCover(true);
    try {
      const coverRes = await fetch('/api/ai/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generatedBook.title,
          genre: generatedBook.genre,
          author: generatedBook.author,
          synopsis: generatedBook.synopsis,
          targetAudience: generatedBook.targetAudience,
          style: coverStyle,
        }),
      });
      const coverData = await coverRes.json();
      if (coverData.success && coverData.imageUrl) {
        setCoverImageUrl(coverData.imageUrl);
        generatedBook.coverImageBase64 = coverData.imageUrl;
      }
    } catch (e) {
      console.warn('Regenerate cover error:', e);
    } finally {
      setIsRegeneratingCover(false);
    }
  };

  // Export & Download PDF
  const handleDownloadPdf = async () => {
    if (!generatedBook) return;
    try {
      setGenerationPhase('جاري تجهيز وتصدير ملف الـ PDF عالي الدقة...');
      const pdfBlob = await createProfessionalArabicPdf(generatedBook);
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedBook.title || 'كتاب_إلكتروني'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download PDF error:', e);
      alert('تعذر تنزيل ملف الـ PDF حالياً.');
    }
  };

  // Convert Generated Book directly to Audiobook
  const handleListenAsAudiobook = () => {
    if (!generatedBook) return;

    const fullText = generatedBook.chapters
      .map((ch) => `${ch.title}\n\n${ch.subsections.map((s) => `${s.subheading}\n${s.content}\n${s.keyTakeaway ? `خلاصة: ${s.keyTakeaway}` : ''}`).join('\n\n')}`)
      .join('\n\n---\n\n');

    const formattedChapters = generatedBook.chapters.map((ch, idx) => {
      const chapterText = ch.subsections.map((s) => `${s.subheading}\n${s.content}`).join('\n\n');
      const words = chapterText.split(/\s+/).length;
      return {
        id: `gen-ch-${idx + 1}`,
        chapterNumber: idx + 1,
        title: ch.title,
        text: chapterText,
        wordCount: words,
        estimatedDurationMinutes: Math.max(2, Math.round(words / 130)),
        status: 'pending' as const,
      };
    });

    const job: ConversionJob = {
      id: `ai-book-${Date.now()}`,
      fileName: `${generatedBook.title}.pdf`,
      fileSize: '1.8 MB',
      totalPages: generatedBook.totalPagesTarget || 15,
      processedPages: generatedBook.totalPagesTarget || 15,
      selectedDialect: {
        id: 'msa',
        name: 'الفصحى المعاصرة',
        country: 'العالم العربي',
        flag: '🌐',
        code: 'ar-SA',
      },
      selectedVoice: selectedVoice || availableVoices[0],
      selectedStyle: {
        id: 'normal',
        name: 'إلقاء وثائقي أدبي',
        description: 'نبرة عميقة وفخمة',
        icon: 'Sparkles',
      },
      status: 'completed',
      progress: 100,
      extractedText: fullText,
      textChunks: [fullText],
      chapters: formattedChapters,
      activeChapterId: formattedChapters[0]?.id,
      durationInSeconds: formattedChapters.reduce((acc, c) => acc + c.estimatedDurationMinutes * 60, 0),
      createdAt: new Date().toLocaleDateString('ar-SA'),
    };

    onStartAudioJob(job);
  };

  return (
    <div className="space-y-6 font-['Cairo',sans-serif]" dir="rtl">
      
      {/* Top Banner & Mode Indicator */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-950/90 via-indigo-950/90 to-purple-950/90 border border-blue-500/40 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/40 shrink-0">
            <Wand2 className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white font-['Tajawal']">
                مؤلف الكتب الذكي (AI Book Creator)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-black shadow-md">
                دعم لغات متعددة + برومبت حر
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              حوّل أي برومبت أو فكرة لقصة أطفال، كتاب ريادة أعمال، أو رواية بأي لغة مع غلاف ومحتوى متناسق 100%.
            </p>
          </div>
        </div>

        {onBackToLibrary && (
          <button
            onClick={onBackToLibrary}
            className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all border border-slate-700/60 shrink-0 cursor-pointer"
          >
            الرجوع للمكتبة
          </button>
        )}
      </div>

      {/* Step 1: Questionnaire or Freeform Prompt Mode */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Form Questionnaire / Prompt Mode (8 cols) */}
          <form onSubmit={handleStartGeneration} className="lg:col-span-8 p-6 sm:p-8 rounded-3xl bg-[#0c1220] border border-blue-900/40 space-y-6 shadow-xl">
            
            {/* Mode & Language Bar Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              
              {/* Creation Mode Switcher Tabs */}
              <div className="flex items-center bg-[#070b14] p-1 rounded-2xl border border-blue-900/50">
                <button
                  type="button"
                  onClick={() => setCreationMode('questionnaire')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    creationMode === 'questionnaire'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>الاستبيان الموجه</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode('freeform_prompt')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    creationMode === 'freeform_prompt'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Feather className="w-3.5 h-3.5 text-amber-300" />
                  <span>كتابة برومبت حر (Prompt Mode)</span>
                </button>
              </div>

              {/* Language Selector Dropdown */}
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-300">لغة الكتاب:</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 font-bold cursor-pointer"
                >
                  <option value="ar">🇸🇦 العربية (Arabic)</option>
                  <option value="en">🇺🇸 الإنجليزية (English)</option>
                  <option value="fr">🇫🇷 الفرنسية (Français)</option>
                  <option value="es">🇪🇸 الإسبانية (Español)</option>
                  <option value="de">🇩🇪 الألمانية (Deutsch)</option>
                </select>
              </div>

            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Mode 1: Freeform Prompt Mode */}
            {creationMode === 'freeform_prompt' ? (
              <div className="space-y-4 animate-in fade-in">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-white flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-purple-400" />
                      <span>اكتب البرومبت أو وصف الكتاب التفصيلي بأسلوبك الحر:</span>
                    </span>
                    <span className="text-[10px] text-amber-300 font-bold">ذكاء اصطناعي تكيفي</span>
                  </label>
                  <textarea
                    rows={6}
                    required
                    value={freeformPrompt}
                    onChange={(e) => setFreeformPrompt(e.target.value)}
                    placeholder="مثال: اكتب لي قصة أطفال ممتعة ومصورة عن أرنوب صغير يكتشف غابة سحرية ويتعلم أهمية الصدق والمشاركة مع الأصدقاء، لغة بسيطة جداً للأطفال من عمر 4 سنوات مع رسوم ملونة وألوان حيوية..."
                    className="w-full p-4 rounded-2xl bg-[#11192e] border border-purple-900/60 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-400">
                    💡 **ملاحظة:** سيتعرف الذكاء الاصطناعي تلقائياً على ما إذا كان الكتاب قصة أطفال أو كتاب أعمال، ويصمم المحتوى والغلاف والغلاف المدمج بدقة متناهية.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-white">اسم المؤلف (اختياري)</label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="اسمك أو اسم مستعار"
                      className="w-full p-3 rounded-xl bg-[#11192e] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-white">طراز غلاف الكتاب</label>
                    <select
                      value={coverStyle}
                      onChange={(e) => setCoverStyle(e.target.value as any)}
                      className="w-full p-3 rounded-xl bg-[#11192e] border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="cinematic">سينمائي/طفولي مبهج (Adaptively Styled)</option>
                      <option value="fantasy">خيالي ورسومات سحرية (Magical Fantasy)</option>
                      <option value="minimal">مينيمال عصري (Minimal Modern)</option>
                      <option value="vintage">كلاسيكي عتيق (Vintage)</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              /* Mode 2: Structured Questionnaire */
              <div className="space-y-5 animate-in fade-in">
                
                {/* Question 1: Topic */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-white flex items-center justify-between">
                    <span>1. ما هو موضوع أو فكرة الكتاب التي تريد تأليفها؟ *</span>
                    <span className="text-[10px] text-cyan-400 font-bold">مطلوب</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="مثال: قصة أطفال عن شجاعة الفرسان، أو كتاب عن استراتيجيات إدارة الوقت للمحترفين..."
                    className="w-full p-3.5 rounded-2xl bg-[#11192e] border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Question 2: Title & Author */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-white">2. عنوان الكتاب (اختياري)</label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="اتركه فارغاً ليبتكره AI بذكاء"
                      className="w-full p-3 rounded-xl bg-[#11192e] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-white">اسم المؤلف</label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="اسمك أو اسم مستعار"
                      className="w-full p-3 rounded-xl bg-[#11192e] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Question 3: Genre & Target Pages */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-white">3. تصنيف ونوع الكتاب</label>
                    <select
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      className="w-full p-3 rounded-xl bg-[#11192e] border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="قصص أطفال صغار ومغامرات">👶 قصص أطفال صغار ومغامرات</option>
                      <option value="تنمية ذاتية وإنتاجية">💡 تنمية ذاتية وإنتاجية</option>
                      <option value="ريادة أعمال ومال واستثمار">🚀 ريادة أعمال ومال واستثمار</option>
                      <option value="أدب ورواية وقصص خيالية">📖 أدب ورواية وقصص خيالية</option>
                      <option value="فكر وتاريخ وفلسفة">🏛️ فكر وتاريخ وفلسفة</option>
                      <option value="صحة نفسية وتطوير شخصي">🌿 صحة نفسية وتطوير شخصي</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-white flex items-center justify-between">
                      <span>4. حجم الكتاب التقديري (بالصفحات)</span>
                      <span className="text-cyan-400 font-bold">{targetPages} صفحة</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[10, 15, 25].map((pages) => (
                        <button
                          key={pages}
                          type="button"
                          onClick={() => setTargetPages(pages)}
                          className={`py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            targetPages === pages
                              ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                              : 'bg-[#11192e] border-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          {pages} صفحة
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Question 5: Tone & Cover Style */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-white">5. نبرة وأسلوب الكتابة</label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full p-3 rounded-xl bg-[#11192e] border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="مسلٍ، حنون، وبسيط للأطفال">مسلٍ، حنون، وبسيط للأطفال (Kids Mode)</option>
                      <option value="ملهم وعميق مع أمثلة عملية">ملهم وعميق مع أمثلة عملية</option>
                      <option value="أكاديمي وبحثي دقيق">أكاديمي وبحثي دقيق</option>
                      <option value="روائي وسينمائي مشوق">روائي وسينمائي مشوق</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-white flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-indigo-400" />
                      <span>طراز غلاف الكتاب الفني</span>
                    </label>
                    <select
                      value={coverStyle}
                      onChange={(e) => setCoverStyle(e.target.value as any)}
                      className="w-full p-3 rounded-xl bg-[#11192e] border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="cinematic">سينمائي فخم (Cinematic Luxury)</option>
                      <option value="fantasy">خيالي طفولي/سحري (Magical Fantasy/Kids)</option>
                      <option value="minimal">مينيمال عصري (Minimal Modern)</option>
                      <option value="vintage">كلاسيكي عتيق (Vintage Classic)</option>
                    </select>
                  </div>
                </div>

              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-800">
              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-sm shadow-xl shadow-indigo-600/40 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
                <span>
                  {creationMode === 'freeform_prompt' 
                    ? 'تحويل البرومبت إلى كتاب إلكتروني كامل وغلاف ✨' 
                    : 'بدء تأليف وصياغة الكتاب الإلكتروني كاملاً ✨'}
                </span>
              </button>
            </div>

          </form>

          {/* Sidebar Presets & Adaptive Tips (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick Presets Box */}
            <div className="p-6 rounded-3xl bg-[#0c1220] border border-blue-900/40 space-y-4 shadow-xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-black text-white font-['Tajawal']">نماذج وأمثلة جاهزة للبدء</h4>
              </div>
              
              <div className="space-y-2.5">
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className={`w-full p-3 rounded-2xl border text-right space-y-1 transition-all group cursor-pointer ${
                      preset.isKids
                        ? 'bg-purple-950/40 border-purple-500/40 hover:border-purple-400'
                        : 'bg-[#11192e] border-slate-800/80 hover:border-blue-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {preset.title}
                      </div>
                      {preset.isKids && (
                        <span className="text-[9px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full font-bold border border-pink-500/40 flex items-center gap-1">
                          <Baby className="w-3 h-3" /> أطفال
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{preset.genre}</span>
                      <span className="text-indigo-400 font-bold">{preset.pages} صفحة</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Adaptive System Guarantee Box */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950/60 to-blue-950/60 border border-indigo-500/30 space-y-3">
              <h4 className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Wand2 className="w-4 h-4 text-cyan-400" />
                <span>الملاءمة الذكية الشاملة (Adaptive AI)</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>**محتوى وغلاف أطفال:** إذا اختيرت قصة طفل، يتم استخدام لغة لطيفة وغلاف 3D Disney/Pixar مبهج.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>**دعم اللغات:** يكتب ويصيغ الكتاب باللغات العربية، الإنجليزية، الفرنسية، الإسبانية أو الألمانية.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>**قياس 6 × 9:** غلاف الكتاب مصمم بأبعاد 6x9 التجاري مع تنسيق PDF محترفي.</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      )}

      {/* Step 2: Generation Loading In Progress */}
      {step === 2 && isGenerating && (
        <div className="p-12 sm:p-16 rounded-3xl bg-[#0c1220] border border-blue-500/40 text-center space-y-6 shadow-2xl animate-pulse">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/50 animate-bounce">
            <Wand2 className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-2xl font-black text-white font-['Tajawal']">
              جاري تأليف وصياغة كتابك الذكي...
            </h3>
            <p className="text-sm text-cyan-300 font-bold">
              {generationPhase}
            </p>
            <p className="text-xs text-slate-400 pt-2">
              يقوم نموذج Gemini 3.8 Flash مع OpenAI Sunburst ببناء الفصول، صياغة المحتوى الملائم للموضوع، وتوليد الغلاف الفني بمقاس 6x9.
            </p>
          </div>

          <div className="w-48 h-2 bg-slate-800 rounded-full mx-auto overflow-hidden">
            <div className="w-full h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 animate-indeterminate" />
          </div>
        </div>
      )}

      {/* Step 3: Success Preview & Download/Listen */}
      {step === 3 && generatedBook && (
        <div className="space-y-6">
          
          {/* Top Congratulations Bar */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-emerald-950/80 border border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white font-['Tajawal']">تم إنشاء كتابك بنجاح! 🎉</h3>
                <p className="text-xs text-emerald-300 font-medium">كتابك جاهز الآن للتحميل كـ PDF فاخر أو الاستماع الفوري بصوت القارئ المفضل.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleDownloadPdf}
                className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>تحميل كتاب الـ PDF</span>
              </button>

              <button
                onClick={handleListenAsAudiobook}
                className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-950/50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Headphones className="w-4 h-4" />
                <span>استمع للكتاب الآن 🎧</span>
              </button>
            </div>
          </div>

          {/* Book Details & Cover Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Cover Preview (4 cols) */}
            <div className="lg:col-span-4 p-6 rounded-3xl bg-[#0c1220] border border-blue-900/40 space-y-4 shadow-xl text-center">
              <div className="relative aspect-[2/3] max-w-[280px] mx-auto rounded-2xl overflow-hidden shadow-2xl border border-blue-500/30 bg-[#0a0f1d] group">
                {coverImageUrl ? (
                  <img src={coverImageUrl} alt={generatedBook.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full bg-[#11192e] flex items-center justify-center text-slate-500">
                    <BookOpen className="w-16 h-16" />
                  </div>
                )}
                {isRegeneratingCover && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-cyan-300 text-xs font-bold animate-in fade-in">
                    <Sparkles className="w-8 h-8 text-amber-300 animate-spin" />
                    <span>جاري توليد غلاف ذكاء اصطناعي جديد...</span>
                  </div>
                )}
              </div>

              {/* Regenerate AI Cover Button */}
              <button
                type="button"
                onClick={handleRegenerateAICover}
                disabled={isRegeneratingCover}
                className="w-full py-2.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>إعادة رسم وتوليد غلاف جديد 🎨</span>
              </button>

              <div className="space-y-1">
                <h4 className="text-base font-black text-white font-['Tajawal']">{generatedBook.title}</h4>
                <p className="text-xs text-slate-400">تأليف: {generatedBook.author}</p>
              </div>

              {/* Voice Selector for Listening */}
              <div className="p-3.5 rounded-2xl bg-[#11192e] border border-slate-800 text-right space-y-2">
                <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>صوت الراوي للاستماع المباشر:</span>
                </label>
                <select
                  value={selectedVoice?.id || ''}
                  onChange={(e) => {
                    const v = availableVoices.find((x) => x.id === e.target.value);
                    if (v) setSelectedVoice(v);
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {availableVoices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.gender === 'female' ? 'أنثى' : 'ذكر'})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setStep(1)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تأليف كتاب جديد آخر</span>
              </button>
            </div>

            {/* Right Chapters & Content Preview (8 cols) */}
            <div className="lg:col-span-8 p-6 sm:p-8 rounded-3xl bg-[#0c1220] border border-blue-900/40 space-y-6 shadow-xl max-h-[750px] overflow-y-auto custom-scrollbar">
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-blue-950 border border-blue-500/40 text-cyan-300 text-xs font-bold">
                    {generatedBook.genre}
                  </span>
                  {generatedBook.language && (
                    <span className="px-2.5 py-1 rounded-xl bg-purple-950 border border-purple-500/40 text-purple-300 text-xs font-bold uppercase">
                      🌐 {generatedBook.language}
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-white font-['Tajawal']">{generatedBook.title}</h3>
                {generatedBook.subtitle && (
                  <p className="text-sm text-slate-300 font-medium">{generatedBook.subtitle}</p>
                )}
              </div>

              {/* Synopsis Box */}
              <div className="p-4 rounded-2xl bg-[#11192e] border border-indigo-900/40 space-y-1.5">
                <div className="text-xs font-bold text-indigo-300">خلاصة الكتاب:</div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{generatedBook.synopsis}</p>
              </div>

              {/* Chapters List */}
              <div className="space-y-5 pt-2">
                <h4 className="text-sm font-black text-white font-['Tajawal'] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>فصول ومحتوى الكتاب ({generatedBook.chapters.length} فصول)</span>
                </h4>

                {generatedBook.chapters.map((ch) => (
                  <div key={ch.chapterNumber} className="p-5 rounded-2xl bg-[#0d1424] border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-extrabold text-blue-400">الفصل {ch.chapterNumber}</div>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                        {ch.subsections.length} أجزاء
                      </span>
                    </div>

                    <h5 className="text-base font-bold text-white">{ch.title}</h5>
                    {ch.summary && <p className="text-xs text-slate-400">{ch.summary}</p>}

                    <div className="space-y-3 pt-2 border-t border-slate-800/60">
                      {ch.subsections.map((sub, sIdx) => (
                        <div key={sIdx} className="space-y-1 text-xs sm:text-sm">
                          {sub.subheading && (
                            <div className="font-bold text-cyan-300">{sub.subheading}</div>
                          )}
                          <p className="text-slate-300 leading-relaxed font-normal">{sub.content}</p>
                          {sub.keyTakeaway && (
                            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-bold mt-1.5">
                              💡 {sub.keyTakeaway}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};
