import React, { useEffect, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { DIALECTS, VOICES } from '../data/voices';
import { Voice } from '../types';
import { audioEngine } from '../lib/audioEngine';

interface VoiceSamplesSectionProps {
  availableVoicesList?: Voice[];
}

const WAVE_HEIGHTS = [10, 20, 14, 26, 12, 22, 16, 24, 10, 18];
const COLLAPSED_COUNT = 8;

export const VoiceSamplesSection: React.FC<VoiceSamplesSectionProps> = ({ availableVoicesList }) => {
  const voicesPool = availableVoicesList && availableVoicesList.length > 0 ? availableVoicesList : VOICES;
  const [dialectId, setDialectId] = useState<string>('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Stay in sync when the tool's voice changes elsewhere
  useEffect(() => {
    const onSelect = (e: Event) => setSelectedId((e as CustomEvent<string>).detail);
    window.addEventListener('select_voice', onSelect);
    return () => window.removeEventListener('select_voice', onSelect);
  }, []);

  const filtered = dialectId === 'all' ? voicesPool : voicesPool.filter((v) => v.dialectId === dialectId);
  const shown = dialectId === 'all' && !showAll ? filtered.slice(0, COLLAPSED_COUNT) : filtered;

  const togglePlay = (voice: Voice) => {
    if (playingId === voice.id) {
      audioEngine.stop();
      setPlayingId(null);
      return;
    }
    setPlayingId(voice.id);
    audioEngine.playVoicePreview(voice, () => setPlayingId(null));
  };

  const selectVoice = (voice: Voice) => {
    setSelectedId(voice.id);
    window.dispatchEvent(new CustomEvent('select_voice', { detail: voice.id }));
    document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' });
  };

  const chipClass = (active: boolean) =>
    `min-h-11 px-[18px] rounded-full text-[15px] border cursor-pointer transition-colors shrink-0 ${
      active ? 'border-brand bg-brand-deep text-white' : 'border-line text-slate-300 hover:text-white'
    }`;

  return (
    <section id="voices" className="border-t border-raised py-[72px] px-4 sm:px-6" dir="rtl">
      <div className="max-w-[1160px] mx-auto flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <h2 className="font-display font-extrabold text-3xl sm:text-[34px] text-white">اسمع قبل أن تختار</h2>
          <p className="text-slate-400">
            {voicesPool.length} صوتاً و{DIALECTS.length} لهجة. اختر الصوت ليصبح قارئ كتابك.
          </p>
        </div>

        <div role="tablist" aria-label="تصفية حسب اللهجة" className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button type="button" role="tab" aria-selected={dialectId === 'all'} onClick={() => setDialectId('all')} className={chipClass(dialectId === 'all')}>
            الكل
          </button>
          {DIALECTS.map((d) => (
            <button key={d.id} type="button" role="tab" aria-selected={dialectId === d.id} onClick={() => setDialectId(d.id)} className={chipClass(dialectId === d.id)}>
              {d.name.split(' (')[0]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {shown.map((voice) => {
            const playing = playingId === voice.id;
            const selected = selectedId === voice.id;
            const dialect = DIALECTS.find((d) => d.id === voice.dialectId);
            return (
              <div
                key={voice.id}
                className={`p-5 rounded-2xl bg-card border flex flex-col gap-4 transition-colors ${playing ? 'border-accent' : 'border-line'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => togglePlay(voice)}
                    aria-label={`${playing ? 'إيقاف عينة' : 'تشغيل عينة'} ${voice.name.split(' - ')[0]}`}
                    className="w-11 h-11 rounded-full bg-brand text-white flex items-center justify-center shrink-0 cursor-pointer hover:bg-indigo-500"
                  >
                    {playing ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>
                  <div className={`flex items-center gap-[3px] h-7 ${playing ? 'wave-on' : ''}`} aria-hidden="true">
                    {WAVE_HEIGHTS.map((h, i) => (
                      <span key={i} className="wave-bar" style={{ height: h }} />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col leading-normal">
                  <span className="font-bold text-white text-[17px]">{voice.name.split(' - ')[0]}</span>
                  <span className="text-sm text-slate-400">
                    {dialect?.name.split(' (')[0]} · {voice.gender === 'female' ? 'امرأة' : 'رجل'}
                  </span>
                  <span className="text-sm text-slate-300 mt-1">{voice.recommendedFor}</span>
                </div>
                <button
                  type="button"
                  onClick={() => selectVoice(voice)}
                  aria-pressed={selected}
                  className={`min-h-11 rounded-[10px] text-sm font-semibold cursor-pointer border transition-colors ${
                    selected ? 'border-brand bg-brand text-white' : 'border-line-strong text-white hover:bg-raised'
                  }`}
                >
                  {selected ? 'الصوت المختار' : 'اختر هذا الصوت'}
                </button>
              </div>
            );
          })}
        </div>

        {dialectId === 'all' && filtered.length > COLLAPSED_COUNT && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="self-center min-h-11 px-5 rounded-xl border border-line text-slate-200 hover:text-white cursor-pointer"
          >
            {showAll ? 'عرض أقل' : `عرض كل الأصوات (${filtered.length})`}
          </button>
        )}
      </div>
    </section>
  );
};
