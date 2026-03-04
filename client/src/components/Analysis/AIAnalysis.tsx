import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { timeAgo } from '../../utils/time';

interface Analysis {
  summary: string;
  riskAssessment: string;
  keyDevelopments: string[];
  escalationProbability: 'Low' | 'Medium' | 'High' | 'Critical';
  escalationReasoning: string;
  generatedAt: string;
}

const PROB_COLOR: Record<string, string> = {
  Low: '#00ff88', Medium: '#ff9500', High: '#ff6b00', Critical: '#ff3b3b',
};

export default function AIAnalysis() {
  const [refresh, setRefresh] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<Analysis>({
    queryKey: ['analysis'],
    queryFn: async () => {
      const res = await axios.get('/api/analysis', {
        params: refresh ? { refresh: '1' } : {},
      });
      setRefresh(false);
      return res.data;
    },
    refetchInterval: 15 * 60 * 1000,
    staleTime: 14 * 60 * 1000,      // treat as fresh for 14 min — avoids redundant fetches
    refetchOnWindowFocus: false,      // don't re-call Claude on every tab switch
    refetchOnMount: false,            // use cached result when component remounts
  });

  return (
    <div className="panel p-3 flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="mono text-xs opacity-50 tracking-widest">AI ANALYSIS</span>
          <span className="mono text-[9px] border border-[#1e3a5f] px-1 rounded opacity-40">CLAUDE</span>
        </div>
        <button
          onClick={() => { setRefresh(true); refetch(); }}
          className="mono text-[10px] border border-[#1e3a5f] px-2 py-0.5 rounded hover:border-[#00ff88] hover:text-[#00ff88] transition-colors"
        >
          REFRESH
        </button>
      </div>

      {isLoading && <div className="mono text-xs opacity-40">GENERATING ANALYSIS...</div>}
      {error && (
        <div className="mono text-xs text-[#ff3b3b] opacity-70">
          {(error as any).response?.data?.error ?? 'Analysis unavailable — check ANTHROPIC_API_KEY'}
        </div>
      )}

      {data && (
        <div className="space-y-3 text-xs">
          <div>
            <div className="mono text-[10px] opacity-40 mb-1">SITUATION</div>
            <p className="opacity-80 leading-relaxed">{data.summary}</p>
          </div>
          <div>
            <div className="mono text-[10px] opacity-40 mb-1">RISK ASSESSMENT</div>
            <p className="opacity-70 leading-relaxed">{data.riskAssessment}</p>
          </div>
          <div>
            <div className="mono text-[10px] opacity-40 mb-1">KEY DEVELOPMENTS</div>
            <ul className="space-y-1">
              {data.keyDevelopments.map((d, i) => (
                <li key={i} className="flex gap-2 opacity-70">
                  <span className="text-[#00ff88]">›</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center gap-2 border-t border-[#1e3a5f] pt-2">
            <span className="mono text-[10px] opacity-40">ESCALATION PROBABILITY:</span>
            <span className="mono text-xs font-bold" style={{ color: PROB_COLOR[data.escalationProbability] }}>
              {data.escalationProbability}
            </span>
          </div>
          <div className="mono text-[9px] opacity-30">
            Generated {timeAgo(data.generatedAt)} · Automated assessment, not an intelligence product
          </div>
        </div>
      )}
    </div>
  );
}
