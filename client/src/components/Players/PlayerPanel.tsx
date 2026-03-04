import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface Player {
  id: string;
  side: 'US' | 'Iran';
  name: string;
  title: string;
  photo: string | null;
  bio: string;
  stance: number; // 1 (dove) to 5 (hawk)
  stanceLabel: string;
}

const STANCE_COLOR = (s: number) =>
  s <= 2 ? '#00ff88' : s === 3 ? '#ff9500' : '#ff3b3b';

export default function PlayerPanel() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const res = await axios.get('/api/players');
      return res.data;
    },
  });

  const players: Player[] = data?.players ?? [];
  const usSide = players.filter(p => p.side === 'US');
  const iranSide = players.filter(p => p.side === 'Iran');

  function renderGroup(title: string, color: string, group: Player[]) {
    return (
      <div>
        <div className="mono text-[10px] opacity-50 mb-1" style={{ color }}>{title}</div>
        <div className="space-y-1">
          {group.map(p => (
            <div
              key={p.id}
              className="border border-[#1e3a5f] rounded p-2 cursor-pointer hover:border-[#1e3a5f] hover:bg-[#0a0f1a] transition-colors"
              onClick={() => setExpanded(expanded === p.id ? null : p.id)}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#1e3a5f] flex items-center justify-center mono text-[10px] opacity-60">
                  {p.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{p.name}</div>
                  <div className="text-[10px] opacity-40 truncate">{p.title}</div>
                </div>
                <div className="mono text-[10px]" style={{ color: STANCE_COLOR(p.stance) }}>
                  {p.stanceLabel}
                </div>
              </div>
              {expanded === p.id && (
                <div className="mt-2 text-[10px] opacity-60 border-t border-[#1e3a5f] pt-2">
                  {p.bio}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="panel p-3 flex flex-col gap-3">
      <div className="mono text-xs opacity-50 tracking-widest">KEY PLAYERS</div>
      {renderGroup('US SIDE', '#4a9eff', usSide)}
      {renderGroup('IRANIAN SIDE', '#ff3b3b', iranSide)}
    </div>
  );
}
