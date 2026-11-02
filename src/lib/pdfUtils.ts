import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { tr } from './i18n';
import { apiFetch } from './apiFetch';

// Configure pdfjs worker locally from bundle, with unpkg fallback
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker || `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
} catch (e) {
  console.warn('Could not set pdf workerSrc', e);
}

// Helper to convert File to Base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Clean extracted text from accidental page headers, ISBNs, footnotes, table of contents dots, and stray markers
export function cleanArabicExtractedText(rawText: string): string {
  if (!rawText) return '';
  return rawText
    // Remove table of contents / index dot-leaders like "الفصل الأول ............... 1" or "المقدمة ....... 2"
    .replace(/^.*(?:\.{3,}|_{3,}|-{3,}|…{2,}).*$/gm, '')
    .replace(/(?:قائمة\s*المحتويات|قائمة\s*امل\s*حتويات|الفهرس|فهرس\s*الكتاب|جدول\s*المحتويات)[\s\S]*?(?=(?:المقدمة|التمهيد|الفصل\s+(?:الأول|1)|\bالباب\s+(?:الأول|1)))/gi, '')
    // Remove page markers and numbers
    .replace(/---\s*الصفحة\s*\d+\s*---/gi, '')
    .replace(/^الصفحة\s*\d+\s*$/gim, '')
    .replace(/\[\s*الصفحة\s*\d+\s*\]/gi, '')
    .replace(/^صفحة\s*[:\d-]+\s*$/gim, '')
    .replace(/^Page\s*\d+(\s*of\s*\d+)?\s*$/gim, '')
    .replace(/^\d+\s*\/\s*\d+\s*$/gm, '') // "1 / 50"
    // Remove standalone numbers at beginning or end of lines that are page numbers
    .replace(/^\s*\d{1,4}\s*$/gm, '')
    .replace(/^\s*\d{1,4}\s+(الفصل|الباب|الجزء)/gm, '$1')
    .replace(/(الفصل|الباب|الجزء)\s+\d{1,4}\s*$/gm, '$1')
    // Remove ISBN & publishing clutter
    .replace(/ISBN[:\s\d-]+/gi, '')
    .replace(/جميع الحقوق محفوظة/gi, '')
    .replace(/رقم الإيداع[:\s\d-]+/gi, '')
    .replace(/الطبعة\s*(الأولى|الثانية|الثالثة|\d+)/gi, '')
    .replace(/دار\s*النشر[:\s\w]+/gi, '')
    // Remove URLs and emails
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/www\.\S+/gi, '')
    .replace(/\S+@\S+\.\S+/gi, '')
    // Remove long dotted or dashed separator lines
    .replace(/[.\-_=*~]{3,}/g, '')
    // Collapse excess whitespaces while keeping natural paragraph breaks
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Client-side call to AI text purifier
export async function purifyTextWithAI(text: string): Promise<string> {
  if (!text || !text.trim()) return '';
  try {
    const res = await apiFetch('/api/ai/purify-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.text && data.text.trim()) {
        return cleanArabicExtractedText(data.text);
      }
    }
  } catch (e) {
    console.warn('AI purifier error:', e);
  }
  return cleanArabicExtractedText(text);
}

// Many Arabic PDFs store shaped glyphs (presentation forms, e.g. "ﺼ") in visual order,
// which reads as reversed, disconnected letters. Normalize and restore logical order.
const MIRROR: Record<string, string> = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{' };

const reverseLine = (line: string): string =>
  Array.from(line)
    .reverse()
    .join('')
    // Latin words and numbers were already in reading order before the line was reversed
    .replace(/[A-Za-z0-9\u0660-\u0669.,:%\/-]{2,}/g, (run) => Array.from(run).reverse().join(''))
    .replace(/[()[\]{}]/g, (c) => MIRROR[c]);

// Real words that end in "لا" (mostly adverbs written without tanween)
const COMMON_LA_ENDINGS = /^(?:[وف]?(?:مثلا|أولا|اولا|طويلا|قليلا|فعلا|أصلا|اصلا|كلا|إلا|الا|ألا|جميلا|سهلا|مستقبلا|سبيلا|دليلا|بديلا|ليلا|عملا|أملا|حلا|شكلا|قبلا|تفصيلا|تحليلا|مقابلا|كاملا|شاملا|عاجلا))[.,:؛،]?$/;

// Reversed Arabic shows the article "ال" at word ends ("لا") far more often than at word starts
const looksReversed = (line: string): boolean => {
  const words = line.split(/\s+/);
  const forward = words.filter((w) => /^(?:ال|وال|بال|فال|لل)/.test(w)).length;
  const backward = words.filter((w) => w.length > 2 && /لا$/.test(w) && !COMMON_LA_ENDINGS.test(w)).length;
  // Short lines (headings) rarely have two article words, so one is enough there
  return backward > forward * 2 && (backward >= 2 || words.length <= 4);
};

export function normalizeArabicPdfText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFKC')
    .split('\n')
    .map((line) => (looksReversed(line) ? reverseLine(line) : line))
    .join('\n')
    // A decomposed lam-alef ligature can come out swapped: "األمثلة" -> "الأمثلة"
    .replace(/ا([أإآ])ل/g, 'ال$1');
}

// pdf.js emits its own space items, so concatenate as-is and break lines on hasEOL
function pageItemsToText(items: any[]): string {
  const rawLines: string[][] = [[]];
  for (const item of items) {
    rawLines[rawLines.length - 1].push(String(item.str || '').normalize('NFKC'));
    if (item.hasEOL) rawLines.push([]);
  }

  const lines = rawLines
    .map((parts) => {
      const line = parts.join('');
      if (!looksReversed(line)) return line;
      // Visual order: multi-letter items are usually already in reading order, so flip
      // the item sequence first and fall back to flipping characters if that's not enough
      const byItems = parts.slice().reverse().join('').replace(/[()[\]{}]/g, (c) => MIRROR[c]);
      return looksReversed(byItems) ? reverseLine(line) : byItems;
    })
    .map((line) => line.replace(/[ \t]+/g, ' ').trim().replace(/ا([أإآ])ل/g, 'ال$1'))
    .filter(Boolean);

  // Re-join wrapped lines into paragraphs; keep breaks after sentence ends and around short lines (headings)
  const isShort = (line: string) => line.split(/\s+/).length <= 8;
  let out = '';
  lines.forEach((line, i) => {
    if (i === 0) {
      out = line;
      return;
    }
    const prev = lines[i - 1];
    const keepBreak = /[.!?؟:»"]$/.test(prev) || isShort(prev) || isShort(line);
    out += (keepBreak ? '\n' : ' ') + line;
  });
  return out;
}

function hasMeaningfulArabic(text: string): boolean {
  if (!text || text.trim().length < 60) return false;
  const arabicLetters = text.match(/[\u0600-\u06FF]/g);
  const arabicCount = arabicLetters ? arabicLetters.length : 0;
  // Scanned image PDFs or broken font encodings result in very few or 0 Arabic characters
  return (arabicCount / text.length) >= 0.25;
}

export interface PdfExtractionResult {
  success: boolean;
  text: string;
  pagesCount: number;
  error?: string;
}

export async function extractTextFromPDFFile(
  file: File, 
  onProgress?: (percent: number) => void,
  forceAiOCR: boolean = false
): Promise<PdfExtractionResult> {
  let extractedContent = '';
  let numPages = 1;

  // 1. Client-side PDF.js fast digital extraction (only if not forced AI OCR)
  if (!forceAiOCR) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Configure pdfjs with robust recovery flags for corrupted or malformed XRef tables
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        stopAtErrors: false,
        useSystemFonts: true,
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
      } as any);

      const pdfDoc = await loadingTask.promise;
      numPages = pdfDoc.numPages;

      const pageTexts: string[] = [];
      const maxPagesToRead = Math.min(numPages, 120);

      for (let i = 1; i <= maxPagesToRead; i++) {
        try {
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = pageItemsToText(textContent.items);

          if (pageText.length > 0) {
            pageTexts.push(pageText);
          }
        } catch (pageErr) {
          // Gracefully continue on corrupted pages (e.g. Bad uncompressed XRef entry)
          // instead of throwing unhandled exceptions
          console.info(`Skipped unreadable page ${i} due to PDF stream structure:`, (pageErr as any)?.message || pageErr);
        }

        if (onProgress) {
          onProgress(Math.round((i / maxPagesToRead) * 60));
        }
      }

      extractedContent = cleanArabicExtractedText(pageTexts.join('\n\n'));
    } catch (clientErr) {
      console.warn('PDF.js client extraction encountered an issue, falling back to server extraction:', clientErr);
    }

    // 2. If client extraction yielded meaningful Arabic content, return it
    if (hasMeaningfulArabic(extractedContent)) {
      if (onProgress) onProgress(100);
      return { success: true, text: extractedContent, pagesCount: numPages };
    }
  }

  // 3. Fallback to Server Extraction (handles digital PDF on server + Gemini Multimodal Vision OCR)
  try {
    if (onProgress) onProgress(75);
    const pdfBase64 = await fileToBase64(file);

    const res = await apiFetch('/api/pdf/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdfBase64,
        fileName: file.name,
        forceOcr: forceAiOCR,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.text && data.text.trim().length > 20) {
        const cleanedAiText = cleanArabicExtractedText(normalizeArabicPdfText(data.text));
        if (onProgress) onProgress(100);
        return { success: true, text: cleanedAiText, pagesCount: data.pagesCount || numPages || 1 };
      }
    } else {
      const errData = await res.json().catch(() => ({}));
      console.warn('Server PDF extraction response error:', errData);
    }
  } catch (aiErr) {
    console.warn('Server PDF extraction network error:', aiErr);
  }

  // 4. Fallback if partial text was extracted
  if (extractedContent && extractedContent.trim().length > 30) {
    return { success: true, text: extractedContent, pagesCount: numPages };
  }

  // 5. Return explicit failure without injecting error string as book text
  return {
    success: false,
    text: '',
    pagesCount: numPages || 1,
    error: tr(
      'تعذّر استخراج النص العربي من هذا الملف. قد تكون صفحاته صوراً منخفضة الجودة أو نصاً محمياً. جرّب المسح العميق، أو انسخ النص والصقه في تبويب "نص".',
      'Couldn’t extract Arabic text from this file. Its pages may be low-quality images or protected text. Try the deep scan, or copy the text and paste it in the "Text" tab.'
    )
  };
}

export interface ProgressivePdfSession {
  success: boolean;
  totalPages: number;
  initialText: string;
  initialPagesRead: number;
  readPagesRange: (startPage: number, endPage: number) => Promise<string>;
  // Raw text of each page in [startPage, endPage] (1-based, inclusive), uncleaned, for
  // page-level cleanup and the background reader (lib/bookCleaner.ts, lib/bookStream.ts)
  readPageTexts: (startPage: number, endPage: number) => Promise<string[]>;
  // Scanned book: pages are read by OCR a few at a time, only as far as the listener needs
  ocr?: boolean;
  // Pages per background batch (lib/bookStream.ts)
  pagesPerBatch?: number;
  error?: string;
}

// Arabic words on a page, ignoring links and lines repeated as a watermark
function realArabicWords(text: string): number {
  const lines = text.split('\n').map((l) => l.replace(/\S*(?:https?:\/\/|www\.|\.(?:com|net|org|info|me))\S*/gi, ' ').trim()).filter(Boolean);
  const unique = [...new Set(lines)];
  return unique.join(' ').split(/\s+/).filter((w) => /[\u0600-\u06FF]{2,}/.test(w)).length;
}

// Download-site / forum pages added to scanned books ("click here", "to download", Facebook)
const FORUM_AD_RE = /اضغط\s+هنا|انقر\s+هنا|لتحميل|للتحميل|تحميل\s+(?:كتب|المزيد)|منتدى|منتديات|الفيسبوك|فيسبوك|فيس\s+بوك|تليجرام|تلغرام|قناتنا|حصريات|زوروا|موقعنا/g;
export const looksLikeForumAd = (text: string): boolean => (text.match(FORUM_AD_RE) || []).length >= 2;

// ---- Progressive OCR for scanned books ----
// Pages are rendered to JPEG in the browser and sent a few at a time to /api/pdf/ocr-pages,
// so a 300-page scan costs only the pages that are actually listened to.
export const OCR_PAGES_PER_REQUEST = 4;
const OCR_PARALLEL_REQUESTS = 3;
export const OCR_PAGES_PER_BATCH = OCR_PAGES_PER_REQUEST * OCR_PARALLEL_REQUESTS;

async function renderPageJpeg(pdfDoc: any, pageNumber: number): Promise<string> {
  const page = await pdfDoc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  // About 1400px wide: sharp enough for Arabic diacritics, small enough to upload quickly
  const scale = Math.min(2.5, Math.max(1, 1400 / base.width));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport } as any).promise;
  const url = canvas.toDataURL('image/jpeg', 0.72);
  canvas.width = canvas.height = 0;
  page.cleanup?.();
  return url;
}

async function ocrPageGroup(pdfDoc: any, pages: number[]): Promise<string[]> {
  const images: string[] = [];
  for (const n of pages) {
    try {
      images.push(await renderPageJpeg(pdfDoc, n));
    } catch (err) {
      console.warn(`Render page ${n} error:`, err);
      images.push('');
    }
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await apiFetch('/api/pdf/ocr-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.pages)) {
          return pages.map((_, i) => normalizeArabicPdfText(String(data.pages[i] || '')));
        }
      }
      if (res.status === 401 || res.status === 403) break;
    } catch (err) {
      console.warn('OCR request error:', err);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(tr('تعذّر المسح الضوئي لهذه الصفحات.', 'These pages could not be scanned.'));
}

function makeOcrReader(pdfDoc: any, totalPages: number) {
  return async (startPage: number, endPage: number): Promise<string[]> => {
    const all: number[] = [];
    for (let i = Math.max(1, startPage); i <= Math.min(totalPages, endPage); i++) all.push(i);
    const groups: number[][] = [];
    for (let i = 0; i < all.length; i += OCR_PAGES_PER_REQUEST) groups.push(all.slice(i, i + OCR_PAGES_PER_REQUEST));
    const out: string[][] = new Array(groups.length);
    for (let i = 0; i < groups.length; i += OCR_PARALLEL_REQUESTS) {
      const wave = groups.slice(i, i + OCR_PARALLEL_REQUESTS);
      const res = await Promise.all(wave.map((g) => ocrPageGroup(pdfDoc, g)));
      res.forEach((r, j) => (out[i + j] = r));
    }
    return out.flat();
  };
}

async function openPdf(file: File): Promise<any> {
  const arrayBuffer = await file.arrayBuffer();
  return pdfjsLib.getDocument({
    data: arrayBuffer,
    stopAtErrors: false,
    useSystemFonts: true,
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
  } as any).promise;
}

// A session that reads the book by OCR (scanned pages, or the user asked for a deep scan)
export async function startOcrPdfSession(file: File): Promise<ProgressivePdfSession> {
  const pdfDoc = await openPdf(file);
  const totalPages = pdfDoc.numPages;
  const readPageTexts = makeOcrReader(pdfDoc, totalPages);
  return {
    success: true,
    totalPages,
    initialText: '',
    initialPagesRead: 0,
    readPagesRange: async (a, b) => cleanArabicExtractedText((await readPageTexts(a, b)).join('\n\n')),
    readPageTexts,
    ocr: true,
    pagesPerBatch: OCR_PAGES_PER_BATCH,
  };
}

/**
 * High-speed progressive extraction for books:
 * Reads first 5-8 pages in ~300ms so user starts listening immediately,
 * while background worker continues reading subsequent chapters!
 */
export async function startProgressivePdfExtraction(
  file: File,
  initialPagesCount: number = 6
): Promise<ProgressivePdfSession> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      stopAtErrors: false,
      useSystemFonts: true,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
    } as any);

    const pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;
    const pagesToReadInitial = Math.min(totalPages, initialPagesCount);

    const initialPageTexts: string[] = [];
    for (let i = 1; i <= pagesToReadInitial; i++) {
      try {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = pageItemsToText(textContent.items);
        if (pageText) {
          initialPageTexts.push(pageText);
        }
      } catch (err) {
        console.warn(`Initial read page ${i} error:`, err);
      }
    }

    const initialText = cleanArabicExtractedText(initialPageTexts.join('\n\n'));

    // Reader function for subsequent ranges
    const readPagesRange = async (startPage: number, endPage: number): Promise<string> => {
      const clampedStart = Math.max(1, startPage);
      const clampedEnd = Math.min(totalPages, endPage);
      const chunkTexts: string[] = [];
      for (let i = clampedStart; i <= clampedEnd; i++) {
        try {
          const page = await pdfDoc.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = pageItemsToText(textContent.items);
          if (pageText) {
            chunkTexts.push(pageText);
          }
        } catch (err) {
          console.warn(`Chunk read page ${i} error:`, err);
        }
      }
      return cleanArabicExtractedText(chunkTexts.join('\n\n'));
    };

    const readPageTexts = async (startPage: number, endPage: number): Promise<string[]> => {
      const texts: string[] = [];
      for (let i = Math.max(1, startPage); i <= Math.min(totalPages, endPage); i++) {
        try {
          const page = await pdfDoc.getPage(i);
          texts.push(pageItemsToText((await page.getTextContent()).items) || '');
        } catch (err) {
          console.warn(`Read page ${i} error:`, err);
          texts.push('');
        }
      }
      return texts;
    };

    // No real text layer in the opening pages: a scanned book, read it by OCR as the user
    // listens. Watermarks stamped on scans ("uploaded by X", a forum URL) don't count as text.
    if (typeof document !== 'undefined') {
      const scanTo = Math.min(totalPages, 15);
      let substantial = 0;
      for (let i = 1; i <= scanTo; i++) {
        try {
          const t = pageItemsToText((await (await pdfDoc.getPage(i)).getTextContent()).items);
          if (realArabicWords(t) >= 40 && !looksLikeForumAd(t)) substantial++;
        } catch {
          // keep looking
        }
      }
      // A digital book has text on most pages; a scan has at most a few (ads, credits)
      if (substantial < (scanTo <= 4 ? 1 : Math.max(2, Math.ceil(scanTo * 0.4)))) {
        const readOcr = makeOcrReader(pdfDoc, totalPages);
        return {
          success: true,
          totalPages,
          initialText: '',
          initialPagesRead: 0,
          readPagesRange: async (a, b) => cleanArabicExtractedText((await readOcr(a, b)).join('\n\n')),
          readPageTexts: readOcr,
          ocr: true,
          pagesPerBatch: OCR_PAGES_PER_BATCH,
        };
      }
    }

    if (hasMeaningfulArabic(initialText) || initialText.length > 30) {
      return {
        success: true,
        totalPages,
        initialText,
        initialPagesRead: pagesToReadInitial,
        readPagesRange,
        readPageTexts,
      };
    }
  } catch (err) {
    console.warn('PDF.js progressive extraction failed, fallback to standard:', err);
  }

  // Fallback to standard extraction if progressive failed
  const standardRes = await extractTextFromPDFFile(file);
  return {
    success: standardRes.success,
    totalPages: standardRes.pagesCount,
    initialText: standardRes.text,
    initialPagesRead: standardRes.pagesCount,
    readPagesRange: async () => '',
    readPageTexts: async () => [],
    error: standardRes.error,
  };
}
