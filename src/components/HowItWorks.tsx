import React from 'react';
import { GraduationCap, Video, Car } from 'lucide-react';

import { HOW_STEPS as STEPS, USE_CASES as USE_CASE_TEXT } from '../data/homeContent';
import { tr, DIR } from '../lib/i18n';

const USE_CASE_ICONS = [GraduationCap, Video, Car];
const USE_CASES = USE_CASE_TEXT.map((u, i) => ({ ...u, icon: USE_CASE_ICONS[i] }));

export const HowItWorks: React.FC = () => (
  <section id="how" className="border-t border-raised py-[72px] px-4 sm:px-6" dir={DIR}>
    <div className="max-w-[1160px] mx-auto flex flex-col gap-7">
      <h2 className="font-display font-extrabold text-3xl sm:text-[34px] text-white">{tr("كيف يعمل", "How it works")}</h2>
      <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3.5 items-start p-5 rounded-2xl bg-card">
            <span className="w-9 h-9 shrink-0 rounded-full border border-brand text-brand-soft flex items-center justify-center font-bold">
              {i + 1}
            </span>
            <span className="flex flex-col">
              <strong className="text-white">{step.title}</strong>
              <span className="text-slate-400 text-[15px]">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export const UseCasesSection: React.FC = () => (
  <section className="border-t border-raised py-[72px] px-4 sm:px-6" dir={DIR}>
    <div className="max-w-[1160px] mx-auto flex flex-col gap-7">
      <h2 className="font-display font-extrabold text-3xl sm:text-[34px] text-white">{tr("لمن هذا الموقع؟", "Who is it for?")}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {USE_CASES.map(({ icon: Icon, title, text }) => (
          <article key={title} className="p-6 rounded-2xl border border-line flex flex-col gap-2.5">
            <Icon className="w-[26px] h-[26px] text-accent" aria-hidden="true" />
            <h3 className="text-[19px] font-semibold text-white">{title}</h3>
            <p className="text-slate-400">{text}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);
