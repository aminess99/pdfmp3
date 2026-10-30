import React, { useEffect, useState } from 'react';
import { AlertTriangle, Gift, Loader2, RefreshCw, Search } from 'lucide-react';
import { apiFetch } from '../lib/apiFetch';
import { toast } from '../lib/toast';

// Admin dashboard (Arabic only). All data comes from /api/admin, which checks the
// signed-in account on the server; this component only renders it.

interface Overview {
  users: { total: number; newToday: number; newWeek: number; activeWeek: number };
  plans: { id: string; priceUsd: number; minutes: number; subscribers: number; mrr: number; usagePercent: number | null }[];
  revenue: { month: number; mrr: number; paymentsMonth: number };
  audio: { month: string; generatedMinutes: number; cachedMinutes: number; costUsd: number; costPerMinuteUsd: number };
  grossProfitMonth: number;
  openRouter: { remaining: number; used: number } | null;
}

interface AdminUser {
  uid: string;
  email: string;
  name: string;
  createdAt: number;
  lastSignIn: number;
  balanceMinutes: number;
  usedMinutes: number;
  plan: string | null;
  subscriber: boolean;
  subscriberUntil: number | null;
  books: number;
}

interface Payment {
  id: string;
  email: string;
  plan: string;
  amount: number;
  currency: string;
  at: number;
}

