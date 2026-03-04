import { Router } from 'express';
import NodeCache from 'node-cache';
import { fetchRSSFeeds } from '../services/rss.js';
import { fetchNewsAPI } from '../services/newsapi.js';
import { fetchGNews } from '../services/gnews.js';
import { deduplicate } from '../services/deduplication.js';
import { computeSeverity } from '../services/severity.js';

const router = Router();
const cache = new NodeCache({ stdTTL: 300 }); // 5 min

// In-flight guard — N simultaneous users on cold cache = 1 fetch, not N
let inFlight: Promise<any> | null = null;

router.get('/', async (_req, res) => {
  const cached = cache.get('news');
  if (cached) return res.json(cached);

  if (inFlight) {
    try { return res.json(await inFlight); } catch { /* fall through */ }
  }

  inFlight = (async () => {
    const [rss, newsapi, gnews] = await Promise.all([
      fetchRSSFeeds(),
      fetchNewsAPI(),
      fetchGNews(),
    ]);

    const merged = [...rss, ...newsapi, ...gnews];
    const deduped = deduplicate(merged);

    const enriched = deduped
      .map(item => ({ ...item, severity: computeSeverity(item.title, item.excerpt) }))
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    const result = {
      articles: enriched,
      total: enriched.length,
      sources: { rss: rss.length, newsapi: newsapi.length, gnews: gnews.length },
      fetchedAt: new Date().toISOString(),
    };
    cache.set('news', result);
    return result;
  })();

  try {
    res.json(await inFlight);
  } catch (err: any) {
    res.status(500).json({ error: 'News fetch failed', detail: err.message });
  } finally {
    inFlight = null;
  }
});

export default router;
