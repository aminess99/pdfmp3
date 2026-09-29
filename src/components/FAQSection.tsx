import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { FAQS } from '../data/sampleBooks';

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-16 bg-[#0b0f19] border-t border-slate-800/80">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-xs sm:text-sm font-semibold">
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>إجابات فورية</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-['Tajawal']">
            الأسئلة الشائعة
          </h2>
          <p className="text-slate-300 text-sm sm:text-base">
            كل ما تحتاج لمعرفته حول كيفية تحويل كتب PDF إلى صوت.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-[#0d1322] border border-slate-800 overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleAccordion(idx)}
                  className="w-full p-5 text-right font-extrabold text-base text-white flex items-center justify-between gap-4 hover:bg-slate-900/60 transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown className={`w-5 h-5 text-indigo-400 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 font-normal">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
