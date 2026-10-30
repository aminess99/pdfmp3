import React from 'react';
import { BookOpen, Crown, Download, FileText, Headphones, ListChecks, MessageCircleQuestion, ScanText, Sparkles, Type, Wand2 } from 'lucide-react';
import { tr, isEn } from '../lib/i18n';

// What each tool needs, so the dashboard can act on a card
export type ToolId = 'pdf' | 'text' | 'ocr' | 'summaries' | 'voices' | 'ask' | 'summary' | 'download' | 'writer' | 'plans';

type Access = 'free' | 'daily' | 'plan';

interface Tool {
  id: ToolId;
  icon: React.ReactNode;
  title: string;
  text: string;
  access: Access;
  // Free daily allowance, shown on 'daily' tools (matches FREE_DAILY in server.ts)
  daily?: string;
}

const ICON = 'w-6 h-6';

const TOOLS: Tool[] = [
  { id: 'pdf', icon: <FileText className={ICON} />, title: tr('تحويل كتاب PDF إلى صوت', 'Book or PDF to audio'), text: tr('ارفع كتاباً واستمع إليه مقسّماً إلى فصول.', 'Upload a book and listen chapter by chapter.'), access: 'free' },
  { id: 'text', icon: <Type className={ICON} />, title: tr('تحويل النص إلى صوت', 'Text to speech'), text: tr('الصق مقالاً أو درساً واسمعه فوراً.', 'Paste an article or lesson and hear it at once.'), access: 'free' },
  { id: 'ocr', icon: <ScanText className={ICON} />, title: tr('قراءة الكتب المصورة (OCR)', 'Scanned books (OCR)'), text: tr('للكتب الممسوحة ضوئياً: يقرأ الذكاء الاصطناعي الصفحات المصورة ويحوّلها إلى نص.', 'For scanned books: AI reads the page images and turns them into text.'), access: 'free' },
  ...(isEn
    ? []
    : [{ id: 'summaries' as ToolId, icon: <BookOpen className={ICON} />, title: 'ملخصات الكتب الصوتية', text: 'أهم أفكار أشهر الكتب في ربع ساعة، ولا تُخصم من رصيدك.', access: 'free' as Access }]),
  { id: 'voices', icon: <Headphones className={ICON} />, title: tr('الأصوات واللهجات', 'Voices and dialects'), text: tr('استمع إلى عينات كل الأصوات واختر المفضّل لديك.', 'Hear a sample of every voice and pick a favourite.'), access: 'free' },
  { id: 'ask', icon: <MessageCircleQuestion className={ICON} />, title: tr('اسأل الكتاب', 'Ask the book'), text: tr('اطرح أي سؤال عن كتابك واحصل على إجابة من محتواه.', 'Ask anything about your book and get answers from it.'), access: 'daily', daily: tr('5 أسئلة يومياً', '5 questions a day') },
  { id: 'summary', icon: <ListChecks className={ICON} />, title: tr('ملخص الفصل وأهم النقاط', 'Chapter summary & key points'), text: tr('ملخص لكل فصل، أو أهم أفكاره في نقاط.', 'A summary of each chapter, or its key ideas as points.'), access: 'daily', daily: tr('ملخصان يومياً', '2 a day') },
  { id: 'download', icon: <Download className={ICON} />, title: tr('تحميل الصوت MP3', 'Download as MP3'), text: tr('حمّل الفصل أو الكتاب كاملاً واستمع بدون إنترنت.', 'Download a chapter or the whole book and listen offline.'), access: 'plan' },
  { id: 'writer', icon: <Wand2 className={ICON} />, title: tr('مؤلف الكتب بالذكاء الاصطناعي', 'AI book writer'), text: tr('اكتب فكرة، فيؤلف لك كتاباً كاملاً بفصوله وغلافه.', 'Describe an idea and get a full book with chapters and a cover.'), access: 'plan' },
];

interface ToolsPanelProps {
  isSubscriber: boolean;
  onOpen: (tool: ToolId) => void;
}

// Every tool in one place, each marked with what this account gets
export const ToolsPanel: React.FC<ToolsPanelProps> = ({ isSubscriber, onOpen }) => {
  const badge = (t: Tool) => {
    if (t.access === 'free') return { label: tr('مجاني', 'Free'), cls: 'bg-accent/15 text-accent' };
    if (isSubscriber) return { label: tr('بلا حد ✓', 'Unlimited ✓'), cls: 'bg-brand/20 text-brand-soft' };
    if (t.access === 'daily') return { label: t.daily!, cls: 'bg-amber-400/15 text-amber-300' };
    return { label: tr('للمشتركين', 'Subscribers'), cls: 'bg-amber-400/15 text-amber-300', crown: true };
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display font-extrabold text-[32px] text-white">{tr('الأدوات', 'Tools')}</h1>
        <p className="text-slate-400">{tr('كل ما يقدّمه Hakawati AI في مكان واحد.', 'Everything Hakawati AI offers, in one place.')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((t) => {
          const b = badge(t);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onOpen(t.id)}
              className="p-5 rounded-[18px] bg-card border border-line hover:border-line-strong text-start flex flex-col gap-3 cursor-pointer transition-colors"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="w-11 h-11 rounded-xl bg-raised text-brand-soft flex items-center justify-center shrink-0">{t.icon}</span>
                <span className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${b.cls}`}>
                  {'crown' in b && b.crown && <Crown className="w-3.5 h-3.5" />}
                  {b.label}
                </span>
              </span>
              <span className="text-white font-bold text-[17px]">{t.title}</span>
              <span className="text-slate-400 text-sm leading-relaxed">{t.text}</span>
            </button>
          );
        })}
      </div>

      {!isSubscriber && (
        <button
          type="button"
          onClick={() => onOpen('plans')}
          className="p-5 rounded-[18px] border border-brand/50 bg-brand-deep/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-start cursor-pointer hover:border-brand"
        >
          <span className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-accent shrink-0 mt-0.5" />
            <span className="flex flex-col gap-1">
              <strong className="text-white">{tr('افتح كل الأدوات بلا حد', 'Unlock every tool, unlimited')}</strong>
              <span className="text-sm text-slate-400">{tr('دقائق كل شهر، وتحميل MP3، وأسئلة وملخصات بلا حد، ومؤلف الكتب.', 'Monthly minutes, MP3 downloads, unlimited questions and summaries, and the book writer.')}</span>
            </span>
          </span>
          <span className="min-h-11 px-5 rounded-xl bg-brand text-white font-bold flex items-center justify-center shrink-0">{tr('عرض الباقات', 'See plans')}</span>
        </button>
      )}
    </div>
  );
};
