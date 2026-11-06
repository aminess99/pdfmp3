// Every summary text, for the server pre-render and the audio generator (not the browser,
// which loads one text at a time through lib/summaryLoader.ts)
import { summaryTextKey, type BookSummary, type SummaryText } from './summaries';
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
import menMarsWomenVenus from './summary-texts/men-mars-women-venus';
import theDiseaseAndTheCure from './summary-texts/the-disease-and-the-cure';
import powerOfSubconscious from './summary-texts/power-of-subconscious';
import howToWinFriends from './summary-texts/how-to-win-friends';
import lifeInAdministration from './summary-texts/life-in-administration';
import fullOfEmptiness from './summary-texts/full-of-emptiness';
import psychologicalFragility from './summary-texts/psychological-fragility';
import whoMovedMyCheese from './summary-texts/who-moved-my-cheese';
import stopWorrying from './summary-texts/stop-worrying';

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
  'men-mars-women-venus': menMarsWomenVenus,
  'the-disease-and-the-cure': theDiseaseAndTheCure,
  'power-of-subconscious': powerOfSubconscious,
  'how-to-win-friends': howToWinFriends,
  'life-in-administration': lifeInAdministration,
  'full-of-emptiness': fullOfEmptiness,
  'psychological-fragility': psychologicalFragility,
  'who-moved-my-cheese': whoMovedMyCheese,
  'stop-worrying': stopWorrying,
};

export const summaryText = (s: BookSummary): SummaryText => {
  const text = SUMMARY_TEXTS[summaryTextKey(s)];
  if (!text) throw new Error(`summary text not registered: ${s.textId}`);
  return text;
};

export const summaryWordCount = (t: SummaryText): number =>
  t.sections.reduce((n, sec) => n + [sec.heading, ...sec.paragraphs].join(' ').split(/\s+/).filter(Boolean).length, 0);
