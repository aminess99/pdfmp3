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
import enFortyeightLawsOfPower from './summary-texts/en/48-laws-of-power';
import enAtomicHabits from './summary-texts/en/atomic-habits';
import enEmotionalIntelligence from './summary-texts/en/emotional-intelligence';
import enFullOfEmptiness from './summary-texts/en/full-of-emptiness';
import enGoodToGreat from './summary-texts/en/good-to-great';
import enHowToWinFriends from './summary-texts/en/how-to-win-friends';
import enLifeInAdministration from './summary-texts/en/life-in-administration';
import enMenMarsWomenVenus from './summary-texts/en/men-mars-women-venus';
import enMissedPrayer from './summary-texts/en/missed-prayer';
import enMyFatherWhomIHate from './summary-texts/en/my-father-whom-i-hate';
import enPowerOfSubconscious from './summary-texts/en/power-of-subconscious';
import enPsychologicalFragility from './summary-texts/en/psychological-fragility';
import enRichDadPoorDad from './summary-texts/en/rich-dad-poor-dad';
import enSevenHabits from './summary-texts/en/seven-habits';
import enStopWorrying from './summary-texts/en/stop-worrying';
import enSubtleArt from './summary-texts/en/subtle-art';
import enSurroundedByIdiots from './summary-texts/en/surrounded-by-idiots';
import enTheDiseaseAndTheCure from './summary-texts/en/the-disease-and-the-cure';
import enThePrince from './summary-texts/en/the-prince';
import enWhoMovedMyCheese from './summary-texts/en/who-moved-my-cheese';

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
  // English versions, under en/<textId>
  'en/48-laws-of-power': enFortyeightLawsOfPower,
  'en/atomic-habits': enAtomicHabits,
  'en/emotional-intelligence': enEmotionalIntelligence,
  'en/full-of-emptiness': enFullOfEmptiness,
  'en/good-to-great': enGoodToGreat,
  'en/how-to-win-friends': enHowToWinFriends,
  'en/life-in-administration': enLifeInAdministration,
  'en/men-mars-women-venus': enMenMarsWomenVenus,
  'en/missed-prayer': enMissedPrayer,
  'en/my-father-whom-i-hate': enMyFatherWhomIHate,
  'en/power-of-subconscious': enPowerOfSubconscious,
  'en/psychological-fragility': enPsychologicalFragility,
  'en/rich-dad-poor-dad': enRichDadPoorDad,
  'en/seven-habits': enSevenHabits,
  'en/stop-worrying': enStopWorrying,
  'en/subtle-art': enSubtleArt,
  'en/surrounded-by-idiots': enSurroundedByIdiots,
  'en/the-disease-and-the-cure': enTheDiseaseAndTheCure,
  'en/the-prince': enThePrince,
  'en/who-moved-my-cheese': enWhoMovedMyCheese,
};

export const summaryText = (s: BookSummary): SummaryText => {
  const text = SUMMARY_TEXTS[summaryTextKey(s)];
  if (!text) throw new Error(`summary text not registered: ${s.textId}`);
  return text;
};

export const summaryWordCount = (t: SummaryText): number =>
  t.sections.reduce((n, sec) => n + [sec.heading, ...sec.paragraphs].join(' ').split(/\s+/).filter(Boolean).length, 0);
