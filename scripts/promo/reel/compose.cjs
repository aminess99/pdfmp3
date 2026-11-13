// Edits a vertical reel (1080x1920): an opening shot of a scanned page, phone recordings of
// the site fitted to the narration, a big headline per shot, word-by-word captions with the
// spoken word highlighted, a slow push-in on the paragraph being read, and a closing card.
// Usage: node scripts/promo/reel/compose.cjs <outDir> <reel.json> <page.jpg>
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const out = path.resolve(process.argv[2] || 'reel-out');
const segments = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const pageImage = path.resolve(process.argv[4]);
const clips = path.join(out, 'clips');
const narr = path.join(out, 'narr');
const work = path.join(out, 'work');
fs.mkdirSync(work, { recursive: true });
const marks = JSON.parse(fs.readFileSync(path.join(clips, 'marks.json'), 'utf8'));
const durations = JSON.parse(fs.readFileSync(path.join(narr, 'durations.json'), 'utf8'));
const FPS = 30;
const PAD = 0.25;
const ENC = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS)];
const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
const m = (k) => {
  if (marks[k] === undefined) throw new Error(`missing mark ${k}`);
  return marks[k];
};
const clipLen = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

// Which stretch of the phone recording illustrates each line, and how the camera moves
const plan = {
  upload: { from: 'app.upload', to: 'app.scanning' },
  scan: { from: 'app.scanning', to: 'app.ready' },
  listen: { from: 'app.listen', to: 'app.listenEnd', push: { y: 760 } },
  chapters: { from: 'app.chapters', to: 'app.chaptersEnd' },
};

// A segment's "shot" in the reel file wins over the plan above (reel1 uses the plan)
const shotFor = (seg) => seg.shot || plan[seg.id];

