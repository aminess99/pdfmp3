import React from 'react';
import { LANDING_PAGES, landingPath } from '../data/landingPages';
import { tr, DIR, HOME_PATH, OTHER_LANG_PATH, isEn } from '../lib/i18n';
import { DIALECT_COUNT } from '../data/voices';
import { SUMMARIES_HUB_PATH } from '../data/summaries';
import { ARTICLES_HUB_PATH } from '../data/articles';
import { SOCIAL_LINKS, SocialLink } from '../data/social';

// Brand marks as simple inline SVG paths (24x24)
const SOCIAL_ICONS: Record<SocialLink['id'], string> = {
  youtube:
    'M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z',
  facebook:
    'M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z',
  tiktok:
    'M19.6 6.7a4.8 4.8 0 0 1-3.8-4.2V2h-3.4v13.7a2.9 2.9 0 1 1-2-2.8V9.5a6.3 6.3 0 1 0 5.4 6.2V8.8a8.2 8.2 0 0 0 4.8 1.5V6.9l-1-.2Z',
  instagram:
    'M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3c1.2-.1 1.6-.1 4.8-.1ZM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0Zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.4-11.8a1.4 1.4 0 1 0 0 2.9 1.4 1.4 0 0 0 0-2.9Z',
};

interface FooterProps {
  onNavigate: (id: string) => void;
  onOpenLegal: (type: 'privacy' | 'terms') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenLegal }) => (
  <footer className="border-t border-raised py-10 px-4 sm:px-6" dir={DIR}>
    <div className="max-w-[1160px] mx-auto flex flex-wrap gap-8 justify-between">
      <div className="flex flex-col gap-1.5 max-w-xs">
        <img src="/brand/logo.png" alt="Hakawati AI" width={151} height={32} className="h-8 w-auto self-start" />
        <span className="text-slate-400 text-sm">{tr(`حوّل النصوص والكتب العربية إلى صوت طبيعي بـ${DIALECT_COUNT} لهجة.`, `Turn Arabic text and books into natural speech in ${DIALECT_COUNT} dialects.`)}</span>
        <ul aria-label={tr('تابعنا', 'Follow us')} className="flex gap-2 mt-3">
          {SOCIAL_LINKS.map((l) => (
            <li key={l.id}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer me"
                aria-label={tr(`حكواتي على ${l.name}`, `Hakawati AI on ${l.name}`)}
                title={l.name}
                className="w-10 h-10 rounded-full border border-line flex items-center justify-center text-slate-300 hover:text-white hover:border-brand hover:bg-raised"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <path d={SOCIAL_ICONS[l.id]} />
                </svg>
              </a>
            </li>
          ))}
        </ul>
        <span className="text-slate-500 text-xs mt-2">© {new Date().getFullYear()} Hakawati AI</span>
      </div>
      <nav aria-label={tr("الأدوات", "Tools")} className="flex flex-col gap-1 text-sm">
        <strong className="text-white">{tr("الأدوات", "Tools")}</strong>
        <a href={HOME_PATH} className="text-brand-soft hover:text-indigo-200">{tr('تحويل PDF إلى صوت', 'Arabic PDF to audio')}</a>
        {isEn ? (
          <a href={OTHER_LANG_PATH} hrefLang="ar" lang="ar" className="text-brand-soft hover:text-indigo-200">
            النسخة العربية
          </a>
        ) : (
          <>
            <a href={SUMMARIES_HUB_PATH} className="text-brand-soft hover:text-indigo-200">ملخصات كتب صوتية</a>
            <a href={ARTICLES_HUB_PATH} className="text-brand-soft hover:text-indigo-200">المقالات</a>
            {LANDING_PAGES.map((page) => (
              <a key={page.slug} href={landingPath(page)} className="text-brand-soft hover:text-indigo-200">
                {page.linkLabel}
              </a>
            ))}
          </>
        )}
      </nav>
      <nav aria-label={tr("الدعم", "Support")} className="flex flex-col gap-1 text-sm">
        <strong className="text-white">{tr("الدعم", "Support")}</strong>
        <button type="button" onClick={() => onNavigate('faq')} className="text-start text-brand-soft hover:text-indigo-200 cursor-pointer">{tr("الأسئلة الشائعة", "FAQ")}</button>
        <button type="button" onClick={() => onNavigate('pricing')} className="text-start text-brand-soft hover:text-indigo-200 cursor-pointer">{tr("الأسعار", "Pricing")}</button>
        <button type="button" onClick={() => onOpenLegal('privacy')} className="text-start text-brand-soft hover:text-indigo-200 cursor-pointer">{tr("سياسة الخصوصية", "Privacy policy")}</button>
        <button type="button" onClick={() => onOpenLegal('terms')} className="text-start text-brand-soft hover:text-indigo-200 cursor-pointer">{tr("شروط الاستخدام", "Terms of use")}</button>
      </nav>
    </div>
  </footer>
);
