import { toastOnce } from './toast';
import { Voice, AudioStyle } from '../types';
import { tr } from './i18n';
import { apiFetch } from './apiFetch';

export class AudioEngine {
  private currentAudioElement: HTMLAudioElement | null = null;
  private isPlaying = false;
  private onBoundaryCallback?: (charIndex: number, text: string) => void;
  private onEndCallback?: () => void;
  private onErrorCallback?: () => void;
  private audioCache = new Map<string, string>();
  private audioBlobCache = new Map<string, { blob: Blob; type: string }>();
  private inflightPromises = new Map<string, Promise<string | null>>();
  private preloadedAudios = new Map<string, HTMLAudioElement>();
  private activeRequestController: AbortController | null = null;
  private currentSessionId = 0;


  // Request high-quality MP3 from Fish Audio API backend
  public async fetchFishAudio(
    text: string, 
    speed: number = 1.0, 
    referenceAudioBase64?: string, 
    referenceId?: string
  ): Promise<string | null> {
    try {
      const res = await apiFetch('/api/tts/fish-audio', {
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

  // Clips are generated once at normal speed and sped up by the <audio> element (playbackRate),
  // so changing the speed never re-synthesizes (or re-charges) audio
  private clipKey(text: string, voice: Voice): string {
    return `${voice.id || 'default'}_${text.trim()}`;
  }

  // Set when the last failure was already explained to the user (sign in / out of minutes)
  private lastFailureHandled = false;

  // Generate or retrieve cached speech audio URL from server AI engines
  public async generateSpeechUrl(
    text: string,
    voice: Voice,
    speed: number = 1.0
  ): Promise<string | null> {
    if (!text || !text.trim()) return null;

    const cacheKey = this.clipKey(text, voice);
    if (this.audioCache.has(cacheKey)) {
      return this.audioCache.get(cacheKey)!;
    }

    if (this.inflightPromises.has(cacheKey)) {
      return this.inflightPromises.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      try {
        const res = await apiFetch('/api/tts/speak', {
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
            speed: 1.0,
          }),
        });

        if (!res.ok) {
          console.warn('Server TTS returned non-200:', res.status);
          // apiFetch already prompted to sign in / top up; don't add a second error toast
          this.lastFailureHandled = res.status === 401 || res.status === 402;
          if (res.status === 429) toastOnce(tr("طلبات كثيرة في وقت قصير، انتظر دقيقة ثم تابع.", "Too many requests in a short time. Wait a minute, then continue."), 'error');
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
    const cacheKey = this.clipKey(text, voice);
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
    const cacheKey = this.clipKey(text, voice);
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

    const generateSampleWithAI = () => {
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
    audio.onerror = generateSampleWithAI;
    audio.play().catch(generateSampleWithAI);
  }

  // Speaks text with the AI voice only (no browser speech fallback). On failure playback stops,
  // the user is told, and onError runs (or onEnd, so callers can reset their play buttons).
  public async speak(
    text: string,
    voice: Voice,
    style: AudioStyle,
    rate: number = 1.0,
    onBoundary?: (charIndex: number, text: string) => void,
    onEnd?: () => void,
    onError?: () => void
  ) {
    this.stop();
    const sessionId = ++this.currentSessionId;
    this.isPlaying = true;
    this.onBoundaryCallback = onBoundary;
    this.onEndCallback = onEnd;
    this.onErrorCallback = onError;

    // First attempt: Server AI voice generation (Fish Audio S2.1 Pro cloned voice or Gemini)
    const audioUrl = await this.generateSpeechUrl(text, voice, rate);

    // If caller stopped playback or a new speech request was started while fetching, abort
    if (!this.isPlaying || this.currentSessionId !== sessionId) return;

    if (audioUrl) {
      const cacheKey = this.clipKey(text, voice);
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
        console.warn('HTMLAudio error:', e);
        this.failPlayback(sessionId);
      };

      try {
        await audio.play();
        return;
      } catch (playErr) {
        if (this.currentSessionId !== sessionId) return;
        console.warn('Audio play failed:', playErr);
      }
    }

    this.failPlayback(sessionId);
  }

  private failPlayback(sessionId: number) {
    if (this.currentSessionId !== sessionId) return;
    this.isPlaying = false;
    this.currentAudioElement = null;
    if (!this.lastFailureHandled) {
      toastOnce(tr('تعذّر تشغيل الصوت الآن، حاول مرة أخرى بعد قليل.', 'Couldn’t play the audio right now. Please try again shortly.'), 'error', 10_000);
    }
    this.lastFailureHandled = false;
    (this.onErrorCallback || this.onEndCallback)?.();
  }

  public pause() {
    if (this.currentAudioElement && !this.currentAudioElement.paused) {
      this.currentAudioElement.pause();
      this.isPlaying = false;
    }
  }

  public resume() {
    if (this.currentAudioElement && this.currentAudioElement.paused) {
      this.currentAudioElement.play();
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
    this.isPlaying = false;
  }

  // Fraction (0–1) of the clip that is currently playing, for progress bars
  public getCurrentClipProgress(): number {
    const a = this.currentAudioElement;
    if (!a || !a.duration || !isFinite(a.duration)) return 0;
    return Math.min(1, a.currentTime / a.duration);
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const audioEngine = new AudioEngine();
