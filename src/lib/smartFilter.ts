import { apiFetch } from './apiFetch';

// An AI "editor" pass over book text before it is read aloud: the server's model gets the start
// of each paragraph and answers only with the numbers of paragraphs a listener doesn't need
// (publisher details, addresses, ads, contents and index lists, references, broken OCR lines).
// It never rewrites text, so it cannot change or invent anything; any failure keeps the text.

const MAX_PER_REQUEST = 120;
const SNIPPET_CHARS = 180;

const splitParagraphs = (text: string): string[] => {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  // One huge block: fall back to lines so junk lines can still be picked out
  if (paras.length < 3) return text.split('\n').map((p) => p.trim()).filter(Boolean);
  return paras;
};

// A chapter heading the AI reader found: the paragraph as it stands in the text, and its name
export interface FoundHeading {
  line: string;
  title: string;
}

export async function smartFilter(text: string): Promise<string> {
  return (await smartFilterWithHeadings(text)).text;
}

export async function smartFilterWithHeadings(text: string): Promise<{ text: string; headings: FoundHeading[] }> {
  const paras = splitParagraphs(text);
  if (paras.length < 2) return { text, headings: [] };
  const drop = new Set<number>();
  const headings: FoundHeading[] = [];
  try {
    for (let start = 0; start < paras.length; start += MAX_PER_REQUEST) {
      const chunk = paras.slice(start, start + MAX_PER_REQUEST);
      const res = await apiFetch(
        '/api/pdf/filter-paragraphs',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paragraphs: chunk.map((p) => ({ text: p.slice(0, SNIPPET_CHARS), words: p.split(/\s+/).length })),
          }),
        },
        { silent: true }
      );
      if (!res.ok) return { text, headings };
      const data = await res.json();
      if (!Array.isArray(data.drop)) return { text, headings };
      for (const n of data.drop) if (Number.isInteger(n) && n >= 1 && n <= chunk.length) drop.add(start + n - 1);
      for (const h of Array.isArray(data.headings) ? data.headings : []) {
        const p = chunk[Number(h?.n) - 1];
        // Only a short paragraph that is the heading by itself can start a chapter
        if (p && p.split(/\s+/).length <= 14 && typeof h.title === 'string' && h.title.trim()) {
          headings.push({ line: p, title: h.title.trim() });
        }
      }
    }
  } catch {
    return { text, headings };
  }
  const kept = paras.filter((_, i) => !drop.has(i));
  // Never leave the listener with nothing: an all-junk verdict is more likely a misread
  if (!drop.size || !kept.length) return { text, headings };
  return { text: kept.join('\n\n'), headings };
}
