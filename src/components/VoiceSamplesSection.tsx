import React, { useState } from 'react';
import { Volume2, Play, Pause, Sparkles, User, Globe, Headphones } from 'lucide-react';
import { DIALECTS, VOICES } from '../data/voices';
import { Voice, Dialect } from '../types';
import { audioEngine } from '../lib/audioEngine';

interface VoiceSamplesSectionProps {
  availableVoicesList?: Voice[];
}

export const VoiceSamplesSection: React.FC<VoiceSamplesSectionProps> = ({ availableVoicesList }) => {
  const voicesPool = availableVoicesList && availableVoicesList.length > 0 ? availableVoicesList : VOICES;
  const [selectedDialectId, setSelectedDialectId] = useState<string>('all');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  const filteredVoices = selectedDialectId === 'all'
    ? voicesPool
    : voicesPool.filter(v => v.dialectId === selectedDialectId);

  const handlePlayVoiceSample = (voice: Voice) => {
    if (playingVoiceId === voice.id) {
      audioEngine.stop();
      setPlayingVoiceId(null);
    } else {
      audioEngine.stop();
      setPlayingVoiceId(voice.id);

      audioEngine.speak(
        voice.sampleText,
        voice,
        { id: 'normal', name: 'عادي', description: '', icon: '' },
        1.0,
        undefined,
        () => setPlayingVoiceId(null)
      );
    }
  };

  return (
    <section id="features" className="py-16 bg-[#0b0f19] relative overflow-hidden border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 text-xs sm:text-sm font-semibold">
            <Headphones className="w-4 h-4 text-cyan-400" />
            <span>استمع لنماذج الصوت الحية</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-['Tajawal']">
            أكثر من 30 صوتاً و14 لهجة عربية
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            اختر اللهجة المفضلة لديك واستمع إلى عينات صوتية طبيعية ومختلفة قبل البدء بتحويل كتبك.
          </p>
        </div>

        {/* Dialect Filter Tabs */}
        <div className="flex items-center justify-start md:justify-center gap-2 overflow-x-auto pb-3 px-1 no-scrollbar">
          <button
            onClick={() => setSelectedDialectId('all')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              selectedDialectId === 'all'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            جميع اللهجات (14)
          </button>

          {DIALECTS.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDialectId(d.id)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedDialectId === d.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <span>{d.flag}</span>
              <span>{d.name}</span>
            </button>
          ))}
        </div>

        {/* Voice Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVoices.map((voice) => {
            const dialect = DIALECTS.find(d => d.id === voice.dialectId);
            const isPlayingThis = playingVoiceId === voice.id;

            return (
              <div
                key={voice.id}
                className={`p-5 rounded-3xl bg-[#0d1322] border transition-all duration-300 space-y-4 ${
                  isPlayingThis
                    ? 'border-cyan-400 ring-2 ring-cyan-500/30 shadow-xl shadow-cyan-950/50'
                    : 'border-slate-800/80 hover:border-indigo-500/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={voice.avatar}
                      alt={voice.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-700 shadow"
                    />
                    <div>
                      <h4 className="text-base font-extrabold text-white flex items-center gap-1.5 flex-wrap">
                        <span>{voice.name}</span>
                        {voice.isPremium && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-black border border-amber-500/30">
                            PRO
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-indigo-300 font-semibold flex items-center gap-1">
                        <span>{dialect?.flag}</span>
                        <span>{dialect?.name}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePlayVoiceSample(voice)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      isPlayingThis
                        ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/40 animate-pulse'
                        : 'bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30'
                    }`}
                  >
                    {isPlayingThis ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current translate-x-[1px]" />
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  {voice.description}
                </p>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>النوع: {voice.gender === 'male' ? 'رجالي' : 'نسائي'}</span>
                  <span className="text-indigo-400 font-bold">{voice.recommendedFor}</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
