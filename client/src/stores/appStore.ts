import { create } from 'zustand';

interface AppState {
  escalationLevel: number;
  escalationScore: number;
  systemStatus: 'operational' | 'partial' | 'outage';
  lastUpdated: string | null;
  scanlines: boolean;
  mapLayers: { bases: boolean; iranian: boolean; assets: boolean; regional: boolean };
  setEscalation: (level: number, score: number) => void;
  setSystemStatus: (status: AppState['systemStatus']) => void;
  setLastUpdated: (ts: string) => void;
  toggleScanlines: () => void;
  toggleLayer: (layer: keyof AppState['mapLayers']) => void;
}

export const useAppStore = create<AppState>((set) => ({
  escalationLevel: 2,
  escalationScore: 15,
  systemStatus: 'operational',
  lastUpdated: null,
  scanlines: true,
  mapLayers: { bases: true, iranian: true, assets: true, regional: true },
  setEscalation: (level, score) => set({ escalationLevel: level, escalationScore: score }),
  setSystemStatus: (status) => set({ systemStatus: status }),
  setLastUpdated: (ts) => set({ lastUpdated: ts }),
  toggleScanlines: () => set((s) => ({ scanlines: !s.scanlines })),
  toggleLayer: (layer) =>
    set((s) => ({ mapLayers: { ...s.mapLayers, [layer]: !s.mapLayers[layer] } })),
}));
