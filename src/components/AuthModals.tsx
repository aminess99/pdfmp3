import React, { useState } from 'react';
import { X, LogIn, UserPlus, Headphones, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface AuthModalsProps {
  isOpen: boolean;
  mode: 'login' | 'register';
  onClose: () => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
}

export const AuthModals: React.FC<AuthModalsProps> = ({
  isOpen,
  mode,
  onClose,
  onSwitchMode,
}) => {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, quickAdminLogin } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim()) {
          throw new Error('يرجى إدخال اسمك الكريم.');
        }
        if (password.length < 6) {
          throw new Error('يجب ألا تقل كلمة المرور عن 6 أحرف.');
        }
        await signUpWithEmail(name, email, password);
      } else {
        await signInWithEmail(email, password);
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      let msg = err.message || 'حدث خطأ أثناء المصادقة.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'هذا البريد الإلكتروني مسجل مسبقاً، يمكنك تسجيل الدخول بدلاً من ذلك.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'كلمة المرور ضعيفة جداً (يجب أن تتكون من 6 خانات على الأقل).';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'تعذر تسجيل الدخول بحساب Google حالياً.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleQuickAdmin = () => {
    quickAdminLogin();
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in" dir="rtl">
      <div className="relative w-full max-w-md bg-[#0f172a] rounded-3xl border border-blue-500/30 shadow-2xl p-6 sm:p-8 text-white space-y-5">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mx-auto flex items-center justify-center">
            <Headphones className="w-6 h-6" />
          </div>
          <h3 className="text-2xl font-black font-['Tajawal']">
            {mode === 'login' ? 'تسجيل الدخول إلى حسابك' : 'إنشاء حساب جديد'}
          </h3>
          <p className="text-xs text-slate-400">
            {mode === 'login'
              ? 'مرحباً بعودتك! ادخل بياناتك لمتابعة كتبك ومكتبتك الصوتية.'
              : 'انضم إلينا واستمتع بتحويل وحفظ كتبك بصوتك المفضل سحابياً.'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-8 text-center space-y-2 animate-in zoom-in">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <p className="text-base font-bold text-white">تمت العملية بنجاح!</p>
            <p className="text-xs text-slate-400">جاري نقلك إلى مكتبتك وتفعيل ميزاتك...</p>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Google One-Click Sign In */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={googleLoading || loading}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span>{mode === 'login' ? 'المتابعة باستخدام Google' : 'التسجيل باستخدام Google'}</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="h-px flex-1 bg-slate-800" />
              <span className="text-[11px] text-slate-500 font-semibold">أو بالبريد الإلكتروني</span>
              <span className="h-px flex-1 bg-slate-800" />
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'register' && (
                <div className="space-y-1 text-right">
                  <label className="text-xs font-semibold text-slate-300">الاسم الكامل</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="محمد أحمد"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none"
                  />
                </div>
              )}

              <div className="space-y-1 text-right">
                <label className="text-xs font-semibold text-slate-300">البريد الإلكتروني</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="space-y-1 text-right">
                <label className="text-xs font-semibold text-slate-300">كلمة المرور</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === 'login' ? (
                  <LogIn className="w-4 h-4" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                <span>{loading ? 'جاري التحقق...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}</span>
              </button>

              {/* Quick Admin Access for aminefiverr1996@gmail.com */}
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={handleQuickAdmin}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <span>👑 الدخول السريع كمدير المنصة (أمين)</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer switch */}
        <div className="pt-1 text-center text-xs text-slate-400">
          {mode === 'login' ? (
            <span>
              ليس لديك حساب؟{' '}
              <button
                onClick={() => onSwitchMode('register')}
                className="text-blue-400 font-bold hover:underline"
              >
                أنشئ حساباً مجانياً الآن
              </button>
            </span>
          ) : (
            <span>
              لديك حساب بالفعل؟{' '}
              <button
                onClick={() => onSwitchMode('login')}
                className="text-blue-400 font-bold hover:underline"
              >
                سجل الدخول من هنا
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
};
