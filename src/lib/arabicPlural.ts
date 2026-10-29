// Arabic count + noun agreement: 1 and 2 have their own forms, 3–10 take the plural, 11+ the singular
export const pluralAr = (n: number, one: string, two: string, few: string, many: string = one): string => {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
};

export const pagesAr = (n: number) => pluralAr(n, 'صفحة واحدة', 'صفحتان', 'صفحات', 'صفحة');
export const minutesAr = (n: number) => pluralAr(n, 'دقيقة واحدة', 'دقيقتان', 'دقائق', 'دقيقة');
export const chaptersAr = (n: number) => pluralAr(n, 'فصل واحد', 'فصلان', 'فصول', 'فصلاً');
export const wordsAr = (n: number) => pluralAr(n, 'كلمة واحدة', 'كلمتان', 'كلمات', 'كلمة');
