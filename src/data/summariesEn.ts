// English versions of the book summaries, keyed by the Arabic summary's slug. Served at
// /en/book-summaries/<slug>; texts in ./summary-texts/en/<textId>.ts, audio narrated into
// public/summaries/en/ by scripts/generate-summary-audio.ts.
import type { BookSummaryEn } from './summaries';

export const SUMMARIES_EN: Record<string, BookSummaryEn> = {};

export const SUMMARIES_HUB_EN = {
  title: 'Free Audio Book Summaries | Hakawati AI',
  description:
    'Listen free to fifteen-minute audio summaries of well-known books in self-development, psychology, money and relationships, with the full text to read or download.',
  keywords: 'audio book summaries, free book summaries, book summary audio, book summaries online, listen to book summaries',
  h1: 'Audio Book Summaries',
  lead: 'The key ideas of widely read books in about fifteen minutes. Listen free, read the summary, or download it to listen offline.',
};
