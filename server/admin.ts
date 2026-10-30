// Admin dashboard data. Every /api/admin route checks the caller with isAdminUser (verified
// Firebase email in ADMIN_EMAILS); the browser's own "admin" flag is cosmetic only.
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb, adminAuthClient, FREE_SECONDS, forgetSubscriber } from './credits';
import { PLANS } from './payments';
import { listBooks } from './library';

// Matches the measured OpenRouter price of google/gemini-3.8-flash-lite-tts
const COST_PER_MINUTE_USD = Number(process.env.TTS_COST_PER_MINUTE || 0.0107);

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'aminefiverr1996@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const isAdminUser = (user: { email?: string; emailVerified?: boolean } | null): boolean =>
  Boolean(user?.email && user.emailVerified && ADMIN_EMAILS.includes(user.email.toLowerCase()));

const millis = (t: unknown): number => (t instanceof Timestamp ? t.toMillis() : 0);

// Every Firebase user, newest first (fine up to tens of thousands)
async function allUsers() {
  const users: { uid: string; email?: string; name?: string; createdAt: number; lastSignIn: number }[] = [];
  let pageToken: string | undefined;
  do {
    const page = await adminAuthClient().listUsers(1000, pageToken);
    for (const u of page.users) {
      users.push({
        uid: u.uid,
        email: u.email,
        name: u.displayName,
        createdAt: Date.parse(u.metadata.creationTime) || 0,
        lastSignIn: Date.parse(u.metadata.lastSignInTime || '') || 0,
      });
    }
    pageToken = page.pageToken;
  } while (pageToken && users.length < 50_000);
  return users.sort((a, b) => b.createdAt - a.createdAt);
}

async function openRouterCredits(): Promise<{ total: number; used: number } | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/credits', { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const d = (await res.json()).data;
    return { total: Number(d.total_credits) || 0, used: Number(d.total_usage) || 0 };
  } catch {
    return null;
  }
}

export async function overview() {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthStart = Timestamp.fromDate(new Date(`${monthKey}-01T00:00:00Z`));

  const [users, credits, payments, stats, openRouter] = await Promise.all([
    allUsers(),
    adminDb().collection('credits').get(),
    adminDb().collection('payments').where('creditedAt', '>=', monthStart).get(),
    adminDb().collection('stats').doc(monthKey).get(),
    openRouterCredits(),
  ]);

  // Subscribers and how much of their minutes they use, per plan
  const plans: Record<string, { subscribers: number; mrr: number; usedSeconds: number; grantedSeconds: number }> = {};
  for (const id of Object.keys(PLANS)) plans[id] = { subscribers: 0, mrr: 0, usedSeconds: 0, grantedSeconds: 0 };
  for (const doc of credits.docs) {
    const plan = doc.get('plan') as string | undefined;
    if (!plan || !plans[plan]) continue;
    const p = plans[plan];
    p.usedSeconds += Number(doc.get('usedSeconds')) || 0;
    p.grantedSeconds += (Number(doc.get('purchasedSeconds')) || 0) + FREE_SECONDS;
    if (millis(doc.get('subscriberUntil')) > now) {
      p.subscribers += 1;
      p.mrr += PLANS[plan].priceUsd;
    }
  }

  // Payment amounts are in the smallest currency unit (cents)
  const revenueMonth = payments.docs.reduce((n, d) => n + (Number(d.get('amount')) || 0), 0) / 100;
  const generatedSeconds = Number(stats.get('generatedSeconds')) || 0;
  const cachedSeconds = Number(stats.get('cachedSeconds')) || 0;
  const audioCostMonth = (generatedSeconds / 60) * COST_PER_MINUTE_USD;

  return {
    users: {
      total: users.length,
      newToday: users.filter((u) => now - u.createdAt < day).length,
      newWeek: users.filter((u) => now - u.createdAt < 7 * day).length,
      activeWeek: users.filter((u) => now - u.lastSignIn < 7 * day).length,
    },
    plans: Object.entries(plans).map(([id, p]) => ({
      id,
      priceUsd: PLANS[id].priceUsd,
      minutes: PLANS[id].minutes,
      subscribers: p.subscribers,
      mrr: Math.round(p.mrr * 100) / 100,
      usagePercent: p.grantedSeconds ? Math.round((p.usedSeconds / p.grantedSeconds) * 100) : null,
    })),
    revenue: {
      month: Math.round(revenueMonth * 100) / 100,
      mrr: Math.round(Object.values(plans).reduce((n, p) => n + p.mrr, 0) * 100) / 100,
      paymentsMonth: payments.size,
    },
    audio: {
      month: monthKey,
      generatedMinutes: Math.round(generatedSeconds / 60),
      cachedMinutes: Math.round(cachedSeconds / 60),
      costUsd: Math.round(audioCostMonth * 100) / 100,
      costPerMinuteUsd: COST_PER_MINUTE_USD,
    },
    // Revenue minus audio cost only (payment fees and hosting are not included)
    grossProfitMonth: Math.round((revenueMonth - audioCostMonth) * 100) / 100,
    openRouter: openRouter ? { remaining: Math.round((openRouter.total - openRouter.used) * 100) / 100, used: Math.round(openRouter.used * 100) / 100 } : null,
  };
}

