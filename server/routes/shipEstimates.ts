import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import NodeCache from 'node-cache';
import Anthropic from '@anthropic-ai/sdk';
import { fetchRSSFeeds } from '../services/rss.js';

const router = Router();
const cache = new NodeCache({ stdTTL: 7200 }); // 2 hour cache — positions don't change fast
const __dir = dirname(fileURLToPath(import.meta.url));

let inFlight: Promise<any> | null = null;

interface Vessel {
  id: string;
  name: string;
  allegiance: string;
  type: string;
  description: string;
  track: [number, number][];
}

export interface ShipEstimate {
  id: string;
  name: string;
  allegiance: string;
  lat: number;
  lng: number;
  confidenceKm: number;
  reasoning: string;
  generatedAt: string;
}

router.get('/', async (_req, res) => {
  const cached = cache.get<ShipEstimate[]>('estimates');
  if (cached) return res.json({ estimates: cached, generatedAt: cached[0]?.generatedAt });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  if (inFlight) {
    try { return res.json({ estimates: await inFlight }); } catch {}
  }

  inFlight = (async () => {
    const vessels: Vessel[] = JSON.parse(
      readFileSync(join(__dir, '../data/vessels.json'), 'utf8')
    );

    // Pull recent headlines for context
    const articles = await fetchRSSFeeds().catch(() => []);
    const headlines = articles.slice(0, 10).map(a => a.title).join('\n');

    const now = new Date().toISOString();
    // Last confirmed OSINT anchor: last timeline event was 2026-03-01
    const lastKnownDate = '2026-03-01T00:00:00Z';

    const vesselContext = vessels.map(v => {
      const last = v.track[v.track.length - 1];
      return `- ${v.name} (${v.allegiance}, ${v.description}): last confirmed position [${last[0].toFixed(2)}°N, ${last[1].toFixed(2)}°E] as of ${lastKnownDate}`;
    }).join('\n');

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: `Naval OSINT analyst. Estimate current vessel positions using dead reckoning, known operating patterns, and news context. Reply ONLY with a JSON array — no other text:
[{"id":"vessel-id","lat":0.0,"lng":0.0,"confidenceKm":100,"reasoning":"1 sentence"}]
Constraints: carriers do 20-30 knots; frigates 20-25 knots. Confidence radius = uncertainty in km. Be realistic — if no new info, confidence should be wide (150-300km). Use vessel's known operational zone as primary prior.`,
      messages: [{
        role: 'user',
        content: `Current UTC: ${now}\n\nLast known positions:\n${vesselContext}\n\nRecent headlines:\n${headlines}\n\nEstimate current position for each vessel. Use the vessel IDs: ${vessels.map(v => v.id).join(', ')}`,
      }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    const parsed: any[] = JSON.parse(clean);
    const generatedAt = new Date().toISOString();

    const estimates: ShipEstimate[] = parsed.map((e: any) => {
      const vessel = vessels.find(v => v.id === e.id);
      return {
        id: e.id,
        name: vessel?.name ?? e.id,
        allegiance: vessel?.allegiance ?? 'Unknown',
        lat: Number(e.lat),
        lng: Number(e.lng),
        confidenceKm: Number(e.confidenceKm),
        reasoning: String(e.reasoning),
        generatedAt,
      };
    });

    cache.set('estimates', estimates);
    return estimates;
  })();

  try {
    const estimates = await inFlight;
    res.json({ estimates, generatedAt: estimates[0]?.generatedAt });
  } catch (err: any) {
    console.error('[ship-estimates] failed:', err?.message ?? err);
    res.status(500).json({ error: 'Ship estimation failed' });
  } finally {
    inFlight = null;
  }
});

export default router;
