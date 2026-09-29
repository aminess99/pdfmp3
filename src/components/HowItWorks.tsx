import React from 'react';
import { UploadCloud, Sliders, Download, Sparkles } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: '01',
      icon: UploadCloud,
      title: 'رفع كتاب PDF',
      description: 'قم بسحب وإسقاط ملف الـ PDF الخاص بك أو اختياره من جهازك بكل سهولة وسرعة.',
    },
    {
      num: '02',
      icon: Sliders,
      title: 'تحديد الصوت والإنصات',
      description: 'اختر اللهجة العربية المناسبة (من بين 14 لهجة) والصوت الفضل ودرجة السرعة والنمط.',
    },
    {
      num: '03',
      icon: Download,
      title: 'الاستماع وتحميل MP3',
      description: 'استمع مباشرة عبر القارئ التزامني الذكي أو حمّل الملف الصوتي بصيغة MP3 للاستماع أوفلاين.',
    },
  ];

  return (
    <section className="py-16 bg-[#090d16] relative border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-xs sm:text-sm font-semibold">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>بسيطة وسريعة للغاية</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-['Tajawal']">
            كيف يعمل الموقع؟
          </h2>
          <p className="text-slate-300 text-sm sm:text-base">
            ثلاث خطوات بسيطة تحول كتابك المكتوب إلى تجربة صوتية استثنائية.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="relative p-7 rounded-3xl bg-[#0d1322] border border-slate-800/90 hover:border-indigo-500/50 transition-all space-y-4 group"
              >
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                    <Icon className="w-7 h-7" />
                  </div>
                  <span className="text-3xl font-black text-slate-700 group-hover:text-indigo-400 transition-colors">
                    {step.num}
                  </span>
                </div>

                <h3 className="text-xl font-extrabold text-white font-['Tajawal']">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
