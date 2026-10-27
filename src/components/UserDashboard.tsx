import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Plus, 
  Library, 
  Mic, 
  Settings, 
  LogOut, 
  Clock, 
  Play, 
  Trash2, 
  Sparkles, 
  ChevronDown, 
  User, 
  Volume2, 
  FileText,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Search,
  Zap,
  FolderOpen,
  Menu,
  X,
  Compass,
  CheckCircle2,
  Globe,
  Wand2,
  MessageSquare
} from 'lucide-react';
import { ConversionJob, Voice } from '../types';
import { useAuth } from '../lib/AuthContext';
import { db, collection, query, where, getDocs, deleteDoc, doc } from '../lib/firebase';
import { ConversionTool } from './ConversionTool';
import { cleanBookTitle } from './AudioPlayerDrawer';
import { UserSettingsModal } from './UserSettingsModal';
import { AIBookCreator } from './AIBookCreator';
import { ChatPdfModal } from './ChatPdfModal';

interface UserDashboardProps {
  user: { name: string; email: string };
  isAdmin: boolean;
  onLogout: () => void;
  onStartJob: (job: ConversionJob) => void;
  availableVoices: Voice[];
  onOpenCheckout?: (plan: any) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  user,
  isAdmin,
  onLogout,
  onStartJob,
  availableVoices,
  onOpenCheckout,
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'new_book' | 'ai_creator'>('library');
  const [savedBooks, setSavedBooks] = useState<ConversionJob[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Menus & Modals state
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [chatBook, setChatBook] = useState<ConversionJob | null>(null);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { user: authUser } = useAuth();

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load user audiobooks from localStorage & Firebase Firestore
  const loadBooks = async () => {
    setLoadingBooks(true);
    let combined: ConversionJob[] = [];
    try {
      const local = JSON.parse(localStorage.getItem('pdf_audio_library') || '[]');
      if (Array.isArray(local)) combined = [...local];
    } catch {
      combined = [];
    }

    if (authUser && authUser.uid) {
      try {
        const q = query(collection(db, 'audiobooks'), where('userId', '==', authUser.uid));
        const snap = await getDocs(q);
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (!combined.some((item) => item.id === docSnap.id)) {
            combined.unshift({
              id: docSnap.id,
              fileName: data.fileName || 'كتاب صوتي',
              fileSize: data.fileSize || '2.4 MB',
              totalPages: data.totalPages || 10,
              processedPages: data.processedPages || 10,
              extractedText: data.extractedText || '',
              textChunks: [data.extractedText || ''],
              selectedDialect: data.selectedDialect,
              selectedVoice: data.selectedVoice,
              selectedStyle: data.selectedStyle,
              durationInSeconds: data.durationInSeconds || 300,
              chapters: data.chapters || [],
              activeChapterId: data.chapters?.[0]?.id,
              status: 'completed',
              progress: 100,
              createdAt: data.createdAtStr || new Date().toLocaleDateString('ar-SA'),
            });
          }
        });
      } catch (err) {
        console.warn('Load audiobooks err:', err);
      }
    }

