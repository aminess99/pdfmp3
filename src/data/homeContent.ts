// Home page copy shared by the React components and the server pre-render (server.ts),
// so what search engines read in the raw HTML matches what visitors see.
import { FAQS } from './sampleBooks';
import { LANG, Lang } from '../lib/i18n';
import { VOICE_COUNT, DIALECT_COUNT } from './voices';

interface HomeContent {
  h1: string;
  subtitle: string;
  steps: { title: string; text: string }[];
  useCases: { title: string; text: string }[];
  sections: { heading: string; paragraphs: string[] }[];
  faqs: { question: string; answer: string }[];
}

export const HOME_CONTENT: Record<Lang, HomeContent> = {
  ar: {
    h1: 'حوّل أي نص أو كتاب إلى صوت طبيعي',
    subtitle: `${VOICE_COUNT} صوتاً · ${DIALECT_COUNT} لهجة عربية · جرّب مجاناً`,
    steps: [
      { title: 'ارفع الكتاب أو الصق النص', text: 'PDF أو ePub أو أي نص عربي.' },
      { title: 'اختر الصوت واللهجة', text: 'اسمع العينة قبل أن تقرر.' },
      { title: 'استمع أو حمّل', text: 'مقسّماً إلى فصول، مع ملخص عند الطلب.' },
    ],
    useCases: [
      { title: 'الطلاب', text: 'حوّل المقررات والملخصات إلى صوت وراجع دروسك وأنت في الطريق.' },
      { title: 'صناع المحتوى', text: 'تعليق صوتي لمقاطعك بلهجة جمهورك: سعودي، مصري، مغربي وغيرها.' },
      { title: 'المشغولون', text: 'اسمع الكتب التي لا تجد وقتاً لقراءتها، أثناء القيادة أو الرياضة.' },
    ],
    sections: [
      {
        heading: 'تحويل PDF إلى صوت بالعربي',
        paragraphs: [
          'Hakawati AI أداة عربية لتحويل ملفات PDF والكتب الإلكترونية والنصوص إلى صوت طبيعي بالذكاء الاصطناعي. ارفع الكتاب أو الصق النص، اختر القارئ واللهجة، وابدأ الاستماع خلال ثوانٍ من المتصفح مباشرة دون تثبيت أي برنامج.',
          'صُمّم الموقع للنص العربي تحديداً: يتعامل مع الحروف المتصلة والتشكيل وعلامات الترقيم العربية، ويقرأ النص بوقفات طبيعية بدلاً من الصوت الآلي الرتيب الذي تسمعه في برامج القراءة التقليدية.',
        ],
      },
      {
        heading: `${VOICE_COUNT} صوتاً و${DIALECT_COUNT} لهجة عربية`,
        paragraphs: [
          'لكل لهجة أربعة أصوات مختلفة، قارئان وقارئتان: الفصحى، والسعودية، والحجازية، والإماراتية، والكويتية، والقطرية، والبحرينية، والعمانية، والسورية، واللبنانية، والفلسطينية، والأردنية، والعراقية، واليمنية، والمصرية، والسودانية، والمغربية (الدارجة)، والجزائرية، والتونسية، والليبية، والحسانية الموريتانية، إضافة إلى صوتين متخصصين في الأدب العربي والوثائقيات.',
          'يمكنك سماع عينة قصيرة لكل صوت قبل التحويل، واختيار الصوت الأقرب لنوع الكتاب: نبرة رصينة للكتب الفكرية والتاريخية، أو نبرة دافئة للروايات وقصص الأطفال، أو إلقاء حيوي للمحتوى التسويقي.',
        ],
      },
      {
        heading: 'ماذا يحدث لكتابك بعد رفعه؟',
        paragraphs: [
          'يستخرج الموقع النص من ملف PDF أو ePub ويحذف ما لا يُقرأ عادةً مثل أرقام الصفحات والفهارس والروابط، ثم يقسّم الكتاب إلى فصول بالاعتماد على عناوينه مثل "الفصل الأول" و"الباب الثاني"، فتنتقل بين الفصول كما تفعل في الكتاب الورقي.',
          'إذا كان الكتاب مصوّراً أو ممسوحاً ضوئياً، يمكنك تشغيل المسح العميق (OCR) ليقرأ الذكاء الاصطناعي الصفحات المصورة ويحوّلها إلى نص قبل تحويلها إلى صوت.',
          'وقبل التحويل تختار ما تريد سماعه: الكتاب كاملاً، أو فصلاً واحداً منه، أو ملخصاً في دقائق، أو أهم النقاط فقط.',
        ],
      },
      {
        heading: 'استوديو استماع مصمّم للكتب الطويلة',
        paragraphs: [
          'يحفظ الاستوديو مكان توقفك في كل كتاب لتكمل من حيث انتهيت، ويتيح لك تغيير سرعة القراءة، وضبط مؤقت للنوم، والانتقال تلقائياً إلى الفصل التالي.',
          'وفيه أيضاً ملخص لكل فصل، واستخراج لأهم النقاط، وخانة لتسأل الكتاب عن أي فكرة فيه. وعندما تريد الاستماع بدون إنترنت، حمّل الفصل أو الكتاب كاملاً كملف صوتي.',
        ],
      },
    ],
    faqs: FAQS,
  },
  en: {
    h1: 'Turn Arabic text and books into natural speech',
    subtitle: `${VOICE_COUNT} voices · ${DIALECT_COUNT} Arabic dialects · Try it free`,
    steps: [
      { title: 'Upload a book or paste text', text: 'PDF, ePub or any Arabic text.' },
      { title: 'Pick a voice and dialect', text: 'Hear a sample before you decide.' },
      { title: 'Listen or download', text: 'Split into chapters, with a summary on request.' },
    ],
    useCases: [
      { title: 'Arabic learners', text: 'Hear real Arabic read naturally, in Modern Standard Arabic or a spoken dialect.' },
      { title: 'Content creators', text: 'Arabic voiceovers in your audience’s dialect: Saudi, Egyptian, Moroccan and more.' },
      { title: 'Busy readers', text: 'Listen to the Arabic books you never find time to read, while driving or working out.' },
    ],
    sections: [
      {
        heading: 'Arabic PDF to audiobook',
        paragraphs: [
          'Hakawati AI turns Arabic PDFs, e-books and text into natural-sounding speech with AI. Upload a book or paste text, pick a narrator and dialect, and start listening within seconds, right in your browser with nothing to install.',
          'It is built specifically for Arabic: it handles connected letters, diacritics (tashkeel) and Arabic punctuation, and reads with natural pauses instead of the flat robotic voice of older screen readers.',
        ],
      },
      {
        heading: `${VOICE_COUNT} voices in ${DIALECT_COUNT} Arabic dialects`,
        paragraphs: [
          'Each dialect has four different voices, two male and two female: Modern Standard Arabic, Saudi, Hijazi, Emirati, Kuwaiti, Qatari, Bahraini, Omani, Syrian, Lebanese, Palestinian, Jordanian, Iraqi, Yemeni, Egyptian, Sudanese, Moroccan Darija, Algerian, Tunisian, Libyan and Hassaniya (Mauritania), plus two voices specialised in Arabic literature and documentaries.',
          'Play a short sample of any voice before converting, and choose the one that fits the book: a measured tone for history and ideas, a warm one for novels and children’s stories, or a lively delivery for marketing content.',
        ],
      },
      {
        heading: 'What happens after you upload a book',
        paragraphs: [
          'The text is extracted from the PDF or ePub and cleaned of things you would not read aloud, such as page numbers, tables of contents and links. The book is then split into chapters using its own headings, so you can move between chapters like in a printed book.',
          'For scanned books, run the deep scan (OCR) and the AI will read the page images and turn them into text before converting them to speech.',
          'Before converting, choose what you want to hear: the whole book, a single chapter, a summary in minutes, or just the key points.',
        ],
      },
      {
        heading: 'A listening studio made for long books',
        paragraphs: [
          'The studio remembers where you stopped in every book, and lets you change the reading speed, set a sleep timer and move on to the next chapter automatically.',
          'It also gives you a summary of each chapter, the key points, and a box to ask the book about any idea in it. To listen offline, download a chapter or the whole book as an audio file.',
        ],
      },
    ],
    faqs: [
      {
        question: 'How do I convert Arabic text to speech for free?',
        answer: 'Paste text or upload a PDF or ePub, pick a narrator and dialect, then press convert. You get 30 free minutes when you sign up, with no credit card.',
      },
      {
        question: 'Can I get Saudi, Egyptian or Moroccan Arabic, not just standard Arabic?',
        answer: `Yes. Besides Modern Standard Arabic there are ${DIALECT_COUNT - 1} dialects: Saudi, Hijazi, Emirati, Kuwaiti, Qatari, Bahraini, Omani, Syrian, Lebanese, Palestinian, Jordanian, Iraqi, Yemeni, Egyptian, Sudanese, Moroccan Darija, Algerian, Tunisian, Libyan and Hassaniya (Mauritania), each with four voices.`,
      },
      {
        question: 'Does it read English text too?',
        answer: 'The voices are tuned for Arabic. They can read short English words and names inside Arabic text, but the site is not meant for converting English books.',
      },
      {
        question: 'How are minutes counted?',
        answer: 'Minutes are based on the number of words and the estimated listening time, about 130 words per minute for natural Arabic narration.',
      },
      {
        question: 'Does it split a book into chapters automatically?',
        answer: 'Yes. It detects the book’s own chapter headings and splits it accordingly, and you can choose to convert a single chapter.',
      },
      {
        question: 'Which audio formats can I download?',
        answer: 'You can download chapters as audio files (MP3 or WAV) that play on any device.',
      },
    ],
  },
};

