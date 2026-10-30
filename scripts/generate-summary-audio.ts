// Narrates every book summary once and saves it as a static file the site serves for free:
//   public/summaries/<slug>.mp3   the whole summary
//   public/summaries/<slug>.json  { hash, duration, sections: [start second of each section] }
//
//   OPENROUTER_API_KEY=sk-or-v1-... npx tsx scripts/generate-summary-audio.ts [--force] [slug...]
//
// A summary is skipped when its manifest hash matches the current text and voice, so editing
// a summary regenerates only that one. Requires ffmpeg.
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { BOOK_SUMMARIES, BookSummary, SummaryAudioManifest, summaryScript } from '../src/data/summaries';
import { VOICES } from '../src/data/voices';

dotenv.config();

const MODEL = process.env.TTS_MODEL || 'google/gemini-3.8-flash-lite-tts';
const OUT_DIR = path.join(process.cwd(), 'public', 'summaries');
const SAMPLE_RATE = 24000;
const BYTES_PER_SECOND = SAMPLE_RATE * 2;
// One request at a time: a low OpenRouter balance refuses parallel requests (402 in-flight budget)
const PARALLEL = 1;
// Finished paragraphs are kept here (restored between workflow runs by actions/cache),
// so a run that fails halfway never pays for the same paragraph twice
const PIECE_CACHE = path.join(process.cwd(), '.summary-cache');

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));

// Pauses between the narrated pieces, in seconds
const GAP_AFTER_HEADING = 0.7;
const GAP_BETWEEN_PARAGRAPHS = 0.5;
const GAP_BEFORE_SECTION = 1.2;

function pcmToWav(pcm: Buffer): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(BYTES_PER_SECOND, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

const silence = (seconds: number): Buffer => Buffer.alloc(Math.round(seconds * SAMPLE_RATE) * 2);

// Drop the model's own leading/trailing silence so the pauses above stay even
function trimSilence(pcm: Buffer, threshold = 300, marginSeconds = 0.06): Buffer {
  const samples = pcm.length >> 1;
  let start = 0;
  while (start < samples && Math.abs(pcm.readInt16LE(start * 2)) < threshold) start++;
  let end = samples - 1;
  while (end > start && Math.abs(pcm.readInt16LE(end * 2)) < threshold) end--;
  const margin = Math.round(marginSeconds * SAMPLE_RATE);
  start = Math.max(0, start - margin);
  end = Math.min(samples - 1, end + margin);
  return pcm.subarray(start * 2, (end + 1) * 2);
}

async function synthesize(text: string, voiceName: string, instructions: string, apiKey: string): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'https://hakawatiai.com',
          'X-Title': 'Hakawati AI',
        },
        // Same request shape as the server: `input` is read verbatim, the style goes in `instructions`
        body: JSON.stringify({ model: MODEL, input: text, instructions, voice: voiceName, speed: 1.0, response_format: 'pcm' }),
        signal: AbortSignal.timeout(180_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const pcm = Buffer.from(await res.arrayBuffer());
      // A real paragraph is several seconds long; anything shorter is a broken answer
      if (pcm.length < BYTES_PER_SECOND) throw new Error(`audio too short (${pcm.length} bytes)`);
      return trimSilence(pcm);
    } catch (err) {
      if (attempt >= 6) throw err;
      console.warn(`  retry (attempt ${attempt}): ${(err as Error).message.slice(0, 160)}`);
      await new Promise((r) => setTimeout(r, 10_000 * attempt));
    }
  }
}

function hashFor(summary: BookSummary, voiceName: string, instructions: string): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ MODEL, voiceName, instructions, script: summaryScript(summary), gaps: [GAP_AFTER_HEADING, GAP_BETWEEN_PARAGRAPHS, GAP_BEFORE_SECTION] }))
    .digest('hex')
    .slice(0, 16);
}

