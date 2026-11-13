// Motion-graphics reel (1080x1920, 30 fps): every frame is drawn by an HTML page at time t
// and captured in order, so the animation is exact and repeatable. The sound track is mixed
// here: the site's narration, effects synthesised in code (no licensed audio), and a
// "chaos" moment with all six dialects at once.
//
//   hook    a PDF falls and slams, opens into a book, its letters fly off into a sound wave
//   wheel   a wheel of the 21 dialect flags spins and lands on a dialect
//   speak   that dialect's line in a speech bubble, word by word, a live waveform, and the
//           phone recording of the site playing that voice
//   finale  all six bubbles at once, sucked into the logo
//   outro   logo, counters, address, and the question for the comments
//
// Usage: node scripts/promo/reel/motion.cjs <outDir> <reel.json>
// Needs <outDir>/narr (scripts/promo/narrate.ts) and <outDir>/clips (record.cjs, "voices").
// Writes <outDir>/reel.mp4 (voice + effects) and <outDir>/reel-voice.mp4 (voice only).
const { chromium } = require('playwright');
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const out = path.resolve(process.argv[2] || 'reel-out');
const segs = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const narrDir = path.join(out, 'narr');
const clips = path.join(out, 'clips');
const work = path.join(out, 'motion');
fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });
const durations = JSON.parse(fs.readFileSync(path.join(narrDir, 'durations.json'), 'utf8'));
const marks = fs.existsSync(path.join(clips, 'marks.json')) ? JSON.parse(fs.readFileSync(path.join(clips, 'marks.json'), 'utf8')) : {};
const FPS = 30;
const SR = 48000;
const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });
const probe = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

const hookSeg = segs.find((s) => s.id === 'hook');
const outroSeg = segs.find((s) => s.id === 'outro');
const dialects = segs.filter((s) => s.flag);
const dur = (id) => durations[id].total;

// ---------------------------------------------------------------- timeline
const WEDGES = segs.find((s) => s.wheel)?.wheel || [];
const tl = {};
tl.hook = { start: 0, voiceAt: 0.95 };
tl.hook.end = Math.max(3.1, tl.hook.voiceAt + dur('hook') + 0.35);
let t = tl.hook.end;
let angle = 0;
const spins = [];
dialects.forEach((d, i) => {
  const spin = i === 0 ? 1.45 : 0.75;
  const hold = 0.18;
  const zoom = 0.26;
  const k = WEDGES.findIndex((w) => w.id === d.id);
  // Flag k sits at k * 360/n degrees (clockwise from the top); land it under the pointer
  const a = (k * 360) / WEDGES.length;
  const rest = (((angle + a) % 360) + 360) % 360;
  const to = angle - ((i === 0 ? 3 : 2) * 360 + rest);
  spins.push({ start: t, end: t + spin, from: angle, to, k });
  angle = to;
  const s = t + spin + hold + zoom;
  tl[d.id] = { spinStart: t, landAt: t + spin, zoomAt: t + spin + hold, start: s, voiceAt: s + 0.12 };
  tl[d.id].end = tl[d.id].voiceAt + dur(d.id) + 0.3;
  t = tl[d.id].end;
});
tl.finale = { start: t, end: t + 2.2 };
t = tl.finale.end;
tl.outro = { start: t, voiceAt: t + 0.45 };
tl.outro.end = Math.max(t + 4.6, tl.outro.voiceAt + dur('outro') + 1.2);
const TOTAL = tl.outro.end;
console.log('timeline', JSON.stringify({ hookEnd: tl.hook.end, ...Object.fromEntries(dialects.map((d) => [d.id, [tl[d.id].spinStart, tl[d.id].start, tl[d.id].end].map((x) => +x.toFixed(2))])), finale: tl.finale.start, outro: tl.outro.start, total: TOTAL }));
const N = Math.ceil(TOTAL * FPS);

const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
// The wheel's angle at time t (also drawn by the page, which gets the same spins)
const wheelAngle = (time) => {
  let a = 0;
  for (const s of spins) {
    if (time >= s.end) a = s.to;
    else if (time >= s.start) return s.from + (s.to - s.from) * easeOutCubic((time - s.start) / (s.end - s.start));
  }
  return a;
};

// Word timings: each word gets a share of the spoken line by its length
const wordTimes = (seg, start) => {
  const words = seg.text.replace(/\.\.\./g, '…').split(/\s+/).filter(Boolean);
  const weights = words.map((w) => w.replace(/[^\p{L}]/gu, '').length + 1);
  const sum = weights.reduce((a, b) => a + b, 0);
  const main = durations[seg.id].parts[0];
  let at = start;
  return words.map((w, i) => {
    const r = { w, at };
    at += (main * weights[i]) / sum;
    return r;
  });
};

// ---------------------------------------------------------------- sound
const decode = (file) => {
  const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
};
const voice = new Float32Array(Math.ceil((TOTAL + 1) * SR));
const fx = new Float32Array(voice.length);
const add = (buf, clip, at, gain = 1, maxLen = Infinity, fadeOut = 0) => {
  const o = Math.round(at * SR);
  const n = Math.min(clip.length, Math.round(maxLen * SR));
  const fade = Math.round(fadeOut * SR);
  for (let i = 0; i < n && o + i < buf.length; i++) {
    const g = fade && i > n - fade ? (n - i) / fade : 1;
    if (o + i >= 0) buf[o + i] += clip[i] * gain * g;
  }
};
const narr = {};
for (const s of segs) narr[s.id] = decode(path.join(narrDir, `${s.id}.wav`));
add(voice, narr.hook, tl.hook.voiceAt);
for (const d of dialects) add(voice, narr[d.id], tl[d.id].voiceAt);
add(voice, narr.outro, tl.outro.voiceAt);

