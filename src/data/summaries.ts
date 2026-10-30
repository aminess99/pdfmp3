// Audio book summaries. Each one is served at /ملخص-كتاب-<slug> (server.ts pre-renders
// the text, meta tags and JSON-LD), and the hub lists them all at /ملخصات-كتب-صوتية.
//
// Each text (./summary-texts/<textId>.ts) doubles as the narration script:
// scripts/generate-summary-audio.ts reads it in order (heading, then paragraphs) and saves
// public/summaries/<slug>.mp3 plus <slug>.json with the start time of every section, so the
// page can jump between them. Write numbers out in words and avoid symbols in the texts,
// since they are read aloud verbatim.

export interface BookSummary {
  slug: string;
  bookTitle: string;
  author: string;
  category: string;
  voiceId: string;
  // Planned listening time, shown until the audio manifest gives the real one
  minutes: number;
  title: string;
  description: string;
  keywords: string;
  // One or two sentences under the title
  lead: string;
  publishedAt: string;
  // File name of the text in ./summary-texts/ (Latin, so it is safe everywhere)
  textId: string;
}

// The long part, kept out of the main bundle: server.ts and the generator import every
// text through ./summaryTexts.ts, the browser loads only the one it shows (lib/summaryLoader.ts)
export interface SummaryText {
  sections: { heading: string; paragraphs: string[] }[];
  faqs: { question: string; answer: string }[];
}

// Written by the server-side generator next to each MP3
export interface SummaryAudioManifest {
  hash: string;
  duration: number;
  sections: number[];
}

export const SUMMARIES_HUB_PATH = `/${encodeURIComponent('ملخصات-كتب-صوتية')}`;
const SUMMARY_PREFIX = 'ملخص-كتاب-';

export const BOOK_SUMMARIES: BookSummary[] = [
  {
    slug: 'العادات-الذرية',
    bookTitle: 'العادات الذرية',
    author: 'جيمس كلير',
    category: 'تطوير الذات',
    voiceId: 'khalid_msa',
    minutes: 19,
    title: 'ملخص كتاب العادات الذرية صوتي ومكتوب – جيمس كلير | Hakawati AI',
    description:
      'استمع إلى ملخص كتاب العادات الذرية لجيمس كلير في أقل من عشرين دقيقة بالعربية الفصحى، أو اقرأه مكتوباً: قاعدة الواحد بالمئة، والعادات المبنية على الهوية، والقوانين الأربعة لتغيير السلوك، وقاعدة الدقيقتين.',
    keywords:
      'ملخص كتاب العادات الذرية, ملخص كتاب العادات الذرية pdf, العادات الذرية كتاب صوتي, ملخص العادات الذرية صوتي, كتاب العادات الذرية, جيمس كلير, القوانين الأربعة لتغيير السلوك, قاعدة الدقيقتين',
    lead: 'كيف تصنع التغييرات الصغيرة جداً نتائج كبيرة؟ أهم أفكار الكتاب في أقل من عشرين دقيقة: من قاعدة الواحد بالمئة إلى القوانين الأربعة لبناء العادات الجيدة والتخلص من السيئة.',
    publishedAt: '2026-10-30',
    textId: 'atomic-habits',
  },
  {
    slug: 'أبي-الذي-أكره',
    bookTitle: 'أبي الذي أكره',
    author: 'عماد رشاد عثمان',
    category: 'علم النفس',
    voiceId: 'huda_msa',
    minutes: 14,
    title: 'ملخص كتاب أبي الذي أكره صوتي ومكتوب – عماد رشاد عثمان | Hakawati AI',
    description:
      'استمع إلى ملخص كتاب أبي الذي أكره للدكتور عماد رشاد عثمان بالعربية الفصحى، أو اقرأه مكتوباً: أشكال الأذى الأسري، وأثر جروح الطفولة، ومراحل التعافي، والحدود والمسامحة.',
    keywords:
      'ملخص كتاب أبي الذي أكره, ملخص كتاب أبي الذي أكره pdf, أبي الذي أكره كتاب صوتي, عماد رشاد عثمان, جروح الطفولة, الأذى الأسري, التعافي النفسي',
    lead: 'حين يجتمع الحب والألم تجاه الوالدين: كيف تفهم جروح الطفولة دون أن تتهم أحداً، وكيف تبدأ رحلة التعافي وتضع حدوداً صحية.',
    publishedAt: '2026-10-30',
    textId: 'my-father-whom-i-hate',
  },
  {
    slug: '48-قانون-للقوة',
    bookTitle: '48 قانوناً للقوة',
    author: 'روبرت غرين',
    category: 'القوة والنفوذ',
    voiceId: 'youssef_msa',
    minutes: 14,
    title: 'ملخص كتاب 48 قانون للقوة صوتي ومكتوب – روبرت غرين | Hakawati AI',
    description:
      'استمع إلى ملخص كتاب 48 قانون للقوة لروبرت غرين بالعربية الفصحى، أو اقرأه مكتوباً: أهم القوانين مجمّعة حسب موضوعها، مع قراءة نقدية لما يفيدك منها وما يجب أن تحذره.',
    keywords:
      'ملخص كتاب 48 قانون للقوة, ملخص كتاب 48 قانون للقوة pdf, 48 قانون للقوة كتاب صوتي, قوانين القوة, روبرت غرين, كيف تمسك بزمام القوة',
    lead: 'أشهر قوانين السلطة والنفوذ من قصص التاريخ: ما الذي نتعلمه منها في الحذر والتوقيت وفهم الناس، وما الذي يجب أن نحذره.',
    publishedAt: '2026-10-30',
    textId: '48-laws-of-power',
  },
  {
    slug: 'فن-اللامبالاة',
    bookTitle: 'فن اللامبالاة',
    author: 'مارك مانسون',
    category: 'تطوير الذات',
    voiceId: 'khalid_msa',
    minutes: 13,
    title: 'ملخص كتاب فن اللامبالاة صوتي ومكتوب – مارك مانسون | Hakawati AI',
    description:
      'استمع إلى ملخص كتاب فن اللامبالاة لمارك مانسون بالعربية الفصحى، أو اقرأه مكتوباً: لماذا تجعلك مطاردة السعادة تعيساً، والألم الذي تختاره، والقيم الجيدة والسيئة، والمسؤولية.',
    keywords:
      'ملخص كتاب فن اللامبالاة, ملخص كتاب فن اللامبالاة pdf, فن اللامبالاة كتاب صوتي, ملخص كتاب فن اللامبالاة صوتي, مارك مانسون',
    lead: 'ليست دعوة إلى ألا تهتم بشيء، بل إلى أن تختار بحكمة ما يستحق اهتمامك، وتتقبل أن الألم والمشكلات جزء من الحياة.',
    publishedAt: '2026-10-30',
    textId: 'subtle-art',
  },
  {
    slug: 'الأب-الغني-والأب-الفقير',
    bookTitle: 'الأب الغني والأب الفقير',
    author: 'روبرت كيوساكي',
    category: 'المال والأعمال',
    voiceId: 'fatima_msa',
    minutes: 12,
    title: 'ملخص كتاب الأب الغني والأب الفقير صوتي ومكتوب – روبرت كيوساكي | Hakawati AI',
    description:
      'استمع إلى ملخص كتاب الأب الغني والأب الفقير لروبرت كيوساكي بالعربية الفصحى، أو اقرأه مكتوباً: الفرق بين الأصل والالتزام، وسباق الفئران، وادفع لنفسك أولاً، والذكاء المالي.',
    keywords:
      'ملخص كتاب الأب الغني والأب الفقير, ملخص كتاب الأب الغني والأب الفقير pdf, الأب الغني والأب الفقير كتاب صوتي, روبرت كيوساكي, الثقافة المالية, الأصول والالتزامات',
    lead: 'دروس الثقافة المالية التي غيّرت تفكير الملايين: لماذا لا يعمل الأغنياء من أجل المال، وما الفرق بين الأصل والالتزام، وكيف تبدأ.',
    publishedAt: '2026-10-30',
    textId: 'rich-dad-poor-dad',
  },
];

