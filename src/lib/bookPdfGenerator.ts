import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface GeneratedBookStructure {
  title: string;
  subtitle: string;
  author: string;
  genre: string;
  targetAudience: string;
  language?: string;
  totalPagesTarget: number;
  coverStyle: string;
  coverImageBase64?: string;
  synopsis: string;
  tableOfContents: string[];
  chapters: {
    chapterNumber: number;
    title: string;
    subsections: {
      subheading: string;
      content: string;
      keyTakeaway?: string;
    }[];
    summary: string;
  }[];
}

// A4 at 96 DPI. Pages are laid out as HTML (so Arabic is shaped by the browser), split into
// real pages by measuring, then rendered with html2canvas into the PDF.
const PAGE_W = 794;
const PAGE_H = 1123;
const PAD_X = 72;
const PAD_TOP = 76;
const FOOTER_H = 64;
const BODY_H = PAGE_H - PAD_TOP - FOOTER_H - 24;

// The site's colours (src/index.css): indigo brand, deep indigo, cyan accent
const C = {
  ink: '#1b1a2e',
  text: '#2a2940',
  muted: '#6b6a85',
  line: '#e4e3f0',
  brand: '#4f46e5',
  brandDeep: '#1e1b4b',
  brandSoft: '#eef0ff',
  brandBorder: '#c7cbfa',
  accent: '#0891b2',
  accentBright: '#22d3ee',
};
const FONT_BODY = "'IBM Plex Sans Arabic', 'Cairo', sans-serif";
const FONT_HEAD = "'Tajawal', 'Cairo', sans-serif";

