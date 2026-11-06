import type { BookChapter, ConversionJob } from '../types';
import { findChapterHeadings, estimateDurationMinutes, normTitle, partTitle, nextPartTitle } from './chapterUtils';
import { RunningHeadFilter, cleanPages } from './bookCleaner';
import { saveBookToServer } from './library';
import { smartFilterWithHeadings, FoundHeading } from './smartFilter';
import { tr } from './i18n';

// Reads a long PDF in the background while the listener is already in the studio: the first
// batch is turned into chapters before the studio opens, later batches arrive as NEW chapters
// (a chapter never changes once the studio may be playing it). App.tsx applies the updates
// to the open book; each update is also saved to the library.

export const BOOK_STREAM_EVENT = 'app_book_stream';
export const PAGES_PER_BATCH = 20;
// A chapter without headings is cut into parts of about this size
const MAX_CHAPTER_WORDS = 3000;

export interface BookStreamUpdate {
  jobId: string;
  chapters: BookChapter[];
  nextPageToRead: number;
  totalPages: number;
  done: boolean;
  failed?: boolean;
}

const countWords = (t: string) => t.split(/\s+/).filter(Boolean).length;

// Turns a stream of text into chapters at the book's own headings: the usual "الفصل الأول"
// patterns, headings the AI reader found (lib/smartFilter.ts), and the names from the book's
// contents page. Text too short to stand alone is carried into the next chapter.
const MIN_CHAPTER_WORDS = 40;

export class ChapterAssembler {
  private buffer = '';
  private title: string;
  private sawHeading = false;
  private partNumber = 1;
  private count: number;
  private knownLines = new Map<string, string>(); // normalized heading line -> title
  private toc: { norm: string; title: string }[] = [];
  // Titles already used for a chapter: a heading seen again ("أفكار تستحق التذكر" after every
  // chapter) is a recurring section, not a new chapter
  private usedTitles = new Set<string>();

  constructor(private readonly jobId: string, fallbackTitle: string, existingChapters = 0, continuing = false) {
    this.title = fallbackTitle;
    this.count = existingChapters;
    // Resuming inside a chapter: its next parts keep numbering from the given title
    this.sawHeading = continuing;
  }

  // Headings the AI reader found in text about to be pushed
  addHeadings(list: FoundHeading[]): void {
    for (const h of list) {
      const key = normTitle(h.line);
      if (key) this.knownLines.set(key, h.title);
    }
  }

  // Chapter names from the book's contents page
  setToc(titles: string[]): void {
    this.toc = titles
      .map((t) => t.replace(/[.،]+\s*$/, '').trim())
      .map((t) => ({ norm: normTitle(t), title: t }))
      .filter((t) => t.norm.length >= 3);
  }

