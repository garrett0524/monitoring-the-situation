import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = Router();
const __dir = dirname(fileURLToPath(import.meta.url));

const vessels = JSON.parse(readFileSync(join(__dir, '../data/vessels.json'), 'utf8'));

router.get('/', (_req, res) => {
  res.json({ vessels, fetchedAt: new Date().toISOString() });
});

export default router;
