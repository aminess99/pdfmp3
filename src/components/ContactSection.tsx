import React, { useState } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2, PhoneCall, MapPin } from 'lucide-react';

export const ContactSection: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 4000);
  };

  return (
    <section id="contact" className="py-16 bg-[#090d16] border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-xs sm:text-sm font-semibold">
            <Mail className="w-4 h-4 text-purple-400" />
            <span>نحن هنا لمساعدتك</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-['Tajawal']">
            تواصل معنا
          </h2>
          <p className="text-slate-300 text-sm sm:text-base">
            لديك سؤال أو استفسار بخصوص خدمة PDFtoAudio؟ راسلنا وسنجيبك في أسرع وقت.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Contact Info */}
          <div className="lg:col-span-5 space-y-6 bg-[#0d1322] p-7 rounded-3xl border border-slate-800">
            <h3 className="text-xl font-extrabold text-white font-['Tajawal']">
              معلومات التواصل المباشر
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              فريق الدعم الفني لدينا متواجد على مدار الساعة لمساعدتك في استخراج الأصوات وتحويل كتبك.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold">البريد الإلكتروني</p>
                  <p className="text-sm font-bold text-white">support@pdftoaudio.com</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold">المحادثة الفورية</p>
                  <p className="text-sm font-bold text-emerald-400">متواجدون الآن (متاح 24/7)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Contact Form */}
          <div className="lg:col-span-7 bg-[#0d1322] p-7 rounded-3xl border border-slate-800">
            {submitted ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">تم إرسال رسالتك بنجاح!</h3>
                <p className="text-sm text-slate-300">سيتواصل معك فريقنا في أقرب وقت ممكن.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">الاسم الكامل</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="أحمد علي"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">البريد الإلكتروني</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@example.com"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">عنوان الموضوع</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="استفسار عن الباقة المحترفة"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">الرسالة</label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="اكتب استفسارك هنا..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4 translate-x-[-2px]" />
                  <span>إرسال الرسالة</span>
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </section>
  );
};
