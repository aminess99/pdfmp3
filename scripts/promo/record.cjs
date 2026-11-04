// Films the site for the promo video (1920x1080), scene by scene, against a local recording
// build (VITE_DEMO_MODE=1, so "?demo=1" shows the signed-in app). Every moment the editor needs
// is saved as a marker (seconds from the start of its clip) in <out>/clips/marks.json.
// Usage: node scripts/promo/record.cjs <demo-book.pdf> <outDir>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:4789';
const SUMMARIES = '/' + encodeURIComponent('ملخصات-كتب-صوتية');
// The page is laid out at 1280x720 (a full-HD layout looks tiny on a phone screen); the
// recording is that size and the editor scales it to 1920x1080
const W = 1280;
const H = 720;

const book = path.resolve(process.argv[2]);
const out = path.join(process.argv[3] || 'promo-out', 'clips');
fs.mkdirSync(out, { recursive: true });
const marks = {};

// A visible cursor with a click ripple (headless browsers draw none)
const CURSOR = () => {
  const add = () => {
    if (document.getElementById('promo-cursor')) return;
    const c = document.createElement('div');
    c.id = 'promo-cursor';
    c.style.cssText = 'position:fixed;z-index:2147483647;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:rgba(255,255,255,.92);border:3px solid #4f46e5;box-shadow:0 2px 10px rgba(0,0,0,.45);pointer-events:none;left:-100px;top:-100px;transition:transform .12s';
    document.body.appendChild(c);
    addEventListener('mousemove', (e) => {
      c.style.left = e.clientX + 'px';
      c.style.top = e.clientY + 'px';
    }, true);
    addEventListener('mousedown', (e) => {
      c.style.transform = 'scale(.75)';
      const r = document.createElement('div');
      r.style.cssText = `position:fixed;z-index:2147483646;left:${e.clientX - 30}px;top:${e.clientY - 30}px;width:60px;height:60px;border-radius:50%;border:3px solid #22d3ee;pointer-events:none;opacity:.9;transition:all .5s ease-out`;
      document.body.appendChild(r);
      requestAnimationFrame(() => {
        r.style.transform = 'scale(1.8)';
        r.style.opacity = '0';
      });
      setTimeout(() => r.remove(), 600);
    }, true);
    addEventListener('mouseup', () => (c.style.transform = ''), true);
  };
  // Notices from the recording setup (no real account, no cloud copy) stay off camera
  const hide = () => {
    if (document.head && !document.getElementById('promo-hide')) {
      const st = document.createElement('style');
      st.id = 'promo-hide';
      st.textContent = 'div.fixed[aria-live="polite"]{display:none!important}';
      document.head.appendChild(st);
    }
  };
  document.addEventListener('DOMContentLoaded', hide);
  new MutationObserver(hide).observe(document.documentElement, { childList: true, subtree: true });
  if (document.body) add();
  else addEventListener('DOMContentLoaded', add);
};

async function scene(name, fn) {
  const browser = scene.browser;
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    recordVideo: { dir: out, size: { width: W, height: H } },
    locale: 'ar',
  });
  await ctx.addInitScript(CURSOR);
  // Dry runs without an API key (PROMO_MOCK=1): canned AI replies, silent audio
  if (process.env.PROMO_MOCK) {
    const para = (n) => Array.from({ length: 40 }, (_, i) => `جملة تجريبية ${n} رقم ${i}.`).join(' ');
    await ctx.route('**/api/pdf/ocr-pages', (r) => r.fulfill({ json: { pages: JSON.parse(r.request().postData()).images.map((_, i) => para(i)) } }));
    await ctx.route('**/api/tts/**', (r) => r.fulfill({ status: 503, json: {} }));
  }
  const page = await ctx.newPage();
  const t0 = Date.now();
  const mark = (k) => {
    marks[`${name}.${k}`] = (Date.now() - t0) / 1000;
    console.log(`  ${name}.${k} = ${marks[`${name}.${k}`].toFixed(1)}s`);
  };
  const move = async (loc) => {
    const box = await loc.boundingBox();
    if (!box) return null;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y, { steps: 22 });
    await page.waitForTimeout(150);
    return { x, y };
  };
  const click = async (loc) => {
    await loc.waitFor({ state: 'visible', timeout: 20000 });
    const p = await move(loc);
    if (!p) return loc.click();
    await page.mouse.down();
    await page.waitForTimeout(80);
    await page.mouse.up();
    await page.waitForTimeout(350);
  };
  const wait = (ms) => page.waitForTimeout(ms);
  const until = async (fn, timeout = 120000, step = 400) => {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (await fn().catch(() => false)) return true;
      await wait(step);
    }
    return false;
  };
  console.log(`scene ${name}`);
  try {
    await fn({ page, mark, move, click, wait, until });
  } catch (err) {
    console.warn(`scene ${name} error: ${err.message}`);
    mark('error');
  }
  const video = page.video();
  await ctx.close();
  const file = path.join(out, `${name}.webm`);
  fs.renameSync(await video.path(), file);
  marks[`${name}.file`] = path.basename(file);
}

