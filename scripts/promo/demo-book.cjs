// The demo book for the promo video: an original short Arabic book (written for the video, no
// third-party text), rendered as a scanned PDF (page images) with a designed cover, an imprint
// page and a contents page, so the video shows OCR and front-matter skipping on a real file.
// Usage: node scripts/promo/demo-book.cjs <out.pdf>
const { chromium } = require('playwright');

const TITLE = 'أسرار العادات الصغيرة';
const CHAPTERS = [
  {
    title: 'المقدمة',
    paras: [
      'كل إنسان يحلم بأن يتغير، لكن قليلين هم الذين يعرفون من أين يبدأ التغيير. نظن غالباً أن الحياة تتبدل بقرار كبير واحد، بينما الحقيقة أن أعظم التحولات تولد من خطوات صغيرة نكررها كل يوم حتى تصبح جزءاً منا.',
      'في هذا الكتاب سنمشي معاً في رحلة قصيرة، نتعرف فيها على قوة البدايات البسيطة، وعلى الطريقة التي تتحول بها الأفعال الصغيرة إلى عادات راسخة، ثم إلى نتائج تدهشنا بعد شهور وسنوات.',
      'لن تجد هنا وصفات سحرية، بل أفكاراً عملية يمكنك أن تجربها منذ الليلة. اقرأ فصلاً، وجرّب فكرة واحدة، ثم عد إلى الفصل التالي حين تشعر بالأثر.',
    ],
  },
  {
    title: 'الفصل الأول: قوة البدايات الصغيرة',
    paras: [
      'تخيل أنك تقرأ صفحة واحدة كل يوم. صفحة واحدة فقط، لا تأخذ أكثر من دقيقتين. يبدو الأمر تافهاً في يومه الأول، لكن بعد عام كامل ستكون قد قرأت أكثر من ثلاثمئة وستين صفحة، أي ما يعادل كتاباً كاملاً أو أكثر.',
      'السر في البدايات الصغيرة أنها لا تخيفنا. العقل يقاوم التغييرات الكبيرة لأنه يراها تهديداً لراحته، لكنه يتساهل مع الخطوة الصغيرة لأنها لا تكلفه شيئاً يذكر. وهكذا نتسلل إلى التغيير من باب لا يحرسه الخوف.',
      'جرّب اليوم أن تختار عادة واحدة تريدها، ثم صغّرها حتى تصبح سهلة إلى حد يدعو إلى الضحك: تمرين واحد بدل ساعة في النادي، وسطر واحد بدل فصل كامل، ودقيقة صمت بدل جلسة تأمل طويلة.',
      'ستلاحظ بعد أيام أن الخطوة الصغيرة تكبر وحدها. من يكتب سطراً يكتب غالباً سطرين، ومن يمشي دقيقة يمشي عشراً. المهم ألا تنقطع السلسلة، لأن الاستمرار أهم من الحجم في البداية.',
    ],
  },
  {
    title: 'الفصل الثاني: كيف تبني عادة تدوم',
    paras: [
      'العادة التي تدوم تحتاج إلى ثلاثة أشياء: إشارة تذكرك بها، وفعل سهل تقوم به، ومكافأة صغيرة تشعر بها بعده. حين تجتمع هذه الثلاثة يبدأ العقل في ربطها معاً حتى يصبح الفعل تلقائياً.',
      'اربط عادتك الجديدة بعادة قديمة تفعلها كل يوم. بعد أن أشرب قهوة الصباح سأقرأ صفحة، وبعد صلاة العشاء سأكتب ثلاثة أشياء أنا ممتن لها. العادة القديمة تصبح جرس تذكير للعادة الجديدة.',
      'واجعل البيئة في صفك. ضع الكتاب على الوسادة، والحذاء الرياضي عند الباب، واترك الهاتف في غرفة أخرى ساعة النوم. الإرادة تتعب في آخر النهار، أما البيئة المرتبة فتعمل عنك دون أن تشعر.',
      'وأخيراً احتفل بنفسك ولو بكلمة. قل لنفسك أحسنت بعد كل مرة تلتزم فيها. هذا الشعور البسيط هو الوقود الذي يجعل عقلك يطلب العادة مرة أخرى في الغد.',
    ],
  },
  {
    title: 'الفصل الثالث: الصبر طريق النتائج',
    paras: [
      'أصعب مرحلة في بناء العادات هي المرحلة التي لا ترى فيها أي نتيجة. تقرأ كل يوم ولا تشعر أنك أصبحت أكثر علماً، وتتمرن ولا ترى تغيراً في المرآة. هنا يستسلم أكثر الناس.',
      'لكن النتائج في الحقيقة تتراكم تحت السطح مثل جليد يذوب ببطء. درجة بعد درجة لا يحدث شيء ظاهر، ثم فجأة عند نقطة معينة يتحول الجليد إلى ماء. العمل كله كان يحدث في الدرجات التي لم ترها.',
      'لذلك لا تقس نجاحك بالنتائج في أسابيعك الأولى، بل قسه بالاستمرار: كم يوماً التزمت؟ إذا كانت السلسلة طويلة فأنت على الطريق الصحيح، والنتائج قادمة لا محالة.',
      'ابدأ اليوم بخطوة صغيرة، وكررها غداً، ثم بعد غد. وبعد عام ستنظر إلى الوراء وتبتسم، لأنك ستجد إنساناً جديداً صنعته العادات الصغيرة يوماً بعد يوم.',
    ],
  },
];

