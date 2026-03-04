import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { timeAgo } from '../../utils/time';
import { useAppStore } from '../../stores/appStore';

type Severity = 'critical' | 'high' | 'elevated' | 'normal';

interface Article {
  title: string;
  source: string;
  url: string;
  excerpt: string;
  publishedAt: string;
  severity: Severity;
  sourceType: string;
}

const SEVERITY_BORDER: Record<Severity, string> = {
  critical: 'border-[#ff3b3b]',
  high: 'border-[#ff6b00]',
  elevated: 'border-[#ff9500]',
  normal: 'border-[#1e3a5f]',
};

export default function NewsFeed() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { setLastUpdated } = useAppStore();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['news'],
    queryFn: async () => {
      const res = await axios.get('/api/news');
      setLastUpdated(new Date().toISOString());
      return res.data;
    },
    refetchInterval: 60000,
  });

  const articles: Article[] = data?.articles ?? [];

  return (
    <div className="panel flex flex-col" style={{ height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e3a5f]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ff3b3b] pulse-dot" />
          <span className="mono text-xs tracking-widest text-[#e0e7ef]">LIVE FEED</span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="mono text-[10px] opacity-40">{data.total} ARTICLES</span>
          )}
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="mono text-[10px] border border-[#1e3a5f] px-2 py-0.5 rounded hover:border-[#00ff88] hover:text-[#00ff88] transition-colors"
          >
            {isRefetching ? '...' : 'REFRESH'}
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto space-y-1 p-2 slim-scroll">
        {isLoading ? (
          <div className="mono text-xs opacity-40 text-center pt-8">FETCHING FEEDS...</div>
        ) : articles.length === 0 ? (
          <div className="mono text-xs opacity-40 text-center pt-8">NO ARTICLES — CHECK API KEYS</div>
        ) : (
          articles.map((a, i) => (
            <div
              key={i}
              className={`border-l-2 ${SEVERITY_BORDER[a.severity]} bg-[#0a0f1a] p-2 cursor-pointer hover:bg-[#111827] transition-colors rounded-sm`}
              onClick={() => setExpanded(expanded === `${i}` ? null : `${i}`)}
            >
              <div className="text-xs font-medium leading-snug text-[#e0e7ef]">{a.title}</div>
              <div className="flex gap-2 mt-1 mono text-[10px] opacity-50">
                <span>{a.source}</span>
                <span>·</span>
                <span>{timeAgo(a.publishedAt)}</span>
              </div>
              {expanded === `${i}` && (
                <div className="mt-2 text-[11px] opacity-70 border-t border-[#1e3a5f] pt-2">
                  <p className="mb-2">{a.excerpt}</p>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono text-[10px] text-[#00ff88] hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    READ SOURCE →
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
