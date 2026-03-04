import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from './components/Layout/Header';
import MapView from './components/Map/MapView';
import NewsFeed from './components/NewsFeed/NewsFeed';
import EscalationGauge from './components/Escalation/EscalationGauge';
import PlayerPanel from './components/Players/PlayerPanel';
import AIAnalysis from './components/Analysis/AIAnalysis';
import EventTimeline from './components/Timeline/EventTimeline';
import SocialFeed from './components/Social/SocialFeed';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col gap-2 p-2 pb-4" style={{ background: '#0a0f1a', minHeight: '100vh' }}>

        {/* Row 1: Header */}
        <Header />

        {/* Row 2: Threat Assessment */}
        <EscalationGauge />

        {/* Row 3: Timeline */}
        <EventTimeline />

        {/* Row 4: Map + News Feed */}
        <div className="flex gap-2">
          <div className="flex-[6]">
            <MapView />
          </div>
          <div className="flex-[4]" style={{ height: '420px' }}>
            <NewsFeed />
          </div>
        </div>

        {/* Row 5: Players + AI Analysis + Social Signals */}
        <div className="flex gap-2">
          <div className="flex-[1]" style={{ minHeight: '320px' }}>
            <PlayerPanel />
          </div>
          <div className="flex-[1]" style={{ minHeight: '320px' }}>
            <AIAnalysis />
          </div>
          <div className="flex-[1]" style={{ minHeight: '320px' }}>
            <SocialFeed />
          </div>
        </div>

      </div>
    </QueryClientProvider>
  );
}