    setSavedBooks(combined);
    setLoadingBooks(false);
  };

  useEffect(() => {
    loadBooks();
  }, [authUser?.uid]);

  const handleDeleteBook = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('هل تريد حذف هذا الكتاب من مكتبتك؟')) return;
    const updated = savedBooks.filter((b) => b.id !== id);
    setSavedBooks(updated);
    try {
      localStorage.setItem('pdf_audio_library', JSON.stringify(updated));
    } catch {}
    if (authUser?.uid) {
      try {
        await deleteDoc(doc(db, 'audiobooks', id));
      } catch (err) {
        console.warn('Delete book doc note:', err);
      }
    }
  };

  const filteredBooks = savedBooks.filter((b) =>
    cleanBookTitle(b.fileName).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-['Cairo',sans-serif]" dir="rtl">
      
      {/* 1. App Dashboard Header (Responsive across Desktop, Tablet & Mobile) */}
      <header className="h-16 px-3 sm:px-6 lg:px-8 bg-[#0c1220]/95 backdrop-blur-md border-b border-blue-900/40 flex items-center justify-between sticky top-0 z-50">
        
        {/* Right: Hamburger button (Mobile) + Brand Logo */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Mobile Menu Hamburger Button */}
          <button
            onClick={() => setShowMobileDrawer(true)}
            className="md:hidden p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            aria-label="القائمة الرئيسية"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand Logo & Work Area Indicator */}
          <div 
            className="flex items-center gap-2 cursor-pointer select-none" 
            onClick={() => setActiveTab('library')}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-black text-white font-['Tajawal'] tracking-tight">
                استوديو الكتب
              </span>
              <span className="text-[9px] sm:text-[10px] text-cyan-300 bg-cyan-950/70 border border-cyan-800/50 px-2 py-0.5 rounded-full font-bold">
                لوحة المشترك
              </span>
            </div>
          </div>
        </div>

        {/* Center: Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center bg-[#070b14] p-1 rounded-2xl border border-blue-900/50">
          <button
            onClick={() => setActiveTab('library')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'library'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Library className="w-4 h-4" />
            <span>مكتبتي الصوتية ({savedBooks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('new_book')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'new_book'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>تحويل كتاب PDF</span>
          </button>

          {/* AI Book Creator Tab */}
          <button
            onClick={() => setActiveTab('ai_creator')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ai_creator'
                ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/40 ring-1 ring-purple-400/50'
                : 'text-purple-300 hover:text-white hover:bg-purple-950/30'
            }`}
          >
            <Wand2 className="w-4 h-4 text-amber-300" />
            <span>تأليف كتاب بالذكاء الاصطناعي ✨</span>
          </button>
        </nav>

        {/* Left: User Profile Dropdown & Minutes Quota Balance */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Minutes Balance Indicator & Recharge Button */}
          <button
            onClick={() => onOpenCheckout && onOpenCheckout({
              id: 'popular',
              name: 'باقة الشغوف (Pro Pack)',
              priceUsd: 19.99,
              minutes: 666,
              unitRateUsd: 0.03
            })}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-105"
            title="انقر لشحن رصيد دقائق إضافي"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>رصيدك: {localStorage.getItem('user_minutes_quota') || '30'} دقيقة</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] text-emerald-300 font-extrabold">+شحن</span>
          </button>

          {/* Quick Settings Icon Button (Desktop) */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="hidden sm:flex p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/50 transition-colors cursor-pointer"
            title="إعدادات الحساب والمشغل"
          >
            <Settings className="w-4 h-4 text-cyan-400" />
          </button>

          {/* User Profile Button with Robust Dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowProfileMenu((prev) => !prev);
              }}
              className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl transition-all cursor-pointer ${
                showProfileMenu 
                  ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-900/30 ring-2 ring-blue-500/40' 
                  : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700 text-slate-200'
              } border select-none`}
              aria-expanded={showProfileMenu}
              aria-haspopup="true"
            >
              {/* Avatar circle */}
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-700/30 shrink-0">
                {user.name ? user.name.slice(0, 1).toUpperCase() : 'م'}
              </div>
              
              {/* User text (Desktop) */}
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-white truncate max-w-[110px] leading-tight">
                  {user.name || 'المشترك'}
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[110px] leading-tight">
                  {user.email}
                </div>
              </div>

              {/* Animated chevron arrow */}
              <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform duration-200 ${showProfileMenu ? 'rotate-180 text-blue-400' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-2 w-64 bg-[#0e1628] border border-blue-500/40 rounded-2xl shadow-2xl p-2 z-[9999] space-y-1 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150"
                style={{ direction: 'rtl' }}
              >
                {/* User info card header */}
                <div className="p-3 bg-[#131d33] rounded-xl border border-blue-900/40 mb-1">
                  <div className="text-xs font-black text-white">{user.name}</div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">{user.email}</div>
                  <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <Zap className="w-3 h-3" /> اشتراك نشط
                    </span>
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-700/50">
                        <ShieldCheck className="w-3 h-3 text-cyan-400" /> مسؤول
                      </span>
                    )}
                  </div>
                </div>

                {/* Menu items */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('library');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-right p-2.5 rounded-xl text-xs font-medium text-slate-200 hover:bg-blue-600/20 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Library className="w-4 h-4 text-blue-400" />
                    <span>مكتبتي الصوتية</span>
                  </span>
                  <span className="text-[10px] bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full font-bold">
                    {savedBooks.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('new_book');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-right p-2.5 rounded-xl text-xs font-medium text-slate-200 hover:bg-blue-600/20 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>تحويل كتاب PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('ai_creator');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-right p-2.5 rounded-xl text-xs font-bold text-purple-300 hover:bg-purple-600/20 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Wand2 className="w-4 h-4 text-amber-400" />
                  <span>تأليف كتاب بالذكاء الاصطناعي</span>
                </button>

                {/* Settings in Dropdown */}
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowSettingsModal(true);
                  }}
                  className="w-full text-right p-2.5 rounded-xl text-xs font-medium text-slate-200 hover:bg-blue-600/20 hover:text-white flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-cyan-400" />
                  <span>الإعدادات والتفضيلات</span>
                </button>

                {/* Logout action */}
                <div className="border-t border-slate-800/80 pt-1 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full text-right p-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-950/40 hover:text-red-300 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>تسجيل الخروج</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </header>

      {/* Mobile Drawer (Sidebar) */}
      {showMobileDrawer && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="fixed inset-y-0 right-0 w-72 bg-[#0d1424] border-l border-blue-900/50 p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            
            <div className="space-y-6">
              {/* Drawer Top */}
              <div className="flex items-center justify-between pb-4 border-b border-blue-900/40">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white font-['Tajawal']">لوحة المشترك</div>
                    <div className="text-[10px] text-cyan-400">استوديو الكتب الصوتية</div>
                  </div>
                </div>

                <button
                  onClick={() => setShowMobileDrawer(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Profile summary & Minutes Top-Up in Mobile Drawer */}
              <div className="p-3.5 bg-[#131d33] rounded-2xl border border-blue-900/40 space-y-2">
                <div className="text-xs font-black text-white">{user.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-[11px] text-slate-300 font-bold flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>الرصيد: {localStorage.getItem('user_minutes_quota') || '30'} دقيقة</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowMobileDrawer(false);
                      if (onOpenCheckout) {
                        onOpenCheckout({
                          id: 'popular',
                          name: 'باقة الشغوف (Pro Pack)',
                          priceUsd: 19.99,
                          minutes: 666,
                          unitRateUsd: 0.03
                        });
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/40 transition-colors cursor-pointer"
                  >
                    + شحن الدقائق
                  </button>
                </div>
              </div>

              {/* Comprehensive Navigation Links in Mobile Drawer */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-bold text-slate-400 px-2 uppercase tracking-wider">
                  التنقل السريع:
                </div>

                <button
                  onClick={() => {
                    setActiveTab('library');
                    setShowMobileDrawer(false);
                  }}
                  className={`w-full text-right p-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'library'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Library className="w-4 h-4 text-cyan-400" />
                    <span>مكتبتي الصوتية</span>
                  </span>
                  <span className="text-[10px] bg-slate-900/60 px-2 py-0.5 rounded-full font-bold">
                    {savedBooks.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('new_book');
                    setShowMobileDrawer(false);
                  }}
                  className={`w-full text-right p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                    activeTab === 'new_book'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>تحويل كتاب PDF</span>
                </button>

                {/* AI Creator Button in Mobile Drawer */}
                <button
                  onClick={() => {
                    setActiveTab('ai_creator');
                    setShowMobileDrawer(false);
                  }}
                  className={`w-full text-right p-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                    activeTab === 'ai_creator'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'text-purple-300 hover:bg-purple-950/40'
                  }`}
                >
                  <Wand2 className="w-4 h-4 text-amber-300" />
                  <span>تأليف كتاب بالذكاء الاصطناعي ✨</span>
                </button>

                <button
                  onClick={() => {
                    setShowMobileDrawer(false);
                    if (onOpenCheckout) {
                      onOpenCheckout({
                        id: 'popular',
                        name: 'باقة الشغوف (Pro Pack)',
                        priceUsd: 19.99,
                        minutes: 666,
                        unitRateUsd: 0.03
                      });
                    }
                  }}
                  className="w-full text-right p-3 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 flex items-center justify-between transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>خطط الدقائق والشحن</span>
                  </span>
                  <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
                    باقات
                  </span>
                </button>

                {/* Settings in Mobile Drawer */}
                <button
                  onClick={() => {
                    setShowMobileDrawer(false);
                    setShowSettingsModal(true);
                  }}
                  className="w-full text-right p-3 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 flex items-center gap-2.5 transition-all cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-cyan-400" />
                  <span>الإعدادات والتفضيلات</span>
                </button>
              </div>
            </div>

            {/* Logout button in Mobile Drawer */}
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setShowMobileDrawer(false);
                  onLogout();
                }}
                className="w-full text-right p-3 rounded-xl text-xs font-bold text-red-400 hover:bg-red-950/40 flex items-center gap-2.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 space-y-6">
        
        {/* Tab 1: Library View */}
        {activeTab === 'library' && (
          <div className="space-y-6">
            
            {/* Header row with search and CTA */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0e1628] border border-blue-900/40 rounded-3xl p-4 sm:p-6 shadow-xl">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white font-['Tajawal'] flex items-center gap-2">
                  <span>مكتبتك الصوتية المحفوظة</span>
                  <span className="text-xs bg-blue-600/30 text-blue-300 border border-blue-500/40 px-2.5 py-0.5 rounded-full">
                    {savedBooks.length} كتاب
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  كتبك وفصولك الصوتية المزامنة سحابياً، جاهزة للاستماع الفوري، التحدث مع الكتاب، أو استئناف القراءة.
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث في كتبك الصوتية..."
                    className="w-full bg-[#11192e] border border-slate-700/80 rounded-2xl py-2 pr-9 pl-4 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                </div>

                <button
                  onClick={() => setActiveTab('new_book')}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>كتاب جديد</span>
                </button>
              </div>
            </div>

            {/* Books Grid */}
            {loadingBooks ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-48 rounded-3xl bg-[#0e1628]/60 border border-slate-800 animate-pulse" />
                ))}
              </div>
            ) : filteredBooks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBooks.map((book) => {
                  const cleanedTitle = cleanBookTitle(book.fileName);
                  const chapterCount = book.chapters ? book.chapters.length : 1;
                  const durationMin = Math.round((book.durationInSeconds || 300) / 60);

                  return (
                    <div
                      key={book.id}
                      onClick={() => onStartJob(book)}
                      className="group p-5 rounded-3xl bg-[#0c1220] border border-blue-900/40 hover:border-blue-500/60 shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between relative overflow-hidden"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-lg shrink-0 group-hover:scale-105 transition-transform">
                            <BookOpen className="w-6 h-6" />
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            {/* Chat with this book button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setChatBook(book);
                              }}
                              className="px-2.5 py-1 rounded-xl bg-purple-950/70 hover:bg-purple-900/80 text-purple-300 hover:text-white border border-purple-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors"
                              title="اسأل وتحدث مع هذا الكتاب"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                              <span>اسأل الكتاب</span>
                            </button>

                            <button
                              onClick={(e) => handleDeleteBook(book.id, e)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors"
                              title="حذف الكتاب"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-base font-black text-white font-['Tajawal'] group-hover:text-cyan-300 transition-colors line-clamp-2">
                            {cleanedTitle}
                          </h3>
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>القارئ: {book.selectedVoice?.name || 'صوت عربي'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{durationMin} دقيقة</span>
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <Layers className="w-3.5 h-3.5 text-purple-400" />
                            <span>{chapterCount} فصول</span>
                          </span>
                        </div>

                        <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-cyan-300 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#0e1628] border border-blue-900/30 rounded-3xl p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto">
                  <FolderOpen className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-white font-['Tajawal']">مكتبتك فارغة حالياً</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    ارفع أول كتاب PDF لتحويله أو استخدم مؤلف الكتب الذكي لإنشاء كتاب كامل من مجرد فكرة.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('new_book')}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-600/30 hover:scale-105 transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>تحويل كتاب PDF</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('ai_creator')}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-purple-600/30 hover:scale-105 transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Wand2 className="w-4 h-4 text-amber-300" />
                    <span>تأليف كتاب بالذكاء الاصطناعي</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Tab 2: New Book Conversion Workspace */}
        {activeTab === 'new_book' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white font-['Tajawal']">تحويل كتاب جديد (PDF / ePub)</h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  ارفع كتابك أو روايتك بصيغة PDF أو ePub أو الصق النص لاختيار القارئ الصوتي واللهجة والبدء في الاستماع المباشر.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('library')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                الرجوع لمكتبتي
              </button>
            </div>

            <ConversionTool
              onConversionStart={(job) => {
                onStartJob(job);
                loadBooks();
              }}
              onPreviewVoiceSample={() => {}}
              availableVoicesList={availableVoices}
            />
          </div>
        )}

        {/* Tab 3: AI Book Creator (From Idea to Complete PDF & Audiobook) */}
        {activeTab === 'ai_creator' && (
          <AIBookCreator
            onStartAudioJob={(job) => {
              onStartJob(job);
              loadBooks();
            }}
            availableVoices={availableVoices}
            onBackToLibrary={() => setActiveTab('library')}
          />
        )}

      </main>

      {/* User Settings Modal */}
      {showSettingsModal && (
        <UserSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          user={user}
        />
      )}

      {/* Chat With PDF Modal (From Library Card) */}
      {chatBook && (
        <ChatPdfModal
          isOpen={Boolean(chatBook)}
          onClose={() => setChatBook(null)}
          job={chatBook}
          availableVoices={availableVoices}
        />
      )}

    </div>
  );
};
