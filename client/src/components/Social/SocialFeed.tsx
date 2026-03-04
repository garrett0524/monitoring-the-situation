import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { timeAgo } from '../../utils/time';

interface Post {
  id: string;
  handle: string;
  name: string;
  cat: string;
  ts: string;
  text: string;
  url: string;
}

const CAT_COLOR: Record<string, string> = {
  us_mil:  '#4a9eff',
  us_gov:  '#00ff88',
  iran:    '#ff3b3b',
  news:    '#ff9500',
  analyst: '#a78bfa',
};

const CAT_LABEL: Record<string, string> = {
  us_mil:  'US MIL',
  us_gov:  'US GOV',
  iran:    'IRAN',
  news:    'NEWS',
  analyst: 'ANALYST',
};

export default function SocialFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ['social'],
    queryFn: async () => (await axios.get('/api/social')).data,
    refetchInterval: 5 * 60 * 1000,
    staleTime:       4 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const posts: Post[] = data?.posts ?? [];
  const usingLive: boolean = data?.usingLive ?? false;

  return (
    <div className="panel p-3 flex flex-col gap-2 h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="mono text-xs opacity-50 tracking-widest">SOCIAL SIGNALS</span>
          <span
            className="mono text-[9px] border px-1 rounded"
            style={{
              borderColor: usingLive ? '#00ff88' : '#1e3a5f',
              color:       usingLive ? '#00ff88' : '#6b7280',
            }}
          >
            {usingLive ? '● LIVE X/TWITTER' : '● CURATED'}
          </span>
        </div>
        {/* Legend */}
        <div className="flex gap-2">
          {Object.entries(CAT_LABEL).map(([k, v]) => (
            <span key={k} className="mono text-[8px]" style={{ color: CAT_COLOR[k], opacity: 0.7 }}>
              {v}
            </span>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="flex flex-col gap-2 overflow-y-auto slim-scroll flex-1">
        {isLoading && <div className="mono text-xs opacity-40">LOADING SIGNALS...</div>}
        {posts.map(p => (
          <a
            key={p.id}
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded border border-[#1e3a5f] px-2.5 py-2 hover:border-opacity-80 transition-colors group"
            style={{ borderColor: `${CAT_COLOR[p.cat]}33`, textDecoration: 'none' }}
          >
            {/* Author row */}
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="mono text-[8px] px-1 rounded font-bold"
                style={{ background: `${CAT_COLOR[p.cat]}22`, color: CAT_COLOR[p.cat] }}
              >
                {CAT_LABEL[p.cat] ?? p.cat.toUpperCase()}
              </span>
              <span className="text-[11px] font-semibold opacity-90 group-hover:opacity-100">
                {p.name}
              </span>
              <span className="mono text-[9px] opacity-35">@{p.handle}</span>
              <span className="mono text-[9px] opacity-30 ml-auto">{timeAgo(p.ts)}</span>
            </div>
            {/* Tweet text */}
            <p className="text-[11px] opacity-75 leading-relaxed line-clamp-3 group-hover:opacity-90">
              {p.text}
            </p>
          </a>
        ))}

        {!usingLive && posts.length > 0 && (
          <div className="mono text-[9px] opacity-25 text-center pb-1">
            Curated scenario posts · Add X_BEARER_TOKEN to .env for live feed
          </div>
        )}
      </div>
    </div>
  );
}
