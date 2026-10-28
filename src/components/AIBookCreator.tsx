import React, { useState } from 'react';
import { ArrowRight, BookOpen, Check, FileDown, Headphones, Loader2, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { GeneratedBookStructure, createProfessionalArabicPdf } from '../lib/bookPdfGenerator';
import { generateCrispBookCoverPng } from '../lib/bookCoverCanvas';
import { ConversionJob, Voice } from '../types';

interface AIBookCreatorProps {
  onStartAudioJob: (job: ConversionJob) => void;
  availableVoices: Voice[];
  onBackToLibrary?: () => void;
}

const LANGUAGES = [
  { value: 'ar', label: 'العربية' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
  { value: 'de', label: 'Deutsch' },
];

const GENRES = [
  'قصص أطفال صغار ومغامرات',
  'تنمية ذاتية وإنتاجية',
  'ريادة أعمال ومال واستثمار',
  'أدب ورواية وقصص خيالية',
  'فكر وتاريخ وفلسفة',
  'صحة نفسية وتطوير شخصي',
];

const TONES = ['ملهم وعميق مع أمثلة عملية', 'مسلٍ، حنون، وبسيط للأطفال', 'أكاديمي وبحثي دقيق', 'روائي وسينمائي مشوق'];

const COVER_STYLES = [
  { value: 'cinematic', label: 'سينمائي' },
  { value: 'fantasy', label: 'خيالي' },
  { value: 'minimal', label: 'بسيط عصري' },
  { value: 'vintage', label: 'كلاسيكي' },
] as const;

const PAGE_OPTIONS = [10, 15, 25];

// Arabic plural: 3–10 take صفحات, 11+ take صفحة
const pagesLabel = (n: number) => `${n} ${n >= 3 && n <= 10 ? 'صفحات' : 'صفحة'}`;

const fieldClass =
  'w-full min-h-12 bg-ink border border-line rounded-[10px] px-3.5 text-[15px] text-white placeholder-slate-500 focus:outline-none focus:border-brand';
const labelClass = 'text-sm font-semibold text-slate-200';

const chipClass = (active: boolean) =>
  `min-h-11 px-4 rounded-[10px] text-sm border cursor-pointer ${
    active ? 'border-brand bg-brand-deep text-white' : 'border-line text-slate-300 hover:text-white hover:border-line-strong'
  }`;

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
      title: 'مغامرة الأرنوب سمسم في الغابة العجيبة',
      genre: 'قصص أطفال صغار ومغامرات',
      pages: 10,
      tone: 'مسلٍ، حنون، وبسيط للأطفال',
      targetAudience: 'الأطفال الصغار والأمهات والأباء',
      coverStyle: 'fantasy' as const,
      isKids: true,
      freeformSample: 'اكتب قصة أطفال مشوقة ولطيفة عن الأرنوب سمسم الذي يتعلم أهمية الصدق ومساعدة الأصدقاء في الغابة السحرية، بكلمات بسيطة ورسوم ملونة مبهجة.'
    },
    {
      title: 'عادات التركيز الفائق في عصر التشتت',
      genre: 'تنمية ذاتية وإنتاجية',
      pages: 15,
      tone: 'ملهم وعميق مع أمثلة عملية',
      targetAudience: 'الشباب والرواد',
      coverStyle: 'cinematic' as const,
      isKids: false,
      freeformSample: 'صغ كتاباً ملهماً عن بناء تركيز عميق وإنجاز المهام الصعبة بدون توتر، مع 5 فصول واستراتيجيات عملية.'
    },
    {
      title: 'أسرار بناء المشاريع الناشئة والذكاء المالي',
      genre: 'ريادة أعمال ومال واستثمار',
      pages: 20,
      tone: 'ملهم وعميق مع أمثلة عملية',
      targetAudience: 'رواد الأعمال والمستثمرون',
      coverStyle: 'minimal' as const,
      isKids: false,
      freeformSample: 'كتاب استراتيجي لشرح أساسيات إطلاق الابتكارات، جذب المستثمرين، وإدارة التدفقات المالية.'
    },
    {
      title: 'رحلة إلى ما وراء النجوم (رواية خيال علمي)',
      genre: 'أدب ورواية وقصص خيالية',
      pages: 12,
      tone: 'روائي وسينمائي مشوق',
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
      setErrorMsg('اكتب فكرة الكتاب أولاً.');
      return;
    }

    setErrorMsg('');
    setIsGenerating(true);
    setStep(2);

    try {
      // Phase 1: Generating Book Chapters & Deep Content with Selected Language & Mode
      setGenerationPhase('نكتب الفصول والمحتوى...');
      
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

      // Phase 2: Generating the book cover
      setGenerationPhase('نصمم الغلاف...');
      
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
      setGenerationPhase('اكتمل الكتاب');
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
      setErrorMsg('تعذر تجهيز ملف PDF، حاول مرة أخرى.');
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
      fileSize: '',
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

  const isQuestionnaire = creationMode === 'questionnaire';
  const coverDone = generationPhase === 'نصمم الغلاف...';

  return (
    <div className="flex flex-col gap-6 font-body text-slate-200" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-display font-extrabold text-[28px] text-white">اصنع كتاباً بالذكاء الاصطناعي</h2>
          <p className="text-slate-400">اكتب فكرة، ونؤلف لك كتاباً كاملاً بغلاف، تحمّله PDF أو تستمع له مباشرة.</p>
        </div>
        {onBackToLibrary && (
          <button
            type="button"
            onClick={onBackToLibrary}
            className="min-h-11 px-4 rounded-[10px] border border-line text-slate-300 hover:text-white hover:border-line-strong flex items-center gap-2 cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            مكتبتي
          </button>
        )}
      </div>

      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
          <form onSubmit={handleStartGeneration} className="bg-card border border-line rounded-[20px] p-5 sm:p-7 flex flex-col gap-5">
            <div role="tablist" aria-label="طريقة الإنشاء" className="flex gap-1 p-1 rounded-xl bg-ink self-start">
              {([
                ['questionnaire', 'خطوة بخطوة'],
                ['freeform_prompt', 'وصف حر'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={creationMode === mode}
                  onClick={() => setCreationMode(mode)}
                  className={`min-h-11 px-5 rounded-[9px] text-[15px] font-semibold cursor-pointer ${
                    creationMode === mode ? 'bg-raised text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {isQuestionnaire ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="book-topic" className={labelClass}>عن ماذا يتحدث الكتاب؟</label>
                <textarea
                  id="book-topic"
                  rows={3}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="مثال: كيف تبني عادة القراءة اليومية في 30 يوماً"
                  className={`${fieldClass} py-3 resize-y leading-relaxed`}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="book-prompt" className={labelClass}>صف الكتاب الذي تريده بأسلوبك</label>
                <textarea
                  id="book-prompt"
                  rows={6}
                  value={freeformPrompt}
                  onChange={(e) => setFreeformPrompt(e.target.value)}
                  placeholder="الموضوع، الجمهور، عدد الفصول، الأسلوب، وأي تفاصيل تهمك..."
                  className={`${fieldClass} py-3 resize-y leading-relaxed`}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isQuestionnaire && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="book-title" className={labelClass}>العنوان <span className="text-slate-500 font-normal">(اختياري)</span></label>
                  <input id="book-title" type="text" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} className={fieldClass} />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="book-author" className={labelClass}>اسم المؤلف</label>
                <input id="book-author" type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)} className={fieldClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="book-lang" className={labelClass}>لغة الكتاب</label>
                <select id="book-lang" value={language} onChange={(e) => setLanguage(e.target.value)} className={`${fieldClass} cursor-pointer`}>
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
              {isQuestionnaire && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="book-genre" className={labelClass}>التصنيف</label>
                    <select id="book-genre" value={genre} onChange={(e) => setGenre(e.target.value)} className={`${fieldClass} cursor-pointer`}>
                      {GENRES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="book-tone" className={labelClass}>الأسلوب</label>
                    <select id="book-tone" value={tone} onChange={(e) => setTone(e.target.value)} className={`${fieldClass} cursor-pointer`}>
                      {TONES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>

            {isQuestionnaire && (
              <div className="flex flex-col gap-2">
                <span id="pages-label" className={labelClass}>الحجم التقريبي</span>
                <div role="radiogroup" aria-labelledby="pages-label" className="flex flex-wrap gap-2">
                  {PAGE_OPTIONS.map((pages) => (
                    <button key={pages} type="button" role="radio" aria-checked={targetPages === pages} onClick={() => setTargetPages(pages)} className={chipClass(targetPages === pages)}>
                      {pagesLabel(pages)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span id="cover-label" className={labelClass}>طراز الغلاف</span>
              <div role="radiogroup" aria-labelledby="cover-label" className="flex flex-wrap gap-2">
                {COVER_STYLES.map((c) => (
                  <button key={c.value} type="button" role="radio" aria-checked={coverStyle === c.value} onClick={() => setCoverStyle(c.value)} className={chipClass(coverStyle === c.value)}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div role="alert" className="p-3 rounded-xl bg-rose-950/60 border border-rose-900 text-rose-200 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isGenerating}
              className="min-h-[52px] rounded-xl bg-gradient-to-l from-brand to-indigo-500 hover:to-indigo-400 text-white font-bold text-base flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Sparkles className="w-5 h-5" />
              ألّف الكتاب
            </button>
            <p className="text-[13px] text-slate-500 text-center -mt-2">يستغرق عادةً بين دقيقة ودقيقتين.</p>
          </form>

          <aside className="bg-card border border-line rounded-[20px] p-5 flex flex-col gap-3">
            <h3 className="font-display font-bold text-lg text-white">أفكار للبدء</h3>
            {presets.map((preset) => (
              <button
                key={preset.title}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="text-right p-3.5 rounded-xl border border-line hover:border-brand bg-ink flex flex-col gap-1 cursor-pointer"
              >
                <span className="text-[15px] font-semibold text-white leading-snug">{preset.title}</span>
                <span className="text-[13px] text-slate-400">{preset.genre} · {pagesLabel(preset.pages)}</span>
              </button>
            ))}
          </aside>
        </div>
      )}

      {step === 2 && isGenerating && (
        <div role="status" aria-live="polite" className="bg-card border border-line rounded-[20px] p-8 sm:p-12 flex flex-col items-center gap-6 text-center">
          <Loader2 className="w-10 h-10 text-brand-soft animate-spin" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <h3 className="font-display font-extrabold text-2xl text-white">نؤلف كتابك الآن</h3>
            <p className="text-slate-400">ابقَ في هذه الصفحة حتى ينتهي.</p>
          </div>
          <ol className="flex flex-col gap-3 text-right min-w-[240px]">
            {[
              ['كتابة الفصول والمحتوى', !coverDone],
              ['تصميم الغلاف', coverDone],
            ].map(([label, active], i) => {
              const done = i === 0 && coverDone;
              return (
                <li key={label as string} className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 ${
                      done ? 'bg-accent/15 text-accent' : active ? 'bg-brand-deep text-brand-soft' : 'bg-raised text-slate-500'
                    }`}
                  >
                    {done ? <Check className="w-4 h-4" /> : active ? <Loader2 className="w-4 h-4 animate-spin" /> : i + 1}
                  </span>
                  <span className={done || active ? 'text-white' : 'text-slate-500'}>{label}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {step === 3 && generatedBook && (
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 items-start">
          <div className="bg-card border border-line rounded-[20px] p-5 flex flex-col gap-4 lg:sticky lg:top-4">
            <div className="relative aspect-[2/3] w-full max-w-[240px] mx-auto rounded-xl overflow-hidden border border-line bg-ink">
              {coverImageUrl ? (
                <img src={coverImageUrl} alt={`غلاف ${generatedBook.title}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">
                  <BookOpen className="w-14 h-14" />
                </div>
              )}
              {isRegeneratingCover && (
                <div className="absolute inset-0 bg-ink/85 flex flex-col items-center justify-center gap-2 text-sm text-slate-200">
                  <Loader2 className="w-7 h-7 animate-spin" />
                  غلاف جديد...
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleRegenerateAICover}
              disabled={isRegeneratingCover}
              className="min-h-11 rounded-[10px] border border-line text-slate-300 hover:text-white hover:border-line-strong text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              غلاف آخر
            </button>

            <div className="flex flex-col gap-1.5 pt-2 border-t border-line">
              <label htmlFor="narrator" className={labelClass}>صوت الراوي</label>
              <select
                id="narrator"
                value={selectedVoice?.id || ''}
                onChange={(e) => {
                  const v = availableVoices.find((x) => x.id === e.target.value);
                  if (v) setSelectedVoice(v);
                }}
                className={`${fieldClass} cursor-pointer`}
              >
                {availableVoices.map((v) => (
                  <option key={v.id} value={v.id}>{v.name.split(' - ')[0]}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleListenAsAudiobook}
              className="min-h-[52px] rounded-xl bg-gradient-to-l from-brand to-indigo-500 hover:to-indigo-400 text-white font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Headphones className="w-5 h-5" />
              استمع للكتاب
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="min-h-12 rounded-xl border border-line-strong text-white hover:bg-raised font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileDown className="w-5 h-5" />
              تحميل PDF
            </button>
            {errorMsg && <p role="alert" className="text-sm text-rose-300 text-center">{errorMsg}</p>}
            <button type="button" onClick={() => setStep(1)} className="min-h-11 text-sm text-slate-400 hover:text-white cursor-pointer">
              ألّف كتاباً آخر
            </button>
          </div>

          <article className="bg-card border border-line rounded-[20px] p-5 sm:p-8 flex flex-col gap-6 min-w-0">
            <header className="flex flex-col gap-2">
              <span className="text-sm text-brand-soft">{generatedBook.genre}</span>
              <h3 className="font-display font-extrabold text-3xl text-white leading-tight">{generatedBook.title}</h3>
              {generatedBook.subtitle && <p className="text-slate-300">{generatedBook.subtitle}</p>}
              <p className="text-sm text-slate-500">تأليف {generatedBook.author} · {generatedBook.chapters.length === 1 ? 'فصل واحد' : `${generatedBook.chapters.length} فصول`}</p>
            </header>

            {generatedBook.synopsis && (
              <p className="p-4 rounded-[14px] bg-ink border border-line leading-[1.9] text-slate-300">{generatedBook.synopsis}</p>
            )}

            {generatedBook.chapters.map((ch) => (
              <section key={ch.chapterNumber} className="flex flex-col gap-3 pt-5 border-t border-line">
                <span className="text-sm text-slate-500">الفصل {ch.chapterNumber}</span>
                <h4 className="font-display font-bold text-xl text-white -mt-2">{ch.title}</h4>
                {ch.subsections.map((sub, sIdx) => (
                  <div key={sIdx} className="flex flex-col gap-1.5">
                    {sub.subheading && <h5 className="font-semibold text-slate-100">{sub.subheading}</h5>}
                    <p className="text-slate-300 leading-[1.9]">{sub.content}</p>
                    {sub.keyTakeaway && (
                      <p className="px-4 py-3 rounded-xl bg-brand-deep/50 border border-brand/30 text-indigo-100 text-[15px]">
                        <strong className="text-white">الخلاصة: </strong>
                        {sub.keyTakeaway}
                      </p>
                    )}
                  </div>
                ))}
              </section>
            ))}
          </article>
        </div>
      )}
    </div>
  );
};
