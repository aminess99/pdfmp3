import { summaryTextKey, type BookSummary, type SummaryText } from '../data/summaries';

// One lazy chunk per summary text, so the hub and the rest of the site never download them
const texts = import.meta.glob<{ default: SummaryText }>('../data/summary-texts/**/*.ts');

export async function loadSummaryText(s: BookSummary): Promise<SummaryText> {
  const load = texts[`../data/summary-texts/${summaryTextKey(s)}.ts`];
  if (!load) throw new Error(`summary text not found: ${summaryTextKey(s)}`);
  return (await load()).default;
}
