import React from 'react';
import { LANDING_PAGES, landingPath } from '../data/landingPages';
import { tr, DIR, HOME_PATH, isEn } from '../lib/i18n';

interface LandingContentProps {
  sections: { heading: string; paragraphs: string[] }[];
  faqs?: { question: string; answer: string }[];
  faqTitle?: string;
  // Slug of the current landing page, left out of the related links ('' on the home page)
  currentSlug?: string;
}

// SEO article + FAQ for the home and landing pages (mirrors what server.ts pre-renders)
export const LandingContent: React.FC<LandingContentProps> = ({ sections, faqs, faqTitle, currentSlug }) => {
  const related = LANDING_PAGES.filter((p) => p.slug !== currentSlug);

  return (
    <section className="border-t border-raised py-[72px] px-4 sm:px-6" dir={DIR}>
      <div className="max-w-[820px] mx-auto flex flex-col gap-10">
        {sections.map((section) => (
          <article key={section.heading} className="flex flex-col gap-3">
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white">{section.heading}</h2>
            {section.paragraphs.map((p, idx) => (
              <p key={idx} className="text-slate-300 text-base sm:text-[17px] leading-[1.9]">
                {p}
              </p>
            ))}
          </article>
        ))}

        {faqs && faqs.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white">{faqTitle}</h2>
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-[14px] bg-card border border-line p-5 flex flex-col gap-2">
                <h3 className="text-[17px] font-semibold text-white">{faq.question}</h3>
                <p className="text-slate-400 leading-[1.8]">{faq.answer}</p>
              </div>
            ))}
          </div>
        )}

        {/* The landing pages are Arabic-only, so the English site does not link them here */}
        {!isEn && (
        <nav aria-label={tr("صفحات ذات صلة", "Related pages")} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-white">{tr("أدوات أخرى", "Other tools")}</h2>
          <div className="flex flex-wrap gap-2">
            {currentSlug !== '' && (
              <a href={HOME_PATH} className="min-h-11 px-4 rounded-[10px] border border-line text-sm text-slate-300 hover:text-white hover:border-line-strong flex items-center">
                {tr("تحويل PDF إلى صوت", "Arabic PDF to audio")}
              </a>
            )}
            {related.map((p) => (
              <a
                key={p.slug}
                href={landingPath(p)}
                className="min-h-11 px-4 rounded-[10px] border border-line text-sm text-slate-300 hover:text-white hover:border-line-strong flex items-center"
              >
                {p.linkLabel}
              </a>
            ))}
          </div>
        </nav>
        )}
      </div>
    </section>
  );
};
