import React from 'react';
import { LANDING_PAGES, landingPath } from '../data/landingPages';

interface FooterProps {
  onNavigate: (id: string) => void;
  onOpenLegal: (type: 'privacy' | 'terms') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenLegal }) => (
  <footer className="border-t border-raised py-10 px-4 sm:px-6" dir="rtl">
    <div className="max-w-[1160px] mx-auto flex flex-wrap gap-8 justify-between">
      <div className="flex flex-col gap-1.5 max-w-xs">
        <span className="font-display font-extrabold text-lg text-white">PDFtoAudio</span>
        <span className="text-slate-400 text-sm">حوّل النصوص والكتب العربية إلى صوت طبيعي بـ14 لهجة.</span>
        <span className="text-slate-500 text-xs mt-2">© {new Date().getFullYear()} PDFtoAudio</span>
      </div>
      <nav aria-label="الأدوات" className="flex flex-col gap-1 text-sm">
        <strong className="text-white">الأدوات</strong>
        <a href="/" className="text-brand-soft hover:text-indigo-200">تحويل PDF إلى صوت</a>
        {LANDING_PAGES.map((page) => (
          <a key={page.slug} href={landingPath(page)} className="text-brand-soft hover:text-indigo-200">
            {page.linkLabel}
          </a>
        ))}
      </nav>
      <nav aria-label="الدعم" className="flex flex-col gap-1 text-sm">
        <strong className="text-white">الدعم</strong>
        <button type="button" onClick={() => onNavigate('faq')} className="text-right text-brand-soft hover:text-indigo-200 cursor-pointer">الأسئلة الشائعة</button>
        <button type="button" onClick={() => onNavigate('pricing')} className="text-right text-brand-soft hover:text-indigo-200 cursor-pointer">الأسعار</button>
        <button type="button" onClick={() => onOpenLegal('privacy')} className="text-right text-brand-soft hover:text-indigo-200 cursor-pointer">سياسة الخصوصية</button>
        <button type="button" onClick={() => onOpenLegal('terms')} className="text-right text-brand-soft hover:text-indigo-200 cursor-pointer">شروط الاستخدام</button>
      </nav>
    </div>
  </footer>
);
