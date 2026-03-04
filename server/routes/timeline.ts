import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = Router();
const __dir = dirname(fileURLToPath(import.meta.url));

// Read once at startup — static data, no reason to hit disk per request
const events = JSON.parse(readFileSync(join(__dir, '../data/timeline.json'), 'utf8'));

router.get('/', (_req, res) => {
  res.json({ events, fetchedAt: new Date().toISOString() });
});

export default router;
