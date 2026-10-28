import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Headphones, Menu, X } from 'lucide-react';
import { LANDING_PAGES, landingPath } from '../data/landingPages';

interface SiteHeaderProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
  onNavigate: (sectionId: string) => void;
}

const textToSpeechPage = LANDING_PAGES.find((p) => p.inputMode === 'text' && !p.dialectId);
const dialectPages = LANDING_PAGES.filter((p) => p.dialectId);

export const SiteHeader: React.FC<SiteHeaderProps> = ({ onOpenAuth, onNavigate }) => {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  // Close the tools menu on outside click or Escape
  useEffect(() => {
    if (!toolsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setToolsOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [toolsOpen]);

  const tools = [
    { mark: 'PDF', name: 'تحويل PDF إلى كتاب صوتي', desc: 'ارفع كتاباً واسمعه مقسّماً إلى فصول', href: '/#top' },
    { mark: 'نص', name: 'تحويل النص إلى صوت', desc: 'الصق أي نص واسمعه فوراً', href: textToSpeechPage ? landingPath(textToSpeechPage) : '/#top' },
    { mark: 'سؤال', name: 'اسأل كتابك', desc: 'ارفع كتاباً ثم اطرح عليه أسئلتك من الاستوديو', href: '/#top' },
  ];

  const go = (id: string) => {
    setMobileOpen(false);
    onNavigate(id);
  };

  return (
    <header className="relative border-b border-raised bg-ink z-30" dir="rtl">
      <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-4">
        <a href="/" className="flex items-center gap-2.5 text-white">
          <span className="w-9 h-9 rounded-[10px] bg-brand flex items-center justify-center">
            <Headphones className="w-5 h-5" aria-hidden="true" />
          </span>
          <span className="font-display font-extrabold text-xl">PDFtoAudio</span>
        </a>

        {/* Desktop nav */}
        <nav aria-label="القائمة الرئيسية" className="hidden md:flex items-center gap-1">
          <div ref={toolsRef} className="relative">
            <button
              type="button"
              onClick={() => setToolsOpen(!toolsOpen)}
              aria-expanded={toolsOpen}
              className={`flex items-center gap-1.5 min-h-11 px-3.5 rounded-[10px] text-[15px] text-slate-200 cursor-pointer ${toolsOpen ? 'bg-raised' : 'hover:bg-raised/60'}`}
            >
              الأدوات <ChevronDown className="w-4 h-4" aria-hidden="true" />
            </button>
            {toolsOpen && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 w-[520px] bg-card border border-line rounded-2xl p-3 shadow-2xl shadow-black/50">
                {tools.map((t) => (
                  <a key={t.name} href={t.href} onClick={() => setToolsOpen(false)} className="flex gap-3.5 items-start p-3.5 rounded-xl hover:bg-raised">
                    <span className="w-10 h-10 shrink-0 rounded-[10px] bg-raised text-accent flex items-center justify-center font-display font-extrabold text-sm">{t.mark}</span>
                    <span className="flex flex-col">
                      <span className="font-semibold text-white">{t.name}</span>
                      <span className="text-sm text-slate-400">{t.desc}</span>
                    </span>
                  </a>
                ))}
                <div className="border-t border-line mt-2 px-3.5 pt-3 pb-1 text-sm text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                  اللهجات:
                  {dialectPages.map((p) => (
                    <a key={p.slug} href={landingPath(p)} className="text-brand-soft hover:text-indigo-200">{p.linkLabel.replace(/^تحويل (النص|الكتابة) إلى صوت\s*/, '')}</a>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button type="button" onClick={() => go('voices')} className="min-h-11 px-3.5 text-[15px] text-slate-300 hover:text-white cursor-pointer">الأصوات</button>
          <button type="button" onClick={() => go('pricing')} className="min-h-11 px-3.5 text-[15px] text-slate-300 hover:text-white cursor-pointer">الأسعار</button>
          <button type="button" onClick={() => go('faq')} className="min-h-11 px-3.5 text-[15px] text-slate-300 hover:text-white cursor-pointer">الأسئلة</button>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenAuth('login')}
            className="hidden sm:flex items-center min-h-11 px-[18px] rounded-[10px] border border-line-strong text-white text-[15px] font-semibold hover:bg-raised cursor-pointer"
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="فتح القائمة"
            className="md:hidden w-11 h-11 rounded-[10px] bg-raised text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/80" onClick={() => setMobileOpen(false)}>
          <nav
            aria-label="قائمة الأدوات"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-0 right-0 bottom-0 w-[320px] max-w-[85vw] bg-card border-l border-line flex flex-col gap-1 px-4 pt-3 pb-5 overflow-y-auto"
          >
            <div className="flex items-center justify-between h-13">
              <span className="font-display font-extrabold text-lg text-white">PDFtoAudio</span>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="إغلاق القائمة" className="w-11 h-11 flex items-center justify-center text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-[13px] text-slate-400 px-2 pt-3 pb-1">الأدوات</div>
            {tools.map((t) => (
              <a key={t.name} href={t.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 min-h-14 px-2 rounded-xl text-white hover:bg-raised">
                <span className="w-9 h-9 shrink-0 rounded-[10px] bg-raised text-accent flex items-center justify-center text-xs font-bold">{t.mark}</span>
                <span className="flex flex-col leading-snug">
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-xs text-slate-400">{t.desc}</span>
                </span>
              </a>
            ))}
            <div className="text-[13px] text-slate-400 px-2 pt-4 pb-2 border-t border-line mt-2">اللهجات والصفحات</div>
            <div className="flex flex-wrap gap-1.5 px-2">
              {LANDING_PAGES.map((p) => (
                <a key={p.slug} href={landingPath(p)} className="flex items-center min-h-10 px-3 rounded-full border border-line text-slate-300 text-sm">
                  {p.linkLabel}
                </a>
              ))}
            </div>
            <div className="mt-auto pt-6 flex flex-col gap-2">
              <button type="button" onClick={() => go('voices')} className="min-h-11 px-2 text-right text-slate-300 cursor-pointer">الأصوات</button>
              <button type="button" onClick={() => go('pricing')} className="min-h-11 px-2 text-right text-slate-300 cursor-pointer">الأسعار</button>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenAuth('login');
                }}
                className="min-h-12 rounded-xl bg-brand text-white font-bold cursor-pointer"
              >
                تسجيل الدخول
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