const PAGE = (inner, extra = '') => `<div class="page" style="${extra}">${inner}</div>`;
const css = `
  @page { size: 1240px 1754px; margin: 0 }
  body { margin: 0; font-family: 'Noto Naskh Arabic', 'Amiri', 'Noto Sans Arabic', serif; direction: rtl; }
  .page { width: 1240px; height: 1754px; box-sizing: border-box; padding: 150px 140px; page-break-after: always; position: relative; background: #fbf8f1; color: #1f1b16; }
  p { font-size: 40px; line-height: 2.05; margin: 0 0 34px; text-align: justify; }
  h2 { font-size: 58px; margin: 40px 0 70px; text-align: center; color: #3b2a12; }
  .num { position: absolute; bottom: 70px; left: 0; right: 0; text-align: center; font-size: 30px; color: #6b5b45; }
  .head { position: absolute; top: 60px; left: 140px; right: 140px; text-align: center; font-size: 26px; color: #8a7a62; border-bottom: 1px solid #d8cfbf; padding-bottom: 10px; }
`;

(async () => {
  const out = process.argv[2] || 'demo-book.pdf';
  require('fs').mkdirSync(require('path').dirname(require('path').resolve(out)), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
  const pages = [];
  // Cover
  pages.push(PAGE(`
    <div style="position:absolute;inset:0;background:linear-gradient(160deg,#1e1b4b 0%,#4f46e5 55%,#22d3ee 130%);"></div>
    <div style="position:absolute;inset:90px;border:3px solid rgba(255,255,255,.35);border-radius:28px;"></div>
    <div style="position:absolute;top:520px;left:120px;right:120px;text-align:center;color:#fff;">
      <div style="font-size:120px;font-weight:700;line-height:1.35;">${TITLE}</div>
      <div style="font-size:46px;margin-top:50px;opacity:.9;">كيف تصنع الخطوات البسيطة حياة جديدة</div>
      <div style="width:160px;height:6px;background:#22d3ee;margin:70px auto;border-radius:3px;"></div>
      <div style="font-size:48px;">تأليف: حكواتي</div>
    </div>`, 'padding:0;background:#1e1b4b'));
  // Imprint
  pages.push(PAGE(`<div style="margin-top:500px;text-align:center;font-size:34px;line-height:2.2;color:#4a4033">
    ${TITLE}<br>جميع الحقوق محفوظة<br>الطبعة الأولى ٢٠٢٦<br>كتاب تجريبي أُعدّ لعرض موقع حكواتي<br>hakawatiai.com</div>`));
  // Contents
  let pn = 1;
  const starts = [];
  const body = [];
  for (const ch of CHAPTERS) {
    starts.push(pn);
    // two paragraphs per page
    for (let i = 0; i < ch.paras.length; i += 2) {
      body.push(PAGE(`<div class="head">${TITLE}</div>${i === 0 ? `<h2>${ch.title}</h2>` : ''}${ch.paras.slice(i, i + 2).map((t) => `<p>${t}</p>`).join('')}<div class="num">${pn}</div>`));
      pn++;
    }
  }
  pages.push(PAGE(`<h2>المحتويات</h2><div style="font-size:40px;line-height:2.6;">${CHAPTERS.map((c, i) => `<div style="display:flex;justify-content:space-between;border-bottom:1px dotted #b9ad97"><span>${c.title}</span><span>${starts[i]}</span></div>`).join('')}</div>`));
  pages.push(...body);
  // Each page becomes an image, like a scan
  const shots = [];
  for (const html of pages) {
    await page.setContent(`<html><head><style>${css}</style></head><body>${html}</body></html>`);
    await page.waitForTimeout(150);
    shots.push((await page.screenshot({ type: 'jpeg', quality: 82 })).toString('base64'));
  }
  // The first chapter's opening page as an image, for the reels' opening shot
  require('fs').writeFileSync(out.replace(/\.pdf$/i, '') + '-page.jpg', Buffer.from(shots[5], 'base64'));
  await page.setContent(`<html><head><style>@page{size:1240px 1754px;margin:0}body{margin:0}img{display:block;width:1240px;height:1754px;page-break-after:always}</style></head><body>${shots.map((b) => `<img src="data:image/jpeg;base64,${b}">`).join('')}</body></html>`);
  await page.pdf({ path: out, width: '1240px', height: '1754px', printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
  await browser.close();
  console.log(`${out}: ${pages.length} pages`);
})();
