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
// Chapter headings ("الفصل الأول", "الباب الثاني", "المقدمة", ...) at line starts, skipping
// table-of-contents lines with dot leaders. Shared by detectArabicChapters and the
// background book reader (lib/bookStream.ts).
export function findChapterHeadings(text: string): { index: number; fullMatch: string; title: string }[] {
  const chapterPattern = /(?:^|\n)\s*(?:[-–—*#\s]*)?(?:(الفصل\s+(?:الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|الحادي عشر|الثاني عشر|\d+)[^\n.]*)|(الباب\s+(?:الأول|الثاني|الثالث|الرابع|الخامس|\d+)[^\n.]*)|(النقطة\s+(?:الأولى|الثانية|الثالثة|الرابعة|الخامسة|السادسة|السابعة|\d+)[^\n.]*)|(المحور\s+(?:الأول|الثاني|الثالث|الرابع|الخامس|\d+)[^\n.]*)|(الدرس\s+(?:الأول|الثاني|الثالث|الرابع|الخامس|\d+)[^\n.]*)|(المقدمة|مقدمة الكتاب|مقدمة المؤلف|التمهيد)|(الخاتمة|خاتمة الكتاب|الخلاصة)|(المبحث\s+(?:الأول|الثاني|الثالث|\d+)[^\n.]*)|(الجزء\s+(?:الأول|الثاني|الثالث|\d+)[^\n.]*)|(Chapter\s+\d+[^\n.]*))\s*(?:[-–—*#\s]*)?(?:\n|$)/gi;

  const matches: { index: number; fullMatch: string; title: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = chapterPattern.exec(text)) !== null) {
    const rawTitle = (match[1] || match[2] || match[3] || match[4] || match[5] || match[6] || match[7] || match[8] || match[9] || match[10] || match[0])
      .trim()
      .replace(/^[#*\-–—\s]+|[#*\-–—\s]+$/g, '');
    
    // Ignore if it has dot leaders (TOC line like "الفصل الأول ..... 1")
    if (/\.{3,}|_{3,}|…{2,}/.test(rawTitle) || /\.{3,}|_{3,}|…{2,}/.test(match[0])) {
      continue;
    }

    let fullMatch = match[0];
    let title = rawTitle;
    // "الفصل الثاني" alone on its line, with the chapter's name on the next line: use both
    if (/^(?:الفصل|الباب|الجزء|المبحث|Chapter)\s+\S+(?:\s+عشر)?$/i.test(rawTitle)) {
      const after = text.slice(match.index + match[0].length);
      const next = after.match(/^[ \t]*\n?[ \t]*([^\n]+)(\n|$)/);
      const line = next?.[1]?.trim() || '';
      const n = line.split(/\s+/).filter(Boolean).length;
      // A name has real words: not a page number ("١٦"), not punctuation
      const hasWords = (line.match(/[\u0621-\u064A]{2,}/g) || []).length >= 1;
      if (line && hasWords && n >= 1 && n <= 12 && !/[.!؛:]$/.test(line) && !/^(?:الفصل|الباب|الجزء)\s/.test(line)) {
        title = `${rawTitle}: ${line.replace(/[.،]+$/, '')}`;
        fullMatch += next![0];
      }
    }

    matches.push({
      index: match.index,
      fullMatch,
      title,
    });
  }

  return matches;
}

export function detectArabicChapters(fullText: string, defaultTitle?: string): BookChapter[] {
  if (!fullText || !fullText.trim()) return [];

  const cleanText = fullText.trim();
  const words = cleanText.split(/\s+/).filter(Boolean);

  const matches = findChapterHeadings(cleanText);

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

// ---- Chapter names (lib/bookStream.ts ChapterAssembler, the studio's chapter list)

// A title reduced to its letters and digits, so "الفصلُ الأول: كنزٌ في داخلك" matches "الفصل الأول - كنز في داخلك"
export const normTitle = (s: string): string =>
  String(s || '')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const AR_ORDINALS = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون'];
// "الجزء الثاني" for parts of a book without headings
export const partTitle = (n: number, ar = true): string => (ar ? `الجزء ${AR_ORDINALS[n - 1] || n}` : `Part ${n}`);

// The next part of a chapter that was cut for length: "كنز في داخلك" -> "كنز في داخلك (2)" -> "(3)"
export function nextPartTitle(title: string): string {
  const m = title.match(/^(.*?)\s*\((\d+)\)\s*$/);
  if (m) return `${m[1]} (${Number(m[2]) + 1})`;
  return `${title.replace(/\s*\((?:تابع|continued)\)\s*$/, '')} (2)`;
}

// Chapter names from contents-page text when the AI reader is unavailable: lines that end in
// a page number, without the dot leaders
export function parseTocLines(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const m = line.match(/^(.*?)[\s.…·_\-–]*([0-9٠-٩]{1,4})\s*$/);
    if (!m) continue;
    const title = m[1].replace(/[.…·_]{2,}/g, ' ').replace(/\s+/g, ' ').trim();
    const words = title.split(' ').length;
    if (words < 1 || words > 14 || /^(المحتويات|الفهرس|فهرس المحتويات)$/.test(title)) continue;
    out.push(title);
  }
  return out.slice(0, 80);
}
