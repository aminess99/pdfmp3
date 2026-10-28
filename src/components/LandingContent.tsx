import React from 'react';
import { HelpCircle, ArrowLeft } from 'lucide-react';
import { LandingPage, LANDING_PAGES, landingPath } from '../data/landingPages';

interface LandingContentProps {
  page: LandingPage;
}

// Page-specific article + FAQ for SEO landing pages (mirrors what server.ts pre-renders)
export const LandingContent: React.FC<LandingContentProps> = ({ page }) => {
  const related = LANDING_PAGES.filter((p) => p.slug !== page.slug);

  return (
    <section className="py-16 bg-[#0b0f19] border-t border-slate-800/80" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {page.sections.map((section, idx) => (
          <article key={idx} className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black text-white font-['Tajawal']">{section.heading}</h2>
            {section.paragraphs.map((p, pIdx) => (
              <p key={pIdx} className="text-slate-300 text-sm sm:text-base leading-relaxed">
                {p}
              </p>
            ))}
          </article>
        ))}

        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-2xl sm:text-3xl font-black text-white font-['Tajawal']">
            <HelpCircle className="w-6 h-6 text-cyan-400" />
            أسئلة حول {page.linkLabel}
          </h2>
          {page.faqs.map((faq, idx) => (
            <div key={idx} className="rounded-2xl bg-[#0d1322] border border-slate-800 p-5 space-y-2">
              <h3 className="text-base font-bold text-white">{faq.question}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>

        <nav className="space-y-3" aria-label="صفحات ذات صلة">
          <h2 className="text-lg font-bold text-white">صفحات ذات صلة</h2>
          <div className="flex flex-wrap gap-2">
            <a href="/" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 hover:border-indigo-500 hover:text-white transition-colors">
              تحويل PDF إلى صوت <ArrowLeft className="w-4 h-4" />
            </a>
            {related.map((p) => (
              <a
                key={p.slug}
                href={landingPath(p)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 hover:border-indigo-500 hover:text-white transition-colors"
              >
                {p.linkLabel} <ArrowLeft className="w-4 h-4" />
              </a>
            ))}
          </div>
        </nav>
      </div>
    </section>
  );
};
