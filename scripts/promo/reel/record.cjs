// Films the site as a phone for the vertical reels (1080x1920): the page is laid out at
// 432 CSS pixels wide and drawn at 2.5x, captured frame by frame through the browser's
// screencast, so text stays sharp. Writes <out>/clips/<scene>.mp4 and marks.json.
// Usage: node scripts/promo/reel/record.cjs <demo-book.pdf> <outDir>
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:4789';
const book = path.resolve(process.argv[2]);
const out = path.resolve(process.argv[3] || 'reel-out', 'clips');
fs.mkdirSync(out, { recursive: true });
const marks = {};

// Phone layout at full-HD sharpness, a touch ripple, and no setup notices on camera
const SETUP = () => {
  const fix = () => {
    let m = document.querySelector('meta[name=viewport]');
    if (!m) {
      m = document.createElement('meta');
      m.name = 'viewport';
      document.head && document.head.appendChild(m);
    }
    const want = 'width=432, initial-scale=2.5, maximum-scale=2.5, user-scalable=no';
    if (m.content !== want) m.content = want;
    // Keep the notice-hiding style in the page's own head (the parser replaces early nodes)
    if (document.head && !document.getElementById('promo-hide')) {
      const st = document.createElement('style');
      st.id = 'promo-hide';
      st.textContent = 'div.fixed[aria-live="polite"]{display:none!important}';
      document.head.appendChild(st);
    }
  };
  document.addEventListener('DOMContentLoaded', fix);
  new MutationObserver(fix).observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('pointerdown', (e) => {
    const r = document.createElement('div');
    r.style.cssText = `position:fixed;z-index:2147483647;left:${e.clientX - 22}px;top:${e.clientY - 22}px;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.35);border:3px solid #22d3ee;pointer-events:none;transition:all .55s ease-out`;
    document.body.appendChild(r);
    requestAnimationFrame(() => {
      r.style.transform = 'scale(1.9)';
      r.style.opacity = '0';
    });
    setTimeout(() => r.remove(), 650);
  }, true);
};

async function scene(name, fn) {
  const ctx = await scene.browser.newContext({ viewport: { width: 1080, height: 1920 }, isMobile: true, hasTouch: true, locale: 'ar' });
  await ctx.addInitScript(SETUP);
  if (process.env.PROMO_MOCK) {
    const para = (n) => Array.from({ length: 40 }, (_, i) => `جملة تجريبية ${n} رقم ${i}.`).join(' ');
    await ctx.route('**/api/pdf/ocr-pages', (r) => r.fulfill({ json: { pages: JSON.parse(r.request().postData()).images.map((_, i) => para(i)) } }));
    await ctx.route('**/api/tts/**', (r) => r.fulfill({ status: 503, json: {} }));
  }
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const dir = path.join(out, `${name}-frames`);
  fs.mkdirSync(dir, { recursive: true });
  const frames = [];
  let t0 = null;
  let firstWall = null;
  cdp.on('Page.screencastFrame', async (f) => {
    const ts = f.metadata.timestamp;
    if (t0 === null) {
      t0 = ts;
      firstWall = Date.now();
    }
    const file = path.join(dir, `f${String(frames.length).padStart(5, '0')}.jpg`);
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    frames.push({ file, t: ts - t0 });
    await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1080, maxHeight: 1920 });
  // Marks are wall-clock times, turned into seconds of film after the first frame at the end
  const wall = {};
  const mark = (k) => {
    wall[k] = Date.now();
  };
  const wait = (ms) => page.waitForTimeout(ms);
  const tap = async (loc) => {
    await loc.waitFor({ state: 'visible', timeout: 20000 });
    await loc.tap();
    await wait(400);
  };
  const until = async (f, timeout = 120000) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await f().catch(() => false)) return true;
      await wait(400);
    }
    return false;
  };
  console.log(`scene ${name}`);
  try {
    await fn({ page, mark, wait, tap, until });
  } catch (err) {
    console.warn(`scene ${name} error: ${err.message}`);
  }
  await wait(300);
  await cdp.send('Page.stopScreencast').catch(() => {});
  await ctx.close();
  for (const [k, w] of Object.entries(wall)) {
    marks[`${name}.${k}`] = Math.max(0, (w - (firstWall || w)) / 1000);
    console.log(`  ${name}.${k} = ${marks[`${name}.${k}`].toFixed(1)}s`);
  }
  const list = path.join(dir, 'list.txt');
  const lines = [];
  frames.forEach((fr, i) => {
    const next = frames[i + 1] ? frames[i + 1].t : fr.t + 0.5;
    lines.push(`file '${fr.file}'`, `duration ${Math.max(0.001, next - fr.t).toFixed(4)}`);
  });
  lines.push(`file '${frames[frames.length - 1].file}'`);
  fs.writeFileSync(list, lines.join('\n'));
  const mp4 = path.join(out, `${name}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '17', mp4]);
  fs.rmSync(dir, { recursive: true, force: true });
  marks[`${name}.file`] = path.basename(mp4);
}

(async () => {
  scene.browser = await chromium.launch();

  await scene('app', async ({ page, mark, wait, tap, until }) => {
    await page.goto(BASE + '/?demo=1', { waitUntil: 'load' });
    await wait(2500);
    await tap(page.getByRole('button', { name: /^تحويل/ }).last());
    await wait(1200);
    mark('upload');
    await tap(page.getByText('اسحب ملف PDF هنا').first()).catch(() => {});
    await page.locator('input[type=file]').first().setInputFiles(book);
    await wait(1200);
    mark('scanning');
    const convert = page.getByRole('button', { name: 'حوّل واستمع' });
    await until(async () => (await convert.isEnabled()) && !(await page.getByText('جاري قراءة كتابك').count()), 240000);
    mark('ready');
    await wait(500);
    await convert.scrollIntoViewIfNeeded();
    await tap(convert);
    await until(async () => (await page.getByRole('tab', { name: 'استماع' }).count()) > 0, 30000);
    await wait(1200);
    mark('listen');
    await wait(7000);
    mark('listenEnd');
    await tap(page.getByRole('button', { name: 'الفصول' }).first());
    await wait(700);
    mark('chapters');
    await wait(3500);
    mark('chaptersEnd');
  });

  await scene.browser.close();
  fs.writeFileSync(path.join(out, 'marks.json'), JSON.stringify(marks, null, 2));
  console.log('done');
})();
