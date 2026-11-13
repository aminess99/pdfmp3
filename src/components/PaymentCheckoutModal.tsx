import React, { useState } from 'react';
import { X, Clock, Loader2, ShieldCheck } from 'lucide-react';
import { tr, DIR } from '../lib/i18n';
import { apiFetch, REQUIRE_AUTH_EVENT } from '../lib/apiFetch';
import { auth } from '../lib/firebase';
import { PLANS } from './PricingSection';

// Buying a plan sends the user to Dodo Payments' hosted checkout (card details never touch
// this site). The minutes are added by the server's payment webhook, not here.
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

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({ isOpen, onClose, plan: requested }) => {
  const [state, setState] = useState<'idle' | 'loading' | 'unavailable' | 'error'>('idle');
  // All plans are offered; the one the user clicked (or the suggested one) starts selected
  const [planId, setPlanId] = useState(requested?.id || 'popular');
  if (!isOpen || !requested) return null;
  const plan = PLANS.find((p) => p.id === planId) || PLANS[1];

  const pay = async () => {
    if (!auth.currentUser) {
      onClose();
      window.dispatchEvent(new CustomEvent(REQUIRE_AUTH_EVENT));
      return;
    }
    setState('loading');
    try {
      const res = await apiFetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: plan.id }),
      });
      if (res.status === 503) return setState('unavailable');
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) return setState('error');
      window.location.href = data.url;
    } catch {
      setState('error');
    }
  };

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

        {state === 'unavailable' ? (
          <>
            <Clock className="w-8 h-8 text-accent" aria-hidden="true" />
            <h2 id="pay-title" className="font-display font-extrabold text-2xl text-white">{tr('الدفع الإلكتروني قريباً', 'Online payments are coming soon')}</h2>
            <p className="text-slate-400 leading-relaxed">{tr('نعمل على تفعيل الدفع الآمن. حتى ذلك الحين استمتع بدقائقك المجانية.', 'We are setting up secure payments. Until then, enjoy your free minutes.')}</p>
            <button type="button" onClick={onClose} className="min-h-12 rounded-xl bg-brand hover:bg-indigo-500 text-white font-bold cursor-pointer">
              {tr('حسناً', 'OK')}
            </button>
          </>
        ) : (
          <>
            <h2 id="pay-title" className="font-display font-extrabold text-2xl text-white pe-10">{tr('اختر باقتك', 'Choose your plan')}</h2>
            <div role="radiogroup" aria-labelledby="pay-title" className="flex flex-col gap-2.5">
              {PLANS.map((p) => {
                const selected = p.id === plan.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPlanId(p.id)}
                    className={`rounded-[14px] p-4 flex items-center justify-between gap-3 text-start cursor-pointer transition-colors ${
                      selected ? 'bg-raised border-2 border-brand' : 'bg-card border border-line hover:border-line-strong'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className={`w-[18px] h-[18px] rounded-full shrink-0 border-2 flex items-center justify-center ${selected ? 'border-brand' : 'border-line-strong'}`} aria-hidden="true">
                        {selected && <span className="w-2 h-2 rounded-full bg-brand" />}
                      </span>
                      <span className="flex flex-col gap-0.5 min-w-0">
                        <span className="flex items-center gap-2 text-white font-semibold">
                          {p.name}
                          {p.featured && <span className="text-[11px] font-medium text-brand-soft">{tr('الأكثر اختياراً', 'Most popular')}</span>}
                        </span>
                        <span className="text-sm text-slate-400">{p.minutes.toLocaleString('en-US')} {tr('دقيقة كل شهر', 'minutes a month')}</span>
                      </span>
                    </span>
                    <span className="flex flex-col items-end shrink-0">
                      <span className="font-display font-extrabold text-2xl text-white" dir="ltr">${p.priceUsd}</span>
                      <span className="text-xs text-slate-500">{tr('شهرياً', 'per month')}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">{tr('اشتراك شهري يتجدد تلقائياً، وتلغيه متى شئت من «مكتبتي». الدقائق غير المستخدمة تبقى في رصيدك.', 'Renews monthly; cancel anytime from your library. Unused minutes stay in your balance.')}</p>
            {state === 'error' && (
              <p role="alert" className="text-rose-300 text-sm">{tr('تعذّر بدء الدفع الآن، حاول بعد قليل.', 'Couldn’t start the payment right now. Please try again shortly.')}</p>
            )}
            <button
              type="button"
              onClick={pay}
              disabled={state === 'loading'}
              className="min-h-12 rounded-xl bg-brand hover:bg-indigo-500 text-white font-bold cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {state === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
              {tr(`اشترك في ${plan.name}`, `Subscribe to ${plan.name}`)} · <span dir="ltr">${plan.priceUsd}</span>
            </button>
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              {tr('ستنتقل إلى صفحة الدفع الآمنة لدى Dodo Payments. لا نرى بيانات بطاقتك ولا نحفظها.', 'You’ll go to Dodo Payments’ secure checkout. We never see or store your card details.')}
            </p>
          </>
        )}
      </div>
    </div>
  );
};