export const summaryPath = (s: BookSummary): string => `/${encodeURIComponent(SUMMARY_PREFIX + s.slug)}`;

export const summaryAudioUrl = (s: BookSummary): string => `/summaries/${encodeURIComponent(s.slug)}.mp3`;
export const summaryManifestUrl = (s: BookSummary): string => `/summaries/${encodeURIComponent(s.slug)}.json`;

function decodePath(pathname: string): string {
  try {
    return decodeURIComponent(pathname).replace(/^\/+|\/+$/g, '');
  } catch {
    return pathname.replace(/^\/+|\/+$/g, '');
  }
}

export function findSummary(pathname: string): BookSummary | undefined {
  const path = decodePath(pathname);
  if (!path.startsWith(SUMMARY_PREFIX)) return undefined;
  const slug = path.slice(SUMMARY_PREFIX.length);
  return BOOK_SUMMARIES.find((s) => s.slug === slug);
}

export const isSummariesHub = (pathname: string): boolean => decodePath(pathname) === 'ملخصات-كتب-صوتية';

// Next on the list (chosen by Arabic search demand); listed on the hub as "coming soon"
export const UPCOMING_SUMMARIES: string[] = [
  'أبي الذي أكره',
  '48 قانوناً للقوة',
  'فن اللامبالاة',
  'الأب الغني والأب الفقير',
  'العادات السبع للناس الأكثر فعالية',
  'فاتتني صلاة',
  'الأمير',
  'جلسات نفسية',
  'أربعون',
  'محاط بالحمقى',
  'المرحلة الملكية',
  'ممتلئ بالفراغ',
  'الرجال من المريخ والنساء من الزهرة',
  'عقدك النفسية سجنك الأبدي',
  'لأنك الله',
  'نظرية الفستق',
  'زاد المعاد',
  'الذكاء العاطفي',
  'من جيد إلى عظيم',
].filter((t) => !BOOK_SUMMARIES.some((s) => s.bookTitle === t));

export const SUMMARIES_HUB = {
  title: 'ملخصات كتب صوتية مجانية بالعربي | Hakawati AI',
  description:
    'استمع مجاناً إلى ملخصات صوتية لأشهر الكتب بالعربية الفصحى، كل ملخص في ربع ساعة تقريباً مع النص مكتوباً: تطوير الذات، والمال، وعلم النفس، والفكر.',
  keywords: 'ملخصات كتب صوتية, ملخص كتاب صوتي, ملخصات كتب, ملخصات كتب مسموعة, كتب صوتية مجانية, ملخص كتاب pdf',
  h1: 'ملخصات كتب صوتية',
  lead: 'أهم أفكار الكتب الأكثر قراءة في ربع ساعة، بصوت عربي فصيح. استمع مجاناً، أو اقرأ الملخص مكتوباً، أو حمّله لتسمعه بدون إنترنت.',
};
