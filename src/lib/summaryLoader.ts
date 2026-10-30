import type { BookSummary, SummaryText } from '../data/summaries';

// One lazy chunk per summary text, so the hub and the rest of the site never download them
const texts = import.meta.glob<{ default: SummaryText }>('../data/summary-texts/*.ts');

export async function loadSummaryText(s: BookSummary): Promise<SummaryText> {
  const load = texts[`../data/summary-texts/${s.textId}.ts`];
  if (!load) throw new Error(`summary text not found: ${s.textId}`);
  return (await load()).default;
}
