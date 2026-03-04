export interface NewsItem {
  title: string;
  source: string;
  url: string;
  excerpt: string;
  publishedAt: string;
  sourceType: string;
}

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  const wordsA = new Set(na.split(' '));
  const wordsB = new Set(nb.split(' '));
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}

export function deduplicate(items: NewsItem[]): NewsItem[] {
  const seen: NewsItem[] = [];
  for (const item of items) {
    const isDup = seen.some(s => similarity(s.title, item.title) > 0.6);
    if (!isDup) seen.push(item);
  }
  return seen;
}
