import { Router } from 'express';
import NodeCache from 'node-cache';
import { computeEscalationScore, scoreToLevel } from '../services/severity.js';

const router = Router();
const cache = new NodeCache({ stdTTL: 120 });

// In-memory override support
let manualOverride: number | null = null;

router.get('/', (_req, res) => {
  const cached = cache.get('escalation');
  if (cached) return res.json(cached);

  // Caller should pass articles as query param, or we return a default
  const result = { level: 2, score: 15, override: manualOverride !== null, updatedAt: new Date().toISOString() };
  cache.set('escalation', result);
  res.json(result);
});

router.post('/compute', (req, res) => {
  const { articles } = req.body as { articles: { severity: string; publishedAt: string }[] };
  if (!articles) return res.status(400).json({ error: 'articles required' });

  const score = computeEscalationScore(articles as any);
  const level = manualOverride !== null ? manualOverride : scoreToLevel(score);
  const result = { level, score: Math.round(score), override: manualOverride !== null, updatedAt: new Date().toISOString() };
  cache.set('escalation', result);
  res.json(result);
});

router.post('/override', (req, res) => {
  const { level } = req.body as { level: number | null };
  manualOverride = level;
  cache.del('escalation');
  res.json({ ok: true, manualOverride });
});

export default router;