function cut(seg, target, file) {
  const p = shotFor(seg);
  // The recording that holds the shot: "voices.msa" -> voices.mp4
  const src = path.join(clips, m(`${p.from.split('.')[0]}.file`));
  const total = clipLen(src);
  const from = Math.min(m(p.from), total - 0.3);
  const to = Math.min(Math.max(m(p.to), from + 0.3), total);
  const len = to - from;
  const speed = Math.min(4, Math.max(1, len / target));
  const used = Math.min(len, target * speed);
  const hold = Math.max(0, target - used / speed);
  let vf = `setpts=PTS/${speed.toFixed(4)},fps=${FPS},scale=1080:1920,tpad=stop_mode=clone:stop_duration=${hold.toFixed(3)},trim=duration=${target.toFixed(3)},setpts=PTS-STARTPTS`;
  if (p.push) {
    // A slow push-in towards the paragraph being read
    const frames = Math.ceil(target * FPS);
    vf += `,zoompan=z='1+0.22*on/${frames}':x='iw/2-(iw/zoom/2)':y='${p.push.y}-(ih/zoom/2)':d=1:s=1080x1920:fps=${FPS}`;
  }
  ff(['-ss', from.toFixed(3), '-t', used.toFixed(3), '-i', src, '-vf', vf, '-an', ...ENC, file]);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  const fonts = '<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@800;900&display=swap" rel="stylesheet">';
  const shot = async (html, file, transparent = true) => {
    await page.setContent(`<html><head>${fonts}<style>body{margin:0;width:1080px;height:1920px;font-family:Tajawal,'Noto Color Emoji',sans-serif;direction:rtl;${transparent ? 'background:transparent' : ''}}</style></head><body>${html}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    await page.screenshot({ path: file, omitBackground: transparent });
  };
  // The big headline at the top of each shot
  const headline = (text, file) =>
    shot(`<div style="position:absolute;top:190px;left:60px;right:60px;text-align:center">
      <span style="display:inline-block;padding:22px 44px;border-radius:28px;background:#4f46e5;color:#fff;font-size:76px;font-weight:900;line-height:1.3;box-shadow:0 14px 40px rgba(0,0,0,.45)">${text}</span></div>`, file);
  // The spoken line, with word i highlighted
  // Captions sit low by default; "captionAt": "top" moves them under the headline (for shots
  // whose bottom half is the point, like the chapter list)
  const words = (list, i, file, at) =>
    shot(`<div style="position:absolute;${at === 'top' ? 'top:470px' : 'bottom:300px'};left:60px;right:60px;text-align:center"><div style="display:inline-block;padding:20px 34px;border-radius:26px;background:rgba(11,12,26,.82);font-size:62px;font-weight:900;line-height:1.45;color:#fff">${list.map((w, k) => `<span style="color:${k === i ? '#22d3ee' : '#fff'}">${w}</span>`).join(' ')}</div></div>`, file);

  const pieces = [];
  const audio = [];
  for (const seg of segments) {
    const spoken = durations[seg.id].total;
    const target = spoken + PAD + (seg.id === 'outro' ? 1 : 0);
    const base = path.join(work, `${seg.id}.base.mp4`);
    if (seg.id === 'hook' && !shotFor(seg)) {
      // The scanned page, darkened, with a slow push-in
      // The whole page over a blurred copy of itself (a portrait page is wider than the phone)
      ff(['-loop', '1', '-i', pageImage, '-filter_complex',
        `[0]split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:2,eq=brightness=-0.25[bg];[b]scale=1000:-1[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,` +
        `zoompan=z='1+0.0016*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.ceil(target * FPS)}:s=1080x1920:fps=${FPS}`,
        '-t', target.toFixed(3), ...ENC, base]);
    } else if (seg.id === 'outro') {
      const card = path.join(work, 'outro.png');
      const c = seg.card || {};
      await shot(`<div style="width:1080px;height:1920px;background:radial-gradient(circle at 70% 25%,#4f46e5 0%,#1e1b4b 45%,#0b0c1a 100%);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px">
        <div style="font-size:150px;font-weight:900">حكواتي</div><div style="font-size:62px;color:#c7cbfa">${c.sub || 'كتبك بصوت عربي'}</div>
        <div style="font-size:72px;font-weight:900;color:#22d3ee;direction:ltr">hakawatiai.com</div>
        <div style="font-size:50px;padding:18px 44px;border-radius:999px;background:#22d3ee;color:#0b0c1a;font-weight:900">30 دقيقة مجاناً</div>
        ${c.question ? `<div style="margin-top:50px;font-size:84px;font-weight:900;padding:24px 50px;border-radius:30px;background:#fff;color:#1e1b4b">${c.question}</div>` : ''}</div>`, card, false);
      ff(['-loop', '1', '-i', card, '-vf', `zoompan=z='1+0.0009*on':d=${Math.ceil(target * FPS)}:s=1080x1920:fps=${FPS}`, '-t', target.toFixed(3), ...ENC, base]);
    } else {
      cut(seg, target, base);
    }
    // Headline + word-by-word caption (the outro card already says it all)
    const piece = path.join(work, `${seg.id}.mp4`);
    if (seg.id === 'outro') {
      fs.copyFileSync(base, piece);
    } else {
      const head = path.join(work, `${seg.id}.head.png`);
      await headline(seg.headline, head);
      const list = seg.text.replace(/\.\.\./g, '…').split(/\s+/).filter(Boolean);
      const weights = list.map((w) => w.replace(/[^\p{L}]/gu, '').length + 1);
      const sum = weights.reduce((a, b) => a + b, 0);
      const main = durations[seg.id].parts[0];
      const inputs = ['-i', base, '-i', head];
      let filter = '[0][1]overlay=0:0[v0]';
      let t = 0;
      for (let i = 0; i < list.length; i++) {
        const f = path.join(work, `${seg.id}.w${i}.png`);
        await words(list, i, f, seg.captionAt);
        inputs.push('-i', f);
        const start = t;
        t += (main * weights[i]) / sum;
        const end = i === list.length - 1 ? 999 : t;
        filter += `;[v${i}][${i + 2}]overlay=0:0:enable='between(t,${start.toFixed(3)},${end.toFixed(3)})'[v${i + 1}]`;
      }
      ff([...inputs, '-filter_complex', filter, '-map', `[v${list.length}]`, ...ENC, piece]);
    }
    pieces.push(piece);
    const a = path.join(work, `${seg.id}.m4a`);
    ff(['-i', path.join(narr, `${seg.id}.wav`), '-af', `apad=whole_dur=${target.toFixed(3)}`, '-t', target.toFixed(3), '-ar', '48000', '-ac', '2', '-c:a', 'aac', '-b:a', '160k', a]);
    audio.push(a);
    console.log(`${seg.id}: ${target.toFixed(2)}s`);
  }
  await browser.close();

  fs.writeFileSync(path.join(work, 'v.txt'), pieces.map((f) => `file '${f}'`).join('\n'));
  fs.writeFileSync(path.join(work, 'a.txt'), audio.map((f) => `file '${f}'`).join('\n'));
  ff(['-f', 'concat', '-safe', '0', '-i', path.join(work, 'v.txt'), '-c', 'copy', path.join(work, 'video.mp4')]);
  ff(['-f', 'concat', '-safe', '0', '-i', path.join(work, 'a.txt'), '-c', 'copy', path.join(work, 'audio.m4a')]);
  const final = path.join(out, 'reel.mp4');
  ff(['-i', path.join(work, 'video.mp4'), '-i', path.join(work, 'audio.m4a'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', '-shortest', final]);
  console.log(`reel.mp4: ${clipLen(final).toFixed(1)}s, ${(fs.statSync(final).size / 1e6).toFixed(1)} MB`);
})();
