// Every article text, for the server pre-render and the "listen" whitelist (not the browser,
// which loads one text at a time through lib/articleLoader.ts)
import type { Article, ArticleText } from './articles';
import { plainText } from './articles';
import pdfToAudiobook from './article-texts/pdf-to-audiobook';

export const ARTICLE_TEXTS: Record<string, ArticleText> = {
  'pdf-to-audiobook': pdfToAudiobook,
};

export const articleText = (a: Article): ArticleText => {
  const text = ARTICLE_TEXTS[a.textId];
  if (!text) throw new Error(`article text not registered: ${a.textId}`);
  return text;
};

// What the "listen" button narrates, piece by piece (headings, paragraphs, steps)
export const articleNarration = (t: ArticleText): string[] =>
  t.sections.flatMap((s) => [s.heading, ...s.paragraphs.map(plainText), ...(s.steps || []).map(plainText)]);
