import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import NodeCache from 'node-cache';

const router = Router();
const cache = new NodeCache({ stdTTL: 300 });
const __dir = dirname(fileURLToPath(import.meta.url));

router.get('/', (_req, res) => {
  const cached = cache.get('assets');
  if (cached) return res.json(cached);

  const bases = JSON.parse(readFileSync(join(__dir, '../data/bases.json'), 'utf8'));
  const iranianSites = JSON.parse(readFileSync(join(__dir, '../data/iranian-sites.json'), 'utf8'));

  const result = { bases, iranianSites, fetchedAt: new Date().toISOString() };
  cache.set('assets', result);
  res.json(result);
});

export default router;