let seed = 7;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed / 2147483647) * 2 - 1;
};
const synth = (len, fn) => {
  const a = new Float32Array(Math.ceil(len * SR));
  for (let i = 0; i < a.length; i++) a[i] = fn(i / SR, i);
  return a;
};
const TAU = Math.PI * 2;
const slam = synth(0.9, (x) => 0.95 * Math.sin(TAU * (42 + 110 * Math.exp(-x * 22)) * x) * Math.exp(-x * 6) + 0.4 * rnd() * Math.exp(-x * 35));
const whoosh = (len, up = true) => {
  let y = 0;
  return synth(len, (x) => {
    const p = x / len;
    const cut = up ? 0.02 + 0.25 * p : 0.27 - 0.25 * p;
    y += cut * (rnd() - y);
    return y * Math.pow(Math.sin(Math.PI * p), 2) * 1.6;
  });
};
const tick = synth(0.05, (x) => 0.45 * Math.sin(TAU * 2300 * x) * Math.exp(-x * 170) + 0.25 * rnd() * Math.exp(-x * 320));
const ding = synth(1.4, (x) => (0.42 * Math.sin(TAU * 1318.5 * x) + 0.2 * Math.sin(TAU * 2637 * x) + 0.12 * Math.sin(TAU * 3955 * x)) * Math.exp(-x * 4.5));
const pop = synth(0.14, (x) => 0.55 * Math.sin(TAU * (520 + 1300 * Math.exp(-x * 45)) * x) * Math.exp(-x * 28));
let prev = 0;
const flip = synth(0.11, (x) => {
  const n = rnd() * Math.exp(-x * 40);
  const y = n - prev;
  prev = n;
  return y * 0.5;
});
const riser = synth(1.0, (x) => (0.25 * Math.sin(TAU * (180 * x + 520 * x * x)) + 0.12 * rnd()) * Math.pow(x, 1.6));
const sparkle = synth(0.9, (x) => {
  let s = 0;
  for (const f of [2093, 2637, 3136, 4186]) s += Math.sin(TAU * f * x) * Math.exp(-((x * 4 - f / 2093 + 1) ** 2) * 6);
  return s * 0.08;
});

add(fx, whoosh(0.5), 0.0, 0.7);
add(fx, slam, 0.45, 1);
for (const at of [0.95, 1.07, 1.19, 1.31]) add(fx, flip, at, 0.8);
add(fx, sparkle, 1.45, 1);
add(fx, whoosh(0.6), 1.45, 0.4);
add(fx, whoosh(0.45), tl.hook.end - 0.3, 0.55);
// Wheel ticks: one per flag passing the pointer
for (const s of spins) {
  const step = 360 / WEDGES.length;
  let last = Math.floor(wheelAngle(s.start) / step);
  let lastAt = -1;
  for (let x = s.start; x < s.end; x += 1 / 240) {
    const w = Math.floor(wheelAngle(x) / step);
    if (w !== last && x - lastAt > 0.032) {
      add(fx, tick, x, 0.55);
      lastAt = x;
    }
    last = w;
  }
}
for (const d of dialects) {
  add(fx, ding, tl[d.id].landAt, 0.6);
  add(fx, whoosh(0.35), tl[d.id].zoomAt, 0.6);
  add(fx, pop, tl[d.id].start + 0.05, 0.6);
}
// The finale: every dialect at once, a riser, and the hit into the logo
dialects.forEach((d, i) => {
  add(voice, narr[d.id], tl.finale.start + 0.15 + i * 0.13, 0.42, 1.5, 0.4);
  add(fx, pop, tl.finale.start + 0.1 + i * 0.13, 0.5);
});
add(fx, riser, tl.finale.end - 1.0, 0.9);
add(fx, slam, tl.finale.end - 0.02, 0.8);
add(fx, sparkle, tl.finale.end, 1);
add(fx, ding, tl.outro.start + 2.3, 0.4);

// Waveform heights: the narration's loudness per frame
const env = [];
for (let f = 0; f < N; f++) {
  const a = Math.floor((f / FPS) * SR);
  let s = 0;
  for (let i = a; i < a + SR / FPS && i < voice.length; i++) s += voice[i] * voice[i];
  env.push(Math.sqrt(s / (SR / FPS)));
}
const envMax = Math.max(...env, 1e-6);
const envNorm = env.map((v) => Math.min(1, v / (envMax * 0.75)));

const writeWav = (file, bufs) => {
  const n = bufs[0][0].length;
  const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    let v = 0;
    for (const [b, g] of bufs) v += b[i] * g;
    pcm.writeInt16LE(Math.round(Math.tanh(v * 1.05) * 32000), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, pcm]));
};
writeWav(path.join(work, 'mix.wav'), [[voice, 1], [fx, 0.55]]);
writeWav(path.join(work, 'voice.wav'), [[voice, 1]]);

