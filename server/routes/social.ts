import { Router } from 'express';
import axios from 'axios';
import NodeCache from 'node-cache';

const router = Router();
const cache = new NodeCache({ stdTTL: 300 });

// Accounts to monitor — ordered by relevance
const ACCOUNTS = [
  { handle: 'CENTCOM',         name: 'US Central Command',      cat: 'us_mil'   },
  { handle: 'DeptofDefense',   name: 'Dept. of Defense',        cat: 'us_mil'   },
  { handle: 'StateDept',       name: 'US State Dept.',          cat: 'us_gov'   },
  { handle: 'POTUS',           name: 'President Biden',         cat: 'us_gov'   },
  { handle: 'IranMission_UN',  name: 'Iran Mission to UN',      cat: 'iran'     },
  { handle: 'khamenei_ir',     name: 'Ayatollah Khamenei',      cat: 'iran'     },
  { handle: 'Reuters',         name: 'Reuters',                 cat: 'news'     },
  { handle: 'BBCWorld',        name: 'BBC World',               cat: 'news'     },
  { handle: 'AJEnglish',       name: 'Al Jazeera English',      cat: 'news'     },
  { handle: 'TritaParsi',      name: 'Trita Parsi (NIAC)',      cat: 'analyst'  },
  { handle: 'KenPolack',       name: 'Kenneth Pollack',         cat: 'analyst'  },
  { handle: 'RALEEZadeh',      name: 'Ali Vaez (ICG)',          cat: 'analyst'  },
];

// Curated mock posts — shown when X_BEARER_TOKEN is not set
const MOCK_POSTS = [
  { id: 'm1',  handle: 'CENTCOM',        name: 'US Central Command',   cat: 'us_mil',  ts: '2026-03-03T09:15:00Z', text: 'CENTCOM forces in the U.S. Central Command area of responsibility remain ready to defend U.S. interests and respond to threats. Force protection posture has been elevated.', url: 'https://x.com/CENTCOM' },
  { id: 'm2',  handle: 'StateDept',      name: 'US State Dept.',       cat: 'us_gov',  ts: '2026-03-03T08:42:00Z', text: 'The United States reaffirms its commitment to preventing Iran from acquiring a nuclear weapon. Diplomacy remains the preferred path, but all options are on the table.', url: 'https://x.com/StateDept' },
  { id: 'm3',  handle: 'khamenei_ir',    name: 'Ayatollah Khamenei',   cat: 'iran',    ts: '2026-03-03T07:30:00Z', text: 'The Islamic Republic will not yield to threats. Any aggression against Iranian territory will be met with a response that the aggressor will regret.', url: 'https://x.com/khamenei_ir' },
  { id: 'm4',  handle: 'Reuters',        name: 'Reuters',              cat: 'news',    ts: '2026-03-03T10:05:00Z', text: 'EXCLUSIVE: Two US carrier strike groups are now operating within range of Iranian territory, the highest US naval presence in the region since 2020 — sources', url: 'https://x.com/Reuters' },
  { id: 'm5',  handle: 'AJEnglish',      name: 'Al Jazeera English',   cat: 'news',    ts: '2026-03-03T09:55:00Z', text: 'Iran\'s foreign minister holds emergency meeting with Russian and Chinese counterparts as US military presence in the Gulf reaches a decade high.', url: 'https://x.com/AJEnglish' },
  { id: 'm6',  handle: 'TritaParsi',     name: 'Trita Parsi (NIAC)',   cat: 'analyst', ts: '2026-03-03T08:10:00Z', text: 'The current US maximum pressure posture has boxed Iran into a corner where hardliners have every incentive to accelerate the nuclear program rather than negotiate. This is not a coincidence.', url: 'https://x.com/TritaParsi' },
  { id: 'm7',  handle: 'DeptofDefense',  name: 'Dept. of Defense',     cat: 'us_mil',  ts: '2026-03-02T18:00:00Z', text: 'Secretary of Defense and Chairman of the Joint Chiefs met today with senior CENTCOM officials to review regional force posture and contingency planning.', url: 'https://x.com/DeptofDefense' },
  { id: 'm8',  handle: 'IranMission_UN', name: 'Iran Mission to UN',   cat: 'iran',    ts: '2026-03-02T15:30:00Z', text: 'Iran calls on the UN Security Council to condemn the illegal military buildup by the United States in the Persian Gulf, which constitutes a clear threat to regional peace.', url: 'https://x.com/IranMission_UN' },
  { id: 'm9',  handle: 'BBCWorld',       name: 'BBC World',            cat: 'news',    ts: '2026-03-02T14:20:00Z', text: 'Oil prices surge 4% as tensions mount in the Strait of Hormuz — analysts warn of potential supply disruption affecting 20% of global oil transit.', url: 'https://x.com/BBCWorld' },
  { id: 'm10', handle: 'KenPolack',      name: 'Kenneth Pollack',      cat: 'analyst', ts: '2026-03-02T12:00:00Z', text: 'We are closer to a US-Iran military confrontation than at any point since 2020. Both sides are signaling credible threats but neither appears to want escalation. The risk is miscalculation.', url: 'https://x.com/KenPolack' },
];

const CAT_COLOR: Record<string, string> = {
  us_mil: '#4a9eff',
  us_gov: '#00ff88',
  iran:   '#ff3b3b',
  news:   '#ff9500',
  analyst:'#a78bfa',
};

async function fetchXPosts(): Promise<typeof MOCK_POSTS> {
  const token = process.env.X_BEARER_TOKEN;
  if (!token || token.startsWith('your_')) return MOCK_POSTS;

  try {
    // Build query from monitored accounts
    const query = ACCOUNTS.map(a => `from:${a.handle}`).join(' OR ');
    const res = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        query,
        max_results: 20,
        'tweet.fields': 'created_at,author_id,text',
        'user.fields':  'username,name',
        expansions:     'author_id',
      },
      timeout: 8000,
    });

    const users: Record<string, { username: string; name: string }> = {};
    for (const u of res.data.includes?.users ?? []) {
      users[u.id] = { username: u.username, name: u.name };
    }

    return (res.data.data ?? []).map((t: any) => {
      const u = users[t.author_id] ?? { username: 'unknown', name: 'Unknown' };
      const acct = ACCOUNTS.find(a => a.handle.toLowerCase() === u.username.toLowerCase());
      return {
        id:   t.id,
        handle: u.username,
        name:   u.name,
        cat:    acct?.cat ?? 'news',
        ts:     t.created_at,
        text:   t.text,
        url:    `https://x.com/${u.username}/status/${t.id}`,
      };
    });
  } catch (err: any) {
    console.warn('[social] X API unavailable:', err?.response?.status ?? err?.message);
    return MOCK_POSTS;
  }
}

router.get('/', async (_req, res) => {
  const cached = cache.get('social');
  if (cached) return res.json(cached);

  const posts = await fetchXPosts();
  const result = {
    posts,
    accounts: ACCOUNTS.map(a => ({ ...a, color: CAT_COLOR[a.cat] })),
    usingLive: !!(process.env.X_BEARER_TOKEN && !process.env.X_BEARER_TOKEN.startsWith('your_')),
    fetchedAt: new Date().toISOString(),
  };
  cache.set('social', result);
  res.json(result);
});

export { CAT_COLOR };
export default router;
