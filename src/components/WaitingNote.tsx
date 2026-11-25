import React, { useEffect, useState } from 'react';
import { tr } from '../lib/i18n';
import { elapsedAr } from '../lib/arabicPlural';

// Elapsed time and a reassuring line under a long wait, so it never looks frozen.
// `typical` is how long the task usually takes (seconds); after it, and again after
// twice it, the line changes.
export const WaitingNote: React.FC<{ typical?: number; className?: string }> = ({ typical = 20, className = '' }) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  if (elapsed < 5) return null;
  const time = elapsedAr(elapsed);
  const line = elapsed >= typical * 2
    ? tr('ما زلنا نعمل، الخدمة أبطأ من المعتاد الآن. لا تغلق الصفحة.', 'Still working; the service is slower than usual right now. Keep this page open.')
    : elapsed >= typical
      ? tr('يستغرق هذا وقتاً أطول قليلاً من المعتاد…', 'This is taking a little longer than usual…')
      : tr(`عادةً يستغرق هذا حوالي ${typical} ثانية`, `This usually takes about ${typical}s`);
  return (
    <span className={`text-[12px] text-slate-500 tabular-nums ${className}`}>
      {tr('مضى', 'Elapsed')} {time} · {line}
    </span>
  );
};
