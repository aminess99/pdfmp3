import React, { useState } from 'react';
import { X, CreditCard, ShieldCheck, Check, Clock, Zap, Sparkles, Lock, ArrowLeft } from 'lucide-react';

// No real payment processor is connected yet: keep the card form hidden
// until checkout goes through a provider (Stripe, Paddle, ...).
const PAYMENTS_ENABLED = false;

interface PaymentCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: {
    id: string;
    name: string;
    priceUsd: number;
    minutes: number;
    unitRateUsd: number;
  } | null;
  onSuccessPayment: (addedMinutes: number) => void;
}

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  isOpen,
  onClose,
  plan,
  onSuccessPayment,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'applepay' | 'paypal'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  if (!isOpen || !plan) return null;

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate instant secure payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentDone(true);

      setTimeout(() => {
        onSuccessPayment(plan.minutes);
        setPaymentDone(false);
        onClose();
      }, 1500);
    }, 1800);
  };

  if (!PAYMENTS_ENABLED) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-['Cairo',sans-serif]" dir="rtl" onClick={onClose}>
        <div className="relative w-full max-w-md bg-[#0c1220] border border-blue-500/40 rounded-3xl shadow-2xl p-8 text-center text-white space-y-4" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-600/20 border border-blue-500/40 text-cyan-400 flex items-center justify-center">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black font-['Tajawal']">الدفع الإلكتروني قريباً</h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            نعمل على تفعيل الدفع الآمن لـ <span className="font-bold text-white">{plan.name}</span>.
            يمكنك الاستمرار في استخدام الدقائق المجانية حالياً.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold transition-colors"
          >
            حسناً
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-['Cairo',sans-serif]" dir="rtl">
      <div className="relative w-full max-w-lg bg-[#0c1220] border border-blue-500/40 rounded-3xl shadow-2xl overflow-hidden text-white space-y-0">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-950 via-indigo-950 to-blue-950 border-b border-blue-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-cyan-400 flex items-center justify-center font-bold shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white font-['Tajawal']">
                إتمام عملية الشراء وشحن الدقائق
              </h3>
              <p className="text-xs text-slate-300">دفع آمن ومشفر 100% لمرة واحدة</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {paymentDone ? (
          /* Payment Success View */
          <div className="p-8 sm:p-10 text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce">
              <Check className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-white font-['Tajawal']">
              تم شحن الحساب بنجاح! 🎉
            </h3>
            <p className="text-sm text-emerald-300 font-bold">
              تمت إضافة <span className="underline">{plan.minutes} دقيقة</span> إلى رصيدك المحفوظ. استمتع بالتحويل والاستماع!
            </p>
          </div>
        ) : (
          /* Payment Form View */
          <form onSubmit={handleProcessPayment} className="p-5 sm:p-6 space-y-5">
            
            {/* Selected Plan Summary Box */}
            <div className="p-4 rounded-2xl bg-[#11192b] border border-blue-900/50 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs text-indigo-300 font-bold">الباقة المختارة:</div>
                <div className="text-sm sm:text-base font-black text-white">{plan.name}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{plan.minutes} دقيقة رصيد دائم</span>
                </div>
              </div>

              <div className="text-left">
                <div className="text-2xl font-black text-white font-['Tajawal']">${plan.priceUsd}</div>
                <div className="text-[10px] text-emerald-400 font-bold">رصيد دائم مدى الحياة</div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">اختر طريقة الدفع المناسبة:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === 'card'
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-cyan-400" />
                  <span>بطاقة ائتمان</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('applepay')}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === 'applepay'
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="font-mono text-sm font-black text-slate-200">Apple Pay</span>
                  <span>أبل باي</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('paypal')}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === 'paypal'
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="font-bold text-indigo-400">PayPal</span>
                  <span>بايبال</span>
                </button>
              </div>
            </div>

            {/* Card Inputs */}
            {paymentMethod === 'card' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[11px] text-slate-300 font-bold mb-1 block">الاسم المدون على البطاقة</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: Mohamed Ali"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 font-bold mb-1 block">رقم البطاقة (Visa / Mastercard / Mada)</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={19}
                      placeholder="4000 0000 0000 0000"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-300 font-bold mb-1 block">تاريخ الانتهاء (MM/YY)</label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      placeholder="08/28"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-300 font-bold mb-1 block">رمز الأمان (CVC)</label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      placeholder="123"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod !== 'card' && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-center text-xs text-slate-300 space-y-2">
                <Sparkles className="w-5 h-5 text-amber-400 mx-auto" />
                <p>سيتم توجيهك إلى بوابة {paymentMethod === 'applepay' ? 'Apple Pay' : 'PayPal'} المعتمدة فور الضغط على تأكيد الشراء.</p>
              </div>
            )}

            {/* Submit Button & Guarantees */}
            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>جاري تأكيد عملية الشراء والشفير...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>تأكيد وشحن {plan.minutes} دقيقة (${plan.priceUsd})</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>تشفير 256-bit SSL</span>
                </span>
                <span>•</span>
                <span>استرجاع الأموال خلال 14 يوماً</span>
              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
