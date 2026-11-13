/**
 * Generates an ultra-crisp 6x9 PNG cover graphic (using HTML5 Canvas)
 * Automatically adapts palette and layout for children's books vs adult books.
 */
export function generateCrispBookCoverPng(
  title: string,
  author: string = 'الكاتب المبدع',
  genre: string = 'إصدار استوديو الكتب',
  style: 'cinematic' | 'minimal' | 'vintage' | 'fantasy' = 'cinematic'
): string {
  const canvas = document.createElement('canvas');
  // Exact 6x9 Trade Paperback Aspect Ratio (600px x 900px)
  canvas.width = 600;
  canvas.height = 900;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const isKidsBook = (genre && (genre.includes("طفل") || genre.includes("أطفال") || genre.toLowerCase().includes("kid") || genre.toLowerCase().includes("children"))) ||
                    (title && (title.includes("قصة") || title.includes("أميرة") || title.includes("دبدوب") || title.includes("طفل") || title.toLowerCase().includes("story")));

  // 1. Background Gradient Palette (Pastel Sky for Kids vs Luxury Dark for Adults)
  const themes = {
    cinematic: ['#090d16', '#1e1b4b', '#06b6d4'],
    minimal: ['#0f172a', '#1e293b', '#38bdf8'],
    vintage: ['#2d1810', '#451a03', '#d97706'],
    fantasy: ['#1e1035', '#4c1d95', '#ec4899'],
  };

  const kidsTheme = ['#0c1427', '#2563eb', '#f43f5e']; // Magical Kids Sky Palette

  const pal = isKidsBook ? kidsTheme : (themes[style] || themes.cinematic);

  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  if (isKidsBook) {
    bgGrad.addColorStop(0, '#1e1b4b');
    bgGrad.addColorStop(0.4, '#3b82f6');
    bgGrad.addColorStop(1, '#ec4899');
  } else {
    bgGrad.addColorStop(0, pal[0]);
    bgGrad.addColorStop(0.5, pal[1]);
    bgGrad.addColorStop(1, pal[0]);
  }

  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Decorative Whimsical Elements for Kids vs Clean Framing
  const cx = canvas.width / 2;
  const cy = 340;

  if (isKidsBook) {
    // Playful Clouds & Stars Background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    // Stars
    [
      [80, 100, 15], [520, 120, 20], [100, 480, 12], [500, 450, 18], [120, 750, 15], [480, 780, 15]
    ].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Cute Rainbow Radial Glow
    const rainbowGlow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 180);
    rainbowGlow.addColorStop(0, 'rgba(253, 224, 71, 0.45)');
    rainbowGlow.addColorStop(0.5, 'rgba(244, 114, 182, 0.35)');
    rainbowGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rainbowGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, 180, 0, Math.PI * 2);
    ctx.fill();

    // Central Cute Character Circle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(cx, cy, 105, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Kids Icon in center
    ctx.font = '65px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐱', cx, cy - 10);
    ctx.fillText('🐶', cx + 45, cy + 30);
  } else {
    // Adult Framing
    ctx.strokeStyle = pal[2];
    ctx.lineWidth = 4;
    ctx.strokeRect(25, 25, canvas.width - 50, canvas.height - 50);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);

    // Glow
    const radialGlow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 160);
    radialGlow.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radialGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, 160, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 90, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = pal[2];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 70, 0, Math.PI * 2);
    ctx.stroke();

    // Adult Icon in center
    ctx.font = '55px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📖', cx, cy);
  }

  // 4. Header Badge
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.roundRect(cx - 140, 70, 280, 42, 20);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(genre || (isKidsBook ? 'قصة أطفال مصورة' : 'إصدار استوديو الكتب'), cx, 91);

  // 5. Book Title
  ctx.fillStyle = '#ffffff';
  ctx.font = isKidsBook ? '900 36px sans-serif' : '900 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Multi-line word wrapping for title
  const words = title.split(' ');
  let line = '';
  const lines: string[] = [];
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > 480 && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  let titleY = 530;
  lines.forEach((l) => {
    ctx.fillText(l.trim(), cx, titleY);
    titleY += 45;
  });

  // 6. Author Name at bottom
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`تأليف: ${author}`, cx, canvas.height - 85);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '12px sans-serif';
  ctx.fillText('استوديو Hakawati AI الذكي © 2026', cx, canvas.height - 55);

  return canvas.toDataURL('image/png', 0.95);
}
