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
      text: `مرحباً بك! أنا مساعدك الذكي لكتاب "${job?.fileName || 'كتابك الصوتي'}". يمكنك سؤالي عن أي فكرة، طلب تلخيص فصل معين، أو استخراج الدروس والعبر الرئيسية وسأجيبك فوراً!`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in font-['Cairo',sans-serif]" dir="rtl">
      <div className="relative w-full max-w-2xl bg-[#0c1220] border border-blue-500/40 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col h-[85vh] sm:h-[600px]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-950 via-indigo-950 to-blue-950 border-b border-blue-900/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white font-['Tajawal']">
                  تحدث واسأل كتابك (Chat With PDF)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold">
                  Gemini 3.8
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate max-w-[280px] sm:max-w-md">
                الكتاب: {job.fileName}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              audioEngine.stop();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const isSpeaking = speakingMsgId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar Icon */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gradient-to-br from-indigo-600 to-purple-600 text-cyan-300'
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div className={`max-w-[82%] sm:max-w-[75%] p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed space-y-2 ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-md'
                    : 'bg-[#121a2d] border border-blue-900/50 text-slate-200 rounded-tl-none shadow-md'
                }`}>
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  
                  <div className={`flex items-center justify-between pt-1 border-t ${
                    isUser ? 'border-blue-500/40 text-blue-200' : 'border-slate-800 text-slate-400'
                  } text-[10px]`}>
                    <span>{msg.timestamp}</span>

                    {!isUser && (
                      <button
                        onClick={() => handleSpeakMessage(msg)}
                        className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                          isSpeaking
                            ? 'bg-rose-600/30 text-rose-300 border-rose-500/50 animate-pulse'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-cyan-300 border-slate-700'
                        }`}
                        title="استمع للإجابة بصوت القارئ"
                      >
                        {isSpeaking ? (
                          <>
                            <Square className="w-3 h-3 fill-current" />
                            <span>إيقاف الصوت</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>نطق الإجابة 🔊</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-cyan-300">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-[#121a2d] border border-blue-900/50 text-xs text-slate-300 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>المساعد يقرأ صفحات الكتاب ويصيغ الإجابة...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Pills (if few messages) */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 bg-[#090e1a] border-t border-slate-800/80 flex flex-wrap gap-2 shrink-0">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(s)}
                className="px-3 py-1.5 rounded-xl bg-[#121c30] hover:bg-[#1a2742] border border-blue-900/40 text-[11px] text-cyan-300 transition-all text-right cursor-pointer"
              >
                💡 {s}
              </button>
            ))}
          </div>
        )}

        {/* Input Form Area */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 sm:p-4 bg-[#090e1a] border-t border-blue-900/40 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="اسأل أي سؤال حول محتوى وفصول هذا الكتاب..."
            disabled={isLoading}
            className="flex-1 bg-[#11192e] border border-slate-700/80 rounded-2xl py-3 px-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-4 sm:px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 disabled:opacity-40 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>إرسال</span>
            <Send className="w-3.5 h-3.5 rotate-180" />
          </button>
        </form>

      </div>
    </div>
  );
};