// ---------------------------------------------------------------- phone frames
// The site recording for each dialect, fitted to how long its line is on screen
const phone = {};
for (const d of dialects) {
  const from = marks[`voices.${d.id}`];
  const to = marks[`voices.${d.id}End`];
  const src = path.join(clips, marks['voices.file'] || 'voices.mp4');
  if (from === undefined || to === undefined || !fs.existsSync(src)) continue;
  const target = tl[d.id].end - tl[d.id].start;
  const total = probe(src);
  const len = Math.max(0.3, Math.min(to, total) - from);
  const speed = Math.min(4, Math.max(0.6, len / target));
  const dir = path.join(work, 'phone', d.id);
  fs.mkdirSync(dir, { recursive: true });
  ff(['-ss', from.toFixed(3), '-t', len.toFixed(3), '-i', src, '-vf', `setpts=PTS/${speed.toFixed(4)},fps=${FPS},scale=432:768`, '-q:v', '3', path.join(dir, 'f%04d.jpg')]);
  phone[d.id] = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).length;
}

// ---------------------------------------------------------------- the page
const DATA = {
  FPS,
  tl,
  spins,
  wedges: WEDGES,
  env: envNorm,
  phone,
  dialects: dialects.map((d) => ({ id: d.id, flag: d.flag, name: d.name, speaker: d.speaker, colors: d.colors, line: d.text, words: wordTimes(d, tl[d.id].voiceAt) })),
  hook: { l1: hookSeg.title?.[0] || 'كتابك...', l2: hookSeg.title?.[1] || 'يتكلم لهجتك؟', l2At: tl.hook.voiceAt + durations.hook.parts[0] * 0.45 },
  outro: outroSeg.card || {},
};

