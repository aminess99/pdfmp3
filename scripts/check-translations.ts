// Every page, article and book summary must exist in Arabic and English. Run on each push
// (.github/workflows/check.yml): a missing English version fails the check.
//   npx tsx scripts/check-translations.ts
import { ALL_LANDING_PAGES } from '../src/data/landingPages';
import { LANDING_EN } from '../src/data/landingPagesEn';
import { ALL_ARTICLES } from '../src/data/articles';
import { ARTICLES_EN } from '../src/data/articlesEn';
import { ARTICLE_TEXTS } from '../src/data/articleTexts';
import { ALL_SUMMARIES } from '../src/data/summaries';
import { SUMMARIES_EN } from '../src/data/summariesEn';
import { SUMMARY_TEXTS } from '../src/data/summaryTexts';

const problems: string[] = [];
const slugs = new Set<string>();
const uniqueSlug = (kind: string, slug: string) => {
  if (!/^[a-z0-9-]+$/.test(slug)) problems.push(`${kind} English slug "${slug}" must be lowercase Latin letters, digits and dashes`);
  if (slugs.has(`${kind}:${slug}`)) problems.push(`${kind} English slug "${slug}" is used twice`);
  slugs.add(`${kind}:${slug}`);
};

for (const p of ALL_LANDING_PAGES) {
  const en = LANDING_EN[p.slug];
  if (!en) problems.push(`landing page "${p.slug}" has no English version (src/data/landingPagesEn.ts)`);
  else uniqueSlug('landing', en.slug);
}
for (const a of ALL_ARTICLES) {
  const en = ARTICLES_EN[a.slug];
  if (!en) problems.push(`article "${a.slug}" has no English version (src/data/articlesEn.ts)`);
  else uniqueSlug('article', en.slug);
  if (!ARTICLE_TEXTS[`en/${a.textId}`]) problems.push(`article "${a.slug}" has no English text (src/data/article-texts/en/${a.textId}.ts)`);
}
for (const s of ALL_SUMMARIES) {
  const en = SUMMARIES_EN[s.slug];
  if (!en) problems.push(`summary "${s.slug}" has no English version (src/data/summariesEn.ts)`);
  else uniqueSlug('summary', en.slug);
  if (!SUMMARY_TEXTS[`en/${s.textId}`]) problems.push(`summary "${s.slug}" has no English text (src/data/summary-texts/en/${s.textId}.ts)`);
}

if (problems.length) {
  console.error(`Missing translations (${problems.length}):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`All ${ALL_LANDING_PAGES.length} pages, ${ALL_ARTICLES.length} articles and ${ALL_SUMMARIES.length} summaries exist in Arabic and English.`);