// Users with their balance and plan; `search` matches the email
export async function usersTable(search = '', limit = 50) {
  const q = search.trim().toLowerCase();
  const users = (await allUsers()).filter((u) => !q || (u.email || '').toLowerCase().includes(q)).slice(0, limit);
  const refs = users.map((u) => adminDb().collection('credits').doc(u.uid));
  const docs = refs.length ? await adminDb().getAll(...refs) : [];
  const now = Date.now();
  return users.map((u, i) => {
    const c = docs[i];
    const until = c?.exists ? millis(c.get('subscriberUntil')) : 0;
    let books = 0;
    try {
      books = listBooks(u.uid).length;
    } catch {
      // library not on this server
    }
    return {
      uid: u.uid,
      email: u.email || '',
      name: u.name || '',
      createdAt: u.createdAt,
      lastSignIn: u.lastSignIn,
      balanceMinutes: c?.exists ? Math.floor((Number(c.get('secondsRemaining')) || 0) / 60) : Math.floor(FREE_SECONDS / 60),
      usedMinutes: c?.exists ? Math.round((Number(c.get('usedSeconds')) || 0) / 60) : 0,
      plan: (c?.exists && (c.get('plan') as string)) || null,
      subscriber: until > now,
      subscriberUntil: until || null,
      books,
    };
  });
}

export async function recentPayments(limit = 30) {
  const snap = await adminDb().collection('payments').orderBy('creditedAt', 'desc').limit(limit).get();
  return snap.docs.map((d) => ({
    id: d.id,
    uid: d.get('uid'),
    email: d.get('email') || '',
    plan: d.get('plan') || '',
    amount: (Number(d.get('amount')) || 0) / 100,
    currency: d.get('currency') || 'USD',
    at: millis(d.get('creditedAt')),
  }));
}

// Gift minutes (support, compensation); logged in adminLog
export async function giftMinutes(adminEmail: string, uid: string, minutes: number, note: string) {
  const seconds = Math.round(minutes * 60);
  const ref = adminDb().collection('credits').doc(uid);
  await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? Number(snap.get('secondsRemaining')) || 0 : FREE_SECONDS;
    tx.set(
      ref,
      {
        secondsRemaining: current + seconds,
        updatedAt: FieldValue.serverTimestamp(),
        ...(snap.exists ? {} : { freeGrantedAt: FieldValue.serverTimestamp() }),
      },
      { merge: true }
    );
    tx.set(adminDb().collection('adminLog').doc(), {
      action: 'gift_minutes',
      admin: adminEmail,
      uid,
      minutes,
      note: note.slice(0, 300),
      at: FieldValue.serverTimestamp(),
    });
  });
  forgetSubscriber(uid);
}
