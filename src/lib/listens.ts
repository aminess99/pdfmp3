import { apiFetch } from './apiFetch';
import { LANG } from './i18n';

// Counts a play of a summary's MP3 for the admin dashboard (once per page load; the server
// also counts each visitor once per half hour). Signed-in listeners are sent with their token.
const reported = new Set<string>();

export function reportSummaryPlay(slug: string, preview = false): void {
  const key = `${slug}|${preview}`;
  if (reported.has(key)) return;
  reported.add(key);
  apiFetch(
    '/api/listens/summary',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, lang: LANG, preview }), keepalive: true },
    { silent: true }
  ).catch(() => {});
}
