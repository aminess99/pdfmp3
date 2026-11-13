import { apiFetch } from './apiFetch';
import type { ConversionJob } from '../types';

// The signed-in user's books on the server disk (server/library.ts). Every call returns
// null/false instead of throwing, so callers can fall back to Firestore and localStorage.

// 'saved', 'limit' (the free library is full) or 'unavailable' (use the Firestore fallback)
export async function saveBookToServer(book: ConversionJob): Promise<'saved' | 'limit' | 'unavailable'> {
  try {
    const res = await apiFetch(
      `/api/library/${encodeURIComponent(book.id)}`,
      { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ book }) },
      { silent: true }
    );
    if (res.ok) return 'saved';
    if (res.status === 403) return 'limit';
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

// Books without their text (chapters carry titles only); null when the library is unavailable
export async function listServerBooks(): Promise<ConversionJob[] | null> {
  try {
    const res = await apiFetch('/api/library', {}, { silent: true });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.books) ? data.books : null;
  } catch {
    return null;
  }
}

export async function getServerBook(id: string): Promise<ConversionJob | null> {
  try {
    const res = await apiFetch(`/api/library/${encodeURIComponent(id)}`, {}, { silent: true });
    if (!res.ok) return null;
    return (await res.json()).book || null;
  } catch {
    return null;
  }
}

export async function deleteServerBook(id: string): Promise<boolean> {
  try {
    const res = await apiFetch(`/api/library/${encodeURIComponent(id)}`, { method: 'DELETE' }, { silent: true });
    return res.ok;
  } catch {
    return false;
  }
}

// A book from the server list has no text yet; it must be fetched before it can play
export const needsText = (book: ConversionJob): boolean =>
  !book.extractedText && !(book.chapters || []).some((c) => c.text && c.text.trim().length > 0);

// The browser copy of the library (guests, and a fallback for signed-in users). Storage holds
// about 5 MB: when a book does not fit, the oldest books are dropped so the newest is kept.
const LOCAL_LIBRARY_KEY = 'pdf_audio_library';

export function readLocalLibrary(): ConversionJob[] {
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_LIBRARY_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function writeLocalLibrary(list: ConversionJob[]): boolean {
  for (let keep = list.length; keep >= 1; keep--) {
    try {
      localStorage.setItem(LOCAL_LIBRARY_KEY, JSON.stringify(list.slice(0, keep)));
      return keep === list.length;
    } catch {
      // full: try again without the oldest book
    }
  }
  return false;
}

// Puts a book at the top of the browser library (replacing an older copy of it)
export function saveLocalBook(book: ConversionJob): boolean {
  return writeLocalLibrary([book, ...readLocalLibrary().filter((j) => j.id !== book.id)]);
}
