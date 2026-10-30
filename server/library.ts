// Users' saved books, kept on the persistent disk (<DATA_DIR>/library/<uid>/):
//   <bookId>.json       the whole book (text and chapters), loaded when it is opened
//   <bookId>.meta.json  what the library grid needs, so listing never reads whole books
// Firestore documents cap at 1 MB, which a long book exceeds; the disk has no such limit.
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || '/var/data';
const LIBRARY_DIR = path.join(DATA_DIR, 'library');

export const MAX_BOOKS_PER_USER = 200;
export const MAX_BOOK_BYTES = 20 * 1024 * 1024;

const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

// Only when the disk is mounted: the app directory is wiped on every deploy
export const libraryEnabled = (): boolean => fs.existsSync(DATA_DIR);

const userDir = (uid: string): string => {
  if (!SAFE_ID.test(uid)) throw new Error('bad uid');
  return path.join(LIBRARY_DIR, uid);
};

const bookFile = (uid: string, id: string, suffix: '.json' | '.meta.json'): string => {
  if (!SAFE_ID.test(id)) throw new Error('bad book id');
  return path.join(userDir(uid), id + suffix);
};

export const isValidBookId = (id: unknown): id is string => typeof id === 'string' && SAFE_ID.test(id);

// Write to a temp file first so a crash never leaves half a book behind
function writeAtomic(file: string, data: string): void {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

function metaOf(book: any, updatedAt: number) {
  return {
    id: book.id,
    fileName: book.fileName,
    fileSize: book.fileSize,
    totalPages: book.totalPages,
    processedPages: book.processedPages,
    selectedDialect: book.selectedDialect,
    selectedVoice: book.selectedVoice,
    selectedStyle: book.selectedStyle,
    durationInSeconds: book.durationInSeconds,
    listeningMode: book.listeningMode,
    createdAt: book.createdAt,
    // Chapter list without the text, for the grid and the progress bar
    chapters: Array.isArray(book.chapters)
      ? book.chapters.map((c: any) => ({
          id: c.id,
          chapterNumber: c.chapterNumber,
          title: c.title,
          wordCount: c.wordCount,
          estimatedDurationMinutes: c.estimatedDurationMinutes,
          text: '',
        }))
      : [],
    status: 'completed',
    progress: 100,
    updatedAt,
  };
}

export function listBooks(uid: string): any[] {
  const dir = userDir(uid);
  if (!fs.existsSync(dir)) return [];
  const books: any[] = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.meta.json')) continue;
    try {
      books.push(JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
    } catch {
      // a broken meta file hides one book, never the whole library
    }
  }
  return books.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function getBook(uid: string, id: string): any | null {
  const file = bookFile(uid, id, '.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function saveBook(uid: string, book: any): { ok: true } | { ok: false; status: number; error: string } {
  if (!book || !isValidBookId(book.id)) return { ok: false, status: 400, error: 'bad book' };
  const dir = userDir(uid);
  fs.mkdirSync(dir, { recursive: true });

  const exists = fs.existsSync(bookFile(uid, book.id, '.json'));
  if (!exists && listBooks(uid).length >= MAX_BOOKS_PER_USER) {
    return { ok: false, status: 409, error: 'library_full' };
  }
  // Blob URLs and transient flags mean nothing on another device
  const { audioUrl, isStreamingBackground, backgroundStatus, ...rest } = book;
  const clean = {
    ...rest,
    status: 'completed',
    progress: 100,
    chapters: Array.isArray(rest.chapters) ? rest.chapters.map(({ audioUrl: _a, ...c }: any) => c) : [],
  };
  const json = JSON.stringify(clean);
  if (Buffer.byteLength(json) > MAX_BOOK_BYTES) return { ok: false, status: 413, error: 'book_too_large' };

  writeAtomic(bookFile(uid, book.id, '.json'), json);
  writeAtomic(bookFile(uid, book.id, '.meta.json'), JSON.stringify(metaOf(clean, Date.now())));
  return { ok: true };
}

export function deleteBook(uid: string, id: string): void {
  for (const suffix of ['.json', '.meta.json'] as const) {
    const file = bookFile(uid, id, suffix);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}
