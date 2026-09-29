import React from 'react';
import { Zap, ShieldCheck, Laptop, Download, Play, Volume2, FileText, Headphones, Sparkles, Smartphone, Cloud } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative overflow-hidden pt-8 pb-10 lg:pt-12 lg:pb-14 bg-[#0b0f19]">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-10 right-10 w-[450px] h-[450px] bg-purple-600/15 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* LEFT COLUMN: Hero Text (Headline & Badges) */}
          <div className="lg:col-span-7 space-y-6 text-right" dir="rtl">
            
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-300 text-xs sm:text-sm font-bold shadow-inner">
              <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400" />
              <span>تحويل سريع ودقيق</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.18] tracking-tight font-['Tajawal']">
              حوّل <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300 underline decoration-purple-500/40 decoration-wavy decoration-2">كُتب</span> PDF إلى صوت
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl font-normal">
              استمتع بقراءة كتابك المفضلة بصوت طبيعي وواقعي، مع دعم لأكثر من <span className="text-blue-400 font-bold">30 صوتاً</span> و<span className="text-purple-400 font-bold">14 لهجة عربية</span>.
            </p>

            {/* Badges in the exact order shown in screenshot:
                [آمن وموثوق] [يعمل على كل الأجهزة] [بدون تثبيت] */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 text-xs sm:text-sm font-semibold shadow-sm">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>آمن وموثوق</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 text-xs sm:text-sm font-semibold shadow-sm">
                <Cloud className="w-4 h-4 text-blue-400" />
                <span>يعمل على كل الأجهزة</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 text-xs sm:text-sm font-semibold shadow-sm">
                <Smartphone className="w-4 h-4 text-blue-400" />
                <span>بدون تثبيت</span>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: 3D Visual Art (PDF -> Audio Player with Headphones) */}
          <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[460px] aspect-[1.2] flex items-center justify-center">
              
              {/* Radial background glowing mesh */}
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/30 via-purple-900/20 to-blue-900/30 rounded-3xl blur-2xl -z-10" />

              {/* Curved label: "من صفحات إلى صوت" at the bottom right */}
              <div className="absolute bottom-1 right-1 sm:-right-2 text-xs sm:text-sm font-bold text-slate-400 tracking-wide transform rotate-[-8deg] pointer-events-none select-none">
                من صفحات إلى صوت 🎧
              </div>

              {/* Interactive Visual Canvas Container */}
              <div className="relative w-full h-full flex items-center justify-between p-4 sm:p-6">
                
                {/* 1. PDF Document Model */}
                <div className="relative z-10 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                  <div className="w-32 sm:w-36 h-44 sm:h-48 bg-slate-100 rounded-2xl shadow-2xl p-3.5 flex flex-col justify-between border-2 border-slate-200/80 relative overflow-hidden group">
                    
                    {/* Red PDF Tag */}
                    <div className="flex items-center justify-between">
                      <span className="bg-[#e50914] text-white text-[11px] font-black px-2.5 py-0.5 rounded shadow">
                        PDF
                      </span>
                    </div>

                    {/* Red decorative PDF curve illustration */}
                    <div className="my-auto py-2 flex items-center justify-center">
                      <svg className="w-16 h-20 text-[#e50914]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <path d="M9 13a2 2 0 0 1 2-2 2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2z" className="text-[#e50914]"></path>
                      </svg>
                    </div>

                    {/* Text line representations */}
                    <div className="space-y-1.5">
                      <div className="h-1 bg-slate-300 rounded w-full" />
                      <div className="h-1 bg-slate-300 rounded w-4/5" />
                      <div className="h-1 bg-slate-300 rounded w-2/3" />
                    </div>
                  </div>
                </div>

                {/* Transfer Arrow Indicator */}
                <div className="relative z-10 flex flex-col items-center justify-center px-1">
                  <div className="w-9 h-9 rounded-full bg-blue-600/30 border border-blue-400/50 flex items-center justify-center text-blue-300 shadow-lg shadow-blue-500/20">
                    <span className="text-xl font-bold animate-pulse">➔</span>
                  </div>
                </div>

                {/* 2. Dark Blue Player Tablet/Smartphone with Waveform and Over-Ear Headphones */}
                <div className="relative z-20">
                  {/* Over-ear headphones graphic placed over player */}
                  <div className="absolute -top-10 -right-6 z-30 w-24 h-24 pointer-events-none drop-shadow-2xl">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-indigo-300 fill-current">
                      {/* Headphones band */}
                      <path d="M20,60 C20,25 80,25 80,60 C80,63 76,64 74,62 C74,30 26,30 26,62 C24,64 20,63 20,60 Z" fill="#1e293b" stroke="#3b82f6" strokeWidth="2.5"/>
                      {/* Left earpad */}
                      <rect x="14" y="52" width="14" height="24" rx="7" fill="#0f172a" stroke="#60a5fa" strokeWidth="2"/>
                      {/* Right earpad */}
                      <rect x="72" y="52" width="14" height="24" rx="7" fill="#0f172a" stroke="#60a5fa" strokeWidth="2"/>
                    </svg>
                  </div>

                  {/* Player Card */}
                  <div className="w-40 sm:w-44 h-40 sm:h-44 bg-gradient-to-br from-[#121c33] to-[#0a1020] rounded-2xl shadow-2xl p-4 border border-blue-500/30 flex flex-col justify-between text-white relative">
                    
                    {/* Glowing audio waveform visualizer bars */}
                    <div className="flex items-end justify-center gap-1.5 h-14 pt-3">
                      <span className="w-1.5 bg-blue-400 rounded-full h-6 animate-pulse" />
                      <span className="w-1.5 bg-indigo-400 rounded-full h-11 animate-pulse delay-75" />
                      <span className="w-1.5 bg-purple-400 rounded-full h-8 animate-pulse delay-150" />
                      <span className="w-1.5 bg-cyan-400 rounded-full h-14 animate-pulse delay-100" />
                      <span className="w-1.5 bg-indigo-400 rounded-full h-10 animate-pulse delay-200" />
                      <span className="w-1.5 bg-blue-400 rounded-full h-7 animate-pulse delay-150" />
                      <span className="w-1.5 bg-purple-400 rounded-full h-12 animate-pulse" />
                      <span className="w-1.5 bg-cyan-400 rounded-full h-8 animate-pulse delay-75" />
                    </div>

                    {/* Progress Slider & Timestamp */}
                    <div className="space-y-1.5">
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-full w-2/3 rounded-full" />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold dir-ltr">
                        <span>3:24</span>
                        <span>0:00</span>
                      </div>
                    </div>

                    {/* Play Button */}
                    <div className="flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <Play className="w-3.5 h-3.5 fill-white text-white translate-x-[1px]" />
                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
