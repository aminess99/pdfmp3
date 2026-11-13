// Listening log for the admin dashboard.
//
//   listens/{day}_{uid}_{hash}   one row per user, title and day: seconds and clips listened
//                                (kind "book" for the studio, "summary" for a summary's MP3)
//   summaryPlays/{slug}          plays of each summary's MP3: full plays, previews, signed-in
//   summaryDaily/{day}           summary plays per day, signed in or not
//
// Writes are summed in memory and flushed once a minute, so a book read clip by clip costs
// one Firestore write per minute instead of one per paragraph.
import crypto from 'crypto';
import { FieldValue, WriteBatch } from 'firebase-admin/firestore';
import { adminDb, creditsEnabled } from './credits';

export type ListenKind = 'book' | 'summary' | 'text';

const today = () => new Date().toISOString().slice(0, 10);
const hash = (s: string) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);
const cleanTitle = (t: unknown) =>
  String(t || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);

const pendingListens = new Map<string, { uid: string; title: string; kind: ListenKind; slug?: string; day: string; seconds: number; clips: number }>();
const pendingSummaries = new Map<string, { plays: number; previews: number; signedIn: number; en: number }>();
const pendingDaily = new Map<string, { plays: number; signedIn: number }>();

// A clip the user was charged for (or an admin's clip), from the studio and the other players
export function recordListen(uid: string, title: unknown, kind: ListenKind, seconds: number, slug?: string): void {
  if (!creditsEnabled()) return;
  const name = cleanTitle(title) || (kind === 'book' ? 'كتاب بلا عنوان' : 'نص');
  const day = today();
  const key = `${day}_${uid}_${hash(`${kind}|${slug || name}`)}`;
  const row = pendingListens.get(key) || { uid, title: name, kind, slug, day, seconds: 0, clips: 0 };
  row.seconds += Math.max(0, Math.round(seconds));
  row.clips += 1;
  pendingListens.set(key, row);
}

// Someone pressed play on a summary's MP3 (full player or the short preview on the cards)
export function recordSummaryPlay(slug: string, title: string, lang: 'ar' | 'en', uid: string | null, preview: boolean): void {
  if (!creditsEnabled()) return;
  const s = pendingSummaries.get(slug) || { plays: 0, previews: 0, signedIn: 0, en: 0 };
  if (preview) s.previews += 1;
  else s.plays += 1;
  if (uid) s.signedIn += 1;
  if (lang === 'en') s.en += 1;
  pendingSummaries.set(slug, s);

  const day = today();
  const d = pendingDaily.get(day) || { plays: 0, signedIn: 0 };
  d.plays += 1;
  if (uid) d.signedIn += 1;
  pendingDaily.set(day, d);

  if (uid && !preview) recordListen(uid, title, 'summary', 0, slug);
}

async function flush(): Promise<void> {
  if (!creditsEnabled() || (!pendingListens.size && !pendingSummaries.size && !pendingDaily.size)) return;
  const listens = [...pendingListens.entries()];
  const summaries = [...pendingSummaries.entries()];
  const daily = [...pendingDaily.entries()];
  pendingListens.clear();
  pendingSummaries.clear();
  pendingDaily.clear();

  const db = adminDb();
  // A batch holds up to 500 writes
  const writes = [
    ...listens.map(([id, r]) => (b: WriteBatch) =>
      b.set(
        db.collection('listens').doc(id),
        {
          uid: r.uid,
          title: r.title,
          kind: r.kind,
          ...(r.slug ? { slug: r.slug } : {}),
          day: r.day,
          seconds: FieldValue.increment(r.seconds),
          clips: FieldValue.increment(r.clips),
          lastAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
    ),
    ...summaries.map(([slug, s]) => (b: WriteBatch) =>
      b.set(
        db.collection('summaryPlays').doc(slug),
        {
          plays: FieldValue.increment(s.plays),
          previews: FieldValue.increment(s.previews),
          signedIn: FieldValue.increment(s.signedIn),
          en: FieldValue.increment(s.en),
          lastAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
    ),
    ...daily.map(([day, d]) => (b: WriteBatch) =>
      b.set(db.collection('summaryDaily').doc(day), { plays: FieldValue.increment(d.plays), signedIn: FieldValue.increment(d.signedIn) }, { merge: true })
    ),
  ];
  try {
    for (let i = 0; i < writes.length; i += 450) {
      const batch = db.batch();
      writes.slice(i, i + 450).forEach((w) => w(batch));
      await batch.commit();
    }
  } catch (err: any) {
    console.warn('[listens] write failed:', err?.message || err);
    // Put the counts back for the next try
    for (const [id, r] of listens) {
      const cur = pendingListens.get(id);
      if (cur) {
        cur.seconds += r.seconds;
        cur.clips += r.clips;
      } else pendingListens.set(id, r);
    }
    for (const [slug, s] of summaries) {
      const cur = pendingSummaries.get(slug) || { plays: 0, previews: 0, signedIn: 0, en: 0 };
      pendingSummaries.set(slug, { plays: cur.plays + s.plays, previews: cur.previews + s.previews, signedIn: cur.signedIn + s.signedIn, en: cur.en + s.en });
    }
    for (const [day, d] of daily) {
      const cur = pendingDaily.get(day) || { plays: 0, signedIn: 0 };
      pendingDaily.set(day, { plays: cur.plays + d.plays, signedIn: cur.signedIn + d.signedIn });
    }
  }
}

setInterval(flush, 60_000).unref();

// Render stops the old server on every deploy: write what is pending first
for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.once(sig, () => {
    flush().finally(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}

// One play per visitor and summary every half hour (reloads and repeated clicks count once)
const recentPlays = new Map<string, number>();
export function firstPlayInWindow(key: string): boolean {
  const now = Date.now();
  const at = recentPlays.get(key);
  if (at && now - at < 30 * 60 * 1000) return false;
  if (recentPlays.size > 100_000) recentPlays.clear();
  recentPlays.set(key, now);
  return true;
}
