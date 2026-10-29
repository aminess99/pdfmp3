// The site language comes from the URL: /en/... is English (LTR), everything else Arabic (RTL).
// It is fixed for the page load, so a plain module constant is enough.
export type Lang = 'ar' | 'en';

export const LANG: Lang = typeof window !== 'undefined' && /^\/en(\/|$)/.test(window.location.pathname) ? 'en' : 'ar';
export const isEn = LANG === 'en';
export const DIR: 'rtl' | 'ltr' = isEn ? 'ltr' : 'rtl';

// Inline translation: tr('عربي', 'English')
export const tr = (ar: string, en: string): string => (isEn ? en : ar);

// Home of the current language, and the same page in the other language
export const HOME_PATH = isEn ? '/en' : '/';
export const OTHER_LANG_PATH = isEn ? '/' : '/en';
