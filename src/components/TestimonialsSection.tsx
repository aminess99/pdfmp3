import React from 'react';
import { Star, Quote } from 'lucide-react';
import { TESTIMONIALS } from '../data/sampleBooks';

export const TestimonialsSection: React.FC = () => {
  return (
    <section className="py-16 bg-[#090d16] border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-xs sm:text-sm font-semibold">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>قصص نجاح ورأي المستخدمين</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-['Tajawal']">
            ماذا يقول قراؤنا في الوطن العربي؟
          </h2>
          <p className="text-slate-300 text-sm sm:text-base">
            آلاف الطلاب والمحترفين والقراء يستمتعون بتحويل كتبهم اليومية إلى صوت.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.id}
              className="p-6 rounded-3xl bg-[#0d1322] border border-slate-800/90 space-y-4 relative flex flex-col justify-between hover:border-indigo-500/40 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={`star-${t.id}-${i}`} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <Quote className="w-8 h-8 text-indigo-500/20" />
                </div>
                <p className="text-sm text-slate-300 leading-relaxed font-normal">
                  "{t.comment}"
                </p>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-11 h-11 rounded-2xl object-cover border border-indigo-500/30"
                />
                <div>
                  <h4 className="text-sm font-extrabold text-white">{t.name}</h4>
                  <p className="text-xs text-slate-400">{t.role} • {t.country}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
