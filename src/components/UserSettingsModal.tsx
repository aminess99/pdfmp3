import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { VOICES } from '../data/voices';
import { voiceLabel } from '../lib/voiceLabel';
import { tr, DIR } from '../lib/i18n';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { name: string; email: string };
}

// Preferences read by ConversionTool (default voice) and StudioView (speed, auto-next)
export const SETTINGS_KEYS = {
  voice: 'app_default_voice',
  speed: 'app_default_speed',
  autoNext: 'app_auto_play_next',
} as const;

const SPEEDS = ['0.8', '1', '1.25', '1.5', '2'];

const readSetting = (key: string, fallback: string) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({ isOpen, onClose, user }) => {
  const [voiceId, setVoiceId] = useState(() => readSetting(SETTINGS_KEYS.voice, ''));
  const [speed, setSpeed] = useState(() => String(Number(readSetting(SETTINGS_KEYS.speed, '1')) || 1));
  const [autoNext, setAutoNext] = useState(() => readSetting(SETTINGS_KEYS.autoNext, 'true') !== 'false');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (voiceId) localStorage.setItem(SETTINGS_KEYS.voice, voiceId);
      else localStorage.removeItem(SETTINGS_KEYS.voice);
      localStorage.setItem(SETTINGS_KEYS.speed, speed);
      localStorage.setItem(SETTINGS_KEYS.autoNext, String(autoNext));
    } catch {}
    setSaved(true);
    setTimeout(onClose, 700);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/85 font-body" dir={DIR} onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[520px] max-h-[calc(100dvh-32px)] overflow-y-auto bg-card border border-line rounded-[20px] p-6 sm:p-7 flex flex-col gap-1 text-slate-200"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 id="settings-title" className="font-display font-extrabold text-2xl text-white">{tr("الإعدادات", "Settings")}</h2>
          <button type="button" onClick={onClose} aria-label={tr("إغلاق", "Close")} className="w-11 h-11 rounded-full text-slate-400 hover:text-white hover:bg-raised flex items-center justify-center cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 min-h-[72px] border-b border-raised">
          <span className="flex flex-col leading-snug">
            <label htmlFor="pref-voice" className="text-white font-semibold">{tr("الصوت الافتراضي", "Default voice")}</label>
            <span className="text-[13px] text-slate-400">{tr("يُختار تلقائياً في كل تحويل جديد", "Picked automatically for every new conversion")}</span>
          </span>
          <select
            id="pref-voice"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            className="min-h-11 max-w-[200px] bg-ink border border-line rounded-[10px] px-3 text-[15px] text-white cursor-pointer"
          >
            <option value="">{tr("حسب اللهجة", "By dialect")}</option>
            {VOICES.map((v) => (
              <option key={v.id} value={v.id}>{voiceLabel(v)}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 min-h-[72px] border-b border-raised py-3">
          <span id="speed-label" className="text-white font-semibold">{tr("السرعة الافتراضية", "Default speed")}</span>
          <div role="radiogroup" aria-labelledby="speed-label" className="flex gap-1.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={speed === s}
                onClick={() => setSpeed(s)}
                className={`min-w-12 min-h-11 px-2 rounded-[10px] text-sm border cursor-pointer ${
                  speed === s ? 'border-brand bg-brand-deep text-white' : 'border-line text-slate-300 hover:text-white'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 min-h-[72px] border-b border-raised">
          <span className="flex flex-col leading-snug">
            <span className="text-white font-semibold">{tr("الانتقال تلقائياً للفصل التالي", "Auto-play next chapter")}</span>
            <span className="text-[13px] text-slate-400">{tr("عند انتهاء الفصل يبدأ الذي بعده", "When a chapter ends, the next one starts")}</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={autoNext}
            aria-label={tr("الانتقال تلقائياً للفصل التالي", "Auto-play next chapter")}
            onClick={() => setAutoNext(!autoNext)}
            className={`relative w-[52px] h-8 rounded-full shrink-0 cursor-pointer transition-colors ${autoNext ? 'bg-brand' : 'bg-line-strong'}`}
          >
            <span className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${autoNext ? 'end-1' : 'end-[24px]'}`} />
          </button>
        </div>

        <div className="flex items-center gap-3 py-5">
          <span className="w-11 h-11 rounded-full bg-brand-deep text-indigo-200 flex items-center justify-center font-bold shrink-0">
            {user.name ? user.name.charAt(0).toUpperCase() : tr('م', 'U')}
          </span>
          <span className="flex flex-col leading-tight min-w-0">
            <span className="text-white font-semibold truncate">{user.name}</span>
            <span className="text-sm text-slate-400 truncate" dir="ltr">{user.email}</span>
          </span>
        </div>

        <button type="submit" className="min-h-12 rounded-xl bg-brand hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer">
          {saved && <Check className="w-5 h-5" />}
          {saved ? tr("تم الحفظ", "Saved") : tr("حفظ", "Save")}
        </button>
      </form>
    </div>
  );
};
