import React from 'react';
import { tr, DIR, HOME_PATH, isEn } from '../lib/i18n';
import { ChevronLeft, Clock, Headphones } from 'lucide-react';
import { ARTICLES, ARTICLES_HUB, articlePath } from '../data/articles';

// /مقالات: every published article, newest first
export const ArticlesHub: React.FC = () => {
  const list = [...ARTICLES].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return (
    <section className="px-4 sm:px-6 py-10 sm:py-14" dir={DIR}>
      <div className="max-w-[960px] mx-auto flex flex-col gap-8">
        <nav aria-label={tr("مسار التنقل", "Breadcrumb")} className="flex items-center gap-1.5 text-sm text-slate-400">
          <a href={HOME_PATH} className="hover:text-white">{tr("الرئيسية", "Home")}</a>
          <ChevronLeft className="w-3.5 h-3.5 ltr:rotate-180" />
          <span className="text-slate-300">{ARTICLES_HUB.h1}</span>
        </nav>

        <header className="flex flex-col gap-3 max-w-[680px]">
          <h1 className="font-display font-extrabold text-3xl sm:text-[44px] leading-tight text-white">{ARTICLES_HUB.h1}</h1>
          <p className="text-slate-400 text-lg leading-[1.8]">{ARTICLES_HUB.lead}</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {list.map((a) => (
            <a key={a.slug} href={articlePath(a)} className="p-6 rounded-[18px] bg-card border border-line hover:border-line-strong flex flex-col gap-3 group">
              <span className="self-start px-3 py-1 rounded-full bg-raised text-brand-soft text-xs font-semibold">{a.category}</span>
              <h2 className="font-display font-extrabold text-xl text-white leading-snug group-hover:text-brand-soft">{a.h1}</h2>
              <p className="text-slate-400 leading-[1.8]">{a.lead}</p>
              <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-auto">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{a.readMinutes} {tr("دقائق قراءة", "min read")}</span>
                {!isEn && <span className="flex items-center gap-1"><Headphones className="w-3.5 h-3.5" />يمكنك الاستماع إليها</span>}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
