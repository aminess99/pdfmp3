// Turns an uploaded file name into a readable book title
export function cleanBookTitle(rawName: string): string {
  if (!rawName) return 'كتاب صوتي';
  
  // If the title is just a raw hash (like 69fb610a9299e)
  if (/^[a-f0-9]{8,}$/i.test(rawName.trim())) {
    return 'كتاب صوتي عربي';
  }

  const cleaned = rawName
    .replace(/\.(pdf|epub)$/i, '')
    .replace(/_pdf$/i, '')
    .replace(/^https?:\/\/\S+/i, '')
    // Download sites stamp their name anywhere in the file name ("…_Foulabook.com_.pdf")
    .replace(/[_\-\s]*(?:www\.)?(?:foulabook|bookslibrary|kutub-pdf|noor-book|kotobati|ktobati|alexandra\.ahlamontada|ketabpedia|maktbah)(?:\.(?:com|net|org))?[_\-\s]*/gi, ' ')
    .replace(/[_-]\d{3,10}/g, '') // remove random upload IDs like _23971
    .replace(/\(\d+\)/g, '') // remove (1)
    .replace(/[._-]+$/, '')
    .replace(/_+/g, ' ')
    .trim();

  // If after cleaning it's just a hex hash, return fallback
  if (/^[a-f0-9]{8,}$/i.test(cleaned)) {
    return 'كتاب صوتي عربي';
  }

  return cleaned || rawName;
}

// A file name that says nothing about the book ("69fb610a9299e.pdf", "1234.pdf", "scan_01.pdf"):
// the title is then read from the book itself
export function isMeaninglessName(rawName: string): boolean {
  const t = cleanBookTitle(rawName);
  if (t === 'كتاب صوتي عربي' || t === 'كتاب صوتي') return true;
  const letters = t.replace(/[^\p{L}]/gu, '');
  if (letters.length < 3) return true;
  // Mostly hex / digits / generic scanner names
  return /^(?:scan|document|doc|file|book|img|image|pdf|untitled|new)[\s_-]*\d*$/i.test(t) || /^[a-f0-9\s]{8,}$/i.test(t);
}
