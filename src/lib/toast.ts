export type ToastKind = 'info' | 'success' | 'error';

export interface ToastDetail {
  message: string;
  kind: ToastKind;
}

export const TOAST_EVENT = 'app_toast';

// Fire-and-forget notification, rendered by <Toaster /> (works from non-React code too)
export const toast = (message: string, kind: ToastKind = 'info') => {
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { message, kind } }));
};

const lastShown = new Map<string, number>();

// Same as toast(), but shows a given message at most once per interval
export const toastOnce = (message: string, kind: ToastKind = 'info', intervalMs = 60_000) => {
  const now = Date.now();
  if (now - (lastShown.get(message) ?? 0) < intervalMs) return;
  lastShown.set(message, now);
  toast(message, kind);
};
