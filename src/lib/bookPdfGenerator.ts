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

/**
 * Creates an ultra-crisp, perfectly rendered PDF with beautiful typography,
 * language-aware direction (RTL for Arabic, LTR for English/French/Spanish), luxury cover art, and A4 pagination.
 */
export async function createProfessionalArabicPdf(book: GeneratedBookStructure): Promise<Blob> {
  const isRtl = !book.language || book.language === 'ar';
  const textDir = isRtl ? 'rtl' : 'ltr';
  const textAlign = isRtl ? 'right' : 'left';

  // Localization labels
  const labels = {
    by: isRtl ? 'تأليف' : 'By',
    edition: isRtl ? 'نسخة رسمية منسقة' : 'Official Edition',
    tocTitle: isRtl ? 'فهرس المحتويات وخلاصة الكتاب' : 'Table of Contents & Synopsis',
    synopsisHeader: isRtl ? '📌 خلاصة فكرة الكتاب:' : '📌 Executive Synopsis:',
    chaptersHeader: isRtl ? 'فصول ومحاور الكتاب:' : 'Book Chapters & Sections:',
    pageAbbr: isRtl ? 'ص' : 'p.',
    chapterAbbr: isRtl ? 'الفصل' : 'Chapter',
    goldenLesson: isRtl ? '💡 خلاصة ذهبية:' : '💡 Key Takeaway:',
    pageWord: isRtl ? 'صفحة' : 'Page',
    footerStudio: isRtl ? 'تم التأليف والتنسيق بالذكاء الاصطناعي الفائق • استوديو Hakawati AI © 2026' : 'Generated & Formatted with Advanced AI Studio © 2026'
  };

  // Create hidden offscreen render container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-10000px';
  container.style.left = '-10000px';
  container.style.width = '794px'; // Exactly A4 width in 96 DPI (210mm)
  container.style.background = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = "'Cairo', 'Tajawal', sans-serif";
  container.style.direction = textDir;
  container.style.textAlign = textAlign;
  container.style.zIndex = '-9999';

  document.body.appendChild(container);

  const pagesHtml: string[] = [];

  // 1. Cover Page HTML (Luxury Dark / Vibrant Theme)
  const coverBgColors: Record<string, string> = {
    cinematic: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #0c1220 100%)',
    minimal: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    vintage: 'linear-gradient(135deg, #2d1810 0%, #451a03 100%)',
    fantasy: 'linear-gradient(135deg, #1e1035 0%, #4c1d95 100%)',
  };

  const coverGradient = coverBgColors[book.coverStyle] || coverBgColors.cinematic;

  const coverHtml = `
    <div class="pdf-page" style="width: 794px; height: 1123px; padding: 60px 50px; box-sizing: border-box; background: ${coverGradient}; color: #ffffff; display: flex; flex-direction: column; justify-content: space-between; border: 12px solid #3b82f6; position: relative; overflow: hidden; direction: ${textDir}; text-align: center;">
      <!-- Decorative Header Badge -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid rgba(255,255,255,0.15); padding-bottom: 20px; direction: ${textDir};">
        <span style="font-size: 14px; font-weight: 800; background: rgba(59, 130, 246, 0.3); color: #93c5fd; padding: 6px 16px; border-radius: 20px; border: 1px solid rgba(147, 197, 253, 0.4);">
          ${book.genre || 'AI Book Edition'}
        </span>
        <span style="font-size: 12px; color: #94a3b8; font-weight: bold;">
          ${labels.edition}
        </span>
      </div>

      <!-- Center Cover Visual & Titles -->
      <div style="text-align: center; margin: 30px 0;">
        ${book.coverImageBase64 ? `
          <div style="width: 280px; height: 280px; margin: 0 auto 30px auto; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); border: 3px solid rgba(255,255,255,0.2);">
            <img src="${book.coverImageBase64}" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
        ` : `
          <div style="width: 140px; height: 140px; margin: 0 auto 30px auto; border-radius: 30px; background: rgba(59,130,246,0.2); border: 2px solid #60a5fa; display: flex; align-items: center; justify-content: center; font-size: 50px;">
            📖
          </div>
        `}

        <h1 style="font-family: 'Tajawal', sans-serif; font-size: 38px; font-weight: 900; line-height: 1.3; margin: 0 0 16px 0; color: #ffffff; text-shadow: 0 4px 12px rgba(0,0,0,0.5);">
          ${book.title}
        </h1>

        ${book.subtitle ? `
          <p style="font-size: 18px; color: #cbd5e1; font-weight: 600; margin: 0 auto; max-width: 600px; line-height: 1.5;">
            ${book.subtitle}
          </p>
        ` : ''}
      </div>

      <!-- Bottom Author Credits -->
      <div style="text-align: center; border-top: 2px solid rgba(255,255,255,0.15); padding-top: 24px;">
        <div style="font-size: 16px; font-weight: bold; color: #38bdf8; margin-bottom: 6px;">
          ${labels.by}: ${book.author || 'Author'}
        </div>
        <div style="font-size: 11px; color: #64748b;">
          ${labels.footerStudio}
        </div>
      </div>
    </div>
  `;
  pagesHtml.push(coverHtml);

  // 2. Table of Contents & Synopsis Page
  const tocHtml = `
    <div class="pdf-page" style="width: 794px; height: 1123px; padding: 60px 50px; box-sizing: border-box; background: #ffffff; color: #0f172a; display: flex; flex-direction: column; justify-content: space-between; direction: ${textDir}; text-align: ${textAlign};">
      <div>
        <div style="text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 30px;">
          <h2 style="font-family: 'Tajawal', sans-serif; font-size: 26px; font-weight: 900; color: #1e293b; margin: 0;">
            ${labels.tocTitle}
          </h2>
        </div>

        <!-- Synopsis Box -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; ${isRtl ? 'border-right: 5px solid #3b82f6;' : 'border-left: 5px solid #3b82f6;'} padding: 20px; border-radius: 12px; margin-bottom: 35px;">
          <div style="font-size: 14px; font-weight: 900; color: #1d4ed8; margin-bottom: 8px;">
            ${labels.synopsisHeader}
          </div>
          <p style="font-size: 13px; line-height: 1.8; color: #334155; margin: 0;">
            ${book.synopsis || ''}
          </p>
        </div>

        <!-- Chapters TOC List -->
        <h3 style="font-size: 16px; font-weight: 900; color: #0f172a; margin-bottom: 16px;">
          ${labels.chaptersHeader}
        </h3>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${book.chapters.map((ch, idx) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f1f5f9; border-radius: 10px; border: 1px solid #e2e8f0;">
              <span style="font-size: 14px; font-weight: bold; color: #1e293b;">
                ${labels.chapterAbbr} ${ch.chapterNumber}: ${ch.title}
              </span>
              <span style="font-size: 12px; font-weight: bold; color: #64748b; background: #ffffff; padding: 4px 10px; border-radius: 6px; border: 1px solid #cbd5e1;">
                ${labels.pageAbbr} ${idx + 3}
              </span>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8;">
        <span>${book.title}</span>
        <span>${labels.pageWord} 2</span>
      </div>
    </div>
  `;
  pagesHtml.push(tocHtml);

  // 3. Chapters Pages
  book.chapters.forEach((ch, chIdx) => {
    const chapterHtml = `
      <div class="pdf-page" style="width: 794px; height: 1123px; padding: 60px 50px; box-sizing: border-box; background: #ffffff; color: #0f172a; display: flex; flex-direction: column; justify-content: space-between; direction: ${textDir}; text-align: ${textAlign};">
        <div>
          <!-- Chapter Header Banner -->
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 16px; padding: 20px; margin-bottom: 30px;">
            <span style="font-size: 12px; font-weight: 800; color: #2563eb; text-transform: uppercase;">
              ${labels.chapterAbbr} ${ch.chapterNumber}
            </span>
            <h2 style="font-family: 'Tajawal', sans-serif; font-size: 24px; font-weight: 900; color: #1e3a8a; margin: 6px 0 0 0;">
              ${ch.title}
            </h2>
            ${ch.summary ? `
              <p style="font-size: 12px; color: #475569; margin: 8px 0 0 0; line-height: 1.6;">
                ${ch.summary}
              </p>
            ` : ''}
          </div>

          <!-- Subsections -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            ${ch.subsections.map((sub) => `
              <div>
                ${sub.subheading ? `
                  <h3 style="font-size: 16px; font-weight: 900; color: #0f172a; margin: 0 0 10px 0; ${isRtl ? 'border-right: 4px solid #3b82f6; padding-right: 10px;' : 'border-left: 4px solid #3b82f6; padding-left: 10px;'}">
                    ${sub.subheading}
                  </h3>
                ` : ''}
                <p style="font-size: 13px; line-height: 1.9; color: #334155; margin: 0; text-align: justify;">
                  ${sub.content}
                </p>
                ${sub.keyTakeaway ? `
                  <div style="margin-top: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 16px; border-radius: 10px; color: #166534; font-size: 12px; font-weight: bold; line-height: 1.6;">
                    ${labels.goldenLesson} ${sub.keyTakeaway}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8;">
          <span>${book.title} • ${labels.chapterAbbr} ${ch.chapterNumber}</span>
          <span>${labels.pageWord} ${chIdx + 3}</span>
        </div>
      </div>
    `;
    pagesHtml.push(chapterHtml);
  });

  // Initialize jsPDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Render each page through html2canvas for 100% Arabic font fidelity
  for (let i = 0; i < pagesHtml.length; i++) {
    container.innerHTML = pagesHtml[i];

    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2, // High resolution crisp text rendering
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    if (i > 0) {
      pdf.addPage();
    }
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  }

  // Cleanup offscreen element
  document.body.removeChild(container);

  return pdf.output('blob');
}
