// The page being viewed in each language, for the language switcher (the server adds the
// same pairs as hreflang links)
import { isEn } from './i18n';
import { findLandingPage, landingAlternates } from '../data/landingPages';
import { findArticle, articleAlternates, isArticlesHub, articlesHubPath, articlesFor } from '../data/articles';
import { findSummary, summaryAlternates, isSummariesHub, summariesHubPath, summariesFor } from '../data/summaries';

export function alternatePaths(pathname: string): { ar: string; en?: string } {
  const landing = findLandingPage(pathname);
  if (landing) return landingAlternates(landing);
  const article = findArticle(pathname);
  if (article) return articleAlternates(article);
  const summary = findSummary(pathname);
  if (summary) return summaryAlternates(summary);
  if (isArticlesHub(pathname)) return { ar: articlesHubPath('ar'), ...(articlesFor('en').length ? { en: articlesHubPath('en') } : {}) };
  if (isSummariesHub(pathname)) return { ar: summariesHubPath('ar'), ...(summariesFor('en').length ? { en: summariesHubPath('en') } : {}) };
  return { ar: '/', en: '/en' };
}

// Where the "العربية / English" link goes from this page
export const otherLanguagePath = (): string => {
  const alt = alternatePaths(typeof window !== 'undefined' ? window.location.pathname : '/');
  return isEn ? alt.ar : alt.en || '/en';
};
