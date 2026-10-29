import { isEn } from './i18n';

// Arabic count + noun agreement: 1 and 2 have their own forms, 3–10 take the plural, 11+ the singular
export const pluralAr = (n: number, one: string, two: string, few: string, many: string = one): string => {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
};

const pluralEn = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const pagesAr = (n: number) => (isEn ? pluralEn(n, 'page', 'pages') : pluralAr(n, 'صفحة واحدة', 'صفحتان', 'صفحات', 'صفحة'));
export const minutesAr = (n: number) => (isEn ? pluralEn(n, 'minute', 'minutes') : pluralAr(n, 'دقيقة واحدة', 'دقيقتان', 'دقائق', 'دقيقة'));
export const chaptersAr = (n: number) => (isEn ? pluralEn(n, 'chapter', 'chapters') : pluralAr(n, 'فصل واحد', 'فصلان', 'فصول', 'فصلاً'));
export const wordsAr = (n: number) => (isEn ? pluralEn(n, 'word', 'words') : pluralAr(n, 'كلمة واحدة', 'كلمتان', 'كلمات', 'كلمة'));
