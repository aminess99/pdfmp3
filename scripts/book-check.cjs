// Runs real books through the site exactly as a user would (upload, OCR, AI editor, contents,
// chapters) against a local production server, and prints a report with likely problems.
// Used by .github/workflows/book-check.yml. Usage: node scripts/book-check.cjs <pdf>...
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:4789';
const WAIT_MS = Number(process.env.BOOK_WAIT_MS || 150000);

const words = (t) => t.split(/\s+/).filter(Boolean);
const norm = (t) => t.replace(/[ً-ٟـ]/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

function flagsFor(ch, allTitles) {
  const f = [];
  const ws = words(ch.text || '');
  if (ws.length < 130) f.push(`قصير جداً (${ws.length} كلمة)`);
  if (allTitles.filter((t) => norm(t) === norm(ch.title)).length > 1) f.push('عنوان مكرر');
  const paras = (ch.text || '').split(/\n{2,}/).filter((p) => p.trim());
  const avg = paras.length ? ws.length / paras.length : 0;
  if (paras.length >= 6 && avg < 9) f.push(`يشبه قائمة (متوسط ${avg.toFixed(1)} كلمة للفقرة)`);
  const digits = (ch.text.match(/[0-9٠-٩]/g) || []).length;
  if (digits / Math.max(1, ch.text.length) > 0.03) f.push('أرقام كثيرة');
  if (/https?:|www\.|\.com\b|ردمك|ISBN|هاتف|فاكس|جميع الحقوق/i.test(ch.text)) f.push('بيانات نشر أو روابط');
  if (/(^|\s)(\S+)(\s+\2){3,}(\s|$)/.test(ch.text)) f.push('كلمات مكررة');
  if (ws.length && new Set(ws).size / ws.length < 0.2) f.push('تنوع كلمات منخفض');
  const qs = (ch.text.match(/[؟?]/g) || []).length;
  if (qs >= 6 && qs / Math.max(1, paras.length) > 0.6 && avg < 15) f.push('أسئلة متتالية (فهرس؟)');
  return f;
}

(async () => {
  const browser = await chromium.launch();
  for (const file of process.argv.slice(2)) {
    const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // No audio: this checks reading, not narration
    await page.route('**/api/tts/**', (r) => r.fulfill({ status: 503, json: { error: 'book-check' } }));
    const t0 = Date.now();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.setInputFiles('input[type=file]', file);
    const button = page.getByRole('button', { name: 'حوّل واستمع' });
    let ready = false;
    for (let i = 0; i < 240 && !ready; i++) {
      await page.waitForTimeout(1000);
      ready = (await button.isEnabled().catch(() => false)) && !(await page.locator('text=جاري قراءة كتابك').count());
    }
    const prepSeconds = Math.round((Date.now() - t0) / 1000);
    const alert = await page.locator('[role=alert]').first().textContent({ timeout: 500 }).catch(() => '');
    console.log(`\n==================== ${file.split('/').pop()}`);
    console.log(`جاهز للاستماع بعد ${prepSeconds} ثانية${alert ? ` | رسالة: ${alert}` : ''}`);
    if (!ready) {
      console.log('لم يصبح جاهزاً');
      await page.close();
      continue;
    }
    await button.click();
    // Let the background reading run (a scanned book only reads two chapters ahead)
    await page.waitForTimeout(WAIT_MS);
    const job = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem('pdf_audio_library') || '[]')[0] || null;
      } catch {
        return null;
      }
    });
    if (!job) {
      console.log('لم يُحفظ الكتاب');
      await page.close();
      continue;
    }
    const titles = (job.chapters || []).map((c) => c.title);
    console.log(`العنوان: ${job.fileName} | غلاف: ${job.coverImage ? `نعم (${Math.round(job.coverImage.length / 1365)} KB)` : 'لا'} | مصوّر: ${job.scannedBook ? 'نعم' : 'لا'}`);
    console.log(`الصفحات المقروءة: ${(job.nextPageToRead || 1) - 1} من ${job.totalPages} | بدأ من الصفحة ${(job.skippedFrontPages || 0) + 1}`);
    console.log(`الفهرس (${(job.tocTitles || []).length}): ${(job.tocTitles || []).join(' / ') || '-'}`);
    let problems = 0;
    for (const [i, ch] of (job.chapters || []).entries()) {
      const f = flagsFor(ch, titles);
      problems += f.length;
      console.log(`\n${i + 1}. ${ch.title} | ${words(ch.text || '').length} كلمة${f.length ? `  ⚠ ${f.join('، ')}` : ''}`);
      console.log(`   البداية: ${(ch.text || '').replace(/\s+/g, ' ').slice(0, 220)}`);
    }
    console.log(`\nعدد الملاحظات: ${problems}${errors.length ? ` | أخطاء الصفحة: ${errors.join('; ')}` : ''}`);
    await page.close();
  }
  await browser.close();
})();
