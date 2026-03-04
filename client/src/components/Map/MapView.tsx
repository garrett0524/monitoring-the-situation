import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '../../stores/appStore';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Asset {
  id: string; name: string; type: string; lat: number; lng: number;
  allegiance: string; description: string; country?: string;
}
interface Vessel {
  id: string; name: string; allegiance: string; type: string;
  description: string; track: [number, number][];
}

const TYPE_COLOR: Record<string, string> = {
  naval: '#4a9eff', air: '#00ff88', army: '#a3e635',
  joint: '#ff9500', nuclear: '#ff3b3b', infrastructure: '#9ca3af',
};
const TYPE_SYMBOL: Record<string, string> = {
  naval: '⚓', air: '✈', army: '★', joint: '⬡', nuclear: '☢', infrastructure: '◈',
};
const ALL_TYPES = ['naval', 'air', 'army', 'joint', 'nuclear', 'infrastructure'] as const;
type AssetType = typeof ALL_TYPES[number];

function makeMarkerEl(type: string, allegiance: string, pulse = false): HTMLElement {
  const color  = TYPE_COLOR[type]  ?? '#e0e7ef';
  const symbol = TYPE_SYMBOL[type] ?? '●';
  const border = allegiance === 'US' ? '#4a9eff' : '#ff3b3b';
  const div = document.createElement('div');
  div.style.cssText = `
    width:30px;height:30px;background:rgba(10,15,26,0.85);
    border:2px solid ${border};border-radius:4px;
    display:flex;align-items:center;justify-content:center;
    font-size:14px;color:${color};cursor:pointer;
    box-shadow:0 0 8px ${border}88,inset 0 0 6px rgba(0,0,0,0.5);
    ${pulse ? 'animation:pulse-dot 1.5s ease-in-out infinite;' : ''}
  `;
  div.textContent = symbol;
  return div;
}

function popupHtml(a: Asset): string {
  const allegiance = a.allegiance ?? (a.type === 'nuclear' ? 'Iran' : 'US');
  return `<div style="font-family:monospace;font-size:12px;min-width:160px;background:#111827;color:#e0e7ef;padding:6px 8px;border-radius:4px;">
    <b style="color:#00ff88">${a.name}</b><br>
    <span style="opacity:0.7">${a.type?.toUpperCase()} · ${allegiance} · ${a.country ?? ''}</span><br>
    <span style="opacity:0.6;font-size:11px">${a.description}</span>
  </div>`;
}

