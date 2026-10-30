import { BookChapter } from '../types';
import { apiFetch } from './apiFetch';

// Arabic number words mapping for readable chapters
const ARABIC_ORDINAL_MAP: Record<string, number> = {
  'الأول': 1,
  'الثاني': 2,
  'الثالث': 3,
  'الرابع': 4,
  'الخامس': 5,
  'السادس': 6,
  'السابع': 7,
  'الثامن': 8,
  'التاسع': 9,
  'العاشر': 10,
  'الحادي عشر': 11,
  'الثاني عشر': 12,
  'الثالث عشر': 13,
  'الرابع عشر': 14,
  'الخامس عشر': 15,
};

// Estimate listening duration in minutes based on Arabic narration pace (~130 words/min)
export function estimateDurationMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / 130));
}

/**
 * Automatically splits Arabic books and text into structured chapters.
 * Recognizes Arabic chapter markers (الفصل، الباب، المقدمة، الخاتمة، المبحث)
 * or creates balanced logical chapters for long unstructured texts.
 */
export function detectArabicChapters(fullText: string, defaultTitle?: string): BookChapter[] {
  if (!fullText || !fullText.trim()) return [];

  const cleanText = fullText.trim();
  const words = cleanText.split(/\s+/).filter(Boolean);

  // Regex pattern matching common Arabic chapter headers at line starts (excluding dot leaders)
  const chapterPattern = /(?:^|\n)\s*(?:[-–—*#\s]*)?(?:(الفصل\s+(?:الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|الحادي عشر|الثاني عشر|\d+)[^\n.]*)|(الباب\s+(?:الأول|الثاني|الثالث|الرابع|الخامس|\d+)[^\n.]*)|(النقطة\s+(?:الأولى|الثانية|الثالثة|الرابعة|الخامسة|السادسة|السابعة|\d+)[^\n.]*)|(المحور\s+(?:الأول|الثاني|الثالث|الرابع|الخامس|\d+)[^\n.]*)|(الدرس\s+(?:الأول|الثاني|الثالث|الرابع|الخامس|\d+)[^\n.]*)|(المقدمة|مقدمة الكتاب|مقدمة المؤلف|التمهيد)|(الخاتمة|خاتمة الكتاب|الخلاصة)|(المبحث\s+(?:الأول|الثاني|الثالث|\d+)[^\n.]*)|(الجزء\s+(?:الأول|الثاني|الثالث|\d+)[^\n.]*)|(Chapter\s+\d+[^\n.]*))\s*(?:[-–—*#\s]*)?(?:\n|$)/gi;

  const matches: { index: number; fullMatch: string; title: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = chapterPattern.exec(cleanText)) !== null) {
    const rawTitle = (match[1] || match[2] || match[3] || match[4] || match[5] || match[6] || match[7] || match[8] || match[9] || match[10] || match[0])
      .trim()
      .replace(/^[#*\-–—\s]+|[#*\-–—\s]+$/g, '');
    
    // Ignore if it has dot leaders (TOC line like "الفصل الأول ..... 1")
    if (/\.{3,}|_{3,}|…{2,}/.test(rawTitle) || /\.{3,}|_{3,}|…{2,}/.test(match[0])) {
      continue;
    }

    matches.push({
      index: match.index,
      fullMatch: match[0],
      title: rawTitle,
    });
  }

  // Case 1: Explicit Arabic chapter headings detected (at least 2 chapters)
  if (matches.length >= 2) {
    const chapters: BookChapter[] = [];

    // Check if there is introductory text before the first detected chapter
    if (matches[0].index > 80) {
      const introText = cleanText.substring(0, matches[0].index).trim();
      const introWords = introText.split(/\s+/).filter(Boolean).length;
      if (introWords >= 20) {
        chapters.push({
          id: `chap_${Date.now()}_0`,
          chapterNumber: 1,
          title: 'المقدمة والافتتاحية',
          wordCount: introWords,
          estimatedDurationMinutes: estimateDurationMinutes(introWords),
          text: introText,
          status: 'completed',
        });
      }
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const startIdx = current.index + current.fullMatch.length;
      const endIdx = i + 1 < matches.length ? matches[i + 1].index : cleanText.length;
      const chapterContent = cleanText.substring(startIdx, endIdx).trim();
      const chapWords = chapterContent.split(/\s+/).filter(Boolean).length;

      chapters.push({
        id: `chap_${Date.now()}_${chapters.length + 1}`,
        chapterNumber: chapters.length + 1,
        title: current.title,
        wordCount: chapWords,
        estimatedDurationMinutes: estimateDurationMinutes(chapWords),
        text: chapterContent || current.title,
        status: 'completed',
      });
    }

    if (chapters.length > 0) {
      return chapters;
    }
  }

  // Case 2: No explicit markers, but text is large (> 450 words) -> split into logical chapters
  if (words.length > 450) {
    const TARGET_WORDS_PER_CHAPTER = 350;
    const estimatedChaptersCount = Math.min(8, Math.max(2, Math.ceil(words.length / TARGET_WORDS_PER_CHAPTER)));
    const paragraphs = cleanText.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    const chapters: BookChapter[] = [];
    let currentChapParas: string[] = [];
    let currentWords = 0;
    let chapIndex = 1;

    for (const para of paragraphs) {
      const pWords = para.split(/\s+/).filter(Boolean).length;
      currentChapParas.push(para);
      currentWords += pWords;

      if (currentWords >= TARGET_WORDS_PER_CHAPTER && chapIndex < estimatedChaptersCount) {
        const chapText = currentChapParas.join('\n\n');
        chapters.push({
          id: `chap_${Date.now()}_${chapIndex}`,
          chapterNumber: chapIndex,
          title: chapIndex === 1 
            ? 'الفصل الأول: البداية والمقدمة' 
            : `الفصل ${chapIndex}: استكمال القراءة`,
          wordCount: currentWords,
          estimatedDurationMinutes: estimateDurationMinutes(currentWords),
          text: chapText,
          status: 'completed',
        });

        currentChapParas = [];
        currentWords = 0;
        chapIndex++;
      }
    }

    if (currentChapParas.length > 0) {
      const remainingText = currentChapParas.join('\n\n');
      const remainingWords = remainingText.split(/\s+/).filter(Boolean).length;
      chapters.push({
        id: `chap_${Date.now()}_${chapIndex}`,
        chapterNumber: chapIndex,
        title: chapters.length === 0 ? 'الفصل الأول' : `الفصل الأخير: الخاتمة والنتائج`,
        wordCount: remainingWords,
        estimatedDurationMinutes: estimateDurationMinutes(remainingWords),
        text: remainingText,
        status: 'completed',
      });
    }

    return chapters;
  }

  // Case 3: Short or standard single article/text
  return [
    {
      id: `chap_${Date.now()}_1`,
      chapterNumber: 1,
      title: defaultTitle?.trim() || 'النص الكامل / الفصل الأول',
      wordCount: words.length,
      estimatedDurationMinutes: estimateDurationMinutes(words.length),
      text: cleanText,
      status: 'completed',
    },
  ];
}

/**
 * Hybrid AI Chapter Detector:
 * First attempts to detect the book's genuine original Table of Contents (TOC)
 * at the beginning, end, or throughout the book using Gemini 3.8 Flash.
 * If no formal TOC exists, gracefully falls back to structured logical split.
 */
export async function detectArabicChaptersWithAI(
  fullText: string,
  defaultTitle?: string,
  voiceName?: string
): Promise<{ 
  chapters: BookChapter[]; 
  isOriginalTOC: boolean;
  bookTitle?: string;
  authorName?: string;
  cinematicIntro?: string;
}> {
  if (!fullText || !fullText.trim()) {
    return { chapters: [], isOriginalTOC: false };
  }

  // Fast check: Try AI-powered TOC & chapter parser
  try {
    const res = await apiFetch('/api/ai/extract-chapters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: fullText,
        defaultTitle: defaultTitle || 'الفصل الأول',
        voiceName: voiceName || 'القارئ الصوتي'
      }),
    }, { silent: true }); // background step with a local fallback: never prompt from here

    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.chapters) && data.chapters.length > 0) {
        const formattedChapters: BookChapter[] = data.chapters.map((ch: any, idx: number) => {
          const chapWords = (ch.text || '').split(/\s+/).filter(Boolean).length;
          return {
            id: `chap_${Date.now()}_${idx + 1}`,
            chapterNumber: idx + 1,
            title: ch.title || `الفصل ${idx + 1}`,
            wordCount: chapWords,
            estimatedDurationMinutes: estimateDurationMinutes(chapWords),
            text: ch.text || '',
            status: 'completed',
          };
        });

        return {
          chapters: formattedChapters,
          isOriginalTOC: Boolean(data.isOriginalTOC),
          bookTitle: data.bookTitle,
          authorName: data.authorName,
          cinematicIntro: data.cinematicIntro,
        };
      }
    }
  } catch (e) {
    console.warn('AI chapter detection fallback to regex:', e);
  }

  // Local fallback
  const localChapters = detectArabicChapters(fullText, defaultTitle);
  return {
    chapters: localChapters,
    isOriginalTOC: false,
  };
}
