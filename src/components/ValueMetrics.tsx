import React from 'react';
import { Shield, Zap, Globe, Headphones } from 'lucide-react';

export const ValueMetrics: React.FC = () => {
  // In the screenshot, from left to right:
  // 1. أكثر من 30 صوتاً
  // 2. 14 لهجة عربية
  // 3. تحويل سريع
  // 4. أمان وخصوصية
  const metrics = [
    {
      icon: Headphones,
      title: 'أكثر من 30 صوتاً',
      subtitle: 'أصوات طبيعية وواقعية',
    },
    {
      icon: Globe,
      title: '14 لهجة عربية',
      subtitle: 'من بينها المغربية، السعودية وغيرها',
    },
    {
      icon: Zap,
      title: 'تحويل سريع',
      subtitle: 'في دقائق معدودة',
    },
    {
      icon: Shield,
      title: 'أمان وخصوصية',
      subtitle: 'بياناتك في أمان تام',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className="p-4 sm:p-5 rounded-2xl bg-[#0d1424] border border-blue-900/40 hover:border-blue-500/50 transition-all flex items-center justify-between gap-4 group"
              dir="rtl"
            >
              <div className="w-12 h-12 rounded-full bg-blue-950/80 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform text-blue-400">
                <Icon className="w-6 h-6" />
              </div>
              <div className="space-y-0.5 text-right flex-1">
                <h4 className="text-base font-black text-white font-['Tajawal']">
                  {m.title}
                </h4>
                <p className="text-xs text-slate-400 font-medium leading-tight">
                  {m.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
