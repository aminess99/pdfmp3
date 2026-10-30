// Server-side listening minutes. The balance lives in Firestore (credits/{uid}) and only
// this server writes it (firestore.rules lets users read their own doc, never write it).
//
// Needs FIREBASE_SERVICE_ACCOUNT on the server: the service-account JSON (raw or base64).
// Without it nothing is enforced and a warning is logged, so the site keeps working.
import type { Request } from 'express';
import { initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import firebaseConfig from '../src/lib/firebaseConfig';
import { SAMPLE_BOOKS } from '../src/data/sampleBooks';
import { VOICES } from '../src/data/voices';

export const FREE_SECONDS = 30 * 60;

let adminApp: App | null | undefined;

function getAdminApp(): App | null {
  if (adminApp !== undefined) return adminApp;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) {
    console.warn('[credits] FIREBASE_SERVICE_ACCOUNT is not set: listening minutes are NOT enforced');
    adminApp = null;
    return null;
  }
  try {
    const json = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
    adminApp = initializeApp({ credential: cert(json), projectId: firebaseConfig.projectId }, 'credits');
    console.log(`[credits] enabled: listening minutes are enforced (service account ${json.client_email || 'unknown'})`);
  } catch (err: any) {
    console.error('[credits] invalid FIREBASE_SERVICE_ACCOUNT, minutes are NOT enforced:', err?.message || err);
    adminApp = null;
  }
  return adminApp;
}

export const creditsEnabled = (): boolean => getAdminApp() !== null;

function db(): Firestore {
  return getFirestore(getAdminApp()!, firebaseConfig.firestoreDatabaseId || '(default)');
}

// Firebase ID token from "Authorization: Bearer <token>" -> the user, or null
export async function userFromRequest(req: Request): Promise<{ uid: string; email?: string } | null> {
  const app = getAdminApp();
  const header = req.headers.authorization || '';
  if (!app || !header.startsWith('Bearer ')) return null;
  try {
    const decoded = await getAuth(app).verifyIdToken(header.slice(7));
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

export const uidFromRequest = async (req: Request): Promise<string | null> => (await userFromRequest(req))?.uid ?? null;

// ~130 words per minute of Arabic narration, like the rest of the site
export const secondsForText = (text: string): number =>
  Math.max(3, Math.ceil((text.trim().split(/\s+/).filter(Boolean).length / 130) * 60));

// Texts anyone may hear without an account: the demo books and the voice samples
const PUBLIC_TEXTS = [...SAMPLE_BOOKS.map((b) => b.sampleText), ...VOICES.map((v) => v.sampleText)]
  .filter(Boolean)
  .map((t) => t.replace(/\s+/g, ' ').trim());

export const isPublicText = (text: string): boolean => {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 0 && PUBLIC_TEXTS.some((p) => p.includes(t));
};

// Balance in seconds; the free minutes are granted the first time an account is seen
export async function getBalance(uid: string): Promise<number> {
  const ref = db().collection('credits').doc(uid);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) return Number(snap.get('secondsRemaining')) || 0;
    tx.set(ref, { secondsRemaining: FREE_SECONDS, freeGrantedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return FREE_SECONDS;
  });
}

// Atomically take `seconds` from the balance; ok=false (nothing taken) when it is too low
export async function charge(uid: string, seconds: number): Promise<{ ok: boolean; remaining: number }> {
  const ref = db().collection('credits').doc(uid);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? Number(snap.get('secondsRemaining')) || 0 : FREE_SECONDS;
    if (current < seconds) return { ok: false, remaining: current };
    const data: Record<string, unknown> = { secondsRemaining: current - seconds, updatedAt: FieldValue.serverTimestamp() };
    if (!snap.exists) data.freeGrantedAt = FieldValue.serverTimestamp();
    tx.set(ref, data, { merge: true });
    return { ok: true, remaining: current - seconds };
  });
}

export async function refund(uid: string, seconds: number): Promise<void> {
  try {
    await db().collection('credits').doc(uid).update({ secondsRemaining: FieldValue.increment(seconds), updatedAt: FieldValue.serverTimestamp() });
  } catch (err: any) {
    console.error('[credits] refund failed', uid, seconds, err?.message || err);
  }
}

// Replaying a clip you already paid for is free for a while (seeking back, reopening a book)
const recentlyCharged = new Map<string, number>();
const CHARGE_MEMORY_MS = 12 * 60 * 60 * 1000;

export const alreadyCharged = (uid: string, key: string): boolean => {
  const at = recentlyCharged.get(`${uid}|${key}`);
  return at !== undefined && Date.now() - at < CHARGE_MEMORY_MS;
};

export const rememberCharge = (uid: string, key: string): void => {
  if (recentlyCharged.size > 50_000) recentlyCharged.clear();
  recentlyCharged.set(`${uid}|${key}`, Date.now());
};

export const forgetCharge = (uid: string, key: string): void => {
  recentlyCharged.delete(`${uid}|${key}`);
};

// Adds purchased minutes once per payment: payments/{paymentId} records it, so a webhook
// delivered twice (Dodo retries until it gets a 2xx) never credits twice.
export async function addPurchasedSeconds(
  uid: string,
  seconds: number,
  paymentId: string,
  info: Record<string, unknown>
): Promise<'added' | 'duplicate'> {
  const creditRef = db().collection('credits').doc(uid);
  const paymentRef = db().collection('payments').doc(paymentId);
  return db().runTransaction(async (tx) => {
    const [paid, credit] = await Promise.all([tx.get(paymentRef), tx.get(creditRef)]);
    if (paid.exists) return 'duplicate';
    const current = credit.exists ? Number(credit.get('secondsRemaining')) || 0 : FREE_SECONDS;
    tx.set(
      creditRef,
      {
        secondsRemaining: current + seconds,
        updatedAt: FieldValue.serverTimestamp(),
        ...(credit.exists ? {} : { freeGrantedAt: FieldValue.serverTimestamp() }),
      },
      { merge: true }
    );
    tx.set(paymentRef, { uid, seconds, ...info, creditedAt: FieldValue.serverTimestamp() });
    return 'added';
  });
}
