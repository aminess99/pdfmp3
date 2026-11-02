// Every summary text, for the server pre-render and the audio generator (not the browser,
// which loads one text at a time through lib/summaryLoader.ts)
import type { BookSummary, SummaryText } from './summaries';
import atomicHabits from './summary-texts/atomic-habits';
import myFatherWhomIHate from './summary-texts/my-father-whom-i-hate';
import lawsOfPower from './summary-texts/48-laws-of-power';
import subtleArt from './summary-texts/subtle-art';
import richDadPoorDad from './summary-texts/rich-dad-poor-dad';
import sevenHabits from './summary-texts/seven-habits';
import missedPrayer from './summary-texts/missed-prayer';
import thePrince from './summary-texts/the-prince';
import emotionalIntelligence from './summary-texts/emotional-intelligence';
import goodToGreat from './summary-texts/good-to-great';
import surroundedByIdiots from './summary-texts/surrounded-by-idiots';
import menFromMars from './summary-texts/men-from-mars-women-from-venus';
import alDaaWalDawaa from './summary-texts/al-daa-wal-dawaa';
import powerOfSubconscious from './summary-texts/power-of-your-subconscious-mind';
import howToWinFriends from './summary-texts/how-to-win-friends';

export const SUMMARY_TEXTS: Record<string, SummaryText> = {
  'atomic-habits': atomicHabits,
  'my-father-whom-i-hate': myFatherWhomIHate,
  '48-laws-of-power': lawsOfPower,
  'subtle-art': subtleArt,
  'rich-dad-poor-dad': richDadPoorDad,
  'seven-habits': sevenHabits,
  'missed-prayer': missedPrayer,
  'the-prince': thePrince,
  'emotional-intelligence': emotionalIntelligence,
  'good-to-great': goodToGreat,
  'surrounded-by-idiots': surroundedByIdiots,
  'men-from-mars-women-from-venus': menFromMars,
  'al-daa-wal-dawaa': alDaaWalDawaa,
  'power-of-your-subconscious-mind': powerOfSubconscious,
  'how-to-win-friends': howToWinFriends,
};

export const summaryText = (s: BookSummary): SummaryText => {
  const text = SUMMARY_TEXTS[s.textId];
  if (!text) throw new Error(`summary text not registered: ${s.textId}`);
  return text;
};

export const summaryWordCount = (t: SummaryText): number =>
  t.sections.reduce((n, sec) => n + [sec.heading, ...sec.paragraphs].join(' ').split(/\s+/).filter(Boolean).length, 0);
