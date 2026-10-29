import React from 'react';
import { HOME_H1, HOME_SUBTITLE } from '../data/homeContent';
import { DIR } from '../lib/i18n';

interface HeroSectionProps {
  badge?: string;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

// Hero = a short headline over the conversion tool (the tool is the hero)
export const HeroSection: React.FC<HeroSectionProps> = ({ badge, title, subtitle, children }) => (
  <section id="top" className="max-w-[1160px] mx-auto px-4 sm:px-6 pt-12 sm:pt-[72px] pb-14 flex flex-col items-center gap-8 sm:gap-9" dir={DIR}>
    <div className="text-center flex flex-col items-center gap-3 max-w-[720px]">
      {badge && (
        <span className="px-3 py-1 rounded-full bg-raised text-brand-soft text-sm">{badge}</span>
      )}
      <h1 className="font-display font-extrabold text-[34px] sm:text-5xl lg:text-[56px] leading-tight text-white">
        {title || HOME_H1}
      </h1>
      <p className="text-lg text-slate-400">
        {subtitle || HOME_SUBTITLE}
      </p>
    </div>
    <div className="w-full max-w-[760px]">{children}</div>
  </section>
);
