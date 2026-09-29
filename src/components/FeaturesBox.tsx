import React from 'react';
import { BookOpen, CheckCircle2, Headphones, Lightbulb, Sparkles } from 'lucide-react';

export const FeaturesBox: React.FC = () => {
  return (
    <div className="w-full h-full bg-[#0d1424] rounded-3xl border border-blue-500/20 p-5 sm:p-7 shadow-2xl shadow-indigo-950/40 flex flex-col justify-between space-y-6" dir="rtl">
      
      {/* Top Header: Book outline icon in rounded square + Title */}
      <div className="space-y-3 text-right">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-transparent border-2 border-blue-500/50 flex items-center justify-center text-blue-400">
            <BookOpen className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-['Tajawal'] tracking-tight">
              استمع إلى كتابك في أي وقت
            </h2>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
          سواء كنت طالباً، قارئاً شغوفا او محترفاً، يمكنك الآن تحويل اي ملف PDF إلى صوت والاستماع إليه بسهولة. مع جودة صوت عالية وتجربة مريحة.
        </p>
      </div>

      {/* Middle Illustration: Tablet with soundwave, headphones, and stacked books */}
      <div className="relative py-2 flex items-center justify-center">
        <div className="relative w-full max-w-sm h-48 bg-gradient-to-b from-[#121c33]/80 to-[#0a1020]/90 rounded-2xl border border-blue-500/30 p-4 flex items-center justify-center shadow-xl overflow-hidden group">
          
          {/* Ambient blur lighting */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Stack of books on the right/center */}
          <div className="absolute bottom-4 left-6 space-y-1.5 z-10">
            <div className="w-14 h-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-sm shadow-md transform -rotate-3" />
            <div className="w-14 h-3.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-sm shadow-md transform rotate-2" />
            <div className="w-16 h-4 bg-gradient-to-r from-cyan-600 to-blue-700 rounded-sm shadow-md" />
          </div>

          {/* Tablet E-Reader Device */}
          <div className="relative z-20 w-32 h-40 bg-slate-100 rounded-xl shadow-2xl p-2.5 flex flex-col justify-between border-2 border-slate-300">
            <div className="space-y-1">
              <div className="h-1.5 bg-slate-300 rounded w-full" />
              <div className="h-1.5 bg-slate-300 rounded w-5/6" />
              <div className="h-1.5 bg-slate-300 rounded w-4/6" />
              <div className="h-1.5 bg-slate-300 rounded w-full" />
            </div>

            {/* Glowing Soundwave Badge */}
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 shadow-lg mx-auto flex items-center justify-center text-white">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 10v4" />
                <path d="M6 7v10" />
                <path d="M10 4v16" />
                <path d="M14 8v8" />
                <path d="M18 6v12" />
                <path d="M22 10v4" />
              </svg>
            </div>

            <div className="space-y-1">
              <div className="h-1.5 bg-slate-300 rounded w-3/4" />
              <div className="h-1.5 bg-slate-300 rounded w-full" />
            </div>
          </div>

          {/* Headphones over the tablet */}
          <div className="absolute top-2 right-12 z-30">
            <Headphones className="w-12 h-12 text-blue-400 drop-shadow-lg" />
          </div>

        </div>
      </div>

      {/* Checklist items in screenshot order */}
      <ul className="space-y-2 text-right">
        {[
          'دعم ملفات PDF و ePub الرقمية متعددة الفصول',
          'أصوات طبيعية وبجودة استوديو عالية',
          'أكثر من 30 صوتاً و14 لهجة عربية',
          'تحميل الملف الصوتي بصيغة MP3',
          'لا حاجة لتثبيت أي برنامج',
        ].map((item, idx) => (
          <li key={idx} className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {/* Tip Box: Lightbulb icon inside rounded dark container */}
      <div className="p-3.5 rounded-2xl bg-[#090d18] border border-blue-500/20 flex items-start gap-2.5 text-right">
        <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-200 leading-relaxed font-normal">
          <strong className="text-white font-bold">مثال:</strong> يمكنك تحويل كتاب كامل إلى صوت والاستماع إليه أثناء القيادة أو أثناء ممارسة الرياضة أو في أي وقت تريد.
        </p>
      </div>

    </div>
  );
};
