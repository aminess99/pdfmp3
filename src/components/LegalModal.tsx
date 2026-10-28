import React from 'react';
import { ShieldCheck, FileText, Lock, ArrowRight, BookOpen, Clock, CheckCircle } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy';
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, type }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-['Cairo',sans-serif]" dir="rtl">
      <div className="relative w-full max-w-3xl bg-[#0c1220] border border-blue-500/40 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-950 via-indigo-950 to-blue-950 border-b border-blue-900/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-cyan-400 flex items-center justify-center shrink-0">
              {type === 'privacy' ? <Lock className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-black text-white font-['Tajawal']">
                {type === 'privacy' ? 'سياسة الخصوصية وحماية البيانات' : 'شروط وإحكام الاستخدام'}
              </h3>
              <p className="text-xs text-slate-300">منصة Hakawati AI • أحدث تحديث: سبتمبر 2026</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-300 text-xs sm:text-sm leading-relaxed custom-scrollbar">
          
          {type === 'privacy' ? (
            /* Privacy Policy Content */
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-blue-200">
                <p className="font-bold">
                  نحن نولي خصوصية بياناتك ومستنداتك أهمية قصوى. يوضح هذا المستند كيفية التعامل مع مستنداتك ورصيد حسابك بأمان تام.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="text-sm sm:text-base font-black text-white font-['Tajawal'] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>1. حماية وتشفير المستندات المرفوعة (PDF / ePub)</span>
                </h4>
                <p>
                  جميع الملفات والنصوص التي تقوم برفعها لتحويلها إلى صوت تشفر إلكترونياً ولا يتم مشاركتها أو بيعها لأي طرف ثالث نهائياً. المعالجة تعتمد على بروتوكول مشفر مخصص بين متصفحك وخوادم الذكاء الاصطناعي.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm sm:text-base font-black text-white font-['Tajawal'] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>2. حماية بيانات الدفع والحساب</span>
                </h4>
                <p>
                  لا نقوم بتخزين أرودك الائتمانية أو بيانات البطاقات على خوادمنا. جميع عمليات الشراء تتم معالجتها فورياً عبر بوابات دفع عالمية مشفرة بـ SSL 256-bit معتمدة من Visa و Mastercard و Apple Pay.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm sm:text-base font-black text-white font-['Tajawal'] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span>3. سياسة حفظ واسترجاع الرصيد</span>
                </h4>
                <p>
                  دقائقك المحولة تبقى مجهزة ومضمونة في محفظتك مدى الحياة بدون تاريخ انتهاء. يحق لك طلب استرجاع الأموال خلال 14 يوماً من الشراء إذا لم تقم باستهلاك الدقائق.
                </p>
              </section>
            </div>
          ) : (
            /* Terms of Service Content */
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200">
                <p className="font-bold">
                  مرحباً بك في منصة Hakawati AI. استخدامك للمنصة يعبر عن موافقتك الكاملة على هذه الشروط والأحكام.
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="text-sm sm:th-base font-black text-white font-['Tajawal'] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  <span>1. الملكية الفكرية وحقوق النشر</span>
                </h4>
                <p>
                  يتعهد المستخدم بأنه يملك الحق الشرعي أو الاستخدام الشخصي للمستندات والكتب التي يرفعها للتحويل الصوتي. المنصة تقدم أداة تقنية تحويل القراءة إلى صوت لاستخدام المستمع الخاص.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm sm:text-base font-black text-white font-['Tajawal'] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>2. نظام احتساب الدقائق وتوليد الصوت</span>
                </h4>
                <p>
                  تخصم الدقائق من الحساب بناءً على الطول الصوتي الفعلي للنص المسموع في الكتاب. النقر على أزواج المعاينة التجريبية المجانية لا يخصم من رصيد المستخدم.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm sm:text-base font-black text-white font-['Tajawal'] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>3. التحديثات والدعم الفني</span>
                </h4>
                <p>
                  نلتزم بتطوير وجودة الاصوات التوليدية وتحسين معالجة التشكيل الإعرابي بشكل مستمر، وتوفير الدعم الفني السريع لكافة المشتركين.
                </p>
              </section>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#090e1a] border-t border-slate-800 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
          >
            قرأت وموافق
          </button>
        </div>

      </div>
    </div>
  );
};
