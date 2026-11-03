// Edits the promo video: each narration segment gets its stretch of film (sped up to fit,
// at most 4x, or held on its last frame), an Arabic caption, then an outro card; the
// narration is laid under it. Writes <out>/promo.mp4 (1920x1080) and <out>/thumbnail.jpg.
// Usage: node scripts/promo/compose.cjs <outDir>
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const out = path.resolve(process.argv[2] || 'promo-out');
const clips = path.join(out, 'clips');
const narr = path.join(out, 'narr');
const work = path.join(out, 'work');
fs.mkdirSync(work, { recursive: true });
const marks = JSON.parse(fs.readFileSync(path.join(clips, 'marks.json'), 'utf8'));
const durations = JSON.parse(fs.readFileSync(path.join(narr, 'durations.json'), 'utf8'));
const segments = JSON.parse(fs.readFileSync(path.join(__dirname, 'segments.json'), 'utf8'));
const FPS = 30;
const PAD = 0.35; // breathing room after each spoken line

const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
const m = (k) => {
  if (marks[k] === undefined) throw new Error(`missing mark ${k}`);
  return marks[k];
};

// Which stretch of which clip illustrates each segment
const plan = {
  hook: [['home', m('home.start'), m('home.end')]],
  upload: [['studio', m('studio.upload'), m('studio.scanning')]],
  scan: [['studio', m('studio.scanning'), m('studio.ready')]],
  chapters: [['studio', m('studio.studio'), m('studio.studioEnd')]],
  voices: [['home', m('home.voices'), m('home.voicesEnd')]],
  controls: [['studio', m('studio.controls'), m('studio.controlsEnd')]],
  ai: [
    ['studio', m('studio.summary'), m('studio.summaryReady')],
    ['studio', m('studio.summaryReady'), m('studio.pointsReady')],
    ['studio', m('studio.ask'), m('studio.askReady')],
  ],
  summaries: [['summaries', m('summaries.start'), m('summaries.end')]],
  writer: [
    ['writer', m('writer.start'), m('writer.generating')],
    ['writer', m('writer.generating'), m('writer.result')],
    ['writer', m('writer.result'), m('writer.resultEnd')],
  ],
  library: [
    ['writer', m('writer.library'), m('writer.libraryEnd')],
    ['studio', m('studio.download'), m('studio.downloadEnd')],
  ],
};