(async () => {
  scene.browser = await chromium.launch();

  // 1. The home page
  await scene('home', async ({ page, mark, wait }) => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.mouse.move(W / 2, H / 2);
    await wait(1200);
    mark('start');
    for (let i = 0; i < 30; i++) {
      await page.mouse.wheel(0, 14);
      await wait(100);
    }
    await wait(800);
    mark('end');
    // The voices and dialects section
    await page.evaluate(() => document.getElementById('voices')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    await wait(1500);
    mark('voices');
    for (let i = 0; i < 30; i++) {
      await page.mouse.wheel(0, 9);
      await wait(150);
    }
    await wait(600);
    mark('voicesEnd');
  });

  // 2–7, 10b. Upload a scanned book, the studio, voices, controls, AI tools, download
  await scene('studio', async ({ page, mark, click, wait, until, move }) => {
    await page.goto(BASE + '/?demo=1', { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    await wait(1200);
    await click(page.getByRole('button', { name: 'تحويل جديد' }).first());
    await wait(900);
    const drop = page.locator('input[type=file]').first();
    await move(page.getByText('ملف PDF').first()).catch(() => {});
    mark('upload');
    await drop.setInputFiles(book);
    const convert = page.getByRole('button', { name: 'حوّل واستمع' });
    await wait(1500);
    mark('scanning');
    await until(async () => (await convert.isEnabled()) && !(await page.getByText('جاري قراءة كتابك').count()), 240000);
    mark('ready');
    await wait(700);
    await click(convert);
    await until(async () => (await page.getByRole('tab', { name: 'استماع' }).count()) > 0, 30000);
    await wait(1500);
    mark('studio');
    await wait(8000);
    mark('studioEnd');

    // Speed, sleep timer, hide text
    mark('controls');
    const speed = page.getByRole('button', { name: 'سرعة التشغيل' }).first();
    await click(speed);
    await wait(500);
    await click(speed);
    await wait(700);
    await click(page.getByRole('button', { name: 'مؤقت النوم' }).first());
    await wait(1400);
    await page.keyboard.press('Escape');
    await wait(400);
    await click(page.getByRole('button', { name: 'إخفاء النص' }).first());
    await wait(2200);
    await click(page.getByRole('button', { name: 'إظهار النص' }).first());
    await wait(600);
    mark('controlsEnd');

    // Summary, key points, ask the book
    await click(page.getByRole('tab', { name: 'الملخص' }));
    mark('summary');
    await until(async () => !(await page.getByText('جاري التلخيص').count()), 90000);
    await wait(1800);
    mark('summaryReady');
    await click(page.getByRole('tab', { name: 'أهم النقاط' }));
    await until(async () => !(await page.getByText('جاري التلخيص').count()), 90000);
    await wait(1500);
    mark('pointsReady');
    await click(page.getByRole('button', { name: /اسأل الكتاب|أسأل الكتاب/ }).first());
    await wait(800);
    const ask = page.getByPlaceholder('اسأل أي شيء عن هذا الكتاب...');
    await click(ask);
    mark('ask');
    await ask.pressSequentially('ما أهم فكرة في هذا الكتاب؟', { delay: 55 });
    await page.keyboard.press('Enter');
    await wait(800);
    await until(async () => !(await page.getByText('يقرأ الكتاب ويصيغ الإجابة').count()), 90000);
    await wait(2500);
    mark('askReady');
    await click(page.getByRole('button', { name: 'إغلاق' }).last());
    await wait(700);

    // Download
    await click(page.getByRole('button', { name: /^تحميل$/ }).first());
    await wait(500);
    mark('download');
    await wait(2500);
    mark('downloadEnd');
  });

  // 8. Audio book summaries
  await scene('summaries', async ({ page, mark, wait }) => {
    await page.goto(BASE + SUMMARIES, { waitUntil: 'networkidle' });
    await page.mouse.move(W / 2, H / 2);
    await wait(1000);
    mark('start');
    for (let i = 0; i < 40; i++) {
      await page.mouse.wheel(0, 22);
      await wait(110);
    }
    await wait(500);
    mark('end');
  });

  // 9–10. The AI book writer, then the library
  await scene('writer', async ({ page, mark, click, wait, until }) => {
    await page.goto(BASE + '/?demo=1', { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    await wait(1000);
    await click(page.getByRole('button', { name: 'تأليف كتاب' }).first());
    await wait(800);
    mark('start');
    await click(page.locator('aside', { hasText: 'أفكار للبدء' }).locator('button').first());
    await wait(900);
    await click(page.getByRole('button', { name: 'ألّف الكتاب' }));
    mark('generating');
    const t = Date.now();
    await until(async () => (await page.getByRole('button', { name: 'استمع للكتاب' }).count()) > 0, process.env.PROMO_MOCK ? 15000 : 300000, 1000);
    console.log(`  writer took ${Math.round((Date.now() - t) / 1000)}s; on screen: ${(await page.locator('[role=alert]').allTextContents()).join(' | ') || 'no error'}`);
    await wait(1500);
    mark('result');
    await page.mouse.wheel(0, 300);
    await wait(2500);
    mark('resultEnd');
    await click(page.getByRole('button', { name: /مكتبتي/ }).first());
    await wait(1500);
    mark('library');
    await wait(3500);
    mark('libraryEnd');
  });

  await scene.browser.close();
  fs.writeFileSync(path.join(out, 'marks.json'), JSON.stringify(marks, null, 2));
  console.log('done', Object.keys(marks).length, 'marks');
})();
