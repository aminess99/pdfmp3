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
  // public/covers/<textId>.webp (page) and .jpg (link previews) exist
  hasCover?: boolean;
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

// Every summary, published or scheduled. Only the audio generator and the cover script read
// this list directly, so a scheduled summary has its audio ready before its day arrives;
// everything the site shows goes through publishedSummaries() below.
export const ALL_SUMMARIES: BookSummary[] = [
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
    hasCover: true,
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
    hasCover: true,
  },
  {
    slug: '48-قانون-للقوة',
    bookTitle: '48 قانوناً للقوة',
    author: 'روبرت غرين',
    category: 'القوة والنفوذ',
    voiceId: 'youssef_msa',
    minutes: 15,
    title: 'ملخص كتاب 48 قانون للقوة صوتي ومكتوب – روبرت غرين | Hakawati AI',
    description:
      'استمع إلى ملخص كتاب 48 قانون للقوة لروبرت غرين بالعربية الفصحى، أو اقرأه مكتوباً: أهم القوانين مجمّعة حسب موضوعها، مع قراءة نقدية لما يفيدك منها وما يجب أن تحذره.',
    keywords:
      'ملخص كتاب 48 قانون للقوة, ملخص كتاب 48 قانون للقوة pdf, 48 قانون للقوة كتاب صوتي, قوانين القوة, روبرت غرين, كيف تمسك بزمام القوة',
    lead: 'أشهر قوانين السلطة والنفوذ من قصص التاريخ: ما الذي نتعلمه منها في الحذر والتوقيت وفهم الناس، وما الذي يجب أن نحذره.',
    publishedAt: '2026-10-30',
    textId: '48-laws-of-power',
    hasCover: true,
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
    hasCover: true,
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
    hasCover: true,
  },
  {
    slug: 'العادات-السبع-للناس-الأكثر-فعالية',
    bookTitle: 'العادات السبع للناس الأكثر فعالية',
    author: 'ستيفن كوفي',
    category: 'تطوير الذات',
    voiceId: 'youssef_msa',
    minutes: 13,
    title: 'ملخص كتاب العادات السبع للناس الأكثر فعالية صوتي ومكتوب – ستيفن كوفي | Hakawati AI',
    description:
      'استمع إلى ملخص كتاب العادات السبع للناس الأكثر فعالية لستيفن كوفي بالعربية الفصحى، أو اقرأه مكتوباً: العادات السبع، ودائرة التأثير، ومصفوفة إدارة الوقت، والحساب العاطفي.',
    keywords:
      'ملخص كتاب العادات السبع للناس الأكثر فعالية, ملخص كتاب العادات السبع pdf, العادات السبع كتاب صوتي, ستيفن كوفي, مصفوفة إدارة الوقت, العادات السبع للمراهقين',
    lead: 'العادات التي تبني شخصية فعالة من الداخل إلى الخارج: من المبادرة وتحديد الوجهة وإدارة الوقت، إلى التعاون والاستماع وتجديد النفس.',
    publishedAt: '2026-10-30',
    textId: 'seven-habits',
    hasCover: true,
  },
  {
    slug: 'فاتتني-صلاة',
    bookTitle: 'فاتتني صلاة',
    author: 'إسلام جمال',
    category: 'ديني',
    voiceId: 'jood_lit',
    minutes: 9,
    title: 'ملخص كتاب فاتتني صلاة صوتي ومكتوب – إسلام جمال | Hakawati AI',
    description:
      'استمع إلى ملخص كتاب فاتتني صلاة لإسلام جمال بالعربية الفصحى، أو اقرأه مكتوباً: لماذا نصلي، ومعاني الصلاة من الأذان إلى التسليم، ونصائح للمحافظة عليها.',
    keywords:
      'ملخص كتاب فاتتني صلاة, ملخص كتاب فاتتني صلاة pdf, فاتتني صلاة كتاب صوتي, إسلام جمال, الخشوع في الصلاة, معاني الصلاة',
    lead: 'رحلة مع الصلاة خطوة خطوة، من الأذان إلى التسليم، لتكتشف معنى ما تقوله وتفعله، وتجد فيها راحة لا عبئاً.',
    publishedAt: '2026-10-30',
    textId: 'missed-prayer',
    hasCover: true,
  },
  {
    slug: 'الأمير-مكيافيلي',
    bookTitle: 'الأمير',
    author: 'نيكولو مكيافيلي',
    category: 'فكر وسياسة',
    voiceId: 'suhaib_doc',
    minutes: 12,
    title: 'ملخص كتاب الأمير لمكيافيلي صوتي ومكتوب | Hakawati AI',
    description:
      'استمع إلى ملخص كتاب الأمير لنيكولو مكيافيلي بالعربية الفصحى، أو اقرأه مكتوباً: أنواع الإمارات، والجيش الخاص، والخوف أم المحبة، والثعلب والأسد، والحظ، مع قراءة نقدية.',
    keywords:
      'ملخص كتاب الأمير, ملخص كتاب الأمير ميكافيلي pdf, كتاب الأمير مكيافيلي, الأمير كتاب صوتي, مكيافيلي, الغاية تبرر الوسيلة',
    lead: 'أشهر كتاب في الفكر السياسي: كيف تُكتسب السلطة وكيف تضيع، كما رآها مكيافيلي في إيطاليا القرن السادس عشر، مع قراءة نقدية.',
    publishedAt: '2026-10-30',
    textId: 'the-prince',
    hasCover: true,
  },
  {
    slug: 'الذكاء-العاطفي',
    bookTitle: 'الذكاء العاطفي',
    author: 'دانيال غولمان',
    category: 'علم النفس',
    voiceId: 'huda_msa',
    minutes: 11,
    title: 'ملخص كتاب الذكاء العاطفي صوتي ومكتوب – دانيال غولمان | Hakawati AI',
    description:
      'استمع إلى ملخص كتاب الذكاء العاطفي لدانيال غولمان بالعربية الفصحى، أو اقرأه مكتوباً: المكونات الخمسة للذكاء العاطفي، والاختطاف العاطفي، وتجربة الحلوى، والذكاء العاطفي في البيت والعمل.',
    keywords:
      'ملخص كتاب الذكاء العاطفي, ملخص كتاب الذكاء العاطفي pdf, الذكاء العاطفي كتاب صوتي, دانيال جولمان, مكونات الذكاء العاطفي',
    lead: 'لماذا لا يكفي الذكاء وحده للنجاح؟ القدرات الخمس التي تساعدك على فهم مشاعرك وإدارتها وفهم الآخرين، وكيف تنميها.',
    publishedAt: '2026-10-30',
    textId: 'emotional-intelligence',
    hasCover: true,
  },
  {
    slug: 'من-جيد-إلى-عظيم',
    bookTitle: 'من جيد إلى عظيم',
    author: 'جيم كولينز',
    category: 'المال والأعمال',
    voiceId: 'khalid_msa',
    minutes: 11,
    title: 'ملخص كتاب من جيد إلى عظيم صوتي ومكتوب – جيم كولينز | Hakawati AI',
    description:
      'استمع إلى ملخص كتاب من جيد إلى عظيم لجيم كولينز بالعربية الفصحى، أو اقرأه مكتوباً: قيادة المستوى الخامس، والأشخاص قبل الاتجاه، ومفارقة ستوكديل، ومفهوم القنفذ، ودولاب الموازنة.',
    keywords:
      'ملخص كتاب من جيد إلى عظيم, ملخص كتاب من جيد إلى عظيم pdf, من جيد إلى عظيم كتاب صوتي, جيم كولينز, قيادة المستوى الخامس, مفهوم القنفذ',
    lead: 'كيف تتحول شركة عادية إلى شركة عظيمة؟ ما وجده بحث استمر سنوات عن الشركات التي حققت هذا التحول، وما يميزها عن غيرها.',
    publishedAt: '2026-10-30',
    textId: 'good-to-great',
    hasCover: true,
  },
  // Scheduled: one new summary a day, going live at 00:00 UTC on its publishedAt date
  {
    slug: 'محاط-بالحمقى',
    bookTitle: 'محاط بالحمقى',
    author: 'توماس إريكسون',
    category: 'علم النفس',
    voiceId: 'khalid_msa',
    minutes: 12,
    title: 'ملخص كتاب محاط بالحمقى صوتي ومكتوب – توماس إريكسون | Hakawati AI',
    description:
      'استمع إلى ملخص كتاب محاط بالحمقى لتوماس إريكسون بالعربية الفصحى، أو اقرأه مكتوباً: الألوان الأربعة للطباع (الأحمر والأصفر والأخضر والأزرق)، وكيف تتفاهم مع كل نمط، ولماذا نرى الآخرين حمقى.',
    keywords:
      'ملخص كتاب محاط بالحمقى, ملخص كتاب محاط بالحمقى pdf, محاط بالحمقى كتاب صوتي, توماس إريكسون, الألوان الأربعة للشخصية, نموذج ديسك, أنماط الشخصية',
    lead: 'هل تشعر أحياناً أن كل من حولك لا يفهمك؟ الألوان الأربعة للطباع عند توماس إريكسون، وكيف تتعامل مع كل لون بدل أن تتعب من الاختلاف.',
    publishedAt: '2026-11-03',
    textId: 'surrounded-by-idiots',
  },
  {
    slug: 'الرجال-من-المريخ-والنساء-من-الزهرة',
    bookTitle: 'الرجال من المريخ والنساء من الزهرة',
    author: 'جون غراي',
    category: 'علم النفس',
    voiceId: 'huda_msa',
    minutes: 11,
    title: 'ملخص كتاب الرجال من المريخ والنساء من الزهرة صوتي ومكتوب – جون غراي | Hakawati AI',
    description:
      'استمع إلى ملخص كتاب الرجال من المريخ والنساء من الزهرة لجون غراي بالعربية الفصحى، أو اقرأه مكتوباً: فكرة الكهف والموجة، واحتياجات كل طرف، وفن التواصل والاعتذار، مع قراءة متوازنة للكتاب.',
    keywords:
      'ملخص كتاب الرجال من المريخ والنساء من الزهرة, ملخص كتاب الرجال من المريخ والنساء من الزهرة pdf, الرجال من المريخ والنساء من الزهرة كتاب صوتي, جون غراي, العلاقة بين الرجل والمرأة, التواصل بين الزوجين',
    lead: 'لماذا يسيء الرجل والمرأة فهم بعضهما رغم الحب؟ أشهر أفكار جون غراي عن الكهف والموجة وطرق التواصل، مع نظرة هادئة إلى حدودها.',
    publishedAt: '2026-11-04',
    textId: 'men-from-mars-women-from-venus',
  },
  {
    slug: 'الداء-والدواء',
    bookTitle: 'الداء والدواء',
    author: 'ابن قيم الجوزية',
    category: 'ديني',
    voiceId: 'suhaib_doc',
    minutes: 13,
    title: 'ملخص كتاب الداء والدواء صوتي ومكتوب – ابن قيم الجوزية | Hakawati AI',
    description:
      'استمع إلى ملخص كتاب الداء والدواء (الجواب الكافي) لابن قيم الجوزية بالعربية الفصحى، أو اقرأه مكتوباً: الدعاء والقدر، وآثار الذنوب، والتوبة والاستغفار، وحفظ النظر واللسان والقلب، وخطر تعلق القلب.',
    keywords:
      'ملخص كتاب الداء والدواء, ملخص كتاب الداء والدواء pdf, الداء والدواء كتاب صوتي, الجواب الكافي لمن سأل عن الدواء الشافي, ابن القيم, آثار الذنوب, التوبة والاستغفار',
    lead: 'ما أثر الذنوب في القلب والحياة، وما الدواء؟ أهم ما في كتاب ابن القيم عن الدعاء والقدر والتوبة وحفظ الجوارح، ورسالته في عدم اليأس.',
    publishedAt: '2026-11-05',
    textId: 'al-daa-wal-dawaa',
  },
  {
    slug: 'قوة-عقلك-الباطن',
    bookTitle: 'قوة عقلك الباطن',
    author: 'جوزيف مورفي',
    category: 'تطوير الذات',
    voiceId: 'fatima_msa',
    minutes: 11,
    title: 'ملخص كتاب قوة عقلك الباطن صوتي ومكتوب – جوزيف مورفي | Hakawati AI',
    description:
      'استمع إلى ملخص كتاب قوة عقلك الباطن لجوزيف مورفي بالعربية الفصحى، أو اقرأه مكتوباً: العقل الواعي والباطن، والتوكيدات، والتخيل، وتقنية ما قبل النوم، والمسامحة، مع نظرة متوازنة إلى حدود الكتاب.',
    keywords:
      'ملخص كتاب قوة عقلك الباطن, ملخص كتاب قوة عقلك الباطن pdf, قوة عقلك الباطن كتاب صوتي, جوزيف مورفي, العقل الباطن, التوكيدات الإيجابية, التفكير الإيجابي',
    lead: 'كيف تؤثر أفكارك المتكررة في حياتك؟ أهم تقنيات جوزيف مورفي لتوجيه العقل الباطن، وما يصلح منها وما يحتاج إلى حذر.',
    publishedAt: '2026-11-06',
    textId: 'power-of-your-subconscious-mind',
  },
  {
    slug: 'كيف-تكسب-الأصدقاء',
    bookTitle: 'كيف تكسب الأصدقاء',
    author: 'ديل كارنيجي',
    category: 'تطوير الذات',
    voiceId: 'youssef_msa',
    minutes: 12,
    title: 'ملخص كتاب كيف تكسب الأصدقاء صوتي ومكتوب – ديل كارنيجي | Hakawati AI',
    description:
      'استمع إلى ملخص كتاب كيف تكسب الأصدقاء وتؤثر في الناس لديل كارنيجي بالعربية الفصحى، أو اقرأه مكتوباً: ست طرق ليحبك الناس، وطرق الإقناع دون جدال، ومبادئ القيادة دون إثارة الاستياء.',
    keywords:
      'ملخص كتاب كيف تكسب الأصدقاء, ملخص كتاب كيف تكسب الأصدقاء pdf, كيف تكسب الأصدقاء وتؤثر في الناس, كيف تكسب الأصدقاء كتاب صوتي, ديل كارنيجي, مهارات التواصل, فن التعامل مع الناس',
    lead: 'ما الذي يجعل الناس يحبونك ويثقون بك؟ مبادئ ديل كارنيجي الأربعة في التعامل مع الناس، من الاهتمام الصادق إلى تجنب الجدال.',
    publishedAt: '2026-11-07',
    textId: 'how-to-win-friends',
  },
];

