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
    title: 'تحويل كتاب PDF إلى كتاب صوتي بالعربي: دليل عملي | Hakawati AI',
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
  {
    slug: 'تعليق-صوتي-بالذكاء-الاصطناعي',
    textId: 'ai-voiceover',
    title: 'تعليق صوتي بالذكاء الاصطناعي بالعربي مجاناً | Hakawati AI',
    description:
      'كيف تصنع تعليقاً صوتياً احترافياً بالعربية بالذكاء الاصطناعي لفيديوهات يوتيوب والريلز والإعلانات: خطوة بخطوة، والفصحى أم اللهجة، وكتابة النص للأذن، وأخطاء تجعل الصوت آلياً.',
    keywords:
      'تعليق صوتي بالذكاء الاصطناعي, تعليق صوتي بالذكاء الاصطناعي مجاني, تعليق صوتي بالذكاء الاصطناعي عربي, تعليق صوتي احترافي, توليد صوت بالذكاء الاصطناعي, موقع تعليق صوتي مجاني',
    h1: 'تعليق صوتي بالذكاء الاصطناعي بالعربي: دليل لصناع المحتوى',
    lead: 'اصنع تعليقاً صوتياً احترافياً لفيديوهاتك وإعلاناتك خلال دقائق، بالفصحى أو بلهجة جمهورك، دون ميكروفون أو استوديو.',
    category: 'أدلة عملية',
    voiceId: 'youssef_msa',
    readMinutes: 6,
    publishedAt: '2026-11-07',
    updatedAt: '2026-11-07',
  },
  {
    slug: 'صوت-ذكاء-اصطناعي-عربي',
    textId: 'natural-arabic-ai-voice',
    title: 'صوت ذكاء اصطناعي عربي طبيعي يشبه البشر | Hakawati AI',
    description:
      'كيف تحوّل النص إلى صوت عربي بشري طبيعي بالذكاء الاصطناعي: ما الذي يجعل الصوت طبيعياً، ولماذا تخطئ بعض الأدوات في العربية، وكيف تختار الصوت واللهجة، وخطوات التجربة مجاناً.',
    keywords:
      'صوت ذكاء اصطناعي عربي, تحويل النص إلى صوت بشري, تحويل النص إلى صوت بالذكاء الاصطناعي عربي, صوت ذكاء اصطناعي مجاني, صوت ذكاء اصطناعي سعودي, تحويل نص إلى صوت بالذكاء الاصطناعي مجانا',
    h1: 'صوت ذكاء اصطناعي عربي طبيعي: كيف تحصل على صوت يشبه البشر؟',
    lead: 'الأصوات العربية بالذكاء الاصطناعي لم تعد آلية. تعرّف إلى ما يجعل الصوت طبيعياً، وكيف تختار الصوت واللهجة المناسبين لكتابك أو فيديوك.',
    category: 'أدلة عملية',
    voiceId: 'fatima_msa',
    readMinutes: 6,
    publishedAt: '2026-11-07',
    updatedAt: '2026-11-07',
  },
  {
    slug: 'كتب-صوتية-عربية-مجانية',
    textId: 'free-arabic-audiobooks',
    title: 'كتب صوتية عربية مجانية: أين تجدها؟ | Hakawati AI',
    description:
      'أين تجد كتباً صوتية عربية مجانية؟ ملخصات الكتب الصوتية، وتحويل كتبك PDF إلى صوت، ومنصات الكتب الصوتية، ويوتيوب والبودكاست، والكتب التراثية، ونصائح للاستفادة من الاستماع.',
    keywords:
      'كتب صوتية, كتب صوتية مجانية, كتب صوتية عربية, أفضل تطبيق كتب صوتية مجاني, ملخصات كتب صوتية مجانية, تحميل كتب صوتية',
    h1: 'كتب صوتية عربية مجانية: أين تجدها وكيف تستفيد منها؟',
    lead: 'خمس طرق لتسمع الكتب بالعربية مجاناً أو بتكلفة قليلة، من الملخصات الصوتية إلى تحويل كتبك الخاصة إلى صوت.',
    category: 'الكتب الصوتية',
    voiceId: 'khalid_msa',
    readMinutes: 5,
    publishedAt: '2026-11-07',
    updatedAt: '2026-11-07',
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