  private make(title: string, rawText: string): BookChapter {
    // A bare "الفصل الأول" line inside a chapter is a running head left by OCR, not text
    const text = rawText.replace(/^[ \t]*(?:الفصل|الباب|الجزء|المبحث)\s+\S+(?:\s+عشر)?[ \t]*$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
    const w = countWords(text);
    this.count++;
    return {
      id: `${this.jobId}_c${this.count}`,
      chapterNumber: this.count,
      title,
      wordCount: w,
      estimatedDurationMinutes: estimateDurationMinutes(w),
      text,
      status: 'completed',
    };
  }

  // Title for text that continues the current chapter after it was cut
  private continuationTitle(): string {
    if (this.sawHeading) return nextPartTitle(this.title);
    this.partNumber++;
    return tr(partTitle(this.partNumber), partTitle(this.partNumber, false));
  }

  // The contents entry a (normalized) line matches: exactly, or closely for longer names
  // ("الفصل الأول: كنز في داخلك" vs "كنز في داخلك")
  private tocMatch(key: string): { norm: string; title: string } | undefined {
    if (!key) return undefined;
    return this.toc.find(
      (t) =>
        t.norm === key ||
        (t.norm.length >= 8 && key.includes(t.norm) && key.length <= t.norm.length + 20) ||
        (key.length >= 8 && t.norm.includes(key) && key.length >= t.norm.length * 0.6)
    );
  }

  private completeFromToc(title: string, after: string): { title: string; consumed: number } | null {
    if (!this.toc.length) return null;
    const m = title.match(/^((?:الفصل|الباب|الجزء|المبحث)\s+\S+(?:\s+عشر)?\s*:\s*)?(.+)$/);
    const prefix = m?.[1] || '';
    const name = normTitle(m?.[2] || title);
    if (name.length < 6) return null;
    const entry = this.toc.find((t) => t.norm.startsWith(name + ' ') && t.norm.length > name.length);
    if (!entry) return null;
    const rest = entry.norm.slice(name.length).trim().split(' ');
    // The next words of the text must be the rest of the name
    const wordRe = /\s*(\S+)/y;
    let pos = 0;
    for (const want of rest) {
      wordRe.lastIndex = pos;
      const w = wordRe.exec(after);
      if (!w || normTitle(w[1]) !== want) return null;
      pos = wordRe.lastIndex;
    }
    return { title: `${prefix}${entry.title}`, consumed: pos };
  }

  // Lines that are headings by the AI reader or by the contents page
  private lineHeadings(text: string): { index: number; fullMatch: string; title: string }[] {
    if (!this.knownLines.size && !this.toc.length) return [];
    const out: { index: number; fullMatch: string; title: string }[] = [];
    let pos = 0;
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      const words = trimmed ? trimmed.split(/\s+/).length : 0;
      if (words >= 1 && words <= 14) {
        const key = normTitle(trimmed);
        // A heading stored backwards ("كلخدا يف زنك") matches when read the other way
        const rkey = normTitle([...trimmed].reverse().join(''));
        let title = this.knownLines.get(key) || this.knownLines.get(rkey);
        // With a real contents list, a heading the AI reader found must be in it to be a chapter
        if (title && this.toc.length >= 3 && !this.tocMatch(normTitle(title)) && !this.tocMatch(key) && !this.tocMatch(rkey)) title = undefined;
        if (!title && key.length >= 3) {
          // Exact match, or a close one for longer names ("الفصل الأول: كنز في داخلك" vs "كنز في داخلك")
          const hit = this.tocMatch(key) || this.tocMatch(rkey);
          if (hit) title = hit.title;
        }
        if (title) out.push({ index: pos, fullMatch: line, title });
      }
      pos += line.length + 1;
    }
    return out;
  }

  // Adds text; returns the chapters completed by it
  push(text: string): BookChapter[] {
    if (!text.trim()) return [];
    const out: BookChapter[] = [];
    const combined = this.buffer ? `${this.buffer}\n\n${text}` : text;
    // Pattern headings and found headings, in order, without overlaps
    const heads = [...findChapterHeadings(combined), ...this.lineHeadings(combined)].sort((a, b) => a.index - b.index);
    let cursor = 0;
    let title = this.title;
    let carry = '';
    for (const h of heads) {
      if (h.index < cursor) continue;
      // A title already used is a recurring section inside chapters, not a new chapter. For
      // "الفصل الأول ..." the chapter number decides: a running head "الفصل الأول" at the top
      // of every page of that chapter is the same chapter
      const numbered = h.title.match(/^(?:الفصل|الباب|الجزء|المبحث)\s+\S+(?:\s+عشر)?/);
      const used = normTitle(numbered ? numbered[0] : h.title);
      if (used && this.usedTitles.has(used)) continue;
      if (used) this.usedTitles.add(used);
      const before = combined.slice(cursor, h.index).trim();
      const body = carry ? `${carry}\n\n${before}`.trim() : before;
      if (countWords(body) >= MIN_CHAPTER_WORDS) {
        out.push(this.make(title, body));
        carry = '';
      } else {
        // Too short to stand alone (an epigraph, a part title page): goes into the next chapter
        carry = body;
      }
      title = h.title;
      this.sawHeading = true;
      cursor = h.index + h.fullMatch.length;
      // A name broken over two lines ("احرص على أن يكون خزان" / "الحب ممتلئاً دائماً"): when the
      // contents has the full name, take it, and drop its remaining words from the text
      const completed = this.completeFromToc(title, combined.slice(cursor));
      if (completed) {
        title = completed.title;
        cursor += completed.consumed;
      }
    }
    this.title = title;
    const rest = combined.slice(cursor).trim();
    this.buffer = carry ? `${carry}\n\n${rest}`.trim() : rest;
    if (countWords(this.buffer) > MAX_CHAPTER_WORDS) {
      out.push(this.make(this.title, this.buffer));
      this.buffer = '';
      this.title = this.continuationTitle();
    }
    return out;
  }

  // Emits whatever is buffered now; text that follows continues as the chapter's next part.
  // A scrap (a title page) stays buffered and opens the next chapter instead.
  cut(): BookChapter[] {
    if (countWords(this.buffer) < MIN_CHAPTER_WORDS) return [];
    const ch = this.make(this.title, this.buffer);
    this.buffer = '';
    this.title = this.continuationTitle();
    return [ch];
  }