// A summary goes live on its publishedAt date (UTC). Before that it is invisible: no page
// (findSummary answers undefined, so the route 404s), no hub entry, no sitemap line,
// and its book shows under "coming soon". Moving a date earlier or later reschedules it.
export const todayIso = (now: Date = new Date()): string => now.toISOString().slice(0, 10);
export const isPublished = (s: BookSummary, now: Date = new Date()): boolean => s.publishedAt <= todayIso(now);
export const publishedSummaries = (now: Date = new Date()): BookSummary[] => ALL_SUMMARIES.filter((s) => isPublished(s, now));

// What the browser shows: fixed when the page loads, which is fine for a visit. The long-lived
// server calls publishedSummaries() again whenever the date changes (see server.ts).
export const BOOK_SUMMARIES: BookSummary[] = publishedSummaries();

export const summaryPath = (s: BookSummary): string => `/${encodeURIComponent(SUMMARY_PREFIX + s.slug)}`;

export const summaryCoverUrl = (s: BookSummary, format: 'webp' | 'jpg' = 'webp'): string => `/covers/${s.textId}.${format}`;
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
  return publishedSummaries().find((s) => s.slug === slug);
}

export const isSummariesHub = (pathname: string): boolean => decodePath(pathname) === 'ملخصات-كتب-صوتية';

