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
    .replace(/^(foulabook\.com|kutub-pdf\.net|noor-book\.com|kotobati\.com)[_-]?/gi, '')
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
