// Writes the English text of every book summary that has none yet:
//   src/data/summary-texts/en/<textId>.ts   (same sections, paragraphs and FAQs as the Arabic)
// The Arabic texts are the site's own; this renders them in natural English for an
// audiobook narrator. The metadata (titles, slugs, descriptions) is written by hand in
// src/data/summariesEn.ts.
//
//   OPENROUTER_API_KEY=sk-or-v1-... npx tsx scripts/translate-summaries.ts [--force] [textId...]
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { ALL_SUMMARIES, SummaryText } from '../src/data/summaries';
import { SUMMARY_TEXTS } from '../src/data/summaryTexts';

dotenv.config();

const MODEL = process.env.TRANSLATE_MODEL || 'google/gemini-2.5-flash';
const OUT_DIR = path.join(process.cwd(), 'src', 'data', 'summary-texts', 'en');
const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));

// How each book is known in English (published English title, or a translated Arabic one)
const ENGLISH_TITLES: Record<string, string> = {
  'atomic-habits': 'Atomic Habits by James Clear',
  'my-father-whom-i-hate': '"My Father Whom I Hate" (Abi Alladhi Akrah) by Imad Rashad Othman',
  '48-laws-of-power': 'The 48 Laws of Power by Robert Greene',
  'subtle-art': 'The Subtle Art of Not Giving a F*ck by Mark Manson',
  'rich-dad-poor-dad': 'Rich Dad Poor Dad by Robert Kiyosaki',
  'seven-habits': 'The 7 Habits of Highly Effective People by Stephen R. Covey',
  'missed-prayer': '"I Missed a Prayer" (Fatatni Salah) by Islam Gamal',
  'the-prince': 'The Prince by Niccolò Machiavelli',
  'emotional-intelligence': 'Emotional Intelligence by Daniel Goleman',
  'good-to-great': 'Good to Great by Jim Collins',
  'surrounded-by-idiots': 'Surrounded by Idiots by Thomas Erikson',
  'men-mars-women-venus': 'Men Are from Mars, Women Are from Venus by John Gray',
  'the-disease-and-the-cure': '"The Disease and the Cure" (Al-Da\' wa al-Dawa\') by Ibn Qayyim al-Jawziyya',
  'power-of-subconscious': 'The Power of Your Subconscious Mind by Joseph Murphy',
  'how-to-win-friends': 'How to Win Friends and Influence People by Dale Carnegie',
  'life-in-administration': '"A Life in Administration" (Hayat fi al-Idara) by Ghazi Al-Gosaibi',
  'full-of-emptiness': '"Full of Emptiness" (Mumtali\' bil-Faragh) by Imad Rashad Othman',
  'psychological-fragility': '"Psychological Fragility" (Al-Hashasha al-Nafsiya) by Ismail Arafa',
  'who-moved-my-cheese': 'Who Moved My Cheese? by Spencer Johnson',
  'stop-worrying': 'How to Stop Worrying and Start Living by Dale Carnegie',
};

const prompt = (book: string, text: SummaryText) => `You are translating an audiobook summary of ${book} from Arabic into English.

Write natural, fluent English for a listener, as a professional audiobook narrator would read it: clear sentences, warm tone, no translationese. Keep the meaning and every idea, and keep it about as long as the Arabic.

Rules:
- Return the SAME structure: the same number of sections, the same number of paragraphs in each section, and the same number of FAQs, in the same order.
- Use the book's published English title and the author's usual English spelling. For books written in Arabic, keep the transliterated title the first time and explain it in English.
- Keep quotations from the Quran or hadith as faithful English renderings, attributed as in the Arabic.
- The text is read aloud verbatim: write numbers in words, and use no symbols, markdown, brackets or emojis.
- Inside the text, quote with curly quotes “ ” or ‘ ’, never with straight double quotes, so the JSON stays valid.
- The first paragraph should open with "Welcome to this summary of ..." in English.
- FAQ answers that mention listening or downloading should refer to "this page" and "MP3" as in the Arabic.

Reply with JSON only, exactly: {"sections":[{"heading":"...","paragraphs":["..."]}],"faqs":[{"question":"...","answer":"..."}]}

The Arabic summary as JSON:
${JSON.stringify(text)}`;

async function translate(book: string, text: SummaryText, apiKey: string): Promise<SummaryText> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'Hakawati AI' },
      body: JSON.stringify({ model: MODEL, temperature: 0.3, max_tokens: 16000, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt(book, text) }] }),
    });
    if (!r.ok) {
      console.warn(`  attempt ${attempt}: ${r.status} ${(await r.text()).slice(0, 200)}`);
      await new Promise((res) => setTimeout(res, 5000 * attempt));
      continue;
    }
    const data: any = await r.json();
    const reply = String(data.choices?.[0]?.message?.content || '');
    // The JSON object inside the reply (models sometimes wrap it in fences or a sentence),
    // with trailing commas removed
    const raw = reply.slice(reply.indexOf('{'), reply.lastIndexOf('}') + 1).replace(/,\s*([}\]])/g, '$1');
    try {
      const out = JSON.parse(raw) as SummaryText;
      // The narration and the section player rely on the same shape as the Arabic
      const same =
        out.sections?.length === text.sections.length &&
        out.sections.every((s, i) => typeof s.heading === 'string' && s.paragraphs?.length === text.sections[i].paragraphs.length && s.paragraphs.every((p) => typeof p === 'string' && p.trim())) &&
        out.faqs?.length === text.faqs.length &&
        out.faqs.every((f) => f.question?.trim() && f.answer?.trim());
      if (same && !/[؀-ۿ]{4,}/.test(JSON.stringify(out).replace(/\([^)]*\)/g, ''))) return out;
      console.warn(`  attempt ${attempt}: structure differs from the Arabic or Arabic left in the text`);
    } catch {
      console.warn(`  attempt ${attempt}: reply is not JSON (finish: ${data.choices?.[0]?.finish_reason}, ${reply.length} chars): ${reply.slice(0, 120).replace(/\s+/g, ' ')} … ${reply.slice(-120).replace(/\s+/g, ' ')}`);
    }
  }
  throw new Error('no usable translation after 3 attempts');
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is not set');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let failed = 0;
  for (const s of ALL_SUMMARIES) {
    if (only.length && !only.includes(s.textId)) continue;
    const file = path.join(OUT_DIR, `${s.textId}.ts`);
    if (!force && fs.existsSync(file)) {
      console.log(`skip  ${s.textId}`);
      continue;
    }
    const book = ENGLISH_TITLES[s.textId];
    if (!book) {
      console.error(`FAIL  ${s.textId}: add its English title to ENGLISH_TITLES`);
      failed++;
      continue;
    }
    console.log(`==    ${s.textId}`);
    try {
      const en = await translate(book, SUMMARY_TEXTS[s.textId], apiKey);
      const words = en.sections.reduce((n, sec) => n + [sec.heading, ...sec.paragraphs].join(' ').split(/\s+/).length, 0);
      fs.writeFileSync(
        file,
        `// English narration script and FAQs for ${book.replace(/\n/g, ' ')} (metadata in ../../summariesEn.ts)\n` +
          `import type { SummaryText } from '../../summaries';\n\n` +
          `const text: SummaryText = ${JSON.stringify(en, null, 2)};\n\nexport default text;\n`
      );
      console.log(`ok    ${s.textId}: ${words} words`);
    } catch (err: any) {
      failed++;
      console.error(`FAIL  ${s.textId}: ${err?.message || err}`);
    }
  }
  if (failed) process.exit(1);
}

main();