const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// A remote cover image would taint the canvas: inline it first (falls back to no image)
async function toDataUrl(src?: string): Promise<string | undefined> {
  if (!src) return undefined;
  if (src.startsWith('data:')) return src;
  try {
    const blob = await (await fetch(src)).blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => resolve(undefined);
      r.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

async function fontsReady(doc: Document): Promise<void> {
  try {
    await Promise.all([
      doc.fonts.load(`400 17px 'IBM Plex Sans Arabic'`),
      doc.fonts.load(`600 17px 'IBM Plex Sans Arabic'`),
      doc.fonts.load(`700 17px 'IBM Plex Sans Arabic'`),
      doc.fonts.load(`800 30px 'Tajawal'`),
      doc.fonts.load(`700 20px 'Tajawal'`),
    ]);
    await doc.fonts.ready;
  } catch {
    // fall back to whatever is loaded
  }
}

/**
 * Builds the book as an A4 PDF: cover, contents, and chapters that flow over as many pages
 * as they need. Direction follows the book language (RTL for Arabic).
 */
export async function createProfessionalArabicPdf(book: GeneratedBookStructure): Promise<Blob> {
  const isRtl = !book.language || book.language === 'ar';
  const dir = isRtl ? 'rtl' : 'ltr';
  const start = isRtl ? 'right' : 'left';
  const L = {
    by: isRtl ? 'تأليف' : 'By',
    contents: isRtl ? 'المحتويات' : 'Contents',
    synopsis: isRtl ? 'نبذة عن الكتاب' : 'About this book',
    chapter: isRtl ? 'الفصل' : 'Chapter',
    takeaway: isRtl ? 'الخلاصة' : 'Key takeaway',
    madeWith: isRtl ? 'أُنشئ باستخدام Hakawati AI' : 'Made with Hakawati AI',
  };

  const cover = await toDataUrl(book.coverImageBase64);

  // Lay out and render inside an isolated frame that has only the fonts: the site's stylesheet
  // (Tailwind, oklch() colours) would break html2canvas and change the measured layout
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = `position:fixed;top:0;left:-20000px;width:${PAGE_W + 40}px;height:${PAGE_H + 40}px;border:0;visibility:hidden;`;
  document.body.appendChild(frame);
  const fdoc = frame.contentDocument!;
  const fontLinks = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
    .filter((l) => /fonts\.googleapis/.test(l.href))
    .map((l) => `<link rel="stylesheet" href="${l.href}">`)
    .join('');
  fdoc.open();
  fdoc.write(`<!doctype html><html><head><meta charset="utf-8">${fontLinks}<style>*{box-sizing:border-box}body{margin:0;background:#fff}</style></head><body></body></html>`);
  fdoc.close();
  await new Promise<void>((resolve) => {
    const links = [...fdoc.querySelectorAll('link')];
    let left = links.length;
    if (!left) return resolve();
    const done = () => --left <= 0 && resolve();
    links.forEach((l) => {
      l.addEventListener('load', done);
      l.addEventListener('error', done);
    });
    setTimeout(resolve, 5000);
  });
  await fontsReady(fdoc);
  const host = fdoc.body;

  // ---- Building blocks
  const pageShell = (inner: string, footerLeft: string, pageNo: number | null) => `
    <div style="width:${PAGE_W}px;height:${PAGE_H}px;box-sizing:border-box;background:#fff;color:${C.text};direction:${dir};text-align:${start};font-family:${FONT_BODY};position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;${start}:0;width:100%;height:6px;background:linear-gradient(${isRtl ? 270 : 90}deg, ${C.brand}, ${C.accentBright});"></div>
      <div data-body style="position:absolute;top:${PAD_TOP}px;left:${PAD_X}px;right:${PAD_X}px;height:${BODY_H}px;overflow:hidden;">${inner}</div>
      ${
        pageNo === null
          ? ''
          : `<div style="position:absolute;bottom:0;left:${PAD_X}px;right:${PAD_X}px;height:${FOOTER_H}px;border-top:1px solid ${C.line};display:flex;align-items:center;justify-content:space-between;font-size:13px;line-height:1.8;color:${C.muted};">
              <span style="line-height:1.8;">${esc(footerLeft.length > 70 ? footerLeft.slice(0, 68) + '…' : footerLeft)}</span>
              <span style="font-weight:700;color:${C.brand};line-height:1.8;">${pageNo}</span>
            </div>`
      }
    </div>`;

  const para = (text: string) =>
    `<p style="font-size:17px;line-height:2;color:${C.text};margin:0 0 16px 0;">${esc(text)}</p>`;
  const subheading = (text: string) =>
    `<h3 style="font-family:${FONT_HEAD};font-size:21px;font-weight:800;color:${C.brandDeep};margin:10px 0 12px 0;padding-${start}:12px;border-${start}:4px solid ${C.brand};line-height:1.5;">${esc(text)}</h3>`;
  const takeaway = (text: string) =>
    `<div style="margin:4px 0 22px 0;background:${C.brandSoft};border:1px solid ${C.brandBorder};border-radius:12px;padding:14px 18px;">
      <div style="font-family:${FONT_HEAD};font-size:14px;font-weight:800;color:${C.brand};margin-bottom:4px;">${L.takeaway}</div>
      <div style="font-size:16px;line-height:1.9;color:${C.brandDeep};">${esc(text)}</div>
    </div>`;
  const chapterHead = (n: number, title: string, summary: string) =>
    `<div style="margin:0 0 30px 0;padding-bottom:22px;border-bottom:2px solid ${C.line};">
      <div style="font-family:${FONT_HEAD};font-size:15px;font-weight:800;color:${C.accent};letter-spacing:0;">${L.chapter} ${n}</div>
      <h2 style="font-family:${FONT_HEAD};font-size:32px;font-weight:800;color:${C.brandDeep};line-height:1.45;margin:6px 0 0 0;">${esc(title)}</h2>
      ${summary ? `<p style="font-size:16px;line-height:1.9;color:${C.muted};margin:12px 0 0 0;">${esc(summary)}</p>` : ''}
    </div>`;

  // ---- Pagination: fill a page body with blocks; long paragraphs are split between pages
  const measure = fdoc.createElement('div');
  host.appendChild(measure);
  measure.innerHTML = pageShell('', '', 1);
  const body = measure.querySelector('[data-body]') as HTMLElement;
  const fits = () => body.scrollHeight <= BODY_H + 1;

  type Block = { html: string; text?: string; keepWithNext?: boolean };
  const paginate = (blocks: Block[]): string[] => {
    const pages: string[] = [];
    let current = '';
    const flush = () => {
      if (current.trim()) pages.push(current);
      current = '';
      body.innerHTML = '';
    };
    body.innerHTML = '';
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      // A heading must not be the last thing on a page
      const nb = blocks[i + 1];
      const withNext = b.keepWithNext && nb ? b.html + (nb.text ? para(nb.text.split(/\s+/).slice(0, 24).join(' ')) : nb.html) : b.html;
      body.innerHTML = current + withNext;
      if (fits()) {
        current += b.html;
        continue;
      }
      if (b.text) {
        // Split the paragraph at word boundaries: as much as fits here, the rest on the next page
        const words = b.text.split(/\s+/);
        let lo = 0;
        let hi = words.length;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          body.innerHTML = current + para(words.slice(0, mid).join(' '));
          if (fits()) lo = mid;
          else hi = mid - 1;
        }
        if (lo >= 8) {
          current += para(words.slice(0, lo).join(' '));
          flush();
          const rest = words.slice(lo).join(' ');
          blocks.splice(i + 1, 0, { html: para(rest), text: rest });
          continue;
        }
      }
      flush();
      current = b.html;
      body.innerHTML = current;
    }
    flush();
    return pages;
  };

  const paragraphs = (text: string): Block[] =>
    String(text || '')
      .split(/\n{2,}|\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => ({ html: para(p), text: p }));

  // ---- Chapters
  const chapterPages: { chapter: number; pages: string[] }[] = book.chapters.map((ch) => {
    const blocks: Block[] = [{ html: chapterHead(ch.chapterNumber, ch.title, ch.summary), keepWithNext: true }];
    for (const s of ch.subsections) {
      if (s.subheading) blocks.push({ html: subheading(s.subheading), keepWithNext: true });
      blocks.push(...paragraphs(s.content));
      if (s.keyTakeaway) blocks.push({ html: takeaway(s.keyTakeaway) });
    }
    return { chapter: ch.chapterNumber, pages: paginate(blocks) };
  });

  // ---- Contents (its own length decides where chapter 1 starts)
  const tocBlocks = (startPages: number[]): Block[] => [
    {
      html: `<h2 style="font-family:${FONT_HEAD};font-size:32px;font-weight:800;color:${C.brandDeep};margin:0 0 26px 0;">${L.contents}</h2>`,
      keepWithNext: true,
    },
    ...(book.synopsis
      ? [
          {
            html: `<div style="background:${C.brandSoft};border:1px solid ${C.brandBorder};border-radius:14px;padding:18px 22px;margin:0 0 30px 0;">
              <div style="font-family:${FONT_HEAD};font-size:15px;font-weight:800;color:${C.brand};margin-bottom:6px;">${L.synopsis}</div>
              <div style="font-size:16px;line-height:1.95;color:${C.text};">${esc(book.synopsis)}</div>
            </div>`,
          },
        ]
      : []),
    ...book.chapters.map((ch, i) => ({
      html: `<div style="display:flex;align-items:baseline;gap:12px;padding:12px 0;border-bottom:1px solid ${C.line};font-size:17px;">
        <span style="font-family:${FONT_HEAD};font-weight:800;color:${C.accent};min-width:72px;">${L.chapter} ${ch.chapterNumber}</span>
        <span style="flex:1;color:${C.ink};font-weight:600;line-height:1.6;">${esc(ch.title)}</span>
        <span style="font-weight:700;color:${C.brand};">${startPages[i] ?? ''}</span>
      </div>`,
    })),
  ];
  const tocPageCount = paginate(tocBlocks(book.chapters.map(() => 999))).length;
  const startPages: number[] = [];
  let next = 2 + tocPageCount; // page 1 is the cover
  for (const c of chapterPages) {
    startPages.push(next);
    next += c.pages.length;
  }
  const tocPages = paginate(tocBlocks(startPages));

  // ---- Cover
  const coverHtml = cover
    ? `<div style="width:${PAGE_W}px;height:${PAGE_H}px;position:relative;overflow:hidden;background:${C.brandDeep};direction:${dir};font-family:${FONT_BODY};">
        <img src="${cover}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" />
        <div style="position:absolute;inset:0;background:linear-gradient(to top, rgba(14,12,40,0.94) 0%, rgba(14,12,40,0.7) 32%, rgba(14,12,40,0) 60%);"></div>
        <div style="position:absolute;left:64px;right:64px;bottom:72px;text-align:center;color:#fff;">
          <h1 style="font-family:${FONT_HEAD};font-size:46px;font-weight:800;line-height:1.35;margin:0 0 14px 0;">${esc(book.title)}</h1>
          ${book.subtitle ? `<p style="font-size:20px;line-height:1.6;color:#dfe2ff;margin:0 0 24px 0;">${esc(book.subtitle)}</p>` : ''}
          <div style="width:72px;height:4px;border-radius:2px;background:${C.accentBright};margin:0 auto 18px auto;"></div>
          <div style="font-family:${FONT_HEAD};font-size:20px;font-weight:700;color:#fff;">${L.by}: ${esc(book.author || '')}</div>
        </div>
      </div>`
    : `<div style="width:${PAGE_W}px;height:${PAGE_H}px;position:relative;overflow:hidden;background:linear-gradient(160deg, ${C.brandDeep} 0%, #0b0c1a 100%);direction:${dir};font-family:${FONT_BODY};color:#fff;text-align:center;">
        <div style="position:absolute;top:0;left:0;right:0;height:8px;background:linear-gradient(90deg, ${C.brand}, ${C.accentBright});"></div>
        <div style="position:absolute;left:72px;right:72px;top:50%;transform:translateY(-50%);">
          ${book.genre ? `<div style="display:inline-block;font-size:15px;font-weight:700;color:${C.accentBright};border:1px solid rgba(34,211,238,0.5);border-radius:20px;padding:6px 18px;margin-bottom:34px;">${esc(book.genre)}</div>` : ''}
          <h1 style="font-family:${FONT_HEAD};font-size:52px;font-weight:800;line-height:1.35;margin:0 0 20px 0;">${esc(book.title)}</h1>
          ${book.subtitle ? `<p style="font-size:21px;line-height:1.6;color:#c7cbfa;margin:0 0 34px 0;">${esc(book.subtitle)}</p>` : ''}
          <div style="width:80px;height:4px;border-radius:2px;background:${C.accentBright};margin:0 auto 22px auto;"></div>
          <div style="font-family:${FONT_HEAD};font-size:21px;font-weight:700;">${L.by}: ${esc(book.author || '')}</div>
        </div>
        <div style="position:absolute;bottom:44px;left:0;right:0;font-size:13px;color:#8d8fb8;">${L.madeWith}</div>
      </div>`;

  // ---- Assemble and render
  const pages: string[] = [coverHtml];
  let pageNo = 2;
  for (const p of tocPages) pages.push(pageShell(p, book.title, pageNo++));
  chapterPages.forEach((c) => {
    const ch = book.chapters.find((x) => x.chapterNumber === c.chapter)!;
    for (const p of c.pages) pages.push(pageShell(p, `${book.title} - ${L.chapter} ${ch.chapterNumber}`, pageNo++));
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  try {
    for (let i = 0; i < pages.length; i++) {
      measure.innerHTML = pages[i];
      const el = measure.firstElementChild as HTMLElement;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: PAGE_W,
        height: PAGE_H,
      });
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 210, 297);
    }
  } finally {
    frame.remove();
  }
  return pdf.output('blob');
}
