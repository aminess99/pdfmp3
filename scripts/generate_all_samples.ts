import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { VOICES } from '../src/data/voices';

dotenv.config();

const AUDIO_CACHE_DIR = path.join(process.cwd(), '.cache', 'audio');
if (!fs.existsSync(AUDIO_CACHE_DIR)) {
  fs.mkdirSync(AUDIO_CACHE_DIR, { recursive: true });
}

function getAudioDiskCachePath(key: string): string {
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return path.join(AUDIO_CACHE_DIR, `${hash}.mp3`);
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

async function synthesizeVoiceSample(voice: any): Promise<Buffer | null> {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const isFemale = voice?.gender === 'female';
  const voiceName = voice?.geminiVoiceName || (isFemale ? 'Kore' : 'Puck');
  const sampleText = voice.sampleText.trim();
  const speed = 1.0;

  const dialectRule = voice?.stylePrompt || 'اقرأ باللغة العربية الفصيحة السليمة بنبرة روائية جهورية آسرة وتشكيل دقيق ومخارج حروف واضحة كما في كبرى المنصات الصوتية.';

  const speechInstruction = `تعليمات الإلقاء الصوتي للذكاء الاصطناعي (أداء قارئ كتب وروايات محترف على يوتيوب):
- التوجيه الأساسي: تصرف كقارئ كتب صوتية (Audiobook Narrator) محترف ومشهور على يوتيوب وبودكاست، بنبرة دافئة، تفاعلية، معبرة، وغير رتيبة أو روبوتية.
- التنغيم والأسلوب: ${dialectRule}
- قواعد الأداء:
  1. مراعاة علامات الترقيم، والوقفات الدرامية القصيرة عند الفواصل لإعطاء المستمع مساحة للتأمل.
  2. التفاعل مع المعنى وتلوين الصوت (Vocal Modulation & Cadence) حسب طبيعة النص (حماسي، مشوق، تأملي، أو سردي).
  3. مخارج حروف واضحة ونطق سلس وفصيح.
- المطلوب: قراءة هذا النص العربي مباشرة بجودة استوديو احترافية:`;

  // Try OpenRouter first if key available
  if (openRouterKey && openRouterKey.startsWith('sk-or-v1-')) {
    const ttsModelsToTry = [
      'google/gemini-3.8-flash-lite-tts',
      'google/gemini-3.8-flash-tts',
      'google/gemini-2.5-flash-preview-tts',
    ];

    for (const model of ttsModelsToTry) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/audio/speech', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            input: sampleText,
            voice: voiceName,
            speed,
            response_format: 'mp3',
          }),
        });

        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const buf = Buffer.from(arrayBuf);
          if (buf.length > 500) {
            return buf;
          }
        }
      } catch (e) {
        // continue
      }
    }
  }

  // Fallback to direct Gemini GenAI API
  const gemini = getGeminiClient();
  if (gemini) {
    const response = await gemini.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [{ parts: [{ text: sampleText }] }],
      config: {
        responseModalities: ['AUDIO'],
        systemInstruction: 'أنت قارئ كتب وروايات صوتية محترف على يوتيوب وبودكاست. اقرأ بنبرة دافئة معبرة ومخارج حروف واضحة جداً، مع وقفات متوازنة وتلوين نغمي يجذب المستمع.',
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return Buffer.from(base64Audio, 'base64');
    }
  }

  return null;
}

async function synthesizeVoiceSampleWithRetry(voice: any, maxRetries = 4): Promise<Buffer | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const buffer = await synthesizeVoiceSample(voice);
      if (buffer && buffer.length > 500) {
        return buffer;
      }
    } catch (err: any) {
      console.warn(`Attempt ${attempt} for ${voice.name} hit rate-limit or error:`, err?.message || err);
    }
    // If quota limit, wait 16 seconds before retrying
    console.log(`Waiting 16s before retry for ${voice.name}...`);
    await new Promise((resolve) => setTimeout(resolve, 16000));
  }
  return null;
}

async function main() {
  console.log(`Starting pre-generation of audio samples for ${VOICES.length} voices...`);
  let successCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < VOICES.length; i++) {
    const voice = VOICES[i];
    const cacheKey = `${voice.id}_1_${voice.sampleText.trim()}`;
    const diskPath = getAudioDiskCachePath(cacheKey);

    if (fs.existsSync(diskPath) && fs.statSync(diskPath).size > 500) {
      console.log(`[${i + 1}/${VOICES.length}] [Already Cached] ${voice.name}`);
      skippedCount++;
      continue;
    }

    console.log(`[${i + 1}/${VOICES.length}] Generating: ${voice.name} (${voice.geminiVoiceName})...`);
    const buffer = await synthesizeVoiceSampleWithRetry(voice);
    if (buffer && buffer.length > 500) {
      fs.writeFileSync(diskPath, buffer);
      console.log(` -> Saved to disk (${buffer.length} bytes): ${diskPath}`);
      successCount++;
    } else {
      console.warn(` -> Failed to generate audio for ${voice.name}`);
    }

    // Rate-limit spacer (wait 20s between each request for standard free-tier 3 requests/minute safety)
    await new Promise((resolve) => setTimeout(resolve, 20000));
  }

  console.log(`\nCompleted! Generated: ${successCount}, Already Cached: ${skippedCount}, Total: ${VOICES.length}`);
}

main().catch(console.error);
