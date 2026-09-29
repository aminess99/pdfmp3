import React, { useState } from 'react';
import { BookOpen, Headphones, Sparkles, Clock, ChevronRight, CheckCircle2, Globe2, Mic2 } from 'lucide-react';

export const AudiobookGuidesSection: React.FC = () => {
  const [selectedGuide, setSelectedGuide] = useState<number | null>(null);

  const guides = [
    {
      title: 'دليل تحويل كتب PDF إلى كتب مسموعة بالذكاء الاصطناعي',
      readTime: '3 دقائق قراءة',
      category: 'دليل تقني',
      summary: 'تعلم كيف تحول ملفات الـ PDF الممسوحة ضوئياً والمكتوبة إلى كتب صوتية احترافية بدون تقطيع صوتي وبأعلى دقة نطق.',
      content: `تحويل الكتب الإلكترونية إلى صوت أصبح أسهل من أي وقت مضى بفضل تقنيات الذكاء الاصطناعي الحديثة. من خلال منصة PDFtoAudio، يتم استخراج النصوص العربية وتنسيق الفصول تلقائياً، ثم توليد مقاطع صوتية متدفقة تحاكي قراءة كبار المعلقين الصوتيين على يوتيوب ومنصات البودكاست العالمية.`,
      tags: ['تحويل PDF إلى صوت', 'كتب مسموعة', 'ذكاء اصطناعي'],
    },
    {
      title: 'دليل اختيار اللهجة والصوت الأنسب لنوع كتابك',
      readTime: '4 دقائق قراءة',
      category: 'نصائح القراءة',
      summary: 'كيف تختار بين اللهجة المغربية، المصرية، الخليجية، أو الفصحى المعاصرة لتناسب روايتك أو كتاب تطوير الذات.',
      content: `تختلف نبرة الصوت باختلاف طبيعة المادة المقروءة. للروايات الأدبية والتاريخية، يُنصح باختيار أصوات الفصحى أو الأصوات الدافئة بنبرة قصصية. أما لكتب التنمية البشرية وريادة الأعمال، فإن اللهجة المصرية الحيوية أو المغربية الدارجة أو السعودية المتزنة تضفي طابعاً تفاعلياً ومحفزاً للمستمع.`,
      tags: ['اللهجة المغربية', 'اللهجة المصرية', 'الفصحى', 'أصوات الذكاء الاصطناعي'],
    },
    {
      title: 'كيف تنهي 4 كتب شهرياً أثناء التنقل وممارسة الرياضة',
      readTime: '2 دقيقة قراءة',
      category: 'إنتاجية',
      summary: 'استغل أوقات القيادة، المواصلات، وأداء المهام اليومية للاستماع إلى كتبك المفضلة بمعدل سرعة قابل للتخصيص.',
      content: `الاستماع إلى الكتب الصوتية بمعدل 30 دقيقة يومياً أثناء قيادة السيارة أو المشي يمكّنك من إنهاء أكثر من 20 كتاباً سنوياً. تتيح لك المنصة تسريع القراءة إلى 1.25x أو 1.5x مع الحفاظ على وضوح الكلمات، بالإضافة إلى ميزة مؤقت النوم والتحكم من سماعات البلوتوث وشاشة القفل.`,
      tags: ['تطوير الذات', 'القراءة السريعة', 'بودكاست'],
    },
  ];

  return (
    <section className="py-20 bg-slate-900/40 border-t border-slate-800/80 relative overflow-hidden" id="guides">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            <span>مقالات وإرشادات الاستماع الذكي</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-['Tajawal'] tracking-tight mb-4">
            دليلك الشامل لعالم <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">الكتب الصوتية بالذكاء الاصطناعي</span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            مقالات ونصائح متخصصة لمساعدتك على استخراج أقصى فائدة من كتبك وتحويلها إلى تجارب صوتية غامرة.
          </p>
        </div>

        {/* Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {guides.map((guide, idx) => (
            <article
              key={idx}
              className="group bg-[#0e1424]/90 border border-slate-800/90 rounded-2xl p-6 hover:border-indigo-500/40 transition-all duration-300 flex flex-col justify-between hover:shadow-xl hover:shadow-indigo-500/5"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                  <span className="px-2.5 py-1 rounded-md bg-slate-800 text-indigo-300 font-semibold border border-slate-700/60">
                    {guide.category}
                  </span>
                  <div className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{guide.readTime}</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors leading-snug">
                  {guide.title}
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed mb-6">
                  {guide.summary}
                </p>
              </div>

              <div>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {guide.tags.map((tag, tIdx) => (
                    <span key={tIdx} className="text-[11px] px-2 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-700/40">
                      #{tag}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => setSelectedGuide(selectedGuide === idx ? null : idx)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-indigo-600/20 text-slate-200 hover:text-indigo-300 border border-slate-700/60 hover:border-indigo-500/30 text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <span>{selectedGuide === idx ? 'إخفاء المقال' : 'قراءة المقال كاملاً'}</span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${selectedGuide === idx ? 'rotate-90' : ''}`} />
                </button>

                {selectedGuide === idx && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-800/40 border border-indigo-500/20 text-xs text-slate-300 leading-relaxed animate-in fade-in">
                    {guide.content}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

      </div>
    </section>
  );
};
