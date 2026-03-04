import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import newsRouter from './routes/news.js';
import assetsRouter from './routes/assets.js';
import escalationRouter from './routes/escalation.js';
import timelineRouter from './routes/timeline.js';
import playersRouter from './routes/players.js';
import analysisRouter from './routes/analysis.js';
import vesselsRouter from './routes/vessels.js';
import socialRouter  from './routes/social.js';

const __dir = dirname(fileURLToPath(import.meta.url));

// Load .env from project root (one level up from server/)
dotenv.config({ path: join(__dir, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// In production the server serves the built client (same origin), so CORS is
// only needed for local dev where client runs on a different port.
const devOrigins = ['http://localhost:5173', 'http://localhost:3000'];
app.use(cors({
  origin: (origin, cb) => {
    // No origin = same-origin request (browsers omit it) — always allow.
    // In dev allow localhost ports; in production block all cross-origin.
    if (!origin || devOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
}));
app.use(express.json());

// ── HTTP caching headers ──────────────────────────────────────────────────────
// Lets browsers (and any CDN in front) cache API responses.
// All users share the same data so `public` is safe.
const httpCache = (maxAge: number) => (_req: any, res: any, next: any) => {
  res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${Math.floor(maxAge / 4)}`);
  next();
};

app.use('/api/news',       httpCache(120),  newsRouter);
app.use('/api/assets',     httpCache(3600), assetsRouter);
app.use('/api/escalation', httpCache(60),   escalationRouter);
app.use('/api/timeline',   httpCache(3600), timelineRouter);
app.use('/api/players',    httpCache(3600), playersRouter);
app.use('/api/analysis',   httpCache(840),  analysisRouter);
app.use('/api/vessels',    httpCache(60),   vesselsRouter);
app.use('/api/social',     httpCache(300),  socialRouter);

app.get('/api/health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Serve built client in production ─────────────────────────────────────────
const clientDist = join(__dir, '../client/dist');
app.use(express.static(clientDist));
app.get('/{*path}', (_req, res) => res.sendFile(join(clientDist, 'index.html')));

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
});