async function generate(summary: BookSummary, apiKey: string): Promise<void> {
  const voice = VOICES.find((v) => v.id === summary.voiceId);
  if (!voice?.geminiVoiceName) throw new Error(`unknown voice ${summary.voiceId}`);
  const instructions = `${voice.stylePrompt?.trim() || ''} اقرأ بإيقاع متأنٍّ وواضح كراوي كتب صوتية، مع وقفات طبيعية بين الجمل.`.trim();

  const mp3File = path.join(OUT_DIR, `${summary.slug}.mp3`);
  const jsonFile = path.join(OUT_DIR, `${summary.slug}.json`);
  const hash = hashFor(summary, voice.geminiVoiceName, instructions);
  if (!force && fs.existsSync(mp3File) && fs.existsSync(jsonFile)) {
    const old = JSON.parse(fs.readFileSync(jsonFile, 'utf8')) as SummaryAudioManifest;
    if (old.hash === hash) {
      console.log(`skip  ${summary.slug} (up to date)`);
      return;
    }
  }

  // Every heading and paragraph is its own request, a few at a time
  const pieces = summaryScript(summary).flatMap((sec, s) => [
    { section: s, isHeading: true, text: sec.heading },
    ...sec.paragraphs.map((p) => ({ section: s, isHeading: false, text: p })),
  ]);
  const audio: Buffer[] = new Array(pieces.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      while (next < pieces.length) {
        const i = next++;
        const key = crypto.createHash('sha256').update(JSON.stringify([MODEL, voice.geminiVoiceName, instructions, pieces[i].text])).digest('hex').slice(0, 24);
        const cached = path.join(PIECE_CACHE, `${key}.pcm`);
        if (fs.existsSync(cached)) {
          audio[i] = fs.readFileSync(cached);
        } else {
          audio[i] = await synthesize(pieces[i].text, voice.geminiVoiceName!, instructions, apiKey);
          fs.writeFileSync(cached, audio[i]);
        }
        console.log(`  ${i + 1}/${pieces.length} ${(audio[i].length / BYTES_PER_SECOND).toFixed(1)}s`);
      }
    })
  );

  const parts: Buffer[] = [];
  const sectionStarts: number[] = [];
  let bytes = 0;
  const push = (b: Buffer) => {
    parts.push(b);
    bytes += b.length;
  };
  pieces.forEach((piece, i) => {
    if (piece.isHeading) {
      if (i > 0) push(silence(GAP_BEFORE_SECTION));
      sectionStarts.push(Math.round((bytes / BYTES_PER_SECOND) * 10) / 10);
      push(audio[i]);
      push(silence(GAP_AFTER_HEADING));
    } else {
      push(audio[i]);
      const nextPiece = pieces[i + 1];
      if (nextPiece && !nextPiece.isHeading) push(silence(GAP_BETWEEN_PARAGRAPHS));
    }
  });
  push(silence(0.8));
  const pcm = Buffer.concat(parts);

  const wavFile = mp3File.replace(/\.mp3$/, '.wav');
  fs.writeFileSync(wavFile, pcmToWav(pcm));
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', wavFile,
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '24000', '-ac', '1',
    '-codec:a', 'libmp3lame', '-b:a', '48k',
    '-metadata', `title=ملخص كتاب ${summary.bookTitle}`, '-metadata', `artist=Hakawati AI`,
    mp3File,
  ]);
  fs.unlinkSync(wavFile);

  const manifest: SummaryAudioManifest = { hash, duration: Math.round(pcm.length / BYTES_PER_SECOND), sections: sectionStarts };
  fs.writeFileSync(jsonFile, JSON.stringify(manifest) + '\n');
  console.log(`ok    ${summary.slug}: ${(manifest.duration / 60).toFixed(1)} min, ${(fs.statSync(mp3File).size / 1024 / 1024).toFixed(1)} MB`);
}

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is not set');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(PIECE_CACHE, { recursive: true });

  let failed = 0;
  for (const summary of BOOK_SUMMARIES) {
    if (only.length && !only.includes(summary.slug)) continue;
    console.log(`==    ${summary.slug}`);
    try {
      await generate(summary, apiKey);
    } catch (err: any) {
      failed++;
      console.error(`FAIL  ${summary.slug}: ${err?.message || err}`);
    }
  }
  if (failed > 0) {
    console.error(`${failed} summary(ies) failed`);
    process.exit(1);
  }
}

main();
