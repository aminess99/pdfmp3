import { db, auth, collection, addDoc, doc, getDoc, serverTimestamp } from './firebase';

// A shared clip is just text + voice; the share page synthesizes the audio on demand,
// so no audio files need public storage. Limits mirror firestore.rules.
export const SHARE_TEXT_MAX = 600;
const TITLE_MAX = 150;

export const SHARE_PATH_RE = /^\/s\/([A-Za-z0-9_-]{10,40})\/?$/;

export interface SharedClip {
  text: string;
  voiceId: string;
  bookTitle: string;
  chapterTitle: string;
}

export const shareUrl = (id: string) => `${window.location.origin}/s/${id}`;

// Trim to the limit, preferring to end on a sentence boundary
export const clipText = (text: string): string => {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= SHARE_TEXT_MAX) return clean;
  const cut = clean.slice(0, SHARE_TEXT_MAX);
  const lastStop = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('؟'), cut.lastIndexOf('!'), cut.lastIndexOf('،'));
  return (lastStop > SHARE_TEXT_MAX * 0.5 ? cut.slice(0, lastStop + 1) : cut).trim();
};

export async function createShare(clip: SharedClip): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('not signed in');
  const ref = await addDoc(collection(db, 'shares'), {
    text: clipText(clip.text),
    voiceId: clip.voiceId.slice(0, 40),
    bookTitle: clip.bookTitle.slice(0, TITLE_MAX),
    chapterTitle: clip.chapterTitle.slice(0, TITLE_MAX),
    userId: uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getShare(id: string): Promise<SharedClip | null> {
  const snap = await getDoc(doc(db, 'shares', id));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    text: String(d.text || ''),
    voiceId: String(d.voiceId || ''),
    bookTitle: String(d.bookTitle || ''),
    chapterTitle: String(d.chapterTitle || ''),
  };
}
