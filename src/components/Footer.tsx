import React from 'react';
import { LANDING_PAGES, landingPath } from '../data/landingPages';
import { Headphones, Heart, Twitter, Facebook, Mail, ShieldCheck, FileText } from 'lucide-react';

interface FooterProps {
  onNavigate: (id: string) => void;
  onOpenLegal?: (type: 'terms' | 'privacy') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenLegal }) => {
  return (
    <footer className="bg-[#070a12] text-slate-400 border-t border-slate-800/80 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
          
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                <Headphones className="w-5 h-5" />
              </div>
              <span className="text-xl font-black text-white font-['Tajawal']">
                PDF<span className="text-blue-400">to</span><span className="text-purple-400">Audio</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              منصة عربية متطورة لتحويل كتب ومستندات PDF إلى مقاطع صوتية نقية بـ 30+ صوتاً و14 لهجة عربية.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-2">
            <h4 className="text-sm font-extrabold text-white">روابط سريعة</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-white transition-colors cursor-pointer">الرئيسية</button>
              </li>
              <li>
                <button onClick={() => onNavigate('features')} className="hover:text-white transition-colors cursor-pointer">الميزات والأصوات</button>
              </li>
              <li>
                <button onClick={() => onNavigate('pricing')} className="hover:text-white transition-colors cursor-pointer">خطط الأسعار ورصيد الدقائق</button>
              </li>
              <li>
                <button onClick={() => onNavigate('faq')} className="hover:text-white transition-colors cursor-pointer">الأسئلة الشائعة</button>
              </li>
            </ul>
          </div>

          {/* SEO landing pages */}
          <div className="space-y-2">
            <h4 className="text-sm font-extrabold text-white">أدوات صوتية</h4>
            <ul className="space-y-1.5 text-xs">
              {LANDING_PAGES.map((page) => (
                <li key={page.slug}>
                  <a href={landingPath(page)} className="hover:text-white transition-colors">{page.linkLabel}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Dialects */}
          <div className="space-y-2">
            <h4 className="text-sm font-extrabold text-white">اللهجات واللغات المدعومة</h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li>الفصحى المعاصرة 🌐</li>
              <li>المغربية (الدارجة) 🇲🇦</li>
              <li>السعودية 🇸🇦 • المصرية 🇪🇬</li>
              <li>الإماراتية، الشامية، الجزائرية...</li>
            </ul>
          </div>

          {/* Legal / Social */}
          <div className="space-y-3">
            <h4 className="text-sm font-extrabold text-white">تواصل ودعم المنصة</h4>
            <div className="flex items-center gap-3">
              <a href="mailto:support@pdftoaudio.ai" className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center hover:text-white hover:border-indigo-500 transition-colors">
                <Mail className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center hover:text-white hover:border-indigo-500 transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
            <p className="text-xs text-slate-500">
              جميع الحقوق محفوظة © 2026 PDFtoAudio.
            </p>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-slate-900 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>صُنِع بـ <Heart className="w-3.5 h-3.5 text-rose-500 inline fill-rose-500 mx-0.5" /> للقراء العرب</span>
          <div className="flex items-center gap-4 text-xs">
            <button 
              onClick={() => onOpenLegal && onOpenLegal('privacy')} 
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              سياسة الخصوصية
            </button>
            <span>•</span>
            <button 
              onClick={() => onOpenLegal && onOpenLegal('terms')} 
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              شروط الاستخدام
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
