import { toastOnce } from './toast';
import { Voice, AudioStyle } from '../types';

export class AudioEngine {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private isPlaying = false;
  private onBoundaryCallback?: (charIndex: number, text: string) => void;
  private onEndCallback?: () => void;
  private audioCache = new Map<string, string>();
  private audioBlobCache = new Map<string, { blob: Blob; type: string }>();
  private inflightPromises = new Map<string, Promise<string | null>>();
  private preloadedAudios = new Map<string, HTMLAudioElement>();
  private activeRequestController: AbortController | null = null;
  private currentSessionId = 0;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  // Request high-quality MP3 from Fish Audio API backend
  public async fetchFishAudio(
    text: string, 
    speed: number = 1.0, 
    referenceAudioBase64?: string, 
    referenceId?: string
  ): Promise<string | null> {
    try {
      const res = await fetch('/api/tts/fish-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          speed,
          referenceAudioBase64,
          referenceId,
          model: 's2.1-pro',
        }),
      });

      if (!res.ok) {
        return null;
      }

      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch (err) {
      console.warn('Fish Audio fetch failed:', err);
      return null;
    }
  }

  // Check if Fish Audio is configured on the backend
  public async isFishAudioActive(): Promise<boolean> {
    try {
      const res = await fetch('/api/tts/status');
      if (!res.ok) return false;
      const data = await res.json();
      return Boolean(data.fishAudioConfigured);
    } catch {
      return false;
    }
  }

  // Generate or retrieve cached speech audio URL from server AI engines
  public async generateSpeechUrl(
    text: string,
    voice: Voice,
    speed: number = 1.0
  ): Promise<string | null> {
    if (!text || !text.trim()) return null;

    const cacheKey = `${voice.id || 'default'}_${speed}_${text.trim()}`;
    if (this.audioCache.has(cacheKey)) {
      return this.audioCache.get(cacheKey)!;
    }

    if (this.inflightPromises.has(cacheKey)) {
      return this.inflightPromises.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      try {
        const res = await fetch('/api/tts/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text.trim(),
            voice: {
              id: voice.id,
              name: voice.name,
              gender: voice.gender,
              dialectId: voice.dialectId,
              geminiVoiceName: voice.geminiVoiceName,
              stylePrompt: voice.stylePrompt,
            },
            speed,
          }),
        });

        if (!res.ok) {
          console.warn('Server TTS returned non-200:', res.status);
          if (res.status === 429) toastOnce('طلبات كثيرة في وقت قصير، انتظر دقيقة ثم تابع.', 'error');
          return null;
        }

        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        this.audioCache.set(cacheKey, objectUrl);
        this.audioBlobCache.set(cacheKey, { blob, type: blob.type || 'audio/mpeg' });

        // Preload HTMLAudio buffer so decoding and network are 100% finished
        try {
          const preloadedAudio = new Audio();
          preloadedAudio.preload = 'auto';
          preloadedAudio.src = objectUrl;
          this.preloadedAudios.set(cacheKey, preloadedAudio);
        } catch (e) {
          // ignore preload failures
        }

        return objectUrl;
      } catch (err: any) {
        if (err?.name === 'AbortError' || err?.message?.includes('aborted') || err?.message?.includes('The user aborted a request')) {
          return null;
        }
        console.warn('Speech URL generation error:', err);
        return null;
      } finally {
        this.inflightPromises.delete(cacheKey);
      }
    })();

    this.inflightPromises.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  // Lookahead Pre-fetching of upcoming sentences to ensure 0-latency playback
  public prefetchSentence(text: string, voice: Voice, speed: number = 1.0): Promise<string | null> {
    if (!text || !text.trim()) return Promise.resolve(null);
    const cacheKey = `${voice.id || 'default'}_${speed}_${text.trim()}`;
    if (this.audioCache.has(cacheKey)) {
      return Promise.resolve(this.audioCache.get(cacheKey)!);
    }
    return this.generateSpeechUrl(text, voice, speed);
  }

  // Pre-fetch multiple sentences lookahead in parallel
  public prefetchBatch(sentences: string[], voice: Voice, speed: number = 1.0, lookaheadCount: number = 3) {
    if (!sentences || sentences.length === 0) return;
    const targets = sentences.slice(0, lookaheadCount);
    for (const sent of targets) {
      if (sent && sent.trim()) {
        this.prefetchSentence(sent, voice, speed).catch(() => {});
      }
    }
  }

  // Retrieve single cached blob for a sentence
  public getCachedBlob(text: string, voice: Voice, speed: number = 1.0): Blob | null {
    if (!text || !text.trim()) return null;
    const cacheKey = `${voice.id || 'default'}_${speed}_${text.trim()}`;
    return this.audioBlobCache.get(cacheKey)?.blob || null;
  }

  // Check how many sentences in this chapter are already cached in audio memory
  public getCachedSegmentsCount(sentences: string[], voice: Voice, speed: number = 1.0): number {
    let count = 0;
    for (const sent of sentences) {
      if (sent && this.getCachedBlob(sent, voice, speed)) {
        count++;
      }
    }
    return count;
  }

  // Assembles and stitches all speech segments into a single cohesive download file
  // with correct multi-chunk WAV master header / MP3 stream so the file plays 100% of the duration!
  public async assembleChapterAudio(
    sentences: string[],
    voice: Voice,
    speed: number = 1.0,
    onProgress?: (percent: number) => void
  ): Promise<{ blob: Blob; isComplete: boolean; ext: string } | null> {
    if (!sentences || sentences.length === 0) return null;

    const blobs: Blob[] = [];
    let isWav = false;
    let isMp3 = false;

    for (let i = 0; i < sentences.length; i++) {
      const sent = sentences[i];
      if (!sent || !sent.trim()) continue;

      let cached = this.getCachedBlob(sent, voice, speed);
      if (!cached) {
        // Fetch missing segment with retry
        await this.generateSpeechUrl(sent, voice, speed);
        cached = this.getCachedBlob(sent, voice, speed);
      }

      if (cached) {
        blobs.push(cached);
        if (cached.type.includes('wav')) isWav = true;
        if (cached.type.includes('mpeg') || cached.type.includes('mp3')) isMp3 = true;
      }

      if (onProgress) {
        onProgress(Math.round(((i + 1) / sentences.length) * 100));
      }
    }

    if (blobs.length === 0) return null;

    // IF WAV files: strip individual RIFF headers (44 bytes each) and rebuild a single Master WAV Header!
    // Otherwise players will only play chunk #1 and stop!
    if (isWav && !isMp3) {
      try {
        const rawPcmChunks: Uint8Array[] = [];
        let totalPcmBytes = 0;

        for (const b of blobs) {
          const buffer = await b.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          // Standard RIFF WAV header check: "RIFF" (ASCII: 0x52, 0x49, 0x46, 0x46)
          if (bytes.length > 44 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
            // Find "data" chunk or fallback to byte offset 44
            let dataOffset = 44;
            for (let j = 12; j < Math.min(bytes.length - 8, 100); j++) {
              if (bytes[j] === 0x64 && bytes[j+1] === 0x61 && bytes[j+2] === 0x74 && bytes[j+3] === 0x61) { // "data"
                dataOffset = j + 8;
                break;
              }
            }
            const pcmPayload = bytes.subarray(dataOffset);
            rawPcmChunks.push(pcmPayload);
            totalPcmBytes += pcmPayload.length;
          } else {
            rawPcmChunks.push(bytes);
            totalPcmBytes += bytes.length;
          }
        }

        // Create unified Master WAV Header (24kHz, 1 channel 16-bit)
        const header = new ArrayBuffer(44);
        const view = new DataView(header);
        const sampleRate = 24000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
        const blockAlign = (numChannels * bitsPerSample) / 8;

        // "RIFF"
        view.setUint32(0, 0x52494646, false);
        view.setUint32(4, 36 + totalPcmBytes, true);
        // "WAVE"
        view.setUint32(8, 0x57415645, false);
        // "fmt "
        view.setUint32(12, 0x666d7420, false);
        view.setUint32(16, 16, true); // Subchunk1Size
        view.setUint16(20, 1, true);  // PCM format
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        // "data"
        view.setUint32(36, 0x64617461, false);
        view.setUint32(40, totalPcmBytes, true);

        // Combine master header and all PCM chunks into one single unified Uint8Array
        const masterBuffer = new Uint8Array(44 + totalPcmBytes);
        masterBuffer.set(new Uint8Array(header), 0);
        let offset = 44;
        for (const chunk of rawPcmChunks) {
          masterBuffer.set(chunk, offset);
          offset += chunk.byteLength;
        }

        const masterBlob = new Blob([masterBuffer.buffer], { type: 'audio/wav' });

        return {
          blob: masterBlob,
          isComplete: blobs.length === sentences.length,
          ext: 'wav',
        };
      } catch (wavStitchErr) {
        console.warn('WAV stitch master header note:', wavStitchErr);
      }
    }

    // Standard audio stream concatenation for MP3
    const finalMime = isMp3 ? 'audio/mpeg' : 'audio/wav';
    const finalBlob = new Blob(blobs, { type: finalMime });
    const ext = isMp3 ? 'mp3' : 'wav';

    return {
      blob: finalBlob,
      isComplete: blobs.length === sentences.length,
      ext,
    };
  }

  // Play from an MP3 Object URL
  public playAudioUrl(url: string, onEnd?: () => void, playbackRate: number = 1.0) {
    this.stop();
    const audio = new Audio(url);
    this.currentAudioElement = audio;
    audio.playbackRate = playbackRate;
    this.isPlaying = true;

    audio.onended = () => {
      this.isPlaying = false;
      this.currentAudioElement = null;
      if (onEnd) onEnd();
    };

    audio.onerror = () => {
      this.isPlaying = false;
      this.currentAudioElement = null;
      if (onEnd) onEnd();
    };

    audio.play().catch((err) => {
      console.warn('Audio play error:', err);
      this.isPlaying = false;
      if (onEnd) onEnd();
    });
  }

  // Play audio sample preview for any voice.
  // Plays the pre-generated file in /voice-samples/ (see scripts/generate-voice-samples.ts)
  // and only synthesizes on the fly when that file is missing.
  public playVoicePreview(voice: Voice, onEnd?: () => void) {
    this.stop();
    const sessionId = this.currentSessionId;

    const synthesizeFallback = () => {
      if (this.currentSessionId !== sessionId) return;
      const sampleText = voice.sampleText || 'مرحباً بكم، هذا صوت عالي النقاء جاهز لقراءة كتبكم.';
      this.speak(
        sampleText,
        voice,
        { id: 'normal', name: 'عادي', description: '', icon: '' },
        1.0,
        undefined,
        onEnd
      );
    };

    const audio = new Audio(`/voice-samples/${voice.id}.mp3`);
    this.currentAudioElement = audio;
    this.isPlaying = true;

    audio.onended = () => {
      if (this.currentSessionId !== sessionId) return;
      this.isPlaying = false;
      this.currentAudioElement = null;
      if (onEnd) onEnd();
    };
    audio.onerror = synthesizeFallback;
    audio.play().catch(synthesizeFallback);
  }

  // Primary speech synthesis method: Uses Fish Audio Cloned Voice / Gemini TTS with browser fallback
  public async speak(
    text: string,
    voice: Voice,
    style: AudioStyle,
    rate: number = 1.0,
    onBoundary?: (charIndex: number, text: string) => void,
    onEnd?: () => void
  ) {
    this.stop();
    const sessionId = ++this.currentSessionId;
    this.isPlaying = true;
    this.onBoundaryCallback = onBoundary;
    this.onEndCallback = onEnd;

    // First attempt: Server AI voice generation (Fish Audio S2.1 Pro cloned voice or Gemini)
    const audioUrl = await this.generateSpeechUrl(text, voice, rate);

    // If caller stopped playback or a new speech request was started while fetching, abort
    if (!this.isPlaying || this.currentSessionId !== sessionId) return;

    if (audioUrl) {
      const cacheKey = `${voice.id || 'default'}_${rate}_${text.trim()}`;
      const preloaded = this.preloadedAudios.get(cacheKey);
      const audio = preloaded || new Audio(audioUrl);
      this.currentAudioElement = audio;
      audio.playbackRate = rate;

      audio.onended = () => {
        if (this.currentSessionId !== sessionId) return;
        this.isPlaying = false;
        this.currentAudioElement = null;
        if (this.onEndCallback) {
          this.onEndCallback();
        }
      };

      audio.onerror = (e) => {
        if (this.currentSessionId !== sessionId) return;
        console.warn('HTMLAudio error, falling back to browser speech:', e);
        this.fallbackBrowserSpeak(text, voice, rate, sessionId);
      };

      try {
        await audio.play();
        return;
      } catch (playErr) {
        if (this.currentSessionId !== sessionId) return;
        console.warn('Audio play failed, falling back:', playErr);
      }
    }

    // Fallback: Browser Web Speech API (only if AI server synthesis was unavailable and session is current)
    if (this.currentSessionId === sessionId) {
      this.fallbackBrowserSpeak(text, voice, rate, sessionId);
    }
  }

  private fallbackBrowserSpeak(text: string, voice: Voice, rate: number, sessionId: number) {
    toastOnce('الصوت الطبيعي غير متاح الآن، نقرأ بصوت المتصفح مؤقتاً.', 'error');
    if (!this.synth) {
      console.warn('Speech synthesis not supported on this browser');
      this.isPlaying = false;
      if (this.onEndCallback) this.onEndCallback();
      return;
    }

    if (this.currentSessionId !== sessionId) {
      return;
    }

    // Ensure any previously scheduled or playing browser speech is strictly cancelled
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voice.dialectId === 'msa' ? 'ar' : voice.dialectId === 'eg' ? 'ar-EG' : voice.dialectId === 'sa' ? 'ar-SA' : 'ar';
    utterance.rate = rate * (voice.rate || 1.0);
    utterance.pitch = voice.pitch || 1.0;

    const browserVoices = this.synth.getVoices();
    const isFemale = voice.gender === 'female';
    const arabicVoices = browserVoices.filter(
      (v) => v.lang.startsWith('ar') || v.lang.includes(voice.dialectId)
    );
    // Find matching gender in browser voices if possible
    const matchedVoice = arabicVoices.find((v) => {
      const name = v.name.toLowerCase();
      if (isFemale) {
        return name.includes('female') || name.includes('layla') || name.includes('salma') || name.includes('meryem') || name.includes('hoda') || name.includes('zeina') || name.includes('zariyah');
      } else {
        return name.includes('male') || name.includes('tariq') || name.includes('shakir') || name.includes('hamed') || name.includes('naayf') || name.includes('maged');
      }
    }) || arabicVoices[0];

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onboundary = (event) => {
      if (this.currentSessionId === sessionId && this.onBoundaryCallback) {
        this.onBoundaryCallback(event.charIndex, text);
      }
    };

    utterance.onend = () => {
      if (this.currentSessionId === sessionId) {
        this.isPlaying = false;
        if (this.onEndCallback) {
          this.onEndCallback();
        }
      }
    };

    utterance.onerror = (err) => {
      // 'interrupted' and 'canceled' are expected when user stops or navigates
      if (err.error === 'interrupted' || err.error === 'canceled') {
        return;
      }
      if (this.currentSessionId === sessionId) {
        console.warn('Browser Speech error:', err);
        this.isPlaying = false;
        if (this.onEndCallback) {
          this.onEndCallback();
        }
      }
    };

    this.currentUtterance = utterance;
    this.isPlaying = true;
    this.synth.speak(utterance);
  }

  public pause() {
    if (this.currentAudioElement && !this.currentAudioElement.paused) {
      this.currentAudioElement.pause();
      this.isPlaying = false;
    } else if (this.synth && this.synth.speaking) {
      this.synth.pause();
      this.isPlaying = false;
    }
  }

  public resume() {
    if (this.currentAudioElement && this.currentAudioElement.paused) {
      this.currentAudioElement.play();
      this.isPlaying = true;
    } else if (this.synth && this.synth.paused) {
      this.synth.resume();
      this.isPlaying = true;
    }
  }

  public stop() {
    this.currentSessionId++;
    if (this.activeRequestController) {
      this.activeRequestController.abort();
      this.activeRequestController = null;
    }
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      this.currentAudioElement.currentTime = 0;
      this.currentAudioElement.src = '';
      this.currentAudioElement = null;
    }
    if (this.synth) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
    this.isPlaying = false;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const audioEngine = new AudioEngine();
