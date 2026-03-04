import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '../../stores/appStore';

const LEVELS = [
  { level: 1, label: 'STABLE', color: '#00ff88', desc: 'Routine posturing, no unusual activity' },
  { level: 2, label: 'ELEVATED', color: '#a3e635', desc: 'Increased rhetoric, minor troop movements' },
  { level: 3, label: 'HIGH', color: '#ff9500', desc: 'Direct threats, asset repositioning, sanctions' },
  { level: 4, label: 'SEVERE', color: '#ff6b00', desc: 'Proxy attacks, direct confrontation, mobilization' },
  { level: 5, label: 'CRITICAL', color: '#ff3b3b', desc: 'Active hostilities, strikes confirmed' },
];

export default function EscalationGauge() {
  const { escalationLevel, setEscalation } = useAppStore();

  useQuery({
    queryKey: ['escalation'],
    queryFn: async () => {
      const res = await axios.get('/api/escalation');
      setEscalation(res.data.level, res.data.score);
      return res.data;
    },
    refetchInterval: 60000,
  });

  const current = LEVELS[escalationLevel - 1] ?? LEVELS[1];

  return (
    <div className="panel px-4 py-3 flex items-center gap-6">
      {/* Label */}
      <div className="flex-shrink-0">
        <div className="mono text-[10px] opacity-40 tracking-widest mb-0.5">THREAT LEVEL</div>
        <div
          className="mono font-bold text-base tracking-widest"
          style={{ color: current.color, textShadow: `0 0 12px ${current.color}` }}
        >
          {current.label}
        </div>
        <div className="mono text-[10px] opacity-40">{escalationLevel} / 5</div>
      </div>

      {/* Horizontal bars */}
      <div className="flex gap-1 items-center flex-1">
        {LEVELS.map((l) => {
          const active = l.level <= escalationLevel;
          const isCurrent = l.level === escalationLevel;
          return (
            <div
              key={l.level}
              className="flex-1 rounded-sm transition-all duration-700"
              style={{
                height: isCurrent ? '28px' : `${14 + l.level * 2}px`,
                backgroundColor: active ? l.color : '#1e3a5f',
                opacity: active ? 1 : 0.25,
                boxShadow: isCurrent ? `0 0 10px ${l.color}` : 'none',
              }}
            />
          );
        })}
      </div>

      {/* Description */}
      <div className="flex-shrink-0 max-w-[200px] hidden md:block">
        <p className="text-[11px] opacity-50 leading-relaxed">{current.desc}</p>
        <div className="mono text-[9px] opacity-20 mt-1">AUTOMATED · NOT AN INTEL PRODUCT</div>
      </div>
    </div>
  );
}
