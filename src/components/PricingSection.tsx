import React, { useState } from 'react';
import { 
  Check, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Flame, 
  Award, 
  HelpCircle, 
  ArrowRight,
  Headphones,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Layers,
  Star,
  Gift
} from 'lucide-react';

interface PricingSectionProps {
  onSelectPlan?: (planId: string, minutes: number, price: number) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onSelectPlan }) => {
  const [currency, setCurrency] = useState<'USD' | 'SAR'>('USD');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'popular' | 'value'>('all');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Currency multiplier for SAR
  const sarRate = 3.75;
  const formatPrice = (usd: number) => {
    if (currency === 'SAR') {
      return (usd * sarRate).toFixed(0);
    }
    return usd.toFixed(2);
  };

  const currencySymbol = currency === 'USD' ? '$' : 'ر.س';

  const plans = [
    {
      id: 'starter',
      name: 'باقة القارئ (Starter Pack)',
      badge: 'الأنسب للتجربة الأولى',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
      priceUsd: 9.99,
      unitRateUsd: 0.03,
      minutes: 333,
      hours: '5.5 ساعات استماع',
      equivalentBooks: '2 إلى 3 كتب متوسطة',
      description: 'حزمة رصيد دقائق مثالية لتحويل واستماع أول كتبك بصوت نقي فائق الجودة.',
      popular: false,
      isValue: false,
      cardBorder: 'border-slate-800 hover:border-slate-700',
      accentGradient: 'from-blue-600 to-indigo-600',
      features: [
        '333 دقيقة رصيد صوتي ($0.03 / دقيقة)',
        'رصيد دائم في حسابك لا ينتهي صلاحيته أبداً',
        'الوصول لجميع الأصوات واللهجات الـ 30+ الفاخرة',
        'استخراج الفصول الحقيقية للكاتب بذكاء AI',
        'افتتاحية صوتية سينمائية إبداعية باسم الكتاب',
        'تحميل الصوت بجودة استوديو عالية HD (MP3)',
        'مشغل صوتي احترافي يدعم السرعات والتشكيل',
      ],
      buttonText: 'شراء 333 دقيقة الآن',
      buttonStyle: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 shadow-md',
    },
    {
      id: 'popular',
      name: 'باقة الشغوف (Pro Pack)',
      badge: 'الأكثر طلباً ومبيعاً 🔥',
      badgeColor: 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black',
      priceUsd: 19.99,
      unitRateUsd: 0.03,
      minutes: 666,
      hours: '11.1 ساعة استماع',
      equivalentBooks: '5 إلى 7 كتب كاملة',
      description: 'الحزمة الأكثر شعبية للطلاب والقراء المحترفين وعشاق المعرفة اليومية.',
      popular: true,
      isValue: false,
      cardBorder: 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-2xl shadow-indigo-950/80 scale-[1.02]',
      accentGradient: 'from-indigo-600 via-purple-600 to-blue-600',
      features: [
        '666 دقيقة رصيد صوتي ($0.03 / دقيقة)',
        'رصيد دائم مدى الحياة بدون تجديد إجباري',
        'تنقية النص وحذف أرقام الصفحات بذكاء Gemini 3.8',
        'خاصية ملخص الكتاب الصوتي في 10 دقائق',
        'انتقال تلقائي سلس بين الفصول بفاصل 0 ثانية',
        'تنزيل الكتاب كاملاً بملف واحد أو فصول مقسمة',
        'أولوية معالجة سحابية فائقة السرعة',
        'مزامنة الأجهزة المتعددة وقفل الشاشة',
      ],
      buttonText: 'احصل على 666 دقيقة الآن',
      buttonStyle: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-600/40 hover:scale-[1.02]',
    },
    {
      id: 'master',
      name: 'باقة النخبة (Master Pack)',
      badge: 'أعلى توفير وأفضل صفقة 👑',
      badgeColor: 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 font-black',
      priceUsd: 29.00,
      unitRateUsd: 0.02,
      savingsBadge: 'خصم 33% (فقط $0.02 / دقيقة)',
      minutes: 1450,
      hours: '24.1 ساعة استماع شاسعة',
      equivalentBooks: '12 إلى 15 كتاباً ضخماً',
      description: 'أفضل قيمة اقتصادية على الإطلاق! استمتع بأقل سعر للدقيقة لمكتبة كاملة.',
      popular: false,
      isValue: true,
      cardBorder: 'border-emerald-500/80 ring-2 ring-emerald-500/30 shadow-2xl shadow-emerald-950/50',
      accentGradient: 'from-emerald-500 to-teal-600',
      features: [
        '1,450 دقيقة رصيد صوتي ($0.02 للدقيقة فقط!)',
        'وفر 33% مقارنة بالباقات الأخرى',
        'رصيد دائم مدى الحياة دون أي رسوم متكررة',
        'كل مميزات الذكاء الاصطناعي والتنقية الفائقة',
        'دعم الكتب الضخمة و ePub والمستندات المصورة',
        'إمكانية تصدير الصوتيات للاستخدام في المحتوى',
        'دعم فني عالي الأولوية المباشرة VIP',
      ],
      buttonText: 'احصل على 1,450 دقيقة ($0.02/د)',
      buttonStyle: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-xl shadow-emerald-950/60 hover:scale-[1.02]',
    },
  ];

  const pricingFaqs = [
    {
      q: 'هل تنتهي صلاحية الدقائق التي أشتريها؟',
      a: 'لا على الإطلاق! الدقائق التي تشتريها تبقى في محفظتك الشخصية بشكل دائم ومضمون مدى الحياة، وتستهلك منها فقط بقدر ما تستمع وتحول من كتب.'
    },
    {
      q: 'كيف يحسب خصم الرصيد عند تحويل الكتاب؟',
      a: 'يحسب الخصم بناءً على المدة الصوتية الفعلية للكتاب بالنشر المسموع (حوالي 120 إلى 150 كلمة في الدقيقة). لا يوجد أي خصم على المحاولات أو المعاينات الصوتية التجريبية.'
    },
    {
      q: 'هل يحصل الحساب الجديد على دقائق مجانية؟',
      a: 'نعم! بمجرد إنشاء حسابك مجاناً تحصل فوراً على 30 دقيقة رصيد تجريبي مجاني لتجربة جودة الأصوات والذكاء الاصطناعي بدون الحاجة لإدخال أي بطاقة دفع.'
    },
    {
      q: 'ما هي وسائل الدفع المتاحة؟',
      a: 'ندعم جميع بطاقات الائتمان والخصم المباشر (Visa, Mastercard, Mada)، بالإضافة إلى Apple Pay و PayPal لتجربة دفع آمنة وسريعة.'
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-[#080c16] relative overflow-hidden border-t border-slate-800/80">
      
      {/* Background Glow Decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/10 via-blue-600/10 to-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 relative z-10">
        
        {/* Top Header & Tagline */}
        <div className="text-center space-y-5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-950/90 to-indigo-950/90 border border-blue-500/40 text-cyan-300 text-xs sm:text-sm font-bold shadow-lg shadow-blue-950/50 animate-pulse">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>نظام رصيد الدقائق النقي (Pay As You Go)</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black text-white font-['Tajawal'] tracking-tight leading-tight">
            ادفع مقابل ما تستمع إليه فقط.. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
              بلا اشتراكات شهرية إجبارية
            </span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            اختر باقة الدقائق المناسبة لمكتبتك الصوتية. دقائقك تحفظ في محفظتك دائماً وتظل متاحة لك <span className="text-emerald-400 font-bold">مدى الحياة</span> بدون أي رسوم خفية.
          </p>

          {/* Controls Bar: Gift Badge + Currency Switcher */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            
            {/* Free Gift Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-md">
              <Gift className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>هدية ترحيبية: <b>30 دقيقة مجاناً</b> لكل حساب جديد عند التسجيل!</span>
            </div>

            {/* Currency Selector Pill */}
            <div className="flex items-center bg-[#0d1424] p-1 rounded-2xl border border-slate-700/80 text-xs font-bold shadow-inner">
              <button
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  currency === 'USD'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                بالدولار ($)
              </button>
              <button
                onClick={() => setCurrency('SAR')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  currency === 'SAR'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                بالريال (ر.س)
              </button>
            </div>

          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => {
            const displayPrice = formatPrice(plan.priceUsd);
            const displayUnitRate = currency === 'SAR' 
              ? (plan.unitRateUsd * sarRate).toFixed(2) + ' ر.س'
              : '$' + plan.unitRateUsd.toFixed(2);

            return (
              <div
                key={plan.id}
                className={`relative p-7 sm:p-9 rounded-3xl bg-[#0c1220]/95 backdrop-blur-xl border flex flex-col justify-between transition-all duration-300 ${plan.cardBorder}`}
              >
                {/* Badge Top Pill */}
                {plan.badge && (
                  <div className={`absolute -top-4 right-6 px-4 py-1 rounded-full text-xs shadow-lg border border-white/10 ${plan.badgeColor}`}>
                    {plan.badge}
                  </div>
                )}

                <div className="space-y-6">
                  
                  {/* Plan Name & Tagline */}
                  <div>
                    <h3 className="text-2xl font-black text-white font-['Tajawal'] flex items-center justify-between">
                      <span>{plan.name}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{plan.description}</p>
                  </div>

                  {/* Main Price Header */}
                  <div className="p-4 rounded-2xl bg-[#080d18] border border-blue-950/60 space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-black text-white font-['Tajawal'] tracking-tight">
                        {displayPrice}
                      </span>
                      <span className="text-sm font-bold text-slate-300">{currencySymbol}</span>
                      <span className="text-[11px] text-slate-400 pr-1">(دفعة واحدة)</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-950/90 border border-blue-500/40 text-cyan-300 text-xs font-mono font-bold">
                        سعر الدقيقة: {displayUnitRate}
                      </span>
                      {plan.savingsBadge && (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                          {plan.savingsBadge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Minutes & Capacity Metric Card */}
                  <div className="p-4 rounded-2xl bg-[#10182b] border border-indigo-900/40 flex items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-white">{plan.minutes} دقيقة رصيد</div>
                        <div className="text-xs text-slate-400 font-medium">{plan.hours}</div>
                      </div>
                    </div>
                    <div className="text-left text-[11px] text-indigo-200 font-bold bg-indigo-950/80 px-2.5 py-1.5 rounded-xl border border-indigo-800/50 shrink-0">
                      ≈ {plan.equivalentBooks}
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="border-t border-slate-800/80 pt-5 space-y-3">
                    <p className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>محتويات الحزمة الفاخرة:</span>
                    </p>
                    <ul className="space-y-2.5">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 font-medium leading-normal">
                          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

                {/* Call to Action Button */}
                <div className="pt-8">
                  <button 
                    onClick={() => onSelectPlan && onSelectPlan(plan.id, plan.minutes, plan.priceUsd)}
                    className={`w-full py-4 rounded-2xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${plan.buttonStyle}`}
                  >
                    <span>{plan.buttonText}</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>

        {/* Lifetime Guarantee & Protection Banner */}
        <div className="max-w-4xl mx-auto p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-[#0c1426] via-[#101b33] to-[#0c1426] border border-blue-500/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="flex items-center gap-4 text-center md:text-right">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mx-auto md:mx-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base sm:text-lg font-black text-white">ضمان الرصيد الدائم وآمان الاستخدام</h4>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                دقائقك المحولة تبقى مجهزة ومضمونة في محفظتك الصوتية مدى الحياة دون أي قيد أو تاريخ انتهاء.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-4 py-2 rounded-xl bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-xs font-black shadow-md">
              شحن تلقائي ومباشر 100%
            </span>
          </div>
        </div>

        {/* Pricing FAQ Section */}
        <div className="max-w-3xl mx-auto space-y-6 pt-6">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-black text-white font-['Tajawal'] flex items-center justify-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-400" />
              <span>أسئلة شائعة حول الدقائق والباقات</span>
            </h3>
          </div>

          <div className="space-y-3">
            {pricingFaqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx}
                  className="rounded-2xl bg-[#0b101d] border border-slate-800/80 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-right font-bold text-sm text-white flex items-center justify-between gap-4 hover:bg-slate-900/50 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-indigo-400 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 font-medium">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
};
