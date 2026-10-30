import { apiFetch } from './apiFetch';
import type { ConversionJob } from '../types';

// The signed-in user's books on the server disk (server/library.ts). Every call returns
// null/false instead of throwing, so callers can fall back to Firestore and localStorage.

export async function saveBookToServer(book: ConversionJob): Promise<boolean> {
  try {
    const res = await apiFetch(
      `/api/library/${encodeURIComponent(book.id)}`,
      { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ book }) },
      { silent: true }
    );
    return res.ok;
  } catch {
    return false;
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
