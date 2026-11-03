// Narration for the promo video, spoken by the site's own voices through a local server
// (POST /api/tts/speak). Writes out/narr/<id>.wav (dialect lines appended to their segment)
// and out/narr/durations.json. Usage: npx tsx scripts/promo/narrate.ts <outDir>
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { VOICES } from '../../src/data/voices';

const BASE = process.env.BASE_URL || 'http://localhost:4789';
const out = path.join(process.argv[2] || 'promo-out', 'narr');
fs.mkdirSync(out, { recursive: true });
const segments = JSON.parse(fs.readFileSync(path.join(__dirname, 'segments.json'), 'utf8'));
const voice = (id: string) => VOICES.find((v) => v.id === id)!;

async function speak(text: string, voiceId: string, file: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(`${BASE}/api/tts/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: voice(voiceId), speed: 1 }),
    });
    if (r.ok) {
      const raw = path.join(out, `${path.basename(file)}.raw`);
      fs.writeFileSync(raw, Buffer.from(await r.arrayBuffer()));
      // Normalise to 48 kHz mono WAV, trimming silence at both ends
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af',
        'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse',
        '-ar', '48000', '-ac', '1', file]);
      fs.unlinkSync(raw);
      return;
    }
    console.warn(`tts ${r.status} for "${text}", retrying`);
    await new Promise((res) => setTimeout(res, 3000));
  }
  throw new Error(`tts failed: ${text}`);
}

const dur = (f: string) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());

(async () => {
  const durations: Record<string, { total: number; parts: number[] }> = {};
  for (const seg of segments) {
    const parts: string[] = [];
    const main = path.join(out, `${seg.id}.main.wav`);
    await speak(seg.text, 'youssef_msa', main);
    parts.push(main);
    for (const [i, d] of (seg.dialects || []).entries()) {
      const f = path.join(out, `${seg.id}.d${i}.wav`);
      await speak(d.text, d.voice, f);
      parts.push(f);
    }
    // Join with short pauses
    const gap = path.join(out, 'gap.wav');
    if (!fs.existsSync(gap)) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', '0.35', gap]);
    const list = path.join(out, `${seg.id}.txt`);
    fs.writeFileSync(list, parts.flatMap((p, i) => (i ? [gap, p] : [p])).map((p) => `file '${path.resolve(p)}'`).join('\n'));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(out, `${seg.id}.wav`)]);
    durations[seg.id] = { total: dur(path.join(out, `${seg.id}.wav`)), parts: parts.map(dur) };
    console.log(`${seg.id}: ${durations[seg.id].total.toFixed(2)}s`);
  }
  fs.writeFileSync(path.join(out, 'durations.json'), JSON.stringify(durations, null, 2));
  console.log('total', Object.values(durations).reduce((a, d) => a + d.total, 0).toFixed(1), 's');
})();
