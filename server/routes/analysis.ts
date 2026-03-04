import { Router } from 'express';
import NodeCache from 'node-cache';
import { generateAnalysis } from '../services/anthropic.js';
import { fetchRSSFeeds } from '../services/rss.js';
import { computeSeverity, computeEscalationScore, scoreToLevel } from '../services/severity.js';

const router = Router();
const cache = new NodeCache({ stdTTL: 900 }); // 15 min

// In-flight guard — prevents duplicate Claude calls when cache is cold
let inFlight: Promise<any> | null = null;

router.get('/', async (req, res) => {
  const forceRefresh = req.query.refresh === '1';
  const cached = cache.get('analysis');
  if (cached && !forceRefresh) return res.json(cached);

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  // If a generation is already running, wait for it instead of firing a second Claude call
  if (inFlight) {
    try { return res.json(await inFlight); } catch { /* fall through to fresh attempt */ }
  }

  inFlight = (async () => {
    // Fetch headlines server-side — RSS needs no API key
    const articles = await fetchRSSFeeds().catch(() => []);
    const headlines = articles.slice(0, 15).map(a => a.title);

    const scored = articles.map(a => ({
      severity: computeSeverity(a.title, a.excerpt),
      publishedAt: a.publishedAt,
    }));
    const escalationScore = Math.round(computeEscalationScore(scored));
    const level = scoreToLevel(escalationScore);

    const analysis = await generateAnalysis(headlines, level * 20);
    cache.set('analysis', analysis);
    return analysis;
  })();

  try {
    const result = await inFlight;
    res.json(result);
  } catch (err: any) {
    console.error('[analysis] generation failed:', err?.message ?? err);
    res.status(500).json({ error: 'Analysis generation failed', detail: err.message });
  } finally {
    inFlight = null;
  }
});

export default router;
