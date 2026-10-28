import React, { useState } from 'react';
import { FAQS } from '../data/sampleBooks';

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="border-t border-raised py-[72px] px-4 sm:px-6" dir="rtl">
      <div className="max-w-[820px] mx-auto flex flex-col gap-5">
        <h2 className="font-display font-extrabold text-3xl sm:text-[34px] text-white">الأسئلة الشائعة</h2>
        <div className="border-t border-line">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="border-b border-line">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full min-h-[60px] flex items-center justify-between gap-3 text-right text-white text-[17px] font-semibold cursor-pointer"
                >
                  {faq.question}
                  <span aria-hidden="true" className="text-slate-400 text-[22px]">{isOpen ? '−' : '+'}</span>
                </button>
                {isOpen && <p className="pb-[18px] text-slate-400">{faq.answer}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
