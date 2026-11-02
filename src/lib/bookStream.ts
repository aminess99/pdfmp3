import type { BookChapter, ConversionJob } from '../types';
import { findChapterHeadings, estimateDurationMinutes } from './chapterUtils';
import { RunningHeadFilter, cleanPages } from './bookCleaner';
import { saveBookToServer } from './library';
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

// Turns a stream of text into chapters at the book's own headings
export class ChapterAssembler {
  private buffer = '';
  private title: string;
  private sawHeading = false;
  private partNumber = 1;
  private count: number;

  constructor(private readonly jobId: string, fallbackTitle: string, existingChapters = 0) {
    this.title = fallbackTitle;
    this.count = existingChapters;
  }

  private make(title: string, text: string): BookChapter {
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
    return this.sawHeading ? tr(`${this.title} (تابع)`, `${this.title} (continued)`) : tr(`الجزء ${++this.partNumber}`, `Part ${++this.partNumber}`);
  }

  // Adds text; returns the chapters completed by it
  push(text: string): BookChapter[] {
    if (!text.trim()) return [];
    const out: BookChapter[] = [];
    const combined = this.buffer ? `${this.buffer}\n\n${text}` : text;
    const heads = findChapterHeadings(combined);
    let cursor = 0;
    let title = this.title;
    for (const h of heads) {
      const before = combined.slice(cursor, h.index).trim();
      if (countWords(before) >= 20) out.push(this.make(title, before));
      title = h.title;
      this.sawHeading = true;
      cursor = h.index + h.fullMatch.length;
    }
    this.title = title;
    this.buffer = combined.slice(cursor).trim();
    if (countWords(this.buffer) > MAX_CHAPTER_WORDS) {
      out.push(this.make(this.title, this.buffer));
      this.buffer = '';
      this.title = this.continuationTitle();
    }
    return out;
  }

  // Emits whatever is buffered now; text that follows continues under a "(continued)" title
  cut(): BookChapter[] {
    if (countWords(this.buffer) < 1) return [];
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
      const { text } = cleanPages(pages, heads);
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
