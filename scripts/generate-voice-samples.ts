// Generates one saved MP3 sample per voice in public/voice-samples/<voice.id>.mp3
// using Gemini TTS on OpenRouter, so the site never re-synthesizes previews.
//
//   OPENROUTER_API_KEY=sk-or-v1-... npx tsx scripts/generate-voice-samples.ts [--force]
//
// Existing files are skipped unless --force is passed. Requires ffmpeg.
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { VOICES } from '../src/data/voices';

dotenv.config();

const MODEL = process.env.TTS_MODEL || 'google/gemini-3.8-flash-lite-tts';
const OUT_DIR = path.join(process.cwd(), 'public', 'voice-samples');
const force = process.argv.includes('--force');

function pcmToWav(pcm: Buffer, sampleRate = 24000, channels = 1, bits = 16): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE((sampleRate * channels * bits) / 8, 28);
  header.writeUInt16LE((channels * bits) / 8, 32);
  header.writeUInt16LE(bits, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function synthesize(text: string, voiceName: string, apiKey: string): Promise<Buffer> {
  const res = await fetch('https://openrouter.ai/api/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.APP_URL || 'https://pdfmp3.onrender.com',
      'X-Title': 'PDF to Audio Arabic Studio',
    },
    // Same request shape as the server (Gemini TTS on OpenRouter returns raw 24kHz PCM)
    body: JSON.stringify({ model: MODEL, input: text, voice: voiceName, speed: 1.0, response_format: 'pcm' }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const pcm = Buffer.from(await res.arrayBuffer());
  if (pcm.length < 1000) throw new Error(`audio too short (${pcm.length} bytes)`);
  return pcm;
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is not set');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let failed = 0;
  for (const voice of VOICES) {
    const outFile = path.join(OUT_DIR, `${voice.id}.mp3`);
    if (!force && fs.existsSync(outFile)) {
      console.log(`skip  ${voice.id} (exists)`);
      continue;
    }
    if (!voice.geminiVoiceName) {
      console.warn(`skip  ${voice.id} (no geminiVoiceName)`);
      continue;
    }
    try {
      const pcm = await synthesize(voice.sampleText.trim(), voice.geminiVoiceName, apiKey);
      const wavFile = outFile.replace(/\.mp3$/, '.wav');
      fs.writeFileSync(wavFile, pcmToWav(pcm));
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wavFile, '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '64k', outFile]);
      fs.unlinkSync(wavFile);
      console.log(`ok    ${voice.id} (${voice.geminiVoiceName}) -> ${(fs.statSync(outFile).size / 1024).toFixed(0)} KB`);
    } catch (err: any) {
      failed++;
      console.error(`FAIL  ${voice.id} (${voice.geminiVoiceName}): ${err?.message || err}`);
    }
  }

  if (failed > 0) {
    console.error(`${failed} sample(s) failed`);
    process.exit(1);
  }
}

main();