function vesselPopupHtml(v: Vessel): string {
  const c = v.allegiance === 'US' ? '#4a9eff' : '#ff3b3b';
  return `<div style="font-family:monospace;font-size:12px;min-width:180px;background:#111827;color:#e0e7ef;padding:6px 8px;border-radius:4px;">
    <b style="color:${c}">${v.name}</b><br>
    <span style="opacity:0.7">NAVAL · ${v.allegiance} · UNDERWAY</span><br>
    <span style="opacity:0.6;font-size:11px">${v.description}</span><br>
    <span style="opacity:0.4;font-size:10px">Track: last 24h · ${v.track.length} fixes</span>
  </div>`;
}

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const markersRef   = useRef<any[]>([]);
  const mbSourcesRef = useRef<string[]>([]);  // Mapbox source IDs to clean up
  const mbLayersRef  = useRef<string[]>([]);  // Mapbox layer  IDs to clean up
  const mapboxDidInit  = useRef(false);
  const leafletDidInit = useRef(false);

  const [mapReady,   setMapReady]   = useState(false);
  const [useLeaflet, setUseLeaflet] = useState(false);
  const { mapLayers, toggleLayer } = useAppStore();
  const [activeTypes, setActiveTypes] = useState<Set<AssetType>>(new Set(ALL_TYPES));
  const [showTracks,  setShowTracks]  = useState(true);

  const { data } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => (await axios.get('/api/assets')).data,
  });
  const { data: vesselData } = useQuery({
    queryKey: ['vessels'],
    queryFn: async () => (await axios.get('/api/vessels')).data,
    refetchInterval: 60_000,
  });

  // ── Mapbox init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapboxDidInit.current) return;
    mapboxDidInit.current = true;

    const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
    if (!token) { setUseLeaflet(true); return; }

    import('mapbox-gl').then(mb => {
      if (mapRef.current) return;
      const mapboxgl = mb.default as any;
      mapboxgl.accessToken = token;
      mapRef.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [54, 26],
        zoom: 4.5,
      });
      mapRef.current.on('load', () => setMapReady(true));
    }).catch(err => {
      console.error('[mapbox] init failed:', err?.message ?? err);
      mapboxDidInit.current = false;
      setUseLeaflet(true);
    });

    return () => { mapRef.current?.remove?.(); mapRef.current = null; };
  }, []);

  // ── Leaflet fallback ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!useLeaflet || leafletDidInit.current || !mapContainer.current) return;
    leafletDidInit.current = true;

    import('leaflet').then(L => {
      if (mapRef.current) return;
      const map = L.default.map(mapContainer.current!, { center: [26, 54], zoom: 5 });
      L.default.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      }).addTo(map);
      mapRef.current = map;
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 100);
    });

    return () => { mapRef.current?.remove?.(); mapRef.current = null; };
  }, [useLeaflet]);

  useEffect(() => {
    if (!useLeaflet) return;
    const fn = () => mapRef.current?.invalidateSize?.();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [useLeaflet]);

  // ── Render markers + tracks ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    // Clear previous markers
    markersRef.current.forEach(m => m.remove?.());
    markersRef.current = [];

    if (useLeaflet) {
      // Clear Leaflet polylines
      mbLayersRef.current.forEach(l => l && (l as any).remove?.());
      mbLayersRef.current = [];
    } else {
      // Clear Mapbox layers/sources
      mbLayersRef.current.forEach(id => { try { mapRef.current.removeLayer(id); } catch {} });
      mbSourcesRef.current.forEach(id => { try { mapRef.current.removeSource(id); } catch {} });
      mbLayersRef.current = []; mbSourcesRef.current = [];
    }

    const bases:   Asset[] = mapLayers.bases   ? (data?.bases        ?? []) : [];
    const iranian: Asset[] = mapLayers.iranian  ? (data?.iranianSites ?? []) : [];
    const assets = [...bases, ...iranian].filter(a => activeTypes.has(a.type as AssetType));
    const vessels: Vessel[] = (vesselData?.vessels ?? []).filter(() => activeTypes.has('naval'));

    if (useLeaflet) {
      renderLeaflet(assets, vessels);
    } else {
      renderMapbox(assets, vessels);
    }
  }, [mapReady, data, vesselData, mapLayers, activeTypes, showTracks, useLeaflet]);

  function renderLeaflet(assets: Asset[], vessels: Vessel[]) {
    import('leaflet').then(L => {
      const map = mapRef.current;
      if (!map) return;

      assets.forEach(a => {
        const allegiance = a.allegiance ?? (a.type === 'nuclear' ? 'Iran' : 'US');
        const icon = L.default.divIcon({
          html: makeMarkerEl(a.type, allegiance).outerHTML,
          iconSize: [30, 30], iconAnchor: [15, 15], className: '',
        });
        markersRef.current.push(
          L.default.marker([a.lat, a.lng], { icon })
            .addTo(map).bindPopup(popupHtml(a), { className: '' })
        );
      });

      vessels.forEach(v => {
        if (!v.track?.length) return;
        if (showTracks && v.track.length >= 2) {
          const polyline = L.default.polyline(v.track, {
            color: v.allegiance === 'US' ? '#4a9eff' : '#ff3b3b',
            weight: 1.5, opacity: 0.35, dashArray: '4 6',
          }).addTo(map);
          mbLayersRef.current.push(polyline as any);
          if (v.track.length >= 3) {
            const recent = L.default.polyline(v.track.slice(-3), {
              color: v.allegiance === 'US' ? '#4a9eff' : '#ff3b3b',
              weight: 2, opacity: 0.85,
            }).addTo(map);
            mbLayersRef.current.push(recent as any);
          }
        }
        const [lat, lng] = v.track[v.track.length - 1];
        const icon = L.default.divIcon({
          html: makeMarkerEl('naval', v.allegiance, true).outerHTML,
          iconSize: [30, 30], iconAnchor: [15, 15], className: '',
        });
        markersRef.current.push(
          L.default.marker([lat, lng], { icon })
            .addTo(map).bindPopup(vesselPopupHtml(v), { className: '' })
        );
      });
    });
  }

  function renderMapbox(assets: Asset[], vessels: Vessel[]) {
    import('mapbox-gl').then(mb => {
      const map = mapRef.current;
      if (!map) return;
      const mapboxgl = mb.default as any;

      // Point markers
      assets.forEach(a => {
        const allegiance = a.allegiance ?? (a.type === 'nuclear' ? 'Iran' : 'US');
        const el = makeMarkerEl(a.type, allegiance);
        const popup = new mapboxgl.Popup({ offset: 15, className: 'mapbox-tactical-popup' })
          .setHTML(popupHtml(a));
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([a.lng, a.lat])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
      });

      // Vessel tracks (Mapbox GeoJSON layers)
      vessels.forEach(v => {
        if (!v.track?.length) return;
        const coords = v.track.map(([lat, lng]) => [lng, lat]); // Mapbox is [lng, lat]

        if (showTracks && coords.length >= 2) {
          const srcId = `track-${v.id}`;
          const layId = `line-${v.id}`;
          map.addSource(srcId, {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} },
          });
          map.addLayer({
            id: layId, type: 'line', source: srcId,
            paint: {
              'line-color': v.allegiance === 'US' ? '#4a9eff' : '#ff3b3b',
              'line-width': 1.5,
              'line-opacity': 0.45,
              'line-dasharray': [2, 3],
            },
          });
          mbSourcesRef.current.push(srcId);
          mbLayersRef.current.push(layId);
        }

        // Current position marker
        const [lat, lng] = v.track[v.track.length - 1];
        const el = makeMarkerEl('naval', v.allegiance, true);
        const popup = new mapboxgl.Popup({ offset: 15, className: 'mapbox-tactical-popup' })
          .setHTML(vesselPopupHtml(v));
        markersRef.current.push(
          new mapboxgl.Marker({ element: el })
            .setLngLat([lng, lat])
            .setPopup(popup)
            .addTo(map)
        );
      });
    });
  }

  const toggleType = (t: AssetType) =>
    setActiveTypes(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });

  const ZOOM_PRESETS = [
    { label: 'REGION',      center: [26, 54],    zoom: 4.5 },
    { label: 'HORMUZ',      center: [26.5, 56.3], zoom: 7  },
    { label: 'GULF',        center: [26, 51],    zoom: 6   },
    { label: 'ARABIAN SEA', center: [20, 62],    zoom: 5   },
  ];

  const ov = (extra: React.CSSProperties): React.CSSProperties =>
    ({ position: 'absolute', zIndex: 1000, pointerEvents: 'auto', ...extra });

  return (
    <div className="panel relative" style={{ height: '420px' }}>

      {/* Layer + type filter — top-left */}
      <div style={ov({ top: 8, left: 8, minWidth: 88, maxWidth: 110 })} className="panel px-2 py-1.5 space-y-1">
        <div className="mono text-[9px] opacity-30 tracking-widest">LAYERS</div>
        {(['bases', 'iranian'] as const).map(l => (
          <label key={l} className="flex items-center gap-1 cursor-pointer mono text-[10px]">
            <input type="checkbox" checked={mapLayers[l]} onChange={() => toggleLayer(l)} className="accent-[#00ff88] w-3 h-3" />
            <span className="opacity-60 uppercase">{l}</span>
          </label>
        ))}
        <label className="flex items-center gap-1 cursor-pointer mono text-[10px]">
          <input type="checkbox" checked={showTracks} onChange={() => setShowTracks(v => !v)} className="accent-[#00ff88] w-3 h-3" />
          <span className="opacity-60">TRACKS</span>
        </label>

        <div className="mono text-[9px] opacity-30 tracking-widest pt-1 border-t border-[#1e3a5f]">TYPES</div>
        {ALL_TYPES.map(t => (
          <button
            key={t}
            onClick={() => toggleType(t)}
            className="flex items-center gap-1 w-full text-left mono text-[10px] transition-opacity"
            style={{ opacity: activeTypes.has(t) ? 1 : 0.25 }}
          >
            <span style={{ color: TYPE_COLOR[t], fontSize: 9 }}>■</span>
            <span className="opacity-80 uppercase">{t === 'infrastructure' ? 'INFRA' : t}</span>
          </button>
        ))}
      </div>

      {/* Zoom presets — bottom-right (no overlap with filters) */}
      <div style={ov({ bottom: 28, right: 8 })} className="flex flex-col gap-1">
        {ZOOM_PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => {
              if (!mapRef.current) return;
              if (useLeaflet) {
                mapRef.current.setView(p.center as [number, number], p.zoom);
              } else {
                mapRef.current.flyTo({ center: [p.center[1], p.center[0]], zoom: p.zoom });
              }
            }}
            className="mono text-[9px] border border-[#1e3a5f] px-1 py-0.5 rounded hover:border-[#00ff88] hover:text-[#00ff88] transition-colors bg-[#111827]"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Map source badge — bottom-left */}
      <div style={ov({ bottom: 8, left: 8 })} className="mono text-[9px] opacity-30">
        {useLeaflet ? 'OpenStreetMap / CARTO' : 'Mapbox Dark-v11'}
      </div>

      <div ref={mapContainer} style={{ width: '100%', height: '100%', borderRadius: '4px' }} />
    </div>
  );
}