const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@500;800;900&family=IBM+Plex+Sans+Arabic:wght@600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1920px;overflow:hidden;background:#07081a}
body{font-family:Tajawal,'IBM Plex Sans Arabic','Noto Color Emoji',sans-serif;color:#fff}
#stage{position:absolute;inset:0;overflow:hidden}
#world{position:absolute;inset:0}
.abs{position:absolute}
#bg{position:absolute;inset:0;background:#07081a}
.blob{position:absolute;width:1500px;height:1500px;border-radius:50%;opacity:.6}
#tint{position:absolute;inset:0;opacity:0}
.dot{position:absolute;width:8px;height:8px;border-radius:50%;background:#a5b4fc}
.scene{position:absolute;inset:0;display:none}
/* hook */
#pdf{left:330px;top:620px;width:420px;height:560px;background:#fff;border-radius:22px;box-shadow:0 30px 80px rgba(0,0,0,.6);overflow:hidden;transform-origin:50% 50%}
#pdf:before{content:'';position:absolute;right:0;top:0;width:110px;height:110px;background:linear-gradient(225deg,#07081a 50%,#cbd5e1 50%)}
#pdf .label{position:absolute;left:36px;bottom:40px;padding:10px 26px;border-radius:14px;background:#dc2626;color:#fff;font:900 64px Tajawal,sans-serif;direction:ltr}
#pdf .ln{position:absolute;right:40px;height:16px;border-radius:8px;background:#e2e8f0}
#ring{left:540px;top:900px;width:400px;height:400px;margin:-200px 0 0 -200px;border-radius:50%;border:14px solid #22d3ee;opacity:0}
#book{left:90px;top:640px;width:900px;height:560px;perspective:2200px;opacity:0}
.page{position:absolute;top:0;width:450px;height:560px;background:#fffdf6;border:2px solid #e7e0cf;padding:46px 40px;color:#1f2937;font:600 31px/1.9 'IBM Plex Sans Arabic',Tajawal,sans-serif;overflow:hidden;backface-visibility:hidden}
.page.l{left:0;border-radius:18px 0 0 18px;box-shadow:inset -30px 0 40px rgba(0,0,0,.08)}
.page.r{left:450px;border-radius:0 18px 18px 0;box-shadow:inset 30px 0 40px rgba(0,0,0,.08);transform-origin:0 50%}
.page.f{left:450px;border-radius:0 18px 18px 0;transform-origin:0 50%;background:#f8f4e8}
#spine{position:absolute;left:446px;top:0;width:8px;height:560px;background:linear-gradient(90deg,#d6cfbd,#fff,#d6cfbd)}
#letters{inset:0}
.letter{position:absolute;left:0;top:0;font:800 60px Tajawal,sans-serif;color:#fff;text-shadow:0 0 18px #22d3ee;opacity:0}
.bar{position:absolute;width:16px;border-radius:8px;background:linear-gradient(#a5f3fc,#22d3ee 50%,#6366f1)}
#hookTitle{left:0;right:0;top:230px;text-align:center}
#hookTitle div{display:block;font-weight:900;line-height:1.15;text-shadow:0 10px 40px rgba(0,0,0,.6)}
#ht1{font-size:132px}
#ht2{font-size:112px;color:#22d3ee}
/* wheel */
#wheel{left:70px;top:520px;width:940px;height:940px;border-radius:50%;box-shadow:0 0 0 18px #1e1b4b,0 0 0 26px #22d3ee,0 30px 120px rgba(34,211,238,.35)}
#wheelFace{position:absolute;inset:0;border-radius:50%}
#flags{position:absolute;inset:0}
.wflag{position:absolute;left:470px;top:470px;width:110px;height:110px;margin:-55px 0 0 -55px;font-size:84px;line-height:110px;text-align:center}
#hub{position:absolute;left:345px;top:345px;width:250px;height:250px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#818cf8,#4338ca 60%,#1e1b4b);box-shadow:0 0 0 10px #0b0c1a,0 0 60px rgba(99,102,241,.8);display:flex;align-items:center;justify-content:center;font-size:110px}
#pointer{left:490px;top:440px;width:100px;height:120px;filter:drop-shadow(0 8px 20px rgba(34,211,238,.9))}
#wheelTitle{left:0;right:0;top:250px;text-align:center;font-weight:900;font-size:100px;text-shadow:0 10px 40px rgba(0,0,0,.6)}
#wipe{position:absolute;inset:0;opacity:0}
/* speak */
#hdr{left:0;right:0;top:150px;text-align:center}
#hdr span{display:inline-flex;align-items:center;gap:26px;padding:20px 54px;border-radius:999px;background:rgba(7,8,26,.55);border:4px solid rgba(255,255,255,.35);font-weight:900;font-size:96px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
#hdr b{font-size:110px;font-weight:400}
#bubble{left:70px;right:70px;top:380px;min-height:300px;padding:46px 56px 52px;border-radius:56px;background:#fff;color:#111827;text-align:center;box-shadow:0 30px 90px rgba(0,0,0,.45);transform-origin:20% 100%}
#bubble:after{content:'';position:absolute;left:150px;bottom:-56px;border:30px solid transparent;border-top:44px solid #fff;border-right:0}
#words{font-weight:900;font-size:84px;line-height:1.35}
#words span{display:inline-block;margin:0 9px}
#vtag{left:0;right:0;top:830px;text-align:center}
#vtag span{display:inline-block;padding:10px 30px;border-radius:999px;background:rgba(255,255,255,.16);font:700 44px 'IBM Plex Sans Arabic',Tajawal,sans-serif}
#wave{left:0;right:0;top:900px;height:150px}
#phone{left:305px;top:1080px;width:470px;height:806px;border-radius:64px;background:#0b0c1a;padding:19px;box-shadow:0 0 0 4px #334155,0 40px 100px rgba(0,0,0,.7)}
#phone .scr{width:432px;height:768px;border-radius:48px;overflow:hidden;background:#111}
#phone img{width:432px;height:768px;display:block}
#phone .notch{position:absolute;left:175px;top:30px;width:120px;height:30px;border-radius:15px;background:#000}
/* finale */
.mini{position:absolute;left:0;top:0;padding:24px 32px;border-radius:40px;background:#fff;color:#111827;font-weight:900;font-size:46px;white-space:nowrap;box-shadow:0 20px 60px rgba(0,0,0,.45)}
.mini b{font-size:58px;font-weight:400;margin-left:14px}
#finaleTitle{left:0;right:0;top:170px;text-align:center}
#finaleTitle span{display:inline-block;padding:18px 44px;border-radius:999px;background:#22d3ee;color:#07081a;font-weight:900;font-size:64px}
/* outro */
#logo{left:0;right:0;top:420px;text-align:center;font-weight:900;font-size:190px;text-shadow:0 0 60px rgba(129,140,248,.9)}
#osub{left:0;right:0;top:680px;text-align:center;font-size:62px;color:#c7d2fe;font-weight:800}
#counters{left:0;right:0;top:820px;display:flex;justify-content:center;gap:40px}
.cnt{width:380px;padding:26px 0;border-radius:36px;background:rgba(255,255,255,.1);border:3px solid rgba(255,255,255,.25);text-align:center}
.cnt b{display:block;font-size:130px;line-height:1;color:#22d3ee;direction:ltr}
.cnt span{font-size:54px;font-weight:800}
#url{left:0;right:0;top:1130px;text-align:center;font-size:76px;font-weight:900;direction:ltr;color:#fff}
#free{left:0;right:0;top:1250px;text-align:center}
#free span{display:inline-block;padding:16px 50px;border-radius:999px;background:#22d3ee;color:#07081a;font-size:58px;font-weight:900}
#ask{left:0;right:0;top:1420px;text-align:center}
#ask span{display:inline-block;padding:26px 60px;border-radius:40px;background:#fff;color:#1e1b4b;font-size:92px;font-weight:900;box-shadow:0 20px 70px rgba(0,0,0,.5)}
#flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}
#vignette{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,transparent 55%,rgba(0,0,0,.55));pointer-events:none}
</style></head><body><div id="stage"><div id="world">
<div id="bg"></div><div class="blob" id="b1"></div><div class="blob" id="b2"></div><div id="tint"></div><div id="dots"></div>
<div class="scene" id="hook">
  <div class="abs" id="ring"></div>
  <div class="abs" id="pdf"><div class="label">PDF</div></div>
  <div class="abs" id="book"><div class="page l" id="pl"></div><div class="page r" id="pr"></div><div class="page f" id="pf"></div><div id="spine"></div></div>
  <div class="abs" id="letters"></div><div class="abs" id="hookWave" style="left:0;right:0;top:0;bottom:0"></div>
  <div class="abs" id="hookTitle"><div id="ht1"></div><div id="ht2"></div></div>
</div>
<div class="scene" id="wheelScene">
  <div class="abs" id="wheelTitle">أي لهجة؟ 🎯</div>
  <div class="abs" id="wheel"><div id="wheelFace"></div><div id="flags"></div><div id="hub">🎧</div></div>
  <svg class="abs" id="pointer" viewBox="0 0 100 120"><path d="M50 118 L8 20 Q50 -8 92 20 Z" fill="#22d3ee" stroke="#fff" stroke-width="6"/></svg>
  <div id="wipe"></div>
</div>
<div class="scene" id="speak">
  <div class="abs" id="hdr"><span><b id="hflag"></b><i id="hname" style="font-style:normal"></i></span></div>
  <div class="abs" id="bubble"><div id="words"></div></div>
  <div class="abs" id="vtag"><span id="vname"></span></div>
  <div class="abs" id="wave"></div>
  <div class="abs" id="phone"><div class="scr"><img id="scr"></div><div class="notch"></div></div>
</div>
<div class="scene" id="finale"><div class="abs" id="finaleTitle"><span></span></div><div id="minis"></div></div>
<div class="scene" id="outro">
  <div class="abs" id="logo">حكواتي</div><div class="abs" id="osub"></div>
  <div class="abs" id="counters"><div class="cnt"><b id="c1">0</b><span>لهجة</span></div><div class="cnt"><b id="c2">0</b><span>صوتاً</span></div></div>
  <div class="abs" id="url">hakawatiai.com</div><div class="abs" id="free"><span>30 دقيقة مجاناً</span></div>
  <div class="abs" id="ask"><span></span></div>
</div>
</div><div id="flash"></div><div id="vignette"></div></div>
<script>
const D = ${JSON.stringify(DATA)};
const $ = (id) => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, x) => a + (b - a) * x;
const eOut = (x) => 1 - Math.pow(1 - x, 3);
const eIn = (x) => x * x * x;
const eInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eBack = (x) => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const eElastic = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1);
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const show = (el, on) => { el.style.display = on ? 'block' : 'none'; };
const envAt = (t) => D.env[clamp(Math.round(t * D.FPS), 0, D.env.length - 1)] || 0;

// ---- build
const TEXT = 'اعلم أن الاجتماع الإنساني ضروري ويعبر الحكماء عن هذا بقولهم الإنسان مدني بالطبع أي لا بد له من الاجتماع الذي هو المدنية في اصطلاحهم وهو معنى العمران';
$('pl').textContent = TEXT; $('pr').textContent = TEXT.split(' ').reverse().join(' '); $('pf').textContent = TEXT;
for (let i = 0; i < 6; i++) { const l = document.createElement('div'); l.className = 'ln'; l.style.top = (110 + i * 50) + 'px'; l.style.width = (200 + hash(i) * 140) + 'px'; $('pdf').appendChild(l); }
const LETTERS = TEXT.replace(/\\s/g, '').split('').slice(0, 54);
const letters = LETTERS.map((ch, i) => {
  const el = document.createElement('div'); el.className = 'letter'; el.textContent = ch; $('letters').appendChild(el);
  const onRight = i % 2 === 0, row = Math.floor(i / 2) % 9;
  return { el, x0: (onRight ? 560 : 130) + hash(i + 3) * 330, y0: 700 + row * 52, i };
});
const BARS = 34;
const mkBars = (host, n, x0, x1, y, w) => Array.from({ length: n }, (_, i) => { const b = document.createElement('div'); b.className = 'bar'; b.style.width = w + 'px'; b.style.left = (x0 + (i * (x1 - x0)) / (n - 1) - w / 2) + 'px'; b.dataset.y = y; host.appendChild(b); return b; });
const hookBars = mkBars($('hookWave'), BARS, 140, 940, 1010, 16);
const waveBars = mkBars($('wave'), 31, 150, 930, 75, 18);
const setBars = (bars, t, amp, base) => bars.forEach((b, i) => {
  const mid = 1 - Math.abs(i - (bars.length - 1) / 2) / (bars.length / 2);
  const h = base + amp * envAt(t) * (0.35 + 0.65 * mid) * (0.6 + 0.4 * Math.abs(Math.sin(i * 1.7 + t * 11)));
  b.style.height = h + 'px'; b.style.top = (Number(b.dataset.y) - h / 2) + 'px';
});
for (let i = 0; i < 30; i++) { const d = document.createElement('div'); d.className = 'dot'; $('dots').appendChild(d); }
const dots = [...document.querySelectorAll('.dot')];
// wheel
const n = D.wedges.length, step = 360 / n;
const wc = ['#312e81', '#4338ca', '#1e1b4b'];
// Wedge k is centred on k * step (the flag's angle); thin dividers on top
$('wheelFace').style.background = 'repeating-conic-gradient(from ' + (-step / 2) + 'deg, rgba(255,255,255,.22) 0deg 0.6deg, transparent 0.6deg ' + step + 'deg), ' +
  'conic-gradient(from ' + (-step / 2) + 'deg, ' + D.wedges.map((w, k) => wc[k % 3] + ' ' + (k * step) + 'deg ' + ((k + 1) * step) + 'deg').join(',') + ')';
const wflags = D.wedges.map((w, k) => { const el = document.createElement('div'); el.className = 'wflag'; el.textContent = w.flag; $('flags').appendChild(el); return el; });
const wheelAngle = (t) => { let a = 0; for (const s of D.spins) { if (t >= s.end) a = s.to; else if (t >= s.start) return s.from + (s.to - s.from) * eOut((t - s.start) / (s.end - s.start)); } return a; };
// finale bubbles
// [offset from the centre, top, tilt]
const SPOTS = [[-60, 360, -5], [70, 580, 4], [-80, 800, 3], [60, 1020, -4], [-50, 1240, -3], [80, 1460, 5]];
const minis = D.dialects.map((d, i) => { const el = document.createElement('div'); el.className = 'mini'; el.innerHTML = '<b>' + d.flag + '</b>' + d.line; $('minis').appendChild(el); return el; });
$('finaleTitle').firstChild.textContent = '6 لهجات من 21 😮';
$('osub').textContent = D.outro.sub || 'كتبك بصوت عربي';
$('ask').firstChild.textContent = D.outro.question || 'أي لهجة أحلى؟ 👇';

let curDialect = -1, curImg = '';
window.render = async (t) => {
  const T = D.tl;
  // background drift
  $('b1').style.transform = 'translate(' + (-300 + Math.sin(t * 0.35) * 160) + 'px,' + (-250 + Math.cos(t * 0.3) * 140) + 'px)';
  $('b2').style.transform = 'translate(' + (100 + Math.cos(t * 0.28) * 180) + 'px,' + (900 + Math.sin(t * 0.33) * 160) + 'px)';
  dots.forEach((d, i) => {
    const y = ((1 - hash(i + 9)) * 2000 - t * (25 + hash(i) * 60)) % 2000;
    d.style.transform = 'translate(' + (hash(i + 1) * 1080 + Math.sin(t + i) * 30) + 'px,' + (y < 0 ? y + 2000 : y) + 'px) scale(' + (0.6 + hash(i + 5) * 1.6) + ')';
    d.style.opacity = 0.12 + hash(i + 2) * 0.3;
  });
  let c1 = '#6d28d9', c2 = '#0891b2', tint = 0, tintBg = '';
  let flash = 0, shake = 0;

  // ---- hook
  const inHook = t < T.hook.end;
  show($('hook'), inHook);
  if (inHook) {
    const fall = prog(t, 0, 0.45);
    const slam = prog(t, 0.45, 0.8);
    shake = t > 0.45 ? Math.max(0, 1 - (t - 0.45) / 0.35) : 0;
    flash = t > 0.45 ? Math.max(0, 0.45 - (t - 0.45) * 3.5) : 0;
    const open = prog(t, 0.78, 1.0);
    const pdf = $('pdf');
    pdf.style.opacity = t < 0.78 ? 1 : 1 - open;
    pdf.style.transform = 'translateY(' + lerp(-1400, 0, eIn(fall)) + 'px) rotate(' + lerp(-28, 0, eOut(fall)) + 'deg) scale(' + (t < 0.45 ? lerp(0.8, 1, fall) * (1 + 0.12 * fall) : 1 + 0.08 * Math.sin(slam * Math.PI) - 0.6 * open) + ',' + (t < 0.45 ? 1 + 0.25 * fall : 1 - 0.06 * Math.sin(slam * Math.PI)) + ')';
    pdf.style.filter = t < 0.45 ? 'blur(' + (fall * 6) + 'px)' : 'none';
    $('ring').style.opacity = t > 0.45 ? Math.max(0, 1 - slam) : 0;
    $('ring').style.transform = 'scale(' + (0.4 + slam * 3.2) + ')';
    const book = $('book');
    const sink = prog(t, 1.45, 1.85);
    book.style.opacity = open * (1 - sink);
    book.style.transform = 'translateY(' + (eOut(sink) * 260) + 'px) scale(' + (lerp(0.7, 1, eBack(open)) - sink * 0.15) + ') rotateX(' + (10 + sink * 20) + 'deg)';
    $('pr').style.transform = 'rotateY(' + lerp(-178, 0, eOut(prog(t, 0.8, 1.05))) + 'deg)';
    const flips = [0.95, 1.07, 1.19, 1.31];
    let fa = 0; flips.forEach((f) => { const p = prog(t, f, f + 0.16); if (p > 0 && p < 1) fa = -180 * eInOut(p); });
    $('pf').style.display = fa ? 'block' : 'none';
    $('pf').style.transform = 'rotateY(' + fa + 'deg)';
    const textFade = prog(t, 1.42, 1.6);
    $('pl').style.color = $('pr').style.color = 'rgba(31,41,55,' + (1 - textFade) + ')';
    letters.forEach((L) => {
      const st = 1.45 + L.i * 0.011;
      const p = prog(t, st, st + 0.7);
      const bar = hookBars[(L.i * 7) % BARS];
      const tx = parseFloat(bar.style.left) + 8, ty = 1010;
      const cx = lerp(L.x0, tx, 0.5) + (hash(L.i) - 0.5) * 700, cy = Math.min(L.y0, ty) - 250 - hash(L.i + 1) * 300;
      const q = eInOut(p);
      const x = (1 - q) * (1 - q) * L.x0 + 2 * (1 - q) * q * cx + q * q * tx;
      const y = (1 - q) * (1 - q) * L.y0 + 2 * (1 - q) * q * cy + q * q * ty;
      L.el.style.opacity = t < st ? 0 : p < 0.85 ? 1 : (1 - p) / 0.15;
      L.el.style.transform = 'translate(' + (x - 20) + 'px,' + (y - 30) + 'px) rotate(' + (q * (hash(L.i + 2) - 0.5) * 900) + 'deg) scale(' + (1 + Math.sin(q * Math.PI) * 0.7) + ')';
    });
    const barsOn = prog(t, 2.0, 2.25);
    $('hookWave').style.opacity = barsOn;
    setBars(hookBars, t, 300, 14 + 30 * barsOn);
    const l1 = prog(t, 0.82, 1.22), l2 = prog(t, D.hook.l2At, D.hook.l2At + 0.4);
    $('ht1').textContent = D.hook.l1; $('ht2').textContent = D.hook.l2 + ' 🤯';
    $('ht1').style.transform = 'scale(' + eElastic(l1) + ')'; $('ht1').style.opacity = l1 > 0 ? 1 : 0;
    $('ht2').style.transform = 'scale(' + eElastic(l2) + ') rotate(' + (-4 * (1 - l2)) + 'deg)'; $('ht2').style.opacity = l2 > 0 ? 1 : 0;
    const out = prog(t, T.hook.end - 0.28, T.hook.end);
    $('hook').style.transform = 'scale(' + (1 + eIn(out) * 0.8) + ')';
    $('hook').style.opacity = 1 - out;
    $('hook').style.filter = out ? 'blur(' + out * 14 + 'px)' : 'none';
  }

  // ---- dialects: wheel, then the line
  let inWheel = false, inSpeak = false;
  for (let i = 0; i < D.dialects.length; i++) {
    const d = D.dialects[i];
    const s = T[d.id];
    if (t >= s.spinStart && t < s.start) {
      inWheel = true;
      const enter = prog(t, s.spinStart, s.spinStart + (i === 0 ? 0.45 : 0.3));
      const zoom = prog(t, s.zoomAt, s.start);
      const land = prog(t, s.landAt, s.landAt + 0.3);
      const a = wheelAngle(t);
      $('flags').style.transform = $('wheelFace').style.transform = 'rotate(' + a + 'deg)';
      const k = D.spins[i].k;
      wflags.forEach((f, j) => {
        const fa = (j * step) * Math.PI / 180;
        const big = j === k ? 1 + 0.9 * Math.sin(land * Math.PI / 2) : 1;
        f.style.transform = 'translate(' + (Math.sin(fa) * 365) + 'px,' + (-Math.cos(fa) * 365) + 'px) rotate(' + (-a) + 'deg) scale(' + big + ')';
        f.style.filter = j === k && land > 0 ? 'drop-shadow(0 0 30px #fff)' : 'none';
      });
      const sc = (i === 0 ? lerp(0.15, 1, eBack(enter)) : lerp(0.6, 1, eBack(enter))) * (1 + eIn(zoom) * 2.6);
      $('wheel').style.transformOrigin = '50% 11.2%';
      $('wheel').style.transform = 'scale(' + sc + ') rotate(' + (i === 0 ? (1 - eOut(enter)) * -90 : 0) + 'deg)';
      $('wheel').style.opacity = enter * (1 - zoom * 0.6);
      $('pointer').style.transform = 'translateY(' + (land > 0 && land < 1 ? -Math.sin(land * Math.PI) * 30 : 0) + 'px) scale(' + (1 - zoom) + ')';
      $('wheelTitle').style.opacity = i === 0 ? enter * (1 - zoom) : 0;
      $('wheelTitle').style.transform = 'scale(' + eBack(enter) + ')';
      const wipe = $('wipe');
      wipe.style.background = 'linear-gradient(160deg,' + d.colors[0] + ',' + d.colors[1] + ')';
      wipe.style.clipPath = 'circle(' + (eIn(zoom) * 2300) + 'px at 540px 625px)';
      wipe.style.opacity = zoom > 0 ? 1 : 0;
    }
    if (t >= s.start && t < s.end) {
      inSpeak = true;
      if (curDialect !== i) {
        curDialect = i;
        $('hflag').textContent = d.flag; $('hname').textContent = d.name; $('vname').textContent = '🎙️ ' + d.speaker;
        $('words').innerHTML = d.words.map((w) => '<span>' + w.w + '</span>').join(' ');
      }
      c1 = d.colors[0]; c2 = d.colors[1]; tint = 1;
      tintBg = 'linear-gradient(160deg,' + d.colors[0] + ',' + d.colors[1] + ')';
      const e = prog(t, s.start, s.start + 0.4);
      const out = prog(t, s.end - 0.2, s.end);
      $('speak').style.opacity = 1 - out;
      $('speak').style.transform = 'scale(' + (1 - out * 0.08) + ')';
      $('hdr').style.transform = 'translateY(' + lerp(-260, 0, eBack(e)) + 'px)';
      $('bubble').style.transform = 'scale(' + lerp(0.2, 1, eBack(prog(t, s.start + 0.05, s.start + 0.42))) + ') rotate(' + (Math.sin(t * 2.2) * 0.8) + 'deg)';
      const spans = $('words').children;
      d.words.forEach((w, j) => {
        const p = prog(t, w.at - 0.04, w.at + 0.14);
        const next = d.words[j + 1] ? d.words[j + 1].at : s.end;
        const sp = spans[j];
        sp.style.opacity = p > 0 ? 1 : 0.12;
        sp.style.transform = 'scale(' + (p > 0 ? eBack(p) : 0.85) + ') translateY(' + (p > 0 ? 0 : 10) + 'px)';
        sp.style.color = t >= w.at && t < next ? '#4f46e5' : '#111827';
      });
      $('vtag').style.opacity = prog(t, s.start + 0.3, s.start + 0.55);
      setBars(waveBars, t, 130, 12);
      const ph = prog(t, s.start + 0.05, s.start + 0.55);
      $('phone').style.transform = 'translateY(' + lerp(760, 0, eOut(ph)) + 'px) rotate(' + (-6 + Math.sin(t * 1.4) * 1.2) + 'deg)';
      const count = D.phone[d.id] || 0;
      if (count) {
        const f = clamp(Math.floor((t - s.start) * D.FPS) + 1, 1, count);
        const src = 'phone/' + d.id + '/f' + String(f).padStart(4, '0') + '.jpg';
        if (src !== curImg) { curImg = src; $('scr').src = src; await $('scr').decode().catch(() => {}); }
      }
    }
  }
  show($('wheelScene'), inWheel);
  show($('speak'), inSpeak);

  // ---- finale
  const F = T.finale;
  const inFin = t >= F.start && t < F.end;
  show($('finale'), inFin);
  if (inFin) {
    const suck = prog(t, F.end - 0.75, F.end);
    minis.forEach((m, i) => {
      const p = prog(t, F.start + 0.1 + i * 0.13, F.start + 0.45 + i * 0.13);
      const [x, y, r] = SPOTS[i];
      const w = m.offsetWidth, h = m.offsetHeight;
      const x0 = clamp(540 - w / 2 + x, 30, 1050 - w);
      const tx = lerp(x0, 540 - w / 2, eIn(suck)), ty = lerp(y, 960 - h / 2, eIn(suck));
      m.style.transform = 'translate(' + (tx + Math.sin(t * 6 + i) * 6) + 'px,' + (ty + Math.cos(t * 5 + i) * 6) + 'px) rotate(' + (r + suck * 220 * (i % 2 ? 1 : -1)) + 'deg) scale(' + (eBack(p) * (1 - eIn(suck))) + ')';
      m.style.opacity = p > 0 ? 1 : 0;
    });
    const ft = prog(t, F.start + 0.7, F.start + 1.0);
    $('finaleTitle').style.transform = 'scale(' + eElastic(ft) + ')';
    $('finaleTitle').style.opacity = (ft > 0 ? 1 : 0) * (1 - suck);
    shake = Math.max(shake, suck * 0.5);
    c1 = '#7c3aed'; c2 = '#db2777';
  }

  // ---- outro
  const O = T.outro;
  const inOut = t >= O.start;
  show($('outro'), inOut);
  if (inOut) {
    flash = Math.max(flash, Math.max(0, 0.9 - (t - O.start) * 3.5));
    const lg = prog(t, O.start, O.start + 0.9);
    $('logo').style.transform = 'scale(' + lerp(0.3, 1, eElastic(lg)) + ')';
    $('osub').style.opacity = prog(t, O.start + 0.4, O.start + 0.8);
    const cp = eOut(prog(t, O.start + 0.6, O.start + 1.6));
    $('counters').style.opacity = prog(t, O.start + 0.5, O.start + 0.8);
    $('counters').style.transform = 'translateY(' + lerp(80, 0, eOut(prog(t, O.start + 0.5, O.start + 0.9))) + 'px)';
    $('c1').textContent = Math.round(21 * cp); $('c2').textContent = Math.round(86 * cp);
    const u = prog(t, O.start + 1.1, O.start + 1.5);
    $('url').style.opacity = u; $('url').style.transform = 'translateY(' + lerp(40, 0, eOut(u)) + 'px)';
    const fr = prog(t, O.start + 1.4, O.start + 1.8);
    $('free').style.transform = 'scale(' + (eBack(fr) * (1 + 0.04 * Math.sin(t * 6))) + ')';
    const q = prog(t, O.start + 2.3, O.start + 2.9);
    $('ask').style.transform = 'scale(' + eElastic(q) + ') translateY(' + (Math.sin(t * 4) * 10) + 'px)';
    $('ask').style.opacity = q > 0 ? 1 : 0;
    c1 = '#4f46e5'; c2 = '#0e7490';
  }

  $('b1').style.background = 'radial-gradient(circle,' + c1 + ',transparent 70%)';
  $('b2').style.background = 'radial-gradient(circle,' + c2 + ',transparent 70%)';
  $('tint').style.background = tintBg; $('tint').style.opacity = tint;
  $('flash').style.opacity = flash;
  const sx = shake ? (hash(Math.floor(t * 60)) - 0.5) * 50 * shake : 0, sy = shake ? (hash(Math.floor(t * 60) + 7) - 0.5) * 50 * shake : 0;
  $('world').style.transform = 'translate(' + sx + 'px,' + sy + 'px)';
};
</script></body></html>`;
fs.writeFileSync(path.join(work, 'index.html'), html);

// ---------------------------------------------------------------- render
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', (e) => console.warn('page error:', e.message));
  await page.goto('file://' + path.join(work, 'index.html'), { waitUntil: 'load' });
  await page.evaluate(async () => {
    await Promise.all(['900 100px Tajawal', '800 100px Tajawal', '700 40px "IBM Plex Sans Arabic"'].map((f) => document.fonts.load(f).catch(() => {})));
    await document.fonts.ready;
  });
  const cdp = await page.context().newCDPSession(page);
  const video = path.join(work, 'video.mp4');
  const enc = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-r', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), video], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => enc.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
  const only = process.env.MOTION_FRAMES ? process.env.MOTION_FRAMES.split(',').map(Number) : null;
  for (let f = 0; f < N; f++) {
    if (only && !only.includes(f)) continue;
    await page.evaluate((x) => window.render(x), f / FPS);
    // Straight from the compositor (page.screenshot waits on fonts and layout every frame)
    const shot = Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 })).data, 'base64');
    if (only) fs.writeFileSync(path.join(work, `still-${f}.jpg`), shot);
    if (!enc.stdin.write(shot)) await new Promise((r) => enc.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`frame ${f}/${N}`);
  }
  enc.stdin.end();
  await done;
  await browser.close();
  if (only) return console.log('stills written');
  const mux = (audio, file) => ff(['-i', video, '-i', audio, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', file]);
  mux(path.join(work, 'mix.wav'), path.join(out, 'reel.mp4'));
  mux(path.join(work, 'voice.wav'), path.join(out, 'reel-voice.mp4'));
  console.log(`reel.mp4: ${probe(path.join(out, 'reel.mp4')).toFixed(1)}s, ${N} frames`);
})();
