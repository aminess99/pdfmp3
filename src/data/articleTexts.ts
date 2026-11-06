// Every article text, for the server pre-render and the "listen" whitelist (not the browser,
// which loads one text at a time through lib/articleLoader.ts)
import type { Article, ArticleText } from './articles';
import { plainText, articleTextKey } from './articles';
import pdfToAudiobook from './article-texts/pdf-to-audiobook';
import aiVoiceover from './article-texts/ai-voiceover';
import naturalArabicAiVoice from './article-texts/natural-arabic-ai-voice';
import freeArabicAudiobooks from './article-texts/free-arabic-audiobooks';
import enPdfToAudiobook from './article-texts/en/pdf-to-audiobook';
import enAiVoiceover from './article-texts/en/ai-voiceover';
import enNaturalArabicAiVoice from './article-texts/en/natural-arabic-ai-voice';
import enFreeArabicAudiobooks from './article-texts/en/free-arabic-audiobooks';

export const ARTICLE_TEXTS: Record<string, ArticleText> = {
  'pdf-to-audiobook': pdfToAudiobook,
  'ai-voiceover': aiVoiceover,
  'natural-arabic-ai-voice': naturalArabicAiVoice,
  'free-arabic-audiobooks': freeArabicAudiobooks,
  // English versions, under en/<textId>
  'en/pdf-to-audiobook': enPdfToAudiobook,
  'en/ai-voiceover': enAiVoiceover,
  'en/natural-arabic-ai-voice': enNaturalArabicAiVoice,
  'en/free-arabic-audiobooks': enFreeArabicAudiobooks,
};

export const articleText = (a: Article): ArticleText => {
  const text = ARTICLE_TEXTS[articleTextKey(a)];
  if (!text) throw new Error(`article text not registered: ${articleTextKey(a)}`);
  return text;
};

// What the "listen" button narrates, piece by piece (headings, paragraphs, steps)
export const articleNarration = (t: ArticleText): string[] =>
  t.sections.flatMap((s) => [s.heading, ...s.paragraphs.map(plainText), ...(s.steps || []).map(plainText)]);
