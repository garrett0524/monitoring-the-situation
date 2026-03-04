import axios from 'axios';

const BASE_URL = 'https://newsapi.org/v2/everything';
const QUERY = 'Iran OR "US military" OR "Persian Gulf" OR "Strait of Hormuz" OR CENTCOM OR IRGC OR "Middle East tensions"';

export interface NewsAPIItem {
  title: string;
  source: string;
  url: string;
  excerpt: string;
  publishedAt: string;
  sourceType: 'newsapi';
}

export async function fetchNewsAPI(): Promise<NewsAPIItem[]> {
  const key = process.env.NEWSAPI_KEY;
  if (!key || key.startsWith('your_')) return [];

  try {
    const res = await axios.get(BASE_URL, {
      params: { q: QUERY, sortBy: 'publishedAt', pageSize: 50, language: 'en', apiKey: key },
      timeout: 8000,
    });

    return (res.data.articles ?? []).map((a: any) => ({
      title: a.title ?? '',
      source: a.source?.name ?? 'NewsAPI',
      url: a.url ?? '',
      excerpt: a.description ?? '',
      publishedAt: a.publishedAt ?? new Date().toISOString(),
      sourceType: 'newsapi' as const,
    }));
  } catch (err: any) {
    console.warn(`[newsapi] Unavailable: ${err?.response?.status ?? err?.message}`);
    return [];
  }
}
