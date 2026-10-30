import { auth } from './firebase';
import { toastOnce } from './toast';
import { tr } from './i18n';

// Events the app listens to (App.tsx): open the sign-up dialog / the plans
export const REQUIRE_AUTH_EVENT = 'app_require_auth';
export const OUT_OF_CREDITS_EVENT = 'app_out_of_credits';
export const CREDITS_CHANGED_EVENT = 'app_credits_changed';
// A subscriber feature was refused (or a free daily limit reached): show the plans
export const SUBSCRIBE_EVENT = 'app_subscribe';

// fetch() for our /api routes: adds the signed-in user's Firebase ID token, and turns
// "sign in first" (401) and "not enough minutes" (402) answers into app-wide prompts.
// `silent` skips those prompts for background calls that have a local fallback.
export async function apiFetch(url: string, init: RequestInit = {}, opts: { silent?: boolean } = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const user = auth.currentUser;
  if (user) {
    try {
      headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
    } catch {}
  }
  const res = await fetch(url, { ...init, headers });

  const remaining = res.headers.get('X-Credits-Remaining');
  if (remaining !== null) {
    window.dispatchEvent(new CustomEvent(CREDITS_CHANGED_EVENT, { detail: Number(remaining) }));
  }

  if (!opts.silent && [401, 402, 403, 429].includes(res.status)) {
    const body = await res
      .clone()
      .json()
      .catch(() => ({}));
    const code = body?.code;
    if (code === 'auth_required') {
      toastOnce(tr('سجّل مجاناً لتستمع إلى نصوصك وكتبك، واحصل على 30 دقيقة.', 'Sign up free to listen to your own texts and books, and get 30 minutes.'), 'info', 8000);
      window.dispatchEvent(new CustomEvent(REQUIRE_AUTH_EVENT));
    } else if (code === 'insufficient_credits') {
      toastOnce(tr('نفد رصيد دقائقك. اشحن رصيدك لمتابعة الاستماع.', 'You’re out of listening minutes. Top up to keep listening.'), 'error', 8000);
      window.dispatchEvent(new CustomEvent(OUT_OF_CREDITS_EVENT));
    } else if (code === 'subscription_required' || code === 'daily_limit') {
      toastOnce(body.error || tr('هذه الميزة متاحة للمشتركين.', 'This feature is for subscribers.'), 'info', 8000);
      window.dispatchEvent(new CustomEvent(SUBSCRIBE_EVENT));
    }
  }
  return res;
}

// Current balance in seconds, or null when minutes are not enforced / unavailable
export async function fetchCredits(): Promise<number | null> {
  try {
    const res = await apiFetch('/api/credits', {}, { silent: true });
    if (!res.ok) return null;
    const data = await res.json();
    return data.enabled ? Number(data.secondsRemaining) || 0 : null;
  } catch {
    return null;
  }
}

// The signed-in account: balance and subscription. null when minutes are not enforced
// (then every feature is open) or the server can't be reached.
export async function fetchAccount(): Promise<{ secondsRemaining: number; subscriber: boolean } | null> {
  try {
    const res = await apiFetch('/api/credits', {}, { silent: true });
    if (!res.ok) return null;
    const data = await res.json();
    return data.enabled ? { secondsRemaining: Number(data.secondsRemaining) || 0, subscriber: Boolean(data.subscriber) } : null;
  } catch {
    return null;
  }
}

// Subscriber-only features that run in the browser (downloading clips already heard)
// check here first; the server enforces the same rule on its own endpoints.
export async function requireSubscription(message: string): Promise<boolean> {
  const account = await fetchAccount();
  if (!account || account.subscriber) return true;
  toastOnce(message, 'info', 8000);
  window.dispatchEvent(new CustomEvent(SUBSCRIBE_EVENT));
  return false;
}
