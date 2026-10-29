import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Info, X } from 'lucide-react';
import { TOAST_EVENT, ToastDetail } from '../lib/toast';
import { tr, DIR } from '../lib/i18n';

interface ToastItem extends ToastDetail {
  id: number;
}

const ICONS = {
  info: <Info className="w-5 h-5 text-brand-soft shrink-0" />,
  success: <Check className="w-5 h-5 text-accent shrink-0" />,
  error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
};

let nextId = 1;

export const Toaster: React.FC = () => {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const dismissLater = (id: number) => setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 5000);
    const onToast = (e: Event) => {
      const { message, kind } = (e as CustomEvent<ToastDetail>).detail;
      const id = nextId++;
      setItems((prev) => [...prev.slice(-2), { id, message, kind }]);
      dismissLater(id);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  return (
    <div
      aria-live="polite"
      className="fixed z-[90] top-[72px] inset-x-4 sm:top-20 sm:inset-x-auto sm:end-6 sm:w-[380px] flex flex-col gap-2 pointer-events-none font-body"
      dir={DIR}
    >
      {items.map((t) => (
        <div
          key={t.id}
          role={t.kind === 'error' ? 'alert' : 'status'}
          className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-[14px] bg-raised border border-line-strong text-slate-100 text-[15px] shadow-lg shadow-black/40"
        >
          {ICONS[t.kind]}
          <span className="flex-1 leading-relaxed">{t.message}</span>
          <button
            type="button"
            onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
            aria-label={tr("إغلاق", "Close")}
            className="-m-2 w-9 h-9 rounded-full text-slate-400 hover:text-white flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
