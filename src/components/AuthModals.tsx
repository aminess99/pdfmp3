import React, { useState } from 'react';
import { X, AlertCircle, Loader2, Check } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface AuthModalsProps {
  isOpen: boolean;
  mode: 'login' | 'register';
  onClose: () => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
}

const firebaseErrorMessage = (err: any): string => {
  switch (err?.code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    case 'auth/email-already-in-use':
      return 'هذا البريد مسجّل مسبقاً، يمكنك تسجيل الدخول بدلاً من ذلك.';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة: 6 أحرف على الأقل.';
    case 'auth/invalid-email':
      return 'صيغة البريد الإلكتروني غير صحيحة.';
    case 'auth/unauthorized-domain':
      return 'تسجيل الدخول غير مفعّل لهذا النطاق بعد. أضف النطاق في إعدادات Firebase.';
    case 'auth/too-many-requests':
      return 'محاولات كثيرة، حاول بعد قليل.';
    default:
      return err?.message || 'حدث خطأ، حاول مرة أخرى.';
  }
};

const inputClass =
  'w-full min-h-12 bg-ink border border-line rounded-[10px] px-3.5 text-base text-white placeholder-slate-500 focus:outline-none focus:border-brand';

export const AuthModals: React.FC<AuthModalsProps> = ({ isOpen, mode, onClose, onSwitchMode }) => {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (!isOpen) return null;

  const switchMode = (next: 'login' | 'register') => {
    setError(null);
    setForgot(false);
    onSwitchMode(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (forgot) {
        await resetPassword(email);
        setResetSent(true);
        return;
      }
      if (mode === 'register') {
        if (!name.trim()) throw new Error('يرجى إدخال اسمك.');
        if (password.length < 6) throw new Error('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
        await signUpWithEmail(name, email, password);
      } else {
        await signInWithEmail(email, password);
      }
      onClose();
    } catch (err: any) {
      setError(firebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') setError(firebaseErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const title = forgot ? 'نسيت كلمة المرور؟' : mode === 'login' ? 'مرحباً بعودتك' : 'أنشئ حسابك';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/85 font-body" dir="rtl" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[420px] max-h-[calc(100dvh-32px)] overflow-y-auto bg-card border border-line rounded-[20px] p-6 sm:p-8 flex flex-col gap-4"
      >
        <button type="button" onClick={onClose} aria-label="إغلاق" className="absolute top-4 left-4 w-11 h-11 rounded-full text-slate-400 hover:text-white hover:bg-raised flex items-center justify-center cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        <img src="/brand/logo.png" alt="Hakawati AI" width={151} height={32} className="h-8 w-auto self-start" />
        <div className="flex flex-col gap-1">
          <h2 id="auth-title" className="font-display font-extrabold text-[28px] text-white">{title}</h2>
          <p className="text-sm text-slate-400">
            {forgot
              ? 'أدخل بريدك وسنرسل لك رابطاً لتعيين كلمة مرور جديدة.'
              : mode === 'register'
              ? '30 دقيقة مجانية عند التسجيل، بدون بطاقة دفع.'
              : 'ادخل لمتابعة كتبك ومكتبتك الصوتية.'}
          </p>
        </div>

        {!forgot && (
          <div role="tablist" aria-label="نوع الحساب" className="flex gap-1 p-1 rounded-xl bg-ink">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={`flex-1 min-h-11 rounded-[9px] text-[15px] font-semibold cursor-pointer ${mode === m ? 'bg-raised text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {m === 'login' ? 'تسجيل الدخول' : 'حساب جديد'}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div role="alert" className="p-3 rounded-xl bg-rose-950/60 border border-rose-900 text-rose-200 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {resetSent ? (
          <div role="status" className="flex flex-col items-center gap-2 py-6 text-center">
            <Check className="w-10 h-10 text-accent" />
            <p className="text-white font-semibold">أرسلنا رابط الاستعادة إلى {email}</p>
            <p className="text-sm text-slate-400">تحقق من بريدك (وصندوق الرسائل غير المرغوبة).</p>
            <button
              type="button"
              onClick={() => {
                setResetSent(false);
                setForgot(false);
              }}
              className="mt-2 min-h-11 px-4 text-brand-soft hover:text-indigo-200 cursor-pointer"
            >
              رجوع لتسجيل الدخول
            </button>
          </div>
        ) : (
          <>
            {!forgot && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={googleLoading || loading}
                  className="w-full min-h-[52px] rounded-xl bg-white text-slate-900 font-bold flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
                >
                  {googleLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.35 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                    </svg>
                  )}
                  المتابعة بحساب Google
                </button>
                <div className="flex items-center gap-3 text-[13px] text-slate-500">
                  <span className="h-px flex-1 bg-line" />
                  أو بالبريد
                  <span className="h-px flex-1 bg-line" />
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {!forgot && mode === 'register' && (
                <div className="flex flex-col gap-1">
                  <label htmlFor="auth-name" className="text-sm text-slate-300">الاسم</label>
                  <input id="auth-name" type="text" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label htmlFor="auth-email" className="text-sm text-slate-300">البريد الإلكتروني</label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  dir="ltr"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${inputClass} text-right`}
                />
              </div>
              {!forgot && (
                <div className="flex flex-col gap-1">
                  <span className="flex justify-between items-center">
                    <label htmlFor="auth-pass" className="text-sm text-slate-300">كلمة المرور</label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => { setError(null); setForgot(true); }} className="text-sm text-brand-soft hover:text-indigo-200 cursor-pointer">
                        نسيتها؟
                      </button>
                    )}
                  </span>
                  <input
                    id="auth-pass"
                    type="password"
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[52px] rounded-xl bg-brand hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                {forgot ? 'أرسل رابط الاستعادة' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}
              </button>
              {forgot && (
                <button type="button" onClick={() => setForgot(false)} className="min-h-11 text-slate-400 hover:text-white cursor-pointer">
                  رجوع لتسجيل الدخول
                </button>
              )}
              {!forgot && mode === 'register' && (
                <p className="text-[13px] text-slate-400 text-center">بالتسجيل توافق على شروط الاستخدام وسياسة الخصوصية.</p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
};