  flush(): BookChapter[] {
    if (!this.buffer.trim()) return [];
    const ch = this.make(this.title, this.buffer);
    this.buffer = '';
    return [ch];
  }
}

// Keeps the browser copy of the library and the server copy in step with the book
export function persistJob(job: ConversionJob): void {
  try {
    const existing = JSON.parse(localStorage.getItem('pdf_audio_library') || '[]');
    const list = Array.isArray(existing) ? existing : [];
    localStorage.setItem('pdf_audio_library', JSON.stringify([job, ...list.filter((j: ConversionJob) => j.id !== job.id)]));
  } catch {
    // storage full or blocked: the server copy still has it
  }
  saveBookToServer(job);
}

// Which chapter the studio is playing, per book: lets a paid (OCR) read stay just ahead of
// the listener instead of scanning the whole book, and cut a chapter early when they catch up
const listenerAt = new Map<string, number>();
export function setListenerPosition(jobId: string, chapterIndex: number | null): void {
  if (chapterIndex === null) listenerAt.delete(jobId);
  else listenerAt.set(jobId, chapterIndex);
}
// Chapters kept ready ahead of the listener in a lazy read
const LAZY_CHAPTERS_AHEAD = 2;

const running = new Map<string, { cancelled: boolean }>();

export const isStreaming = (jobId: string) => running.has(jobId);

export function stopBookStream(jobId: string): void {
  const r = running.get(jobId);
  if (r) r.cancelled = true;
}

// Reads pages [fromPage, totalPages] in batches and appends their chapters to the book
export async function runBookStream(opts: {
  job: ConversionJob;
  readPageTexts: (start: number, end: number) => Promise<string[]>;
  fromPage: number;
  totalPages: number;
  assembler: ChapterAssembler;
  heads?: RunningHeadFilter;
  batchSize?: number;
  // Read only as far ahead of the listener as needed (scanned books: every page costs)
  lazy?: boolean;
}): Promise<void> {
  const { readPageTexts, totalPages, assembler } = opts;
  const heads = opts.heads || new RunningHeadFilter();
  if (running.has(opts.job.id)) return;
  const state = { cancelled: false };
  running.set(opts.job.id, state);

  let chapters = [...(opts.job.chapters || [])];
  let page = opts.fromPage;
  const emit = (done: boolean, failed = false) => {
    const update: BookStreamUpdate = { jobId: opts.job.id, chapters, nextPageToRead: page, totalPages, done, failed };
    window.dispatchEvent(new CustomEvent<BookStreamUpdate>(BOOK_STREAM_EVENT, { detail: update }));
    persistJob({
      ...opts.job,
      chapters,
      nextPageToRead: page,
      processedPages: Math.min(totalPages, page - 1),
      totalPages,
      isStreamingBackground: false,
      durationInSeconds: chapters.reduce((n, c) => n + (c.estimatedDurationMinutes || 1) * 60, 0),
    });
  };

  try {
    while (page <= totalPages && !state.cancelled) {
      if (opts.lazy) {
        // Wait while enough is ready; resumes as the listener moves on
        while (!state.cancelled && chapters.length - 1 - (listenerAt.get(opts.job.id) ?? 0) >= LAZY_CHAPTERS_AHEAD) {
          await new Promise((r) => setTimeout(r, 1500));
        }
        if (state.cancelled) break;
      }
      const end = Math.min(totalPages, page + (opts.batchSize || PAGES_PER_BATCH) - 1);
      const pages = await readPageTexts(page, end);
      const filtered = await smartFilterWithHeadings(cleanPages(pages, heads).text);
      assembler.addHeadings(filtered.headings);
      const text = filtered.text;
      page = end + 1;
      const added = assembler.push(text);
      if (page > totalPages) added.push(...assembler.flush());
      // The listener is on the last ready chapter: hand over what is read now rather than
      // make them wait for the whole chapter
      else if (!added.length && (listenerAt.get(opts.job.id) ?? 0) >= chapters.length - 1) added.push(...assembler.cut());
      if (added.length) chapters = [...chapters, ...added];
      emit(page > totalPages);
      // Give the player room on slow phones
      await new Promise((r) => setTimeout(r, 50));
    }
  } catch (err) {
    console.warn('Background book reading stopped:', err);
    emit(true, true);
  } finally {
    running.delete(opts.job.id);
  }
}
