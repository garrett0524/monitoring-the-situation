import { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/appStore';
import { utcNow } from '../../utils/time';

const STATUS_COLOR = {
  operational: 'text-[#00ff88]',
  partial: 'text-[#ff9500]',
  outage: 'text-[#ff3b3b]',
};

export default function Header() {
  const { systemStatus, lastUpdated, scanlines, toggleScanlines } = useAppStore();
  const [utc, setUtc] = useState(utcNow());

  useEffect(() => {
    const id = setInterval(() => setUtc(utcNow()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className={`relative panel px-4 py-2 flex items-center justify-between ${scanlines ? 'scanlines' : ''}`}>
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="relative w-6 h-6">
          <div className="absolute inset-0 rounded-full border border-[#00ff88] opacity-30 radar-sweep origin-center" style={{ borderRightColor: 'transparent' }} />
          <div className="absolute inset-[6px] rounded-full bg-[#00ff88] pulse-dot" />
        </div>
        <span className="mono text-sm md:text-lg font-bold tracking-wide md:tracking-widest text-[#00ff88] uppercase">
          Monitoring the Situation
        </span>
      </div>

      {/* Center: UTC clock */}
      <div className="mono text-sm text-[#e0e7ef] opacity-80 hidden md:block">{utc}</div>

      {/* Right: status */}
      <div className="flex items-center gap-4 text-xs mono">
        <span className={STATUS_COLOR[systemStatus]}>
          ● {systemStatus.toUpperCase()}
        </span>
        {lastUpdated && (
          <span className="opacity-50 hidden sm:inline">UPDATED {new Date(lastUpdated).toLocaleTimeString()}</span>
        )}
        <button
          onClick={toggleScanlines}
          className="opacity-40 hover:opacity-100 transition-opacity text-[10px] border border-current px-1 rounded"
        >
          SCAN
        </button>
      </div>
    </header>
  );
}