const PLAN_NAMES: Record<string, string> = { starter: 'Reader', popular: 'Book Lover', master: 'Pro' };
const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (ms: number | null) => (ms ? new Date(ms).toLocaleDateString('ar', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

async function getJson<T>(url: string): Promise<T> {
  const res = await apiFetch(url, {}, { silent: true });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

const Card: React.FC<{ label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: 'warn' | 'good' }> = ({ label, value, hint, tone }) => (
  <div className={`p-5 rounded-[16px] bg-card border flex flex-col gap-1.5 ${tone === 'warn' ? 'border-rose-500/60' : 'border-line'}`}>
    <span className="text-sm text-slate-400">{label}</span>
    <span className={`font-display font-extrabold text-[28px] leading-none ${tone === 'warn' ? 'text-rose-300' : tone === 'good' ? 'text-accent' : 'text-white'}`} dir="ltr">
      {value}
    </span>
    {hint && <span className="text-xs text-slate-500">{hint}</span>}
  </div>
);

export const AdminPanel: React.FC = () => {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gift, setGift] = useState<{ user: AdminUser; minutes: string; note: string; saving: boolean } | null>(null);

  const loadUsers = (q = search) =>
    getJson<{ users: AdminUser[] }>(`/api/admin/users?q=${encodeURIComponent(q)}`).then((d) => setUsers(d.users));

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, p] = await Promise.all([getJson<Overview>('/api/admin/overview'), getJson<{ payments: Payment[] }>('/api/admin/payments')]);
      setOverview(o);
      setPayments(p.payments);
      await loadUsers('');
    } catch (e: any) {
      setError(e.message || 'تعذّر تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sendGift = async () => {
    if (!gift) return;
    const minutes = Number(gift.minutes);
    if (!(minutes > 0)) return toast('اكتب عدد دقائق صحيحاً.', 'error');
    setGift({ ...gift, saving: true });
    try {
      const res = await apiFetch(
        `/api/admin/users/${encodeURIComponent(gift.user.uid)}/gift`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ minutes, note: gift.note }) },
        { silent: true }
      );
      if (!res.ok) throw new Error();
      toast(`أُضيفت ${minutes} دقيقة إلى ${gift.user.email}.`, 'success');
      setGift(null);
      loadUsers();
    } catch {
      toast('تعذّر إضافة الدقائق.', 'error');
      setGift((g) => (g ? { ...g, saving: false } : g));
    }
  };

  if (loading && !overview) {
    return (
      <div role="status" className="py-24 flex justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" aria-label="جاري التحميل" />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div role="alert" className="p-6 rounded-[16px] border border-rose-500/50 bg-rose-950/30 flex flex-col gap-3">
        <strong className="text-white">تعذّر فتح لوحة الأدمن</strong>
        <span className="text-slate-300 text-sm" dir="ltr">{error}</span>
        <span className="text-slate-400 text-sm">إن ظهر «forbidden» فالحساب ليس أدمن أو بريده غير مؤكَّد.</span>
        <button type="button" onClick={load} className="self-start min-h-11 px-4 rounded-xl border border-line text-slate-200 cursor-pointer">إعادة المحاولة</button>
      </div>
    );
  }

  const o = overview!;
  const lowCredit = o.openRouter !== null && o.openRouter.remaining < 5;

  return (
    <div className="flex flex-col gap-8" dir="rtl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display font-extrabold text-[32px] text-white">لوحة الأدمن</h1>
          <span className="text-sm text-slate-400">أرقام شهر {o.audio.month}</span>
        </div>
        <button type="button" onClick={load} disabled={loading} className="min-h-11 px-4 rounded-xl border border-line text-slate-200 hover:text-white flex items-center gap-2 cursor-pointer disabled:opacity-60">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
        </button>
      </div>

      {lowCredit && (
        <div role="alert" className="p-4 rounded-[14px] border border-rose-500/60 bg-rose-950/30 flex items-center gap-3 text-rose-200">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          رصيد OpenRouter منخفض ({usd(o.openRouter!.remaining)}). إذا نفد يتوقف الصوت في الموقع كله. اشحنه من openrouter.ai/settings/credits
        </div>
      )}

      {/* Money */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="إيرادات هذا الشهر" value={usd(o.revenue.month)} hint={`${o.revenue.paymentsMonth} عملية دفع`} />
        <Card label="الإيراد الشهري المتكرر (MRR)" value={usd(o.revenue.mrr)} hint="من الاشتراكات النشطة" />
        <Card label="تكلفة الصوت هذا الشهر" value={usd(o.audio.costUsd)} hint={`${o.audio.generatedMinutes.toLocaleString('en-US')} دقيقة مولَّدة × $${o.audio.costPerMinuteUsd}`} />
        <Card label="الربح الإجمالي التقديري" value={usd(o.grossProfitMonth)} hint="الإيرادات ناقص تكلفة الصوت (قبل رسوم Dodo والاستضافة)" tone={o.grossProfitMonth >= 0 ? 'good' : 'warn'} />
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          label="رصيد OpenRouter المتبقي"
          value={o.openRouter ? usd(o.openRouter.remaining) : '—'}
          hint={o.openRouter ? `المستهلك منذ البداية: ${usd(o.openRouter.used)}` : 'تعذّرت القراءة'}
          tone={lowCredit ? 'warn' : undefined}
        />
        <Card label="المستخدمون" value={o.users.total.toLocaleString('en-US')} hint={`${o.users.newToday} اليوم · ${o.users.newWeek} هذا الأسبوع`} />
        <Card label="نشطون هذا الأسبوع" value={o.users.activeWeek.toLocaleString('en-US')} hint="سجّلوا الدخول خلال 7 أيام" />
        <Card
          label="توفير الحفظ على القرص"
          value={`${o.audio.cachedMinutes.toLocaleString('en-US')} د`}
          hint={`≈ ${usd((o.audio.cachedMinutes * o.audio.costPerMinuteUsd))} لم تُدفع لـ OpenRouter`}
          tone="good"
        />
      </section>

      {/* Plans */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display font-extrabold text-xl text-white">الباقات</h2>
        <div className="overflow-x-auto rounded-[16px] border border-line">
          <table className="w-full text-sm">
            <thead className="bg-raised text-slate-300">
              <tr>
                {['الباقة', 'السعر', 'الدقائق شهرياً', 'المشتركون النشطون', 'MRR', 'نسبة الاستهلاك'].map((h) => (
                  <th key={h} className="px-4 py-3 text-start font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {o.plans.map((p) => (
                <tr key={p.id} className="border-t border-line text-slate-200">
                  <td className="px-4 py-3 font-semibold text-white">{PLAN_NAMES[p.id] || p.id}</td>
                  <td className="px-4 py-3" dir="ltr">{usd(p.priceUsd)}</td>
                  <td className="px-4 py-3">{p.minutes.toLocaleString('en-US')}</td>
                  <td className="px-4 py-3">{p.subscribers}</td>
                  <td className="px-4 py-3" dir="ltr">{usd(p.mrr)}</td>
                  <td className="px-4 py-3">
                    {p.usagePercent === null ? (
                      <span className="text-slate-500">لا بيانات بعد</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="w-24 h-2 rounded-full bg-line overflow-hidden">
                          <span className={`block h-full ${p.usagePercent > 80 ? 'bg-rose-400' : 'bg-accent'}`} style={{ width: `${Math.min(100, p.usagePercent)}%` }} />
                        </span>
                        {p.usagePercent}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">نسبة الاستهلاك = الدقائق التي استمع إليها مشتركو الباقة ÷ كل الدقائق التي حصلوا عليها (مع الـ 30 المجانية). فوق 80% تعني أن هامش الباقة يضيق.</p>
      </section>

      {/* Payments */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display font-extrabold text-xl text-white">آخر المدفوعات</h2>
        {payments.length === 0 ? (
          <p className="text-slate-400 text-sm">لا مدفوعات بعد.</p>
        ) : (
          <div className="overflow-x-auto rounded-[16px] border border-line">
            <table className="w-full text-sm">
              <thead className="bg-raised text-slate-300">
                <tr>
                  {['التاريخ', 'البريد', 'الباقة', 'المبلغ'].map((h) => (
                    <th key={h} className="px-4 py-3 text-start font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-line text-slate-200">
                    <td className="px-4 py-3 whitespace-nowrap">{date(p.at)}</td>
                    <td className="px-4 py-3" dir="ltr">{p.email || '—'}</td>
                    <td className="px-4 py-3">{PLAN_NAMES[p.plan] || p.plan}</td>
                    <td className="px-4 py-3" dir="ltr">{usd(p.amount)} {p.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Users */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display font-extrabold text-xl text-white">المستخدمون</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadUsers().catch(() => toast('تعذّر البحث.', 'error'));
            }}
            className="relative"
          >
            <Search className="w-4 h-4 text-slate-500 absolute top-1/2 -translate-y-1/2 start-3" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالبريد الإلكتروني"
              aria-label="ابحث بالبريد الإلكتروني"
              className="min-h-11 w-[260px] ps-9 pe-3 rounded-xl bg-raised border border-line text-white text-sm"
            />
          </form>
        </div>
        <div className="overflow-x-auto rounded-[16px] border border-line">
          <table className="w-full text-sm">
            <thead className="bg-raised text-slate-300">
              <tr>
                {['البريد', 'التسجيل', 'الرصيد', 'استمع', 'الاشتراك', 'الكتب', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-start font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid} className="border-t border-line text-slate-200">
                  <td className="px-4 py-3">
                    <span className="flex flex-col">
                      <span dir="ltr" className="text-start">{u.email || '—'}</span>
                      {u.name && <span className="text-xs text-slate-500">{u.name}</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{date(u.createdAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{u.balanceMinutes.toLocaleString('en-US')} د</td>
                  <td className="px-4 py-3 whitespace-nowrap">{u.usedMinutes.toLocaleString('en-US')} د</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {u.subscriber ? (
                      <span className="text-accent">{PLAN_NAMES[u.plan || ''] || 'مشترك'} · حتى {date(u.subscriberUntil)}</span>
                    ) : u.plan ? (
                      <span className="text-slate-500">انتهى ({PLAN_NAMES[u.plan] || u.plan})</span>
                    ) : (
                      <span className="text-slate-500">مجاني</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{u.books}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setGift({ user: u, minutes: '30', note: '', saving: false })} className="min-h-9 px-3 rounded-lg border border-line text-brand-soft hover:text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                      <Gift className="w-4 h-4" /> إهداء دقائق
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">لا نتائج.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">تظهر آخر 50 مستخدماً؛ استخدم البحث للوصول إلى غيرهم.</p>
      </section>

      {gift && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/85" onClick={() => !gift.saving && setGift(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="gift-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-[420px] bg-card border border-line rounded-[20px] p-6 flex flex-col gap-4">
            <h2 id="gift-title" className="font-display font-extrabold text-xl text-white">إهداء دقائق</h2>
            <span className="text-sm text-slate-400" dir="ltr">{gift.user.email}</span>
            <label className="flex flex-col gap-1.5 text-sm text-slate-300">
              عدد الدقائق
              <input type="number" min={1} value={gift.minutes} onChange={(e) => setGift({ ...gift, minutes: e.target.value })} className="min-h-11 px-3 rounded-xl bg-raised border border-line text-white" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-slate-300">
              السبب (اختياري، يُحفظ في السجل)
              <input type="text" value={gift.note} onChange={(e) => setGift({ ...gift, note: e.target.value })} placeholder="مثال: تعويض عن مشكلة في الصوت" className="min-h-11 px-3 rounded-xl bg-raised border border-line text-white" />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={sendGift} disabled={gift.saving} className="flex-1 min-h-11 rounded-xl bg-brand text-white font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
                {gift.saving && <Loader2 className="w-4 h-4 animate-spin" />} إضافة
              </button>
              <button type="button" onClick={() => setGift(null)} disabled={gift.saving} className="min-h-11 px-4 rounded-xl border border-line text-slate-300 cursor-pointer">إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
