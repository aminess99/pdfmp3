import React from 'react';
import { LANDING_PAGES, landingPath } from '../data/landingPages';

export const NotFound: React.FC = () => (
  <section className="px-4 sm:px-6 py-20 sm:py-28" dir="rtl">
    <div className="max-w-[640px] mx-auto flex flex-col items-center text-center gap-5">
      <span className="font-display font-extrabold text-[88px] leading-none text-brand-soft/40" aria-hidden="true">404</span>
      <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-white">هذه الصفحة غير موجودة</h1>
      <p className="text-slate-400 text-lg">ربما تغيّر الرابط أو كُتب بشكل خاطئ. جرّب إحدى الأدوات:</p>
      <a
        href="/"
        className="min-h-[52px] px-7 rounded-xl bg-brand hover:bg-indigo-500 text-white font-bold flex items-center justify-center"
      >
        تحويل PDF إلى صوت
      </a>
      <nav aria-label="أدوات أخرى" className="flex flex-wrap justify-center gap-2 pt-2">
        {LANDING_PAGES.map((page) => (
          <a
            key={page.slug}
            href={landingPath(page)}
            className="min-h-11 px-4 rounded-[10px] border border-line text-slate-300 hover:text-white hover:border-line-strong flex items-center text-sm"
          >
            {page.linkLabel}
          </a>
        ))}
      </nav>
    </div>
  </section>
);
