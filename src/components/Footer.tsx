import React from 'react';
import { LANDING_PAGES, landingPath } from '../data/landingPages';
import { tr, DIR, HOME_PATH, OTHER_LANG_PATH, isEn } from '../lib/i18n';
import { DIALECT_COUNT } from '../data/voices';

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
          LANDING_PAGES.map((page) => (
            <a key={page.slug} href={landingPath(page)} className="text-brand-soft hover:text-indigo-200">
              {page.linkLabel}
            </a>
          ))
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
