import React from 'react';

interface PricingSectionProps {
  onSelectPlan?: (planId: string, minutes: number, price: number) => void;
}

const PLANS = [
  { id: 'starter', name: 'باقة القارئ', minutes: 333, priceUsd: 9.99, note: 'لتجربة أول كتبك', featured: false },
  { id: 'popular', name: 'باقة الشغوف', minutes: 666, priceUsd: 19.99, note: '5 إلى 7 كتب كاملة', featured: true },
  { id: 'master', name: 'باقة النخبة', minutes: 1450, priceUsd: 29, note: 'أقل سعر للدقيقة', featured: false },
];

export const PricingSection: React.FC<PricingSectionProps> = ({ onSelectPlan }) => (
  <section id="pricing" className="border-t border-raised py-[72px] px-4 sm:px-6" dir="rtl">
    <div className="max-w-[1160px] mx-auto flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h2 className="font-display font-extrabold text-3xl sm:text-[34px] text-white">الأسعار</h2>
        <p className="text-slate-400">ادفع مقابل الدقائق التي تستمع إليها، بدون اشتراك. الدقائق لا تنتهي صلاحيتها.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <div className="p-7 rounded-[18px] bg-card border border-line flex flex-col gap-3.5">
          <span className="text-slate-300 font-semibold">مجاني</span>
          <span className="font-display text-[40px] font-extrabold text-white leading-none">$0</span>
          <span className="text-slate-400">30 دقيقة عند التسجيل، بدون بطاقة</span>
          <a href="#top" className="mt-auto flex items-center justify-center min-h-12 rounded-xl border border-line-strong text-white font-semibold hover:bg-raised">
            ابدأ مجاناً
          </a>
        </div>
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`p-7 rounded-[18px] bg-card flex flex-col gap-3.5 ${plan.featured ? 'border-2 border-brand' : 'border border-line'}`}
          >
            <span className="flex justify-between items-center text-slate-300 font-semibold">
              {plan.name}
              {plan.featured && <span className="text-[13px] text-brand-soft">الأكثر اختياراً</span>}
            </span>
            <span className="font-display text-[40px] font-extrabold text-white leading-none">${plan.priceUsd}</span>
            <span className="text-slate-400">
              {plan.minutes.toLocaleString('en-US')} دقيقة · {plan.note}
            </span>
            <button
              type="button"
              onClick={() => onSelectPlan?.(plan.id, plan.minutes, plan.priceUsd)}
              className={`mt-auto min-h-12 rounded-xl font-bold cursor-pointer ${
                plan.featured ? 'bg-brand text-white hover:bg-indigo-500' : 'border border-line-strong text-white hover:bg-raised'
              }`}
            >
              اختر الباقة
            </button>
          </div>
        ))}
      </div>
    </div>
  </section>
);
