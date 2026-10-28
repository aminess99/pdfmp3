import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  MessageSquare, 
  Send, 
  Sparkles, 
  Volume2, 
  Square, 
  Bot, 
  User, 
  BookOpen, 
  HelpCircle, 
  CornerDownLeft,
  Loader2
} from 'lucide-react';
import { ConversionJob, Voice } from '../types';
import { audioEngine } from '../lib/audioEngine';

interface ChatPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: ConversionJob | null;
  availableVoices: Voice[];
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const ChatPdfModal: React.FC<ChatPdfModalProps> = ({
  isOpen,
  onClose,
  job,
  availableVoices,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'اسألني عن أي فكرة في هذا الكتاب، أو اطلب تلخيص فصل، أو استخراج أهم الدروس.',
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen || !job) return null;

  // Suggested questions based on book context
  const suggestions = [
    'ما هي الفكرة الجوهرية والرسالة الأساسية لهذا الكتاب؟',
    'لخص لي أهم 3 دروس عملية مستفادة من هذا الكتاب',
    'استخرج لي أفضل الاقتباسات والحكم الواردة في النص',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend || inputValue).trim();
    if (!queryText || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputValue('');
    setIsLoading(true);

    try {
      const bookContext = job.extractedText || 
        job.chapters?.map((c) => `${c.title}\n${c.text}`).join('\n\n') || 
        job.fileName;

      const res = await fetch('/api/ai/chat-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: queryText,
          bookText: bookContext,
          bookTitle: job.fileName,
          history: messages.map((m) => ({
            role: m.sender === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }],
          })),
        }),
      });

      const data = await res.json();
      if (data.success && data.answer) {
        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          text: data.answer,
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error('لم تصل إجابة من المساعد');
      }
    } catch (e: any) {
      console.error('Chat error:', e);
      const errorMsg: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: 'عذراً، حدث خطأ مؤقت أثناء الاتصال بمحرك الذكاء الاصطناعي. يرجى إعادة المحاولة.',
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Speak message response using current book voice
  const handleSpeakMessage = (msg: Message) => {
    if (speakingMsgId === msg.id) {
      audioEngine.stop();
      setSpeakingMsgId(null);
      return;
    }

    audioEngine.stop();
    setSpeakingMsgId(msg.id);

    const voice = job.selectedVoice || availableVoices[0];
    audioEngine.speak(
      msg.text,
      voice,
      job.selectedStyle || { id: 'normal', name: 'عادي', description: '', icon: '' },
      1.0,
      () => setSpeakingMsgId(null),
      () => setSpeakingMsgId(null)
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 font-body" dir="rtl">
      <div role="dialog" aria-modal="true" aria-labelledby="chat-title" className="w-full max-w-2xl h-[85dvh] sm:h-[620px] bg-card border border-line rounded-[20px] overflow-hidden flex flex-col text-slate-200">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 id="chat-title" className="font-display font-extrabold text-xl text-white">اسأل الكتاب</h2>
            <p className="text-sm text-slate-400 truncate">{job.fileName}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              audioEngine.stop();
              onClose();
            }}
            aria-label="إغلاق"
            className="w-11 h-11 rounded-full text-slate-400 hover:text-white hover:bg-raised flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4" aria-live="polite">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isSpeaking = speakingMsgId === msg.id;
            return (
              <div key={msg.id} className={`max-w-[85%] flex flex-col gap-1.5 ${isUser ? 'self-start' : 'self-end'}`}>
                <div className={`px-4 py-3 rounded-[14px] text-[15px] leading-relaxed whitespace-pre-wrap ${isUser ? 'bg-brand-deep text-white' : 'bg-ink border border-line text-slate-200'}`}>
                  {msg.text}
                </div>
                {!isUser && msg.id !== 'welcome' && (
                  <button
                    type="button"
                    onClick={() => handleSpeakMessage(msg)}
                    className="self-end flex items-center gap-1.5 min-h-9 px-2.5 rounded-lg text-[13px] text-brand-soft hover:bg-raised cursor-pointer"
                  >
                    {isSpeaking ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
                    {isSpeaking ? 'إيقاف' : 'استمع للإجابة'}
                  </button>
                )}
              </div>
            );
          })}
          {isLoading && (
            <div className="self-end flex items-center gap-2 px-4 py-3 rounded-[14px] bg-ink border border-line text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-accent" /> يقرأ الكتاب ويصيغ الإجابة...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {messages.length <= 2 && (
          <div className="px-4 py-3 border-t border-line flex flex-wrap gap-2 shrink-0">
            {suggestions.map((s, idx) => (
              <button key={idx} type="button" onClick={() => handleSendMessage(s)} className="min-h-10 px-3.5 rounded-full border border-line text-[13px] text-slate-300 hover:text-white hover:border-line-strong text-right cursor-pointer">
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 sm:p-4 border-t border-line flex items-center gap-2 shrink-0"
        >
          <label htmlFor="chat-input" className="sr-only">سؤالك عن الكتاب</label>
          <input
            id="chat-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="اسأل أي شيء عن هذا الكتاب..."
            disabled={isLoading}
            className="flex-1 min-h-12 bg-ink border border-line rounded-xl px-4 text-base text-white placeholder-slate-500 focus:outline-none focus:border-brand disabled:opacity-50"
          />
          <button type="submit" disabled={!inputValue.trim() || isLoading} className="min-h-12 px-5 rounded-xl bg-brand hover:bg-indigo-500 text-white font-semibold disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shrink-0">
            إرسال <Send className="w-4 h-4 rotate-180" />
          </button>
        </form>
      </div>
    </div>
  );
};
