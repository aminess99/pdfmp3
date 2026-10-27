import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

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
    const res = await fetch('/api/ai/purify-text', {
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
          const pageText = textContent.items
            .map((item: any) => item.str || '')
            .filter((str: string) => str.trim().length > 0)
            .join(' ')
            .trim();

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

    const res = await fetch('/api/pdf/extract', {
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
        const cleanedAiText = cleanArabicExtractedText(data.text);
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
    error: 'تعذر استخراج النص العربي من هذا الملف. قد يكون الكتاب عبارة عن صور ممسوحة ذات جودة منخفضة جداً أو نص مشفر. يمكنك نسخ النص ولصقه مباشرة في خانة "كتابة نص مباشر".'
  };
}

export interface ProgressivePdfSession {
  success: boolean;
  totalPages: number;
  initialText: string;
  initialPagesRead: number;
  readPagesRange: (startPage: number, endPage: number) => Promise<string>;
  error?: string;
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
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .filter((str: string) => str.trim().length > 0)
          .join(' ')
          .trim();
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
          const pageText = textContent.items
            .map((item: any) => item.str || '')
            .filter((str: string) => str.trim().length > 0)
            .join(' ')
            .trim();
          if (pageText) {
            chunkTexts.push(pageText);
          }
        } catch (err) {
          console.warn(`Chunk read page ${i} error:`, err);
        }
      }
      return cleanArabicExtractedText(chunkTexts.join('\n\n'));
    };

    if (hasMeaningfulArabic(initialText) || initialText.length > 30) {
      return {
        success: true,
        totalPages,
        initialText,
        initialPagesRead: pagesToReadInitial,
        readPagesRange,
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
    error: standardRes.error,
  };
}
