import React from 'react';
import { X, Clock } from 'lucide-react';
import { tr, DIR } from '../lib/i18n';

// No payment processor is connected yet, so choosing a plan explains that payments are
// coming soon. Build real checkout on a provider (Stripe, Paddle, ...) when it is ready;
// never collect card details on this site directly.
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

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({ isOpen, onClose, plan }) => {
  if (!isOpen || !plan) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 font-body" dir={DIR} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[440px] bg-card border border-line rounded-[20px] p-7 flex flex-col gap-4 text-slate-200"
      >
        <button type="button" onClick={onClose} aria-label={tr('إغلاق', 'Close')} className="absolute top-4 end-4 w-11 h-11 rounded-full text-slate-400 hover:text-white hover:bg-raised flex items-center justify-center cursor-pointer">
          <X className="w-5 h-5" />
        </button>
        <Clock className="w-8 h-8 text-accent" aria-hidden="true" />
        <h2 id="pay-title" className="font-display font-extrabold text-2xl text-white">{tr('الدفع الإلكتروني قريباً', 'Online payments are coming soon')}</h2>
        <p className="text-slate-400 leading-relaxed">
          {tr('نعمل على تفعيل الدفع الآمن لـ', 'We are setting up secure payments for')} <strong className="text-white">{plan.name}</strong> (
          {plan.minutes.toLocaleString('en-US')} {tr('دقيقة', 'minutes')}). {tr('حتى ذلك الحين استمتع بدقائقك المجانية.', 'Until then, enjoy your free minutes.')}
        </p>
        <button type="button" onClick={onClose} className="min-h-12 rounded-xl bg-brand hover:bg-indigo-500 text-white font-bold cursor-pointer">
          {tr('حسناً', 'OK')}
        </button>
      </div>
    </div>
  );
};
