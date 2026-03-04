import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

type Impact = 'escalatory' | 'de-escalatory' | 'neutral';
type Category = 'military' | 'diplomatic' | 'economic' | 'cyber' | 'humanitarian';

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  category: Category;
  impact: Impact;
  description: string;
  source: string;
}

const IMPACT_COLOR: Record<Impact, string> = {
  escalatory: '#ff3b3b',
  'de-escalatory': '#00ff88',
  neutral: '#6b7280',
};


export default function EventTimeline() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['timeline'],
    queryFn: async () => {
      const res = await axios.get('/api/timeline');
      return res.data;
    },
  });

  // Newest first — most recent events appear at the left without scrolling
  const events: TimelineEvent[] = [...(data?.events ?? [])].sort(
    (a, b) => b.date.localeCompare(a.date)
  );

  return (
    <div className="panel px-4 py-3">
      <div className="flex items-center gap-3 mb-3">
        <span className="mono text-[10px] opacity-40 tracking-widest">EVENT TIMELINE</span>
        <div className="flex gap-3 mono text-[10px] opacity-40">
          <span style={{ color: '#ff3b3b' }}>■ escalatory</span>
          <span style={{ color: '#00ff88' }}>■ de-escalatory</span>
          <span style={{ color: '#6b7280' }}>■ neutral</span>
        </div>
      </div>
      {/* Connector line */}
      <div className="relative">
        <div className="absolute top-3 left-0 right-0 h-px bg-[#1e3a5f]" />
        <div ref={scrollRef} className="flex gap-5 overflow-x-auto pb-2 scroll-smooth slim-scroll">
          {events.map((ev) => (
            <div key={ev.id} className="flex-shrink-0 w-40 cursor-pointer group pt-1">
              {/* Node dot */}
              <div
                className="w-2.5 h-2.5 rounded-full mb-2 border transition-all duration-200 group-hover:scale-125"
                style={{
                  backgroundColor: IMPACT_COLOR[ev.impact],
                  borderColor: IMPACT_COLOR[ev.impact],
                  boxShadow: `0 0 6px ${IMPACT_COLOR[ev.impact]}`,
                }}
              />
              <div className="mono text-[10px] opacity-35 mb-0.5">{ev.date}</div>
              <div className="text-[11px] font-semibold leading-snug group-hover:text-[#00ff88] transition-colors">
                {ev.title}
              </div>
              <div className="text-[10px] opacity-40 mt-0.5 line-clamp-2 leading-relaxed">
                {ev.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
