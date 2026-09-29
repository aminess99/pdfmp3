import React, { useState, useEffect } from 'react';
import { X, BookMarked, Play, Trash2, Clock, FileText, Cloud, User, Loader2 } from 'lucide-react';
import { ConversionJob } from '../types';
import { useAuth } from '../lib/AuthContext';
import { db, collection, query, where, getDocs, deleteDoc, doc } from '../lib/firebase';

interface AudioLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayJob: (job: ConversionJob) => void;
}

export const AudioLibraryModal: React.FC<AudioLibraryModalProps> = ({
  isOpen,
  onClose,
  onPlayJob,
}) => {
  const { user } = useAuth();
  const [library, setLibrary] = useState<ConversionJob[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadLibrary = async () => {
      setLoading(true);
      try {
        // 1. First get local saved items
        let combined: ConversionJob[] = [];
        try {
          const saved = JSON.parse(localStorage.getItem('pdf_audio_library') || '[]');
          combined = Array.isArray(saved) ? saved : [];
        } catch {
          combined = [];
        }

        // 2. If logged into Firebase, query Firestore audiobooks
        if (user && user.uid) {
          try {
            const q = query(collection(db, 'audiobooks'), where('userId', '==', user.uid));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((docSnap) => {
              const data = docSnap.data();
              // Prevent duplicate by id
              if (!combined.some(item => item.id === docSnap.id)) {
                combined.unshift({
                  id: docSnap.id,
                  fileName: data.fileName || 'كتاب صوتي',
                  fileSize: data.fileSize || '2.4 MB',
                  totalPages: data.totalPages || 12,
                  processedPages: data.processedPages || 12,
                  extractedText: data.extractedText || '',
                  selectedDialect: data.selectedDialect || { id: 'sa', name: 'سعودي نجدي', flag: '🇸🇦' },
                  selectedVoice: data.selectedVoice || { id: 'salman', name: 'سلمان الشمري', gender: 'male', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', description: '', sampleText: '', dialectId: 'sa' },
                  selectedStyle: data.selectedStyle || { id: 'podcast', name: 'بودكاست دافئ', description: '', icon: 'Mic' },
                  chapters: data.chapters,
                  status: 'completed',
                  progress: 100,
                  createdAt: data.createdAtStr || new Date().toLocaleDateString('ar-SA'),
                  audioUrl: data.audioUrl,
                });
              }
            });
          } catch (cloudErr) {
            console.warn('Firestore audiobooks fetch notice:', cloudErr);
          }
        }

        setLibrary(combined);
      } finally {
        setLoading(false);
      }
    };

    loadLibrary();
  }, [isOpen, user]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = library.filter(item => item.id !== id);
    setLibrary(updated);
    localStorage.setItem('pdf_audio_library', JSON.stringify(updated));

    // Delete from Firestore if exists
    if (user && user.uid) {
      try {
        await deleteDoc(doc(db, 'audiobooks', id));
      } catch (err) {
        console.warn('Cloud delete notice:', err);
      }
    }
  };

  const handleClearAll = () => {
    if (confirm('هل تريد بالتأكيد حذف جميع الكتب الصوتية المحفوظة محلياً؟')) {
      setLibrary([]);
      localStorage.removeItem('pdf_audio_library');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in" dir="rtl">
      <div className="relative w-full max-w-2xl bg-[#0f172a] rounded-3xl border border-blue-500/30 shadow-2xl p-5 sm:p-6 text-white space-y-4 max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black font-['Tajawal'] text-white">
                  مكتبتي الصوتية
                </h3>
                {user ? (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                    <Cloud className="w-3 h-3" />
                    متزامنة سحابياً
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    تخزين محلي
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {user ? `حساب: ${user.name} (${user.email})` : 'جميع كتبك وملفات الـ PDF التي تم تحويلها صوتياً'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-400 mx-auto animate-spin" />
              <p className="text-xs text-slate-400">جاري تحميل مكتبتك الصوتية...</p>
            </div>
          ) : library.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">مكتبتك الصوتية فارغة حالياً</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                قم برفع أي ملف PDF أو اختر كتاباً نموذجياً واضغط على "ابدأ التحويل" لحفظه في حسابك وتشغيله لاحقاً.
              </p>
            </div>
          ) : (
            library.map((job) => (
              <div
                key={job.id}
                onClick={() => {
                  onPlayJob(job);
                  onClose();
                }}
                className="p-3.5 sm:p-4 rounded-2xl bg-[#0d1322] border border-slate-800 hover:border-blue-500/50 cursor-pointer transition-all flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Play className="w-5 h-5 fill-current" />
                  </div>
                  <div className="truncate text-right">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-extrabold text-white truncate">
                        {job.fileName}
                      </h4>
                      {job.chapters && job.chapters.length > 1 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                          📚 {job.chapters.length} فصول
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{job.selectedDialect?.flag} {job.selectedDialect?.name}</span>
                      <span>•</span>
                      <span>{job.selectedVoice?.name}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {job.createdAt}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => handleDelete(job.id, e)}
                    className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                    title="حذف من المكتبة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {library.length > 0 && (
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>إجمالي الكتب الصوتية: {library.length}</span>
            <button
              onClick={handleClearAll}
              className="text-rose-400 hover:underline"
            >
              مسح الكل
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
