import { cleanArabicExtractedText, looksLikeForumAd } from './pdfUtils';

// Page-level cleanup for books read page by page (lib/bookStream.ts): finds where the real
// content starts, drops front/back matter pages (cover, copyright, contents, publisher ads),
// and removes running heads and footnote markers that a listener does not need to hear.

const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
const lines = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean);

// A line reduced to its letters, so "الفصل الثاني 23" and "الفصل الثاني 24" compare equal
const lineKey = (l: string) => l.replace(/[0-9٠-٩\s\-–—|•.:]/g, '');

// Copyright / imprint page markers
const IMPRINT_RE = /ISBN|ردمك|رقم الإيداع|الإيداع القانوني|جميع الحقوق محفوظة|حقوق الطبع|حقوق النشر|الطبعة\s+(?:الأولى|الثانية|الثالثة|الرابعة|\S*\d)|للنشر والتوزيع|دار\s+\S+\s+للنشر|المطبعة|مطبعة|تصميم الغلاف|الترقيم الدولي|هاتف|فاكس|ص\.\s*ب|البريد الإلكتروني|©|Copyright|All rights reserved|Printed in/gi;
// Contents / index page headings
const CONTENTS_RE = /^(?:المحتويات|فهرس المحتويات|الفهرس|فهرس الكتاب|قائمة المحتويات|جدول المحتويات|فهرس الموضوعات)\s*$/m;
// Publisher ads and catalogues at the end of a book
const ADS_RE = /صدر\s+(?:للمؤلف|للكاتب|حديثاً|حديثا|عن\s+الدار)|من\s+إصدارات|إصدارات\s+الدار|يصدر\s+قريباً|من\s+منشورات|سلسلة\s+كتب|كتب\s+أخرى\s+للمؤلف/g;
// Where a book's content usually begins
const START_RE = /^(?:\s*[-–—*#]*\s*)(?:المقدمة|مقدمة(?:\s+\S+){0,3}|التمهيد|تمهيد|توطئة|استهلال|الفصل\s+(?:الأول|1|١)|الباب\s+(?:الأول|1|١)|الجزء\s+(?:الأول|1|١))\s*$/m;

// Branch / address / phone lists (bookstore branches, distributors)
const ADDRESS_RE = /شارع|طريق|هاتف|تليفون|تلفون|فاكس|ص\.\s*ب|صندوق بريد|المملكة العربية السعودية|الإمارات العربية المتحدة|فروعنا|فرع|مركز|برج|مول|جوال|\+?\d[\d\s-]{6,}/g;

// Words repeated in a loop ("تليفون تليفون تليفون ..."), which OCR models sometimes produce
// on table-like pages: collapse the run to one occurrence
export const collapseRepeats = (t: string): string =>
  t
    .replace(/(^|\s)(\S+(?:\s+\S+){0,2}?)(?:\s+\2){3,}(?=\s|$)/g, '$1$2')
    .replace(/(^|\s)(\S+)(?:\s+\2){2,}(?=\s|$)/g, '$1$2');

// Very few distinct words for its length: a repetition loop or a list, not prose
function lowVariety(text: string): boolean {
  const ws = text.split(/\s+/).filter(Boolean);
  return ws.length >= 40 && new Set(ws).size / ws.length < 0.15;
}

export type PageKind = 'content' | 'blank' | 'imprint' | 'contents' | 'ads';

// A table-of-contents page: many short lines that end in a page number
function looksLikeContents(text: string): boolean {
  const ls = lines(text);
  if (ls.length < 5) return false;
  const numbered = ls.filter((l) => /(?:\.{2,}|…|\s)[0-9٠-٩]{1,4}\s*$/.test(l) && words(l) <= 12).length;
  return numbered / ls.length >= 0.45;
}

export function classifyPage(text: string): PageKind {
  const w = words(text);
  if (w < 12) return 'blank';
  if (CONTENTS_RE.test(text) || looksLikeContents(text)) return 'contents';
  if (lowVariety(text)) return 'blank';
  // Mostly addresses and phone numbers: a branches / distributors page
  if ((text.match(ADDRESS_RE) || []).length >= 8 && (text.match(ADDRESS_RE) || []).length / w >= 0.08) return 'imprint';
  const imprintHits = (text.match(IMPRINT_RE) || []).length;
  if (imprintHits >= 2 && w < 260) return 'imprint';
  if ((text.match(ADS_RE) || []).length >= 1 && w < 400) return 'ads';
  if (looksLikeForumAd(text) && w < 500) return 'ads';
  return 'content';
}

// Index of the first page with real content among the first pages of a book. Prefers an
// explicit start (introduction, chapter one); otherwise the first substantial prose page.
export function findContentStart(pages: string[], scanLimit = 25): number {
  const n = Math.min(pages.length, scanLimit);
  for (let i = 0; i < n; i++) {
    if (classifyPage(pages[i]) === 'content' && START_RE.test(pages[i])) return i;
  }
  for (let i = 0; i < n; i++) {
    if (classifyPage(pages[i]) === 'content' && words(pages[i]) >= 80) return i;
  }
  return 0;
}

// Lines repeated at the top or bottom of many pages (book title, chapter name, author):
// learned across batches, then removed from every page
export class RunningHeadFilter {
  private counts = new Map<string, number>();
  private seenPages = 0;

  learn(pages: string[]): void {
    for (const p of pages) {
      const ls = lines(p);
      if (ls.length < 3) continue;
      this.seenPages++;
      const edge = new Set([...ls.slice(0, 2), ...ls.slice(-2)].map(lineKey).filter((k) => k.length >= 3 && k.length <= 60));
      for (const k of edge) this.counts.set(k, (this.counts.get(k) || 0) + 1);
    }
  }

  private isHead(line: string): boolean {
    if (this.seenPages < 4) return false;
    const k = lineKey(line);
    const c = this.counts.get(k) || 0;
    return k.length >= 3 && c >= 3 && c / this.seenPages >= 0.3;
  }

  // Only the first and last two lines of a page can be running heads
  strip(page: string): string {
    const ls = page.split('\n');
    const idx = ls.map((l, i) => ({ l: l.trim(), i })).filter((x) => x.l);
    const edges = new Set([...idx.slice(0, 2), ...idx.slice(-2)].map((x) => x.i));
    return ls.filter((l, i) => !(edges.has(i) && this.isHead(l))).join('\n');
  }
}

// Footnote markers glued to a word: "كلمة(1)", "كلمة (٢)", "كلمة¹"
const stripFootnoteMarks = (t: string) =>
  t
    // links and site names stamped on pages (forum watermarks)
    .replace(/\S*(?:https?:\/\/|www\.)\S*/gi, ' ')
    .replace(/\b[\w-]+(?:\.[\w-]+)*\.(?:com|net|org|info|me)\b\S*/gi, ' ')
    .replace(/(?<=[؀-ۿA-Za-z.,،؛:!?؟»"')])\s?[([]\s*[0-9٠-٩]{1,3}\s*[)\]]/g, '').replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g, '');

// The listenable text of a run of pages: non-content pages dropped, heads and markers removed
export function cleanPages(pages: string[], heads: RunningHeadFilter): { text: string; skipped: number } {
  heads.learn(pages);
  let skipped = 0;
  const kept: string[] = [];
  for (const p of pages) {
    if (classifyPage(p) !== 'content') {
      skipped++;
      continue;
    }
    kept.push(collapseRepeats(stripFootnoteMarks(heads.strip(p))));
  }
  return { text: cleanArabicExtractedText(kept.join('\n\n')), skipped };
}

