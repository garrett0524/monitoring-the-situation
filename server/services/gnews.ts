import axios from 'axios';

const BASE_URL = 'https://gnews.io/api/v4/search';
const QUERY = 'Iran OR CENTCOM OR IRGC OR "Persian Gulf" OR "Strait of Hormuz"';

export interface GNewsItem {
  title: string;
  source: string;
  url: string;
  excerpt: string;
  publishedAt: string;
  sourceType: 'gnews';
}

export async function fetchGNews(): Promise<GNewsItem[]> {
  const key = process.env.GNEWS_API_KEY;
  if (!key || key.startsWith('your_')) return [];

  try {
    const res = await axios.get(BASE_URL, {
      params: { q: QUERY, lang: 'en', max: 50, apikey: key },
      timeout: 8000,
    });

    return (res.data.articles ?? []).map((a: any) => ({
      title: a.title ?? '',
      source: a.source?.name ?? 'GNews',
      url: a.url ?? '',
      excerpt: a.description ?? '',
      publishedAt: a.publishedAt ?? new Date().toISOString(),
      sourceType: 'gnews' as const,
    }));
  } catch (err: any) {
    console.warn(`[gnews] Unavailable: ${err?.response?.status ?? err?.message}`);
    return [];
  }
}
