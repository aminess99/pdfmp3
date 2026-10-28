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
import { cleanBookTitle } from '../lib/bookTitle';
import { toast } from '../lib/toast';
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
              fileSize: data.fileSize || '',
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
        toast('تعذّر تحميل مكتبتك من السحابة، نعرض الكتب المحفوظة في هذا المتصفح.', 'error');
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
        toast('حُذف الكتاب من هذا الجهاز، لكن تعذّر حذفه من السحابة.', 'error');
        return;
      }
    }
    toast('حُذف الكتاب من مكتبتك.', 'success');
  };

  const [filter, setFilter] = useState<'all' | 'progress' | 'new'>('all');

  // Listening position saved by the studio (studio_pos_<id>) -> rough progress %
  const progressOf = (book: ConversionJob): number => {
    try {
      const pos = JSON.parse(localStorage.getItem(`studio_pos_${book.id}`) || 'null');
      if (!pos) return 0;
      const total = book.chapters && book.chapters.length > 0 ? book.chapters.length : 1;
      return Math.min(99, Math.max(3, Math.round(((pos.chapter + 0.5) / total) * 100)));
    } catch {
      return 0;
    }
  };

  const filteredBooks = savedBooks
    .filter((b) => cleanBookTitle(b.fileName).toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((b) => (filter === 'progress' ? progressOf(b) > 0 : filter === 'new' ? progressOf(b) === 0 : true));
  const continueBook = savedBooks.find((b) => progressOf(b) > 0);
  const COVER_HUES = ['#312e81', '#164e63', '#3b0764', '#1e3a8a', '#134e4a', '#4c1d95'];
  const balance = localStorage.getItem('user_minutes_quota') || '30';
  const openCheckout = () =>
    onOpenCheckout?.({ id: 'popular', name: 'باقة الشغوف', priceUsd: 19.99, minutes: 666, unitRateUsd: 0.03 });

  const navItem = (active: boolean) =>
    `w-full min-h-11 flex items-center gap-2.5 px-3 rounded-[10px] text-[15px] text-right cursor-pointer transition-colors ${
      active ? 'bg-raised text-white' : 'text-slate-300 hover:bg-raised/60 hover:text-white'
    }`;

  const sidebar = (
    <nav aria-label="القائمة الجانبية" className="flex flex-col gap-1 h-full">
      <img src="/brand/logo.png" alt="Hakawati AI" width={151} height={32} className="h-8 w-auto self-start mx-2 mb-5" />
      <button
        type="button"
        onClick={() => {
          setActiveTab('new_book');
          setShowMobileDrawer(false);
        }}
        className="flex items-center justify-center gap-2 min-h-12 rounded-xl bg-gradient-to-l from-[#8b5cf6] to-[#3b82f6] text-white font-bold mb-3 cursor-pointer"
      >
        <Plus className="w-[18px] h-[18px]" /> تحويل جديد
      </button>
      <button type="button" aria-current={activeTab === 'library'} onClick={() => { setActiveTab('library'); setShowMobileDrawer(false); }} className={navItem(activeTab === 'library')}>
        <Library className="w-[18px] h-[18px]" /> مكتبتي
        <span className="mr-auto text-xs text-slate-400">{savedBooks.length}</span>
      </button>
      <button type="button" aria-current={activeTab === 'ai_creator'} onClick={() => { setActiveTab('ai_creator'); setShowMobileDrawer(false); }} className={navItem(activeTab === 'ai_creator')}>
        <Wand2 className="w-[18px] h-[18px]" /> تأليف كتاب
      </button>
      <button type="button" onClick={() => { setShowSettingsModal(true); setShowMobileDrawer(false); }} className={navItem(false)}>
        <Settings className="w-[18px] h-[18px]" /> الإعدادات
      </button>

      <div className="mt-auto flex flex-col gap-3">
        <div className="p-4 rounded-[14px] bg-card border border-line flex flex-col gap-2.5">
          <span className="flex justify-between text-sm">
            <span className="text-slate-400">رصيدك</span>
            <strong className="text-white">{balance} دقيقة</strong>
          </span>
          <button type="button" onClick={openCheckout} className="self-start text-sm text-brand-soft hover:text-indigo-200 cursor-pointer">
            شحن الرصيد
          </button>
        </div>
        <div className="flex items-center gap-2.5 px-2">
          <span className="w-9 h-9 rounded-full bg-brand-deep text-indigo-200 flex items-center justify-center font-bold shrink-0">
            {user.name ? user.name.charAt(0).toUpperCase() : 'م'}
          </span>
          <span className="flex flex-col leading-tight min-w-0">
            <span className="text-sm text-white truncate">{user.name || 'المشترك'}</span>
            <span className="text-xs text-slate-400 truncate" dir="ltr">{user.email}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowMobileDrawer(false);
            onLogout();
          }}
          className="flex items-center gap-2 min-h-11 px-3 rounded-[10px] text-slate-400 hover:text-rose-300 hover:bg-raised/60 cursor-pointer"
        >
          <LogOut className="w-[18px] h-[18px]" /> تسجيل الخروج
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-ink text-slate-200 flex font-body" dir="rtl">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[260px] shrink-0 border-l border-raised p-4 sticky top-0 h-screen">{sidebar}</aside>

      {/* Mobile drawer */}
      {showMobileDrawer && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/80" onClick={() => setShowMobileDrawer(false)}>
          <div onClick={(e) => e.stopPropagation()} className="absolute inset-y-0 right-0 w-[280px] max-w-[85vw] bg-card border-l border-line p-4 overflow-y-auto">
            <button type="button" onClick={() => setShowMobileDrawer(false)} aria-label="إغلاق القائمة" className="absolute top-3 left-3 w-11 h-11 flex items-center justify-center text-slate-300 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden h-16 px-4 border-b border-raised flex items-center justify-between">
          <img src="/brand/logo.png" alt="Hakawati AI" width={151} height={32} className="h-8 w-auto" />
          <button type="button" onClick={() => setShowMobileDrawer(true)} aria-label="فتح القائمة" className="w-11 h-11 rounded-[10px] bg-raised flex items-center justify-center cursor-pointer">
            <Menu className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 w-full max-w-[1160px] mx-auto px-4 sm:px-8 lg:px-10 py-6 sm:py-8">
          {activeTab === 'library' && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="font-display font-extrabold text-[32px] text-white">مكتبتي</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="relative">
                    <span className="sr-only">ابحث في كتبك</span>
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث في كتبك..."
                      className="min-h-11 w-56 bg-card border border-line rounded-full pr-9 pl-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand"
                    />
                  </label>
                  <div role="tablist" aria-label="تصفية الكتب" className="flex gap-1.5">
                    {([
                      { id: 'all', label: 'الكل' },
                      { id: 'progress', label: 'قيد الاستماع' },
                      { id: 'new', label: 'لم تبدأ' },
                    ] as const).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        role="tab"
                        aria-selected={filter === f.id}
                        onClick={() => setFilter(f.id)}
                        className={`min-h-11 px-4 rounded-full text-sm border cursor-pointer ${
                          filter === f.id ? 'border-brand bg-brand-deep text-white' : 'border-line text-slate-300 hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {continueBook && filter !== 'new' && !searchQuery && (
                <button
                  type="button"
                  onClick={() => onStartJob(continueBook)}
                  className="flex items-center gap-5 p-5 rounded-[18px] bg-card border border-line text-right hover:border-line-strong cursor-pointer"
                >
                  <span aria-hidden="true" className="w-[72px] h-[100px] shrink-0 rounded-lg bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-800" />
                  <span className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <span className="text-[13px] text-accent font-semibold">تابع الاستماع</span>
                    <span className="font-display font-extrabold text-[22px] text-white truncate">{cleanBookTitle(continueBook.fileName)}</span>
                    <span className="text-sm text-slate-400">بصوت {continueBook.selectedVoice?.name?.split(' - ')[0] || 'عربي'}</span>
                    <span className="relative h-[5px] max-w-[420px] rounded-full bg-line">
                      <span className="absolute top-0 right-0 h-full rounded-full bg-accent" style={{ width: `${progressOf(continueBook)}%` }} />
                    </span>
                  </span>
                  <span className="w-14 h-14 shrink-0 rounded-full bg-brand text-white flex items-center justify-center">
                    <Play className="w-5 h-5 fill-current" />
                  </span>
                </button>
              )}

              {loadingBooks ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className="aspect-[3/4] rounded-[10px] bg-card animate-pulse" />
                  ))}
                </div>
              ) : filteredBooks.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
                  {filteredBooks.map((book, i) => {
                    const title = cleanBookTitle(book.fileName);
                    const pct = progressOf(book);
                    const minutes = Math.max(1, Math.round((book.durationInSeconds || 300) / 60));
                    return (
                      <div key={book.id} className="group flex flex-col gap-2.5">
                        <button
                          type="button"
                          onClick={() => onStartJob(book)}
                          className="relative aspect-[3/4] rounded-[10px] border border-line flex items-end p-3.5 text-right font-display font-extrabold text-base text-indigo-50 cursor-pointer hover:border-line-strong"
                          style={{ background: `linear-gradient(160deg, ${COVER_HUES[i % COVER_HUES.length]}, #0b0f19)` }}
                          aria-label={`استمع إلى ${title}`}
                        >
                          <span className="line-clamp-3">{title}</span>
                          <span className="absolute top-2.5 left-2.5 w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-4 h-4 fill-current" />
                          </span>
                        </button>
                        <span className="flex flex-col leading-snug">
                          <span className="font-semibold text-white truncate">{title}</span>
                          <span className="text-[13px] text-slate-400">
                            {pct > 0 ? `${pct}%` : 'لم يبدأ'} · {minutes} د · {book.selectedVoice?.name?.split(' (')[0] || ''}
                          </span>
                        </span>
                        <span className="relative h-1 rounded-full bg-line">
                          <span className="absolute top-0 right-0 h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="flex gap-1">
                          <button type="button" onClick={() => setChatBook(book)} className="min-h-9 px-2.5 rounded-lg text-[13px] text-brand-soft hover:bg-raised cursor-pointer">
                            اسأل الكتاب
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteBook(book.id, e)}
                            aria-label={`حذف ${title}`}
                            className="min-h-9 w-9 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-raised flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="min-h-[360px] rounded-2xl border-[1.5px] border-dashed border-line flex flex-col items-center justify-center gap-3 text-center p-6">
                  <strong className="text-xl text-white">{savedBooks.length === 0 ? 'مكتبتك فارغة' : 'لا نتائج'}</strong>
                  <span className="text-slate-400 max-w-[320px]">
                    {savedBooks.length === 0 ? 'حوّل أول كتاب وسيُحفظ هنا مع مكان توقفك.' : 'جرّب كلمة بحث أو تصفية أخرى.'}
                  </span>
                  {savedBooks.length === 0 && (
                    <button type="button" onClick={() => setActiveTab('new_book')} className="min-h-12 px-6 rounded-xl bg-brand text-white font-bold cursor-pointer">
                      حوّل أول كتاب
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'new_book' && (
            <div className="flex flex-col gap-6 items-center">
              <div className="text-center flex flex-col gap-2">
                <h1 className="font-display font-extrabold text-[32px] text-white">تحويل جديد</h1>
                <p className="text-slate-400">ارفع كتاباً أو الصق نصاً، اختر الصوت، واستمع.</p>
              </div>
              <div className="w-full max-w-[760px]">
                <ConversionTool
                  onConversionStart={(job) => {
                    onStartJob(job);
                    loadBooks();
                  }}
                  onPreviewVoiceSample={() => {}}
                  availableVoicesList={availableVoices}
                />
              </div>
            </div>
          )}

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
      </div>

      {showSettingsModal && <UserSettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} user={user} />}

      {chatBook && <ChatPdfModal isOpen={Boolean(chatBook)} onClose={() => setChatBook(null)} job={chatBook} availableVoices={availableVoices} />}
    </div>
  );
};
