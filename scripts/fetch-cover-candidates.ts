// Downloads candidate cover images for every book summary into covers-candidates/<textId>/,
// from Google Books and Open Library (searched by Arabic and English title), so a person can
// pick the right edition before it goes into public/covers/. Run by .github/workflows/covers.yml.
import fs from 'fs';
import path from 'path';
import { BOOK_SUMMARIES } from '../src/data/summaries';

// English editions help when the Arabic one has no cover online
const ENGLISH: Record<string, { title: string; author: string }> = {
  'atomic-habits': { title: 'Atomic Habits', author: 'James Clear' },
  '48-laws-of-power': { title: 'The 48 Laws of Power', author: 'Robert Greene' },
  'subtle-art': { title: 'The Subtle Art of Not Giving', author: 'Mark Manson' },
  'rich-dad-poor-dad': { title: 'Rich Dad Poor Dad', author: 'Robert Kiyosaki' },
};

const OUT = path.join(process.cwd(), 'covers-candidates');
const PER_QUERY = 4;

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { 'User-Agent': 'HakawatiAI-covers/1.0' }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function googleBooks(title: string, author: string, lang?: string): Promise<{ url: string; label: string }[]> {
  const q = encodeURIComponent(`intitle:${title} inauthor:${author}`);
  const data = await getJson(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=10${lang ? `&langRestrict=${lang}` : ''}`);
  return (data.items || [])
    .filter((it: any) => it.volumeInfo?.imageLinks?.thumbnail)
    .slice(0, PER_QUERY)
    .map((it: any) => ({
      // Ask the image server for a larger rendition than the default thumbnail
      url: it.volumeInfo.imageLinks.thumbnail.replace('http://', 'https://').replace('&edge=curl', '') + '&fife=w600',
      label: `google-${lang || 'any'}-${(it.volumeInfo.title || '').slice(0, 40)}-${it.volumeInfo.publisher || ''}`,
    }));
}

async function openLibrary(title: string, author: string): Promise<{ url: string; label: string }[]> {
  const data = await getJson(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=10`);
  return (data.docs || [])
    .filter((d: any) => d.cover_i)
    .slice(0, PER_QUERY)
    .map((d: any) => ({ url: `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`, label: `openlibrary-${(d.title || '').slice(0, 40)}` }));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const index: Record<string, { file: string; label: string; url: string }[]> = {};
  for (const s of BOOK_SUMMARIES) {
    const dir = path.join(OUT, s.textId);
    fs.mkdirSync(dir, { recursive: true });
    const en = ENGLISH[s.textId];
    const found: { url: string; label: string }[] = [];
    const tries: Promise<{ url: string; label: string }[]>[] = [
      googleBooks(s.bookTitle.replace(/^48 قانوناً/, '48 قانون'), s.author, 'ar'),
      googleBooks(s.bookTitle, s.author),
      ...(en ? [googleBooks(en.title, en.author, 'en'), openLibrary(en.title, en.author)] : [openLibrary(s.bookTitle, s.author)]),
    ];
    for (const t of await Promise.allSettled(tries)) {
      if (t.status === 'fulfilled') found.push(...t.value);
      else console.warn(`  ${s.textId}: ${t.reason?.message || t.reason}`);
    }
    index[s.textId] = [];
    let n = 0;
    for (const c of found) {
      if (index[s.textId].some((x) => x.url === c.url)) continue;
      try {
        const res = await fetch(c.url, { signal: AbortSignal.timeout(20_000) });
        const buf = Buffer.from(await res.arrayBuffer());
        // Skip "no cover" placeholders and broken answers
        if (!res.ok || buf.length < 4000) continue;
        const file = `${String(++n).padStart(2, '0')}.jpg`;
        fs.writeFileSync(path.join(dir, file), buf);
        index[s.textId].push({ file, label: c.label, url: c.url });
      } catch (err: any) {
        console.warn(`  ${s.textId}: ${err?.message || err}`);
      }
    }
    console.log(`${s.textId}: ${n} candidates`);
  }
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n');
}

main();
