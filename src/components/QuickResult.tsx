import React, { useEffect, useRef, useState } from 'react';
import { Download, Maximize2, Pause, Play, X } from 'lucide-react';

interface QuickResultProps {
  url: string;
  blob: Blob | null;
  voiceName: string;
  fileName: string;
  onOpenStudio?: () => void;
  onClose?: () => void;
  autoPlay?: boolean;
}

const fmt = (sec: number) => {
  if (!isFinite(sec) || sec < 0) sec = 0;
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
};

// Inline player for short texts: listen and download without opening the studio
export const QuickResult: React.FC<QuickResultProps> = ({ url, blob, voiceName, fileName, onOpenStudio, onClose, autoPlay = true }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.ontimeupdate = () => setTime(audio.currentTime);
    audio.onplay = () => setPlaying(true);
    audio.onpause = () => setPlaying(false);
    audio.onended = () => setPlaying(false);
    if (autoPlay) audio.play().catch(() => setPlaying(false));
    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [url, autoPlay]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(e.target.value);
    setTime(audio.currentTime);
  };

  const download = () => {
    const ext = blob?.type.includes('wav') ? 'wav' : 'mp3';
    const href = blob ? URL.createObjectURL(blob) : url;
    const a = document.createElement('a');
    a.href = href;
    a.download = `${fileName}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (blob) URL.revokeObjectURL(href);
  };

  return (
    <div role="region" aria-label="نتيجة التحويل" className="rounded-[14px] border border-brand/50 bg-brand-deep/30 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-slate-300">
          جاهز بصوت <strong className="text-white">{voiceName}</strong>
        </span>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="إغلاق النتيجة" className="-m-2 w-10 h-10 rounded-full text-slate-400 hover:text-white flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'إيقاف مؤقت' : 'تشغيل'}
          className="w-12 h-12 rounded-full bg-white text-ink flex items-center justify-center shrink-0 cursor-pointer"
        >
          {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
        </button>
        <span className="text-[13px] text-slate-400 tabular-nums" dir="ltr">{fmt(time)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={time}
          onChange={seek}
          aria-label="موضع التشغيل"
          dir="ltr"
          className="flex-1 accent-accent cursor-pointer"
        />
        <span className="text-[13px] text-slate-400 tabular-nums" dir="ltr">{fmt(duration)}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={download} className="min-h-11 px-4 rounded-[10px] bg-raised hover:bg-line-strong text-white text-sm font-semibold flex items-center gap-2 cursor-pointer">
          <Download className="w-4 h-4" />
          تحميل الصوت
        </button>
        {onOpenStudio && (
          <button type="button" onClick={onOpenStudio} className="min-h-11 px-4 rounded-[10px] border border-line text-slate-300 hover:text-white text-sm flex items-center gap-2 cursor-pointer">
            <Maximize2 className="w-4 h-4" />
            فتح في الاستوديو
          </button>
        )}
      </div>
    </div>
  );
};