// The current page language (client); the server picks a language explicitly
const current = HOME_CONTENT[LANG];
export const HOME_H1 = current.h1;
export const HOME_SUBTITLE = current.subtitle;
export const HOW_STEPS = current.steps;
export const USE_CASES = current.useCases;
export const HOME_SECTIONS = current.sections;
export const HOME_FAQS = current.faqs;

// Head tags for the home page in each language (server.ts)
export const HOME_SEO: Record<Lang, { title: string; description: string; keywords: string; ogLocale: string }> = {
  ar: {
    title: 'تحويل النص وكتب PDF إلى صوت بالذكاء الاصطناعي | Hakawati AI',
    description:
      `تحويل النص والكتابة وملفات PDF إلى صوت بالذكاء الاصطناعي. أنشئ كتباً صوتية مسموعة بـ${VOICE_COUNT} صوتاً طبيعياً و${DIALECT_COUNT} لهجة عربية (سعودي، مصري، مغربي، لبناني...) وجرّب مجاناً.`,
    keywords:
      'تحويل النص الى صوت, تحويل الكتابة الى صوت, تحويل النص الى صوت بالذكاء الاصطناعي, تحويل النص الى صوت مجانا, تحويل pdf الى صوت, كتب صوتية, كتب صوتية مجانية, ملخصات كتب صوتية, تحويل النص الى صوت سعودي, تحويل النص الى صوت عربي, قارئ كتب صوتية',
    ogLocale: 'ar_AR',
  },
  en: {
    title: 'Arabic Text to Speech & PDF to Audiobook AI | Hakawati AI',
    description:
      `Turn Arabic text, PDFs and e-books into natural speech with AI. ${VOICE_COUNT} voices in ${DIALECT_COUNT} Arabic dialects, including Saudi, Egyptian, Moroccan, Lebanese and MSA. Listen online or download, free to try.`,
    keywords:
      'arabic text to speech, arabic tts, arabic pdf to audio, arabic audiobook, arabic voice generator, egyptian arabic text to speech, saudi arabic text to speech, moroccan darija text to speech',
    ogLocale: 'en_US',
  },
};
