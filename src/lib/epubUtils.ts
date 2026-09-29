import JSZip from 'jszip';
import { cleanArabicExtractedText } from './pdfUtils';

export interface EpubExtractionResult {
  success: boolean;
  text: string;
  pagesCount: number;
  title?: string;
  author?: string;
  chaptersCount?: number;
  error?: string;
}

/**
 * Strips HTML / XHTML tags, scripts, and styles and decodes basic XML/HTML entities
 */
function stripHtmlAndFormat(html: string): string {
  if (!html) return '';

  // 1. Remove XML declarations, DOCTYPE, scripts, and styles
  let clean = html
    .replace(/<\?xml[^>]*\?>/gi, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '');

  // 2. Turn structural tags into appropriate line breaks
  clean = clean
    .replace(/<\/(p|div|section|article|blockquote|h[1-6]|li|tr)>/gi, '\n\n')
    .replace(/<(br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n');

  // 3. Remove all remaining tags
  clean = clean.replace(/<[^>]+>/g, ' ');

  // 4. Decode HTML / XML entities
  clean = clean
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return '';
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return '';
      }
    });

  return cleanArabicExtractedText(clean);
}

/**
 * Extracts all chapters and texts in the correct reading order from an .epub file using JSZip
 */
export async function extractTextFromEpubFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<EpubExtractionResult> {
  try {
    if (onProgress) onProgress(15);
    const arrayBuffer = await file.arrayBuffer();
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(arrayBuffer);

    if (onProgress) onProgress(35);

    // 1. Find container.xml to locate the OPF content package file
    const containerXmlFile = loadedZip.file('META-INF/container.xml');
    let opfPath = '';

    if (containerXmlFile) {
      const containerXml = await containerXmlFile.async('text');
      const rootfileMatch = containerXml.match(/full-path=["']([^"']+\.opf)["']/i);
      if (rootfileMatch && rootfileMatch[1]) {
        opfPath = rootfileMatch[1];
      }
    }

    // Fallback: search for any .opf file in the zip
    if (!opfPath) {
      const opfFiles = Object.keys(loadedZip.files).filter((path) => path.toLowerCase().endsWith('.opf'));
      if (opfFiles.length > 0) {
        opfPath = opfFiles[0];
      }
    }

    let orderedTextFiles: string[] = [];
    let bookTitle = '';
    let bookAuthor = '';

    if (opfPath && loadedZip.file(opfPath)) {
      const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
      const opfContent = await loadedZip.file(opfPath)!.async('text');

      // Extract metadata (title, author)
      const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
      if (titleMatch && titleMatch[1]) {
        bookTitle = titleMatch[1].trim();
      }

      const authorMatch = opfContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
      if (authorMatch && authorMatch[1]) {
        bookAuthor = authorMatch[1].trim();
      }

      // Parse manifest items (id -> href)
      const manifestMap = new Map<string, string>();
      const itemRegex = /<item\s+[^>]*id=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
      let match: RegExpExecArray | null;
      while ((match = itemRegex.exec(opfContent)) !== null) {
        const id = match[1];
        const href = decodeURIComponent(match[2]);
        manifestMap.set(id, href);
      }

      // If attributes were in reverse order (href before id)
      const itemRegexAlt = /<item\s+[^>]*href=["']([^"']+)["'][^>]*id=["']([^"']+)["'][^>]*>/gi;
      while ((match = itemRegexAlt.exec(opfContent)) !== null) {
        const href = decodeURIComponent(match[1]);
        const id = match[2];
        if (!manifestMap.has(id)) {
          manifestMap.set(id, href);
        }
      }

      // Parse spine items to get the reading order
      const spineRegex = /<itemref\s+[^>]*idref=["']([^"']+)["'][^>]*>/gi;
      while ((match = spineRegex.exec(opfContent)) !== null) {
        const idref = match[1];
        const href = manifestMap.get(idref);
        if (href) {
          const fullPath = opfDir + href;
          // Normalize relative paths (e.g. OEBPS/Text/../Chapter1.xhtml)
          const normalizedPath = fullPath.replace(/\/\.\//g, '/');
          orderedTextFiles.push(normalizedPath);
        }
      }
    }

    // Fallback if spine parsing failed: collect all html/xhtml/xml files in natural alphabetical order
    if (orderedTextFiles.length === 0) {
      orderedTextFiles = Object.keys(loadedZip.files).filter((path) => {
        const lower = path.toLowerCase();
        return (
          (lower.endsWith('.xhtml') || lower.endsWith('.html') || lower.endsWith('.htm') || lower.endsWith('.xml')) &&
          !lower.includes('meta-inf') &&
          !lower.endsWith('.opf') &&
          !lower.endsWith('.ncx')
        );
      }).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    }

    if (onProgress) onProgress(50);

    const chapterTexts: string[] = [];
    const totalFiles = orderedTextFiles.length;

    for (let i = 0; i < totalFiles; i++) {
      const filePath = orderedTextFiles[i];
      // Find file in zip (case-insensitive and exact path match)
      let zipEntry = loadedZip.file(filePath);
      if (!zipEntry) {
        const lowerPath = filePath.toLowerCase();
        const foundKey = Object.keys(loadedZip.files).find((k) => k.toLowerCase() === lowerPath);
        if (foundKey) {
          zipEntry = loadedZip.file(foundKey);
        }
      }

      if (zipEntry) {
        const rawContent = await zipEntry.async('text');
        const formatted = stripHtmlAndFormat(rawContent);
        if (formatted.trim().length > 15) {
          chapterTexts.push(formatted);
        }
      }

      if (onProgress) {
        onProgress(50 + Math.round(((i + 1) / Math.max(totalFiles, 1)) * 45));
      }
    }

    const fullBookText = chapterTexts.join('\n\n');

    if (!fullBookText || fullBookText.trim().length < 20) {
      return {
        success: false,
        text: '',
        pagesCount: 1,
        error: 'لم نتمكن من العثور على محتوى نصي مقروء داخل ملف ePub هذا.',
      };
    }

    // Estimate page count (~250 words per page standard book layout)
    const wordCount = fullBookText.split(/\s+/).filter(Boolean).length;
    const estimatedPages = Math.max(1, Math.round(wordCount / 250));

    if (onProgress) onProgress(100);

    return {
      success: true,
      text: fullBookText,
      pagesCount: estimatedPages,
      title: bookTitle || file.name.replace(/\.epub$/i, ''),
      author: bookAuthor,
      chaptersCount: chapterTexts.length,
    };
  } catch (err: any) {
    console.error('ePub extraction error:', err);
    return {
      success: false,
      text: '',
      pagesCount: 1,
      error: `فشل استخراج محتوى ePub: ${err?.message || 'الملف قد يكون تالفاً أو محمي بنظام DRM.'}`,
    };
  }
}
