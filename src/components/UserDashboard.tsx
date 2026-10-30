import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  LayoutGrid, 
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
import { minutesAr } from '../lib/arabicPlural';
import { BOOK_SUMMARIES, SUMMARIES_HUB_PATH, summaryPath } from '../data/summaries';
import { SummaryCover } from './SummaryPage';
import { ToolsPanel, ToolId } from './ToolsPanel';
import { VoiceSamplesSection } from './VoiceSamplesSection';
import { PricingSection } from './PricingSection';
import { SUBSCRIBE_EVENT } from '../lib/apiFetch';
import { listServerBooks, getServerBook, deleteServerBook, saveBookToServer, needsText } from '../lib/library';
import { apiFetch, fetchAccount, CREDITS_CHANGED_EVENT } from '../lib/apiFetch';
import { isEn, tr, DIR } from '../lib/i18n';
import { voiceLabel } from '../lib/voiceLabel';

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
  const [activeTab, setActiveTab] = useState<'library' | 'new_book' | 'ai_creator' | 'tools' | 'voices' | 'plans'>('library');
  // "Text to speech" and "PDF" open the same converter in a different mode
  const [convertMode, setConvertMode] = useState<'pdf' | 'text'>('pdf');
  // Tools that work on one of the user's books ask which book first
  const [toolPick, setToolPick] = useState<'ask' | 'summary' | 'download' | null>(null);
  // Listening minutes from the server (null: not enforced / not loaded yet)
  const [balanceSeconds, setBalanceSeconds] = useState<number | null>(null);
  const [isSubscriber, setIsSubscriber] = useState(false);
  useEffect(() => {
    fetchAccount().then((a) => {
      setBalanceSeconds(a ? a.secondsRemaining : null);
      setIsSubscriber(Boolean(a?.subscriber));
    });
    const onChange = (e: Event) => setBalanceSeconds((e as CustomEvent<number>).detail);
    window.addEventListener(CREDITS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CREDITS_CHANGED_EVENT, onChange);
  }, []);
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

    // Server library first: it holds whole books of any size, on every device
    if (authUser && authUser.uid) {
      const serverBooks = await listServerBooks();
      if (serverBooks) {
        // A copy saved in this browser keeps its text; the server one only lists chapters
        const byId = new Map(combined.map((b) => [b.id, b]));
        for (const b of serverBooks) if (!byId.has(b.id)) byId.set(b.id, b);
        combined = [...byId.values()];
        // Books saved before the server library existed: copy them up once, in the background
        const onServer = new Set(serverBooks.map((b) => b.id));
        const toUpload = combined.filter((b) => !onServer.has(b.id) && !needsText(b));
        (async () => {
          for (const b of toUpload) await saveBookToServer(b);
        })();
      }
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
              fileName: data.fileName || tr("كتاب صوتي", "Audiobook"),
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
        toast(tr("تعذّر تحميل مكتبتك من السحابة، نعرض الكتب المحفوظة في هذا المتصفح.", "Couldn’t load your cloud library; showing books saved in this browser."), 'error');
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
    if (!confirm(tr("هل تريد حذف هذا الكتاب من مكتبتك؟", "Delete this book from your library?"))) return;
    const updated = savedBooks.filter((b) => b.id !== id);
    setSavedBooks(updated);
    try {
      localStorage.setItem('pdf_audio_library', JSON.stringify(updated));
    } catch {}
    if (authUser?.uid) {
      deleteServerBook(id);
      try {
        await deleteDoc(doc(db, 'audiobooks', id));
      } catch (err) {
        console.warn('Delete book doc note:', err);
        toast(tr("حُذف الكتاب من هذا الجهاز، لكن تعذّر حذفه من السحابة.", "Deleted from this device, but it couldn’t be deleted from the cloud."), 'error');
        return;
      }
    }
    toast(tr("حُذف الكتاب من مكتبتك.", "Book deleted from your library."), 'success');
  };

  // Books listed from the server come without their text: fetch it before opening
  const [openingId, setOpeningId] = useState<string | null>(null);
  const loadFullBook = async (book: ConversionJob): Promise<ConversionJob | null> => {
    if (!needsText(book)) return book;
    setOpeningId(book.id);
    const full = await getServerBook(book.id);
    setOpeningId(null);
    if (!full || needsText(full)) {
      toast(tr("تعذّر تحميل نص الكتاب الآن، حاول بعد قليل.", "Couldn’t load the book’s text right now. Please try again shortly."), 'error');
      return null;
    }
    setSavedBooks((prev) => prev.map((b) => (b.id === full.id ? full : b)));
    return full;
  };
  const openBook = async (book: ConversionJob) => {
    const full = await loadFullBook(book);
    if (full) onStartJob(full);
  };

  const openTool = (tool: ToolId) => {
    setShowMobileDrawer(false);
    switch (tool) {
      case 'pdf':
      case 'ocr':
        setConvertMode('pdf');
        setActiveTab('new_book');
        if (tool === 'ocr') toast(tr('ارفع الكتاب المصوّر، ثم اضغط «جرّب المسح العميق» إن لم يظهر النص بوضوح.', 'Upload the scanned book, then press “Try a deep scan” if the text doesn’t come out clearly.'), 'info');
        return;
      case 'text':
        setConvertMode('text');
        setActiveTab('new_book');
        return;
      case 'summaries':
        window.location.href = SUMMARIES_HUB_PATH;
        return;
      case 'voices':
      case 'plans':
        setActiveTab(tool);
        return;
      case 'writer':
        if (!isSubscriber) {
          window.dispatchEvent(new CustomEvent(SUBSCRIBE_EVENT));
          return;
        }
        setActiveTab('ai_creator');
        return;
      case 'download':
        if (!isSubscriber) {
          window.dispatchEvent(new CustomEvent(SUBSCRIBE_EVENT));
          return;
        }
      // fall through: subscribers pick a book
      case 'ask':
      case 'summary':
        if (savedBooks.length === 0) {
          toast(tr('حوّل كتاباً أولاً، ثم استخدم هذه الأداة عليه.', 'Convert a book first, then use this tool on it.'), 'info');
          setConvertMode('pdf');
          setActiveTab('new_book');
          return;
        }
        setToolPick(tool);
    }
  };

  const applyToolToBook = async (book: ConversionJob) => {
    const tool = toolPick;
    setToolPick(null);
    const full = await loadFullBook(book);
    if (!full) return;
    if (tool === 'ask') setChatBook(full);
    else if (tool === 'summary') onStartJob({ ...full, initialPanel: 'summary' });
    else if (tool === 'download') {
      toast(tr('اضغط زر التحميل في الاستوديو لتحميل الفصل أو الكتاب كاملاً.', 'Press the download button in the studio to save a chapter or the whole book.'), 'info');
      onStartJob(full);
    }
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
  // Dodo's customer portal: update the card or cancel the monthly plan
  const [openingPortal, setOpeningPortal] = useState(false);
  const openBillingPortal = async () => {
    setOpeningPortal(true);
    try {
      const res = await apiFetch('/api/billing-portal', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      if (data.code === 'no_subscription') {
        toast(tr("ليس لديك اشتراك بعد. اختر باقة لتبدأ.", "You don’t have a plan yet. Pick one to start."), 'info');
        openCheckout();
      } else {
        toast(tr("تعذّر فتح إدارة الاشتراك الآن، حاول بعد قليل.", "Couldn’t open plan management right now. Please try again shortly."), 'error');
      }
    } catch {
      toast(tr("تعذّر فتح إدارة الاشتراك الآن، حاول بعد قليل.", "Couldn’t open plan management right now. Please try again shortly."), 'error');
    }
    setOpeningPortal(false);
  };

  const openCheckout = () =>
    onOpenCheckout?.({ id: 'popular', name: tr("باقة الشغوف", "Book lover"), priceUsd: 19.99, minutes: 666, unitRateUsd: 0.03 });

  const navItem = (active: boolean) =>
    `w-full min-h-11 flex items-center gap-2.5 px-3 rounded-[10px] text-[15px] text-start cursor-pointer transition-colors ${
      active ? 'bg-raised text-white' : 'text-slate-300 hover:bg-raised/60 hover:text-white'
    }`;

  const sidebar = (
    <nav aria-label={tr("القائمة الجانبية", "Sidebar")} className="flex flex-col gap-1 h-full">
      <img src="/brand/logo.png" alt="Hakawati AI" width={151} height={32} className="h-8 w-auto self-start mx-2 mb-5" />
      <button
        type="button"
        onClick={() => {
          setActiveTab('new_book');
          setShowMobileDrawer(false);
        }}
        className="flex items-center justify-center gap-2 min-h-12 rounded-xl bg-gradient-to-l from-[#8b5cf6] to-[#3b82f6] text-white font-bold mb-3 cursor-pointer"
      >
        <Plus className="w-[18px] h-[18px]" /> {tr(tr("تحويل جديد", "New conversion"), 'New conversion')}
      </button>
      <button type="button" aria-current={activeTab === 'library'} onClick={() => { setActiveTab('library'); setShowMobileDrawer(false); }} className={navItem(activeTab === 'library')}>
        <Library className="w-[18px] h-[18px]" /> {tr(tr("مكتبتي", "My library"), 'My library')}
        <span className="ms-auto text-xs text-slate-400">{savedBooks.length}</span>
      </button>
      <button type="button" aria-current={activeTab === 'tools'} onClick={() => { setActiveTab('tools'); setShowMobileDrawer(false); }} className={navItem(['tools', 'voices', 'plans'].includes(activeTab))}>
        <LayoutGrid className="w-[18px] h-[18px]" /> {tr('الأدوات', 'Tools')}
      </button>
      <button type="button" aria-current={activeTab === 'ai_creator'} onClick={() => { setActiveTab('ai_creator'); setShowMobileDrawer(false); }} className={navItem(activeTab === 'ai_creator')}>
        <Wand2 className="w-[18px] h-[18px]" /> {tr('تأليف كتاب', 'Write a book')}
      </button>
      {!isEn && (
        <a href={SUMMARIES_HUB_PATH} className={navItem(false)}>
          <BookOpen className="w-[18px] h-[18px]" /> ملخصات الكتب
          <span className="ms-auto text-[11px] px-1.5 py-0.5 rounded-md bg-accent/15 text-accent font-semibold">مجاناً</span>
        </a>
      )}
      <button type="button" onClick={() => { setShowSettingsModal(true); setShowMobileDrawer(false); }} className={navItem(false)}>
        <Settings className="w-[18px] h-[18px]" /> {tr(tr("الإعدادات", "Settings"), 'Settings')}
      </button>

      <div className="mt-auto flex flex-col gap-3">
        <div className="p-4 rounded-[14px] bg-card border border-line flex flex-col gap-2.5">
          <span className="flex justify-between gap-2 text-sm">
            <span className="text-slate-400 flex items-center gap-1.5">
              {tr("رصيدك", "Your balance")}
              {isSubscriber && <span className="px-1.5 py-0.5 rounded-md bg-brand/20 text-brand-soft text-[11px] font-semibold">{tr("مشترك", "Subscriber")}</span>}
            </span>
            <strong className="text-white">{balanceSeconds === null ? '—' : minutesAr(Math.floor(balanceSeconds / 60))}</strong>
          </span>
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <button type="button" onClick={openCheckout} className="text-sm text-brand-soft hover:text-indigo-200 cursor-pointer">
              {isSubscriber ? tr("تغيير الباقة", "Change plan") : tr("اشترك في باقة", "Get a plan")}
            </button>
            <button type="button" onClick={openBillingPortal} disabled={openingPortal} className="text-sm text-slate-400 hover:text-white cursor-pointer disabled:opacity-60">
              {tr("إدارة الاشتراك", "Manage plan")}
            </button>
          </span>
        </div>
        <div className="flex items-center gap-2.5 px-2">
          <span className="w-9 h-9 rounded-full bg-brand-deep text-indigo-200 flex items-center justify-center font-bold shrink-0">
            {user.name ? user.name.charAt(0).toUpperCase() : tr('م', 'U')}
          </span>
          <span className="flex flex-col leading-tight min-w-0">
            <span className="text-sm text-white truncate">{user.name || tr('المشترك', 'Member')}</span>
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
          <LogOut className="w-[18px] h-[18px]" /> {tr('تسجيل الخروج', 'Log out')}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-ink text-slate-200 flex font-body" dir={DIR}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[260px] shrink-0 border-e border-raised p-4 sticky top-0 h-screen">{sidebar}</aside>

      {/* Mobile drawer */}
      {showMobileDrawer && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/80" onClick={() => setShowMobileDrawer(false)}>
          <div onClick={(e) => e.stopPropagation()} className="absolute inset-y-0 start-0 w-[280px] max-w-[85vw] bg-card border-e border-line p-4 overflow-y-auto">
            <button type="button" onClick={() => setShowMobileDrawer(false)} aria-label={tr("إغلاق القائمة", "Close menu")} className="absolute top-3 end-3 w-11 h-11 flex items-center justify-center text-slate-300 cursor-pointer">
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
          <button type="button" onClick={() => setShowMobileDrawer(true)} aria-label={tr("فتح القائمة", "Open menu")} className="w-11 h-11 rounded-[10px] bg-raised flex items-center justify-center cursor-pointer">
            <Menu className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 w-full max-w-[1160px] mx-auto px-4 sm:px-8 lg:px-10 pt-6 pb-24 md:py-8">
          {activeTab === 'library' && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="font-display font-extrabold text-[32px] text-white">{tr("مكتبتي", "My library")}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="relative">
                    <span className="sr-only">{tr("ابحث في كتبك", "Search your books")}</span>
                    <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={tr("ابحث في كتبك...", "Search your books...")}
                      className="min-h-11 w-56 bg-card border border-line rounded-full ps-9 pe-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand"
                    />
                  </label>
                  <div role="tablist" aria-label={tr("تصفية الكتب", "Filter books")} className="flex gap-1.5">
                    {([
                      { id: 'all', label: tr("الكل", "All") },
                      { id: 'progress', label: tr("قيد الاستماع", "In progress") },
                      { id: 'new', label: tr("لم تبدأ", "Not started") },
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
                  onClick={() => openBook(continueBook)}
                  className="flex items-center gap-5 p-5 rounded-[18px] bg-card border border-line text-start hover:border-line-strong cursor-pointer"
                >
                  <span aria-hidden="true" className="w-[72px] h-[100px] shrink-0 rounded-lg bg-gradient-to-br from-indigo-900 to-slate-900 border border-indigo-800" />
                  <span className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <span className="text-[13px] text-accent font-semibold">{tr("تابع الاستماع", "Continue listening")}</span>
                    <span className="font-display font-extrabold text-[22px] text-white truncate">{cleanBookTitle(continueBook.fileName)}</span>
                    <span className="text-sm text-slate-400">{tr('بصوت', 'Voice:')} {continueBook.selectedVoice ? voiceLabel(continueBook.selectedVoice) : tr('عربي', 'Arabic')}</span>
                    <span className="relative h-[5px] max-w-[420px] rounded-full bg-line">
                      <span className="absolute top-0 start-0 h-full rounded-full bg-accent" style={{ width: `${progressOf(continueBook)}%` }} />
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
                          onClick={() => openBook(book)}
                          aria-busy={openingId === book.id}
                          className={`relative aspect-[3/4] rounded-[10px] border border-line flex items-end p-3.5 text-start font-display font-extrabold text-base text-indigo-50 cursor-pointer hover:border-line-strong ${openingId === book.id ? 'animate-pulse' : ''}`}
                          style={{ background: `linear-gradient(160deg, ${COVER_HUES[i % COVER_HUES.length]}, #0b0f19)` }}
                          aria-label={tr(`استمع إلى ${title}`, `Listen to ${title}`)}
                        >
                          <span className="line-clamp-3">{title}</span>
                          <span className="absolute top-2.5 end-2.5 w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="w-4 h-4 fill-current" />
                          </span>
                        </button>
                        <span className="flex flex-col leading-snug">
                          <span className="font-semibold text-white truncate">{title}</span>
                          <span className="text-[13px] text-slate-400">
                            {pct > 0 ? `${pct}%` : tr('لم يبدأ', 'Not started')} · {minutes} {tr('د', 'min')} · {book.selectedVoice ? voiceLabel(book.selectedVoice).split(' (')[0] : ''}
                          </span>
                        </span>
                        <span className="relative h-1 rounded-full bg-line">
                          <span className="absolute top-0 start-0 h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                        </span>
                        <span className="flex gap-1">
                          <button type="button" onClick={() => setChatBook(book)} className="min-h-9 px-2.5 rounded-lg text-[13px] text-brand-soft hover:bg-raised cursor-pointer">
                            {tr("اسأل الكتاب", "Ask the book")}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteBook(book.id, e)}
                            aria-label={tr(`حذف ${title}`, `Delete ${title}`)}
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
                  <strong className="text-xl text-white">{savedBooks.length === 0 ? tr('مكتبتك فارغة', 'Your library is empty') : tr('لا نتائج', 'No results')}</strong>
                  <span className="text-slate-400 max-w-[320px]">
                    {savedBooks.length === 0 ? tr('حوّل أول كتاب وسيُحفظ هنا مع مكان توقفك.', 'Convert your first book and it will be saved here with your place.') : tr('جرّب كلمة بحث أو تصفية أخرى.', 'Try another search or filter.')}
                  </span>
                  {savedBooks.length === 0 && (
                    <button type="button" onClick={() => setActiveTab('new_book')} className="min-h-12 px-6 rounded-xl bg-brand text-white font-bold cursor-pointer">
                      {tr("حوّل أول كتاب", "Convert your first book")}
                    </button>
                  )}
                </div>
              )}
              {/* Free audio summaries, Arabic only */}
              {!isEn && (
                <section aria-labelledby="dash-summaries" className="flex flex-col gap-4 pt-4 border-t border-line">
                  <div className="flex items-end justify-between gap-3">
                    <span className="flex flex-col gap-1">
                      <h2 id="dash-summaries" className="font-display font-extrabold text-xl text-white">ملخصات كتب صوتية مجانية</h2>
                      <span className="text-sm text-slate-400">أهم أفكار أشهر الكتب في ربع ساعة، ولا تُخصم من رصيدك.</span>
                    </span>
                    <a href={SUMMARIES_HUB_PATH} className="shrink-0 text-sm text-brand-soft hover:text-indigo-200">كل الملخصات</a>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                    {BOOK_SUMMARIES.slice(-6).reverse().map((s) => (
                      <a key={s.slug} href={summaryPath(s)} className="flex flex-col gap-2 group">
                        <SummaryCover summary={s} />
                        <span className="text-xs sm:text-sm text-slate-300 group-hover:text-white line-clamp-2">{s.bookTitle}</span>
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {activeTab === 'tools' && <ToolsPanel isSubscriber={isSubscriber} onOpen={openTool} />}

          {activeTab === 'voices' && (
            <div className="flex flex-col gap-4">
              <button type="button" onClick={() => setActiveTab('tools')} className="self-start text-sm text-brand-soft hover:text-indigo-200 cursor-pointer">← {tr('الأدوات', 'Tools')}</button>
              <div className="-mx-4 sm:-mx-6">
                <VoiceSamplesSection availableVoicesList={availableVoices} />
              </div>
            </div>
          )}

          {activeTab === 'plans' && (
            <div className="flex flex-col gap-4">
              <button type="button" onClick={() => setActiveTab('tools')} className="self-start text-sm text-brand-soft hover:text-indigo-200 cursor-pointer">← {tr('الأدوات', 'Tools')}</button>
              <div className="-mx-4 sm:-mx-6">
                <PricingSection
                  onSelectPlan={(id, minutes, price) => {
                    const names: Record<string, string> = { starter: tr('باقة القارئ', 'Reader'), popular: tr('باقة الشغوف', 'Book lover'), master: tr('باقة النخبة', 'Pro') };
                    onOpenCheckout?.({ id, name: names[id] || id, priceUsd: price, minutes, unitRateUsd: price / minutes });
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'new_book' && (
            <div className="flex flex-col gap-6 items-center">
              <div className="text-center flex flex-col gap-2">
                <h1 className="font-display font-extrabold text-[32px] text-white">{tr("تحويل جديد", "New conversion")}</h1>
                <p className="text-slate-400">{tr("ارفع كتاباً أو الصق نصاً، اختر الصوت، واستمع.", "Upload a book or paste text, pick a voice, and listen.")}</p>
              </div>
              <div className="w-full max-w-[760px]">
                <ConversionTool
                  key={convertMode}
                  initialInputMode={convertMode}
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

      {/* Phone: bottom navigation */}
      <nav aria-label={tr("التنقل", "Navigation")} className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-line grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {([
          ['library', tr("مكتبتي", "My library"), Library],
          ['new_book', tr("تحويل", "Convert"), Plus],
          ['tools', tr("الأدوات", "Tools"), LayoutGrid],
        ] as const).map(([tab, label, Icon]) => (
          <button
            key={tab}
            type="button"
            aria-current={activeTab === tab ? 'page' : undefined}
            onClick={() => {
              if (tab === 'new_book') setConvertMode('pdf');
              setActiveTab(tab);
              window.scrollTo({ top: 0 });
            }}
            className={`min-h-16 flex flex-col items-center justify-center gap-1 text-[12px] cursor-pointer ${activeTab === tab || (tab === 'tools' && ['voices', 'plans', 'ai_creator'].includes(activeTab)) ? 'text-white' : 'text-slate-400'}`}
          >
            <Icon className={`w-[22px] h-[22px] ${activeTab === tab || (tab === 'tools' && ['voices', 'plans', 'ai_creator'].includes(activeTab)) ? 'text-accent' : ''}`} />
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowSettingsModal(true)}
          className="min-h-16 flex flex-col items-center justify-center gap-1 text-[12px] text-slate-400 cursor-pointer"
        >
          <Settings className="w-[22px] h-[22px]" />
          {tr("الإعدادات", "Settings")}
        </button>
      </nav>

      {showSettingsModal && <UserSettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} user={user} />}

      {toolPick && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85" dir={DIR} onClick={() => setToolPick(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="pick-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-[440px] max-h-[80vh] bg-card border border-line rounded-[20px] p-6 flex flex-col gap-4">
            <h2 id="pick-title" className="font-display font-extrabold text-xl text-white">{tr('اختر كتاباً', 'Choose a book')}</h2>
            <ul className="flex flex-col gap-2 overflow-y-auto">
              {savedBooks.map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => applyToolToBook(b)} className="w-full min-h-12 px-4 rounded-xl bg-raised hover:bg-line-strong text-start text-white cursor-pointer truncate">
                    {cleanBookTitle(b.fileName)}
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setToolPick(null)} className="min-h-11 rounded-xl border border-line text-slate-300 hover:text-white cursor-pointer">{tr('إلغاء', 'Cancel')}</button>
          </div>
        </div>
      )}
      {chatBook && <ChatPdfModal isOpen={Boolean(chatBook)} onClose={() => setChatBook(null)} job={chatBook} availableVoices={availableVoices} />}
    </div>
  );
};
