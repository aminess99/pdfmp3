// Blog articles. Each one is served at /مقالات/<slug> (server.ts pre-renders the text, meta
// tags and JSON-LD) and listed on the hub at /مقالات. The text of each article lives in
// ./article-texts/<textId>.ts: the server imports them all (./articleTexts.ts), the browser
// loads only the one it shows (lib/articleLoader.ts).
//
// Paragraphs may contain internal links written as [text](/path). Write numbers and symbols
// the way they should be read aloud: the "listen" button narrates the text as it is.

export interface Article {
  slug: string;
  textId: string;
  title: string;
  description: string;
  keywords: string;
  h1: string;
  lead: string;
  category: string;
  // Narrator for the "listen to this article" button
  voiceId: string;
  readMinutes: number;
  publishedAt: string;
  updatedAt: string;
}

export interface ArticleText {
  sections: { heading: string; paragraphs: string[]; steps?: string[] }[];
  faqs: { question: string; answer: string }[];
}

export const ARTICLES_HUB_PATH = `/${encodeURIComponent('مقالات')}`;

export const ARTICLES: Article[] = [
  {
    slug: 'تحويل-كتاب-pdf-الى-كتاب-صوتي',
    textId: 'pdf-to-audiobook',
    title: 'كيف تحوّل كتاب PDF إلى كتاب صوتي بالعربي؟ دليل خطوة بخطوة | Hakawati AI',
    description:
      'دليل عملي لتحويل أي كتاب PDF عربي إلى كتاب صوتي بصوت طبيعي: تجهيز الملف، والكتب المصورة، واختيار الصوت واللهجة، والاستماع فصلاً فصلاً، ونصائح لنطق أدق.',
    keywords:
      'تحويل pdf الى صوت, تحويل كتاب pdf الى كتاب صوتي, تحويل الكتب الى صوت, تحويل pdf الى صوت عربي, قراءة pdf بصوت, تحويل كتاب الى صوت مجانا, كتاب صوتي من pdf',
    h1: 'كيف تحوّل كتاب PDF إلى كتاب صوتي بالعربي؟',
    lead: 'دليل خطوة بخطوة لتحويل أي كتاب عربي بصيغة PDF إلى كتاب صوتي تسمعه في الطريق أو قبل النوم، بصوت طبيعي وبلهجتك المفضلة.',
    category: 'أدلة عملية',
    voiceId: 'khalid_msa',
    readMinutes: 7,
    publishedAt: '2026-11-02',
    updatedAt: '2026-11-02',
  },
];

export const articlePath = (a: Article): string => `${ARTICLES_HUB_PATH}/${encodeURIComponent(a.slug)}`;

function decodePath(pathname: string): string {
  try {
    return decodeURIComponent(pathname).replace(/^\/+|\/+$/g, '');
  } catch {
    return pathname.replace(/^\/+|\/+$/g, '');
  }
}

export const isArticlesHub = (pathname: string): boolean => decodePath(pathname) === 'مقالات';

export function findArticle(pathname: string): Article | undefined {
  const path = decodePath(pathname);
  if (!path.startsWith('مقالات/')) return undefined;
  const slug = path.slice('مقالات/'.length);
  return ARTICLES.find((a) => a.slug === slug);
}

export const ARTICLES_HUB = {
  title: 'مقالات عن الكتب الصوتية وتحويل النص إلى صوت | Hakawati AI',
  description: 'أدلة ونصائح عملية عن تحويل الكتب والنصوص العربية إلى صوت، والاستماع الذكي، والكتب الصوتية، من فريق Hakawati AI.',
  h1: 'المقالات',
  lead: 'أدلة ونصائح عملية عن الكتب الصوتية وتحويل النصوص العربية إلى صوت. ويمكنك الاستماع إلى أي مقالة بدل قراءتها.',
};

// "[text](/path)" -> parts, for React and for the server pre-render
export function splitLinks(text: string): ({ text: string } | { text: string; href: string })[] {
  const parts: ({ text: string } | { text: string; href: string })[] = [];
  const re = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ text: m[1], href: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

// The words a listener hears: links reduced to their text
export const plainText = (text: string): string => splitLinks(text).map((p) => p.text).join('');