// Next on the list (chosen by Arabic search demand); listed on the hub as "coming soon".
// Scheduled summaries stay here until their day arrives.
const UPCOMING_TITLES: string[] = [
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
  'الداء والدواء',
  'قوة عقلك الباطن',
  'كيف تكسب الأصدقاء',
];

export const upcomingSummaries = (now: Date = new Date()): string[] => {
  const published = publishedSummaries(now);
  return UPCOMING_TITLES.filter((t) => !published.some((s) => s.bookTitle === t));
};

export const UPCOMING_SUMMARIES: string[] = upcomingSummaries();

export const SUMMARIES_HUB = {
  title: 'ملخصات كتب صوتية مجانية بالعربي | Hakawati AI',
  description:
    'استمع مجاناً إلى ملخصات صوتية لأشهر الكتب بالعربية الفصحى، كل ملخص في ربع ساعة تقريباً مع النص مكتوباً: تطوير الذات، والمال، وعلم النفس، والفكر.',
  keywords: 'ملخصات كتب صوتية, ملخص كتاب صوتي, ملخصات كتب, ملخصات كتب مسموعة, كتب صوتية مجانية, ملخص كتاب pdf',
  h1: 'ملخصات كتب صوتية',
  lead: 'أهم أفكار الكتب الأكثر قراءة في ربع ساعة، بصوت عربي فصيح. استمع مجاناً، أو اقرأ الملخص مكتوباً، أو حمّله لتسمعه بدون إنترنت.',
};
