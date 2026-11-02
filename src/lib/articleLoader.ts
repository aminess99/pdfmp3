import type { Article, ArticleText } from '../data/articles';

// One lazy chunk per article text, so the rest of the site never downloads them
const texts = import.meta.glob<{ default: ArticleText }>('../data/article-texts/*.ts');

export async function loadArticleText(a: Article): Promise<ArticleText> {
  const load = texts[`../data/article-texts/${a.textId}.ts`];
  if (!load) throw new Error(`article text not found: ${a.textId}`);
  return (await load()).default;
}