// Fit a stretch of film into `target` seconds: speed it up (max 4x) or hold the last frame
function cut(clip, from, to, target, file) {
  const src = path.join(clips, marks[`${clip}.file`]);
  const len = Math.max(0.2, to - from);
  const speed = Math.min(4, Math.max(1, len / target));
  const used = Math.min(len, target * speed);
  const hold = Math.max(0, target - used / speed);
  ff([
    '-ss', from.toFixed(3), '-t', used.toFixed(3), '-i', src,
    '-vf', `setpts=PTS/${speed.toFixed(4)},fps=${FPS},scale=1920:1080:flags=lanczos,tpad=stop_mode=clone:stop_duration=${hold.toFixed(3)},trim=duration=${target.toFixed(3)}`,
    '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', file,
  ]);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const fonts = '<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@700;800&display=swap" rel="stylesheet">';

  // Captions as transparent PNGs (the browser shapes Arabic properly; ffmpeg's text filter may not)
  async function caption(text, file) {
    await page.setContent(`<html><head>${fonts}<style>body{margin:0;background:transparent;width:1920px;height:1080px;font-family:Tajawal,sans-serif}
      .c{position:absolute;bottom:64px;left:50%;transform:translateX(-50%);max-width:1500px;padding:18px 40px;border-radius:18px;background:rgba(11,12,26,.82);color:#fff;font-size:48px;font-weight:800;line-height:1.45;text-align:center;direction:rtl;box-shadow:0 8px 30px rgba(0,0,0,.35)}
      </style></head><body><div class="c">${text}</div></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: file, omitBackground: true });
  }

  // The closing card
  async function outroCard(file) {
    await page.setContent(`<html><head>${fonts}<style>body{margin:0;width:1920px;height:1080px;font-family:Tajawal,sans-serif;direction:rtl;
      background:radial-gradient(circle at 70% 20%,#4f46e5 0%,#1e1b4b 45%,#0b0c1a 100%);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px}
      .t{font-size:120px;font-weight:800}.s{font-size:54px;color:#c7cbfa}.u{font-size:64px;font-weight:800;color:#22d3ee;direction:ltr}
      .b{font-size:40px;padding:14px 34px;border-radius:999px;background:#22d3ee;color:#0b0c1a;font-weight:800}</style></head>
      <body><div class="t">حكواتي</div><div class="s">كتبك بصوت عربي</div><div class="u">hakawatiai.com</div><div class="b">30 دقيقة استماع مجاناً</div></body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
    await page.screenshot({ path: file });
  }

  const parts = [];
  const audio = [];
  for (const seg of segments) {
    const spoken = durations[seg.id].total;
    const target = spoken + PAD;
    const piece = path.join(work, `${seg.id}.mp4`);
    if (seg.id === 'outro') {
      const card = path.join(work, 'outro.png');
      await outroCard(card);
      // A slow push-in on the card
      ff(['-loop', '1', '-i', card, '-vf', `zoompan=z='min(zoom+0.0007,1.06)':d=${Math.ceil((target + 1.2) * FPS)}:s=1920x1080:fps=${FPS}`, '-t', (target + 1.2).toFixed(3), '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', piece]);
    } else {
      const stretches = plan[seg.id];
      // Share the segment's time between its stretches by their length
      const lens = stretches.map(([, a, b]) => Math.max(0.5, b - a));
      const total = lens.reduce((a, b) => a + b, 0);
      const sub = [];
      stretches.forEach(([clip, a, b], i) => {
        const f = path.join(work, `${seg.id}.${i}.mp4`);
        cut(clip, a, b, (target * lens[i]) / total, f);
        sub.push(f);
      });
      const raw = path.join(work, `${seg.id}.raw.mp4`);
      if (sub.length === 1) fs.copyFileSync(sub[0], raw);
      else {
        fs.writeFileSync(path.join(work, `${seg.id}.txt`), sub.map((f) => `file '${f}'`).join('\n'));
        ff(['-f', 'concat', '-safe', '0', '-i', path.join(work, `${seg.id}.txt`), '-c', 'copy', raw]);
      }
      // Caption over the film: one per dialect line for the voices segment
      const cap = path.join(work, `${seg.id}.cap.png`);
      await caption(seg.caption, cap);
      let filter = '[0][1]overlay=0:0';
      const inputs = ['-i', raw, '-i', cap];
      if (seg.dialects?.length) {
        // Switch captions as each dialect line starts
        const p = durations[seg.id].parts;
        let t = p[0] + 0.35;
        filter = `[0][1]overlay=0:0:enable='lt(t,${t.toFixed(2)})'[v0]`;
        seg.dialects.forEach((d, i) => {
          const f = path.join(work, `${seg.id}.cap${i}.png`);
          inputs.push('-i', f);
          const start = t;
          t += p[i + 1] + 0.35;
          const end = i === seg.dialects.length - 1 ? 999 : t;
          filter += `;[v${i}][${i + 2}]overlay=0:0:enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'[v${i + 1}]`;
        });
        filter += `;[v${seg.dialects.length}]null`;
        for (const [i, d] of seg.dialects.entries()) await caption(d.caption, path.join(work, `${seg.id}.cap${i}.png`));
      }
      ff([...inputs, '-filter_complex', filter, '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', piece]);
    }
    parts.push(piece);
    // Audio: the spoken line, then silence to the end of the piece
    const a = path.join(work, `${seg.id}.m4a`);
    const pieceLen = seg.id === 'outro' ? target + 1.2 : target;
    ff(['-i', path.join(narr, `${seg.id}.wav`), '-af', `apad=whole_dur=${pieceLen.toFixed(3)}`, '-t', pieceLen.toFixed(3), '-ar', '48000', '-ac', '2', '-c:a', 'aac', '-b:a', '160k', a]);
    audio.push(a);
    console.log(`${seg.id}: ${pieceLen.toFixed(2)}s`);
  }

  // Join the pieces and lay the narration under them
  fs.writeFileSync(path.join(work, 'v.txt'), parts.map((f) => `file '${f}'`).join('\n'));
  fs.writeFileSync(path.join(work, 'a.txt'), audio.map((f) => `file '${f}'`).join('\n'));
  ff(['-f', 'concat', '-safe', '0', '-i', path.join(work, 'v.txt'), '-c', 'copy', path.join(work, 'video.mp4')]);
  ff(['-f', 'concat', '-safe', '0', '-i', path.join(work, 'a.txt'), '-c', 'copy', path.join(work, 'audio.m4a')]);
  const final = path.join(out, 'promo.mp4');
  ff(['-i', path.join(work, 'video.mp4'), '-i', path.join(work, 'audio.m4a'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', '-shortest', final]);

  // Thumbnail for YouTube: the studio frame with a big title
  const still = path.join(work, 'still.jpg');
  ff(['-ss', (m('studio.studio') + 3).toFixed(2), '-i', path.join(clips, marks['studio.file']), '-frames:v', '1', still]);
  const b64 = fs.readFileSync(still).toString('base64');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.setContent(`<html><head>${fonts}<style>body{margin:0;width:1280px;height:720px;font-family:Tajawal,sans-serif;direction:rtl;position:relative;overflow:hidden}
    img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.45)}
    .t{position:absolute;right:60px;top:150px;left:60px;color:#fff;font-size:92px;font-weight:800;line-height:1.25;text-shadow:0 6px 24px rgba(0,0,0,.6)}
    .t span{color:#22d3ee}.b{position:absolute;right:60px;bottom:70px;font-size:40px;padding:12px 28px;border-radius:999px;background:#4f46e5;color:#fff;font-weight:800}</style></head>
    <body><img src="data:image/jpeg;base64,${b64}"><div class="t">حوّل أي كتاب<br><span>إلى صوت عربي</span></div><div class="b">حكواتي · hakawatiai.com</div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, 'thumbnail.jpg'), type: 'jpeg', quality: 88 });
  await browser.close();
  const d = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', final]).toString().trim();
  console.log(`promo.mp4: ${Number(d).toFixed(1)}s, ${(fs.statSync(final).size / 1e6).toFixed(1)} MB`);
})();
