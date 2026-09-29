import React, { useState } from 'react';
import { Headphones, Moon, Sun, Menu, X, Sparkles, User, LogOut, BookMarked, Globe, ChevronDown } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { useLanguage } from '../lib/LanguageContext';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onNavigate: (sectionId: string) => void;
  activeSection: string;
  user: { name: string; email: string } | null;
  onLogout: () => void;
  onOpenLibrary: () => void;
  isAdmin: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  setDarkMode,
  onOpenAuth,
  onNavigate,
  activeSection,
  user,
  onLogout,
  onOpenLibrary,
  isAdmin,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { lang, setLang, t } = useLanguage();

  const navLinks = [
    { id: 'contact', label: t('nav_contact') },
    { id: 'faq', label: t('nav_faq') },
    { id: 'features', label: t('nav_features') },
    { id: 'pricing', label: t('nav_pricing') },
    { id: 'home', label: t('nav_home') },
  ];

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  const toggleLanguage = () => {
    setLang(lang === 'ar' ? 'en' : 'ar');
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#0b0f19]/90 border-b border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* LEFT: Brand Logo */}
        <div 
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-[2px] shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/50 transition-all duration-300">
            <div className="w-full h-full bg-[#0b0f19] rounded-[14px] flex items-center justify-center">
              <Headphones className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-0.5">
              <span className="text-2xl font-black tracking-tight text-white font-['Tajawal']">
                PDF<span className="text-blue-400 font-extrabold">to</span><span className="text-purple-400 font-extrabold">Audio</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide">{t('app_tagline')}</p>
          </div>
        </div>

        {/* CENTER: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <div key={link.id} className="relative py-2">
                <button
                  onClick={() => handleNavClick(link.id)}
                  className={`px-3 lg:px-4 py-1.5 text-sm font-bold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {link.label}
                </button>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-gradient-to-r from-blue-500 to-purple-500 rounded-full shadow-md shadow-indigo-500" />
                )}
              </div>
            );
          })}
        </nav>

        {/* RIGHT: Header Actions (Language Switcher, Theme, Library, Auth) */}
        <div className="hidden sm:flex items-center gap-2.5">
          
          {/* Language Switcher Pill Button (Arabic / English) */}
          <button
            onClick={toggleLanguage}
            className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Switch Language / تغيير اللغة"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-sans uppercase">{lang === 'ar' ? 'English' : 'العربية'}</span>
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />
          
          {/* Library button */}
          <button
            onClick={onOpenLibrary}
            className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            title={t('library')}
          >
            <BookMarked className="w-4 h-4 text-cyan-400" />
            <span>{t('library')}</span>
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 transition-all border border-slate-700/50 cursor-pointer"
            title={darkMode ? 'Light Mode' : 'Dark Mode'}
          >
            {darkMode ? <Moon className="w-4 h-4 text-slate-300" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white">
                <User className="w-4 h-4 text-indigo-400" />
                <span className="truncate max-w-[100px]">{user.name}</span>
                {isAdmin && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    {t('admin')}
                  </span>
                )}
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                title={t('logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Login Button */}
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:text-white bg-transparent hover:bg-slate-800/60 rounded-xl transition-all border border-slate-700/70 cursor-pointer"
              >
                {t('login')}
              </button>

              {/* Register Button */}
              <button
                onClick={() => onOpenAuth('register')}
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                {t('register')}
              </button>
            </>
          )}
        </div>

        {/* Mobile Hamburger & Controls */}
        <div className="sm:hidden flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold font-sans"
          >
            {lang === 'ar' ? 'EN' : 'عربي'}
          </button>
          <button
            onClick={onOpenLibrary}
            className="p-2 rounded-lg bg-slate-800 text-slate-300"
          >
            <BookMarked className="w-4 h-4 text-cyan-400" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-200"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-[#0e1424] border-b border-slate-800 px-4 pt-3 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className={`text-right px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${
                  activeSection === link.id
                    ? 'bg-indigo-600/20 text-indigo-400'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>
          <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
            {!user ? (
              <>
                <button
                  onClick={() => { onOpenAuth('login'); setMobileMenuOpen(false); }}
                  className="w-full py-2.5 text-sm font-semibold text-slate-200 bg-slate-800/80 rounded-xl"
                >
                  {t('login')}
                </button>
                <button
                  onClick={() => { onOpenAuth('register'); setMobileMenuOpen(false); }}
                  className="w-full py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl"
                >
                  {t('register')}
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/70 border border-slate-700/60 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <User className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="font-bold text-white truncate">{user.name}</span>
                  </div>
                  {isAdmin && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold shrink-0">
                      {t('admin')}
                    </span>
                  )}
                </div>
                <button
                  onClick={onLogout}
                  className="w-full py-2.5 text-sm font-semibold text-rose-300 bg-rose-950/40 border border-rose-900/50 rounded-xl"
                >
                  {t('logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
