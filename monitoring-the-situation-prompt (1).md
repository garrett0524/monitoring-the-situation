# Claude Code Prompt: "Monitoring the Situation"

## Copy everything below this line into Claude Code

---

Build a full-stack interactive web application called **"Monitoring the Situation"** — a real-time situational awareness dashboard focused on the US/Iran conflict. The app is designed for a general public audience: it should be informative and data-rich, but clean, intuitive, and accessible to non-experts.

## Tech Stack

- **Frontend:** React + Vite + TypeScript
- **Styling:** Tailwind CSS with a **dark military/tactical theme** (think deep navy/charcoal backgrounds, muted greens, amber/orange accents for alerts, monospace fonts for data readouts, subtle grid/scanline texture overlays)
- **Maps:** Mapbox GL JS (use the `dark-v11` base style, customized with military-style markers and overlays). If a Mapbox token is unavailable at runtime, fall back gracefully to Leaflet + OpenStreetMap with dark tiles
- **State Management:** Zustand
- **HTTP/Data Fetching:** TanStack Query (React Query)
- **Backend/API Layer:** Node.js + Express (lightweight API proxy to avoid CORS issues and keep API keys server-side)

## Layout: Single-Page Dashboard

Everything should be visible on one screen with no tab navigation. Use a dense but organized grid layout:

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: "MONITORING THE SITUATION" + Timestamp + Status │
├────────────────────────────┬────────────────────────────┤
│                            │  BREAKING NEWS FEED        │
│   INTERACTIVE MAP          │  (scrolling list, auto-    │
│   (60% width)              │   refreshing)              │
│   - US assets overlay      │                            │
│   - Regional bases         │  30% width                 │
│   - Strait of Hormuz       │                            │
├────────────────────────────┤────────────────────────────┤
│  ESCALATION GAUGE    │ KEY PLAYERS  │ AI ANALYSIS PANEL │
│  (DEFCON-style)      │  (profiles)  │ (Claude-powered)  │
├──────────────────────┴──────────────┴───────────────────┤
│  EVENT TIMELINE (horizontal scrolling, chronological)    │
└─────────────────────────────────────────────────────────┘
```

Make the layout fully responsive. On mobile, stack panels vertically in this priority order: Escalation Gauge → Map → Breaking News → AI Analysis → Key Players → Timeline.

## Feature 1: Interactive Map

The centerpiece of the dashboard. Build this with multiple toggleable layers:

### US Military Assets Layer
- Display known/reported positions of US Navy carrier strike groups, destroyers, submarines (when surfaced/reported), and aircraft (patrol routes)
- Use distinct military-style icons for each asset type (carrier icon, sub icon, aircraft icon, etc.)
- Each marker should have a popup with: asset name, type, last known position, source of the data, and timestamp
- Data source architecture: Create a `/api/assets` endpoint that aggregates from:
  - **ADS-B Exchange API** or **OpenSky Network API** for military aircraft tracking (filter for known US military transponder ranges)
  - **MarineTraffic AIS data** or **VesselFinder API** for naval vessel positions
  - **Manual/curated dataset** (JSON file) for known base locations and assets that don't broadcast positions — this serves as the baseline and should be pre-populated with known US bases in the region (Al Udeid, Al Dhafra, Bahrain 5th Fleet HQ, Camp Arifjan, etc.)
- Include a "last updated" indicator per layer

### Regional Context Layer
- Permanent overlay showing: US military bases in the Gulf region, Iranian military installations (known), the Strait of Hormuz chokepoint with shipping lane visualization, and oil infrastructure markers
- Color-code by allegiance: blue for US/allied, red for Iranian, neutral/gray for civilian infrastructure
- Add a semi-transparent range ring around key Iranian missile sites showing approximate strike radius

### Iranian Assets Layer (when available)
- Known Iranian naval positions, IRGC bases, missile sites
- Sourced from OSINT data and curated datasets

### Controls
- Layer toggle panel (checkboxes for each layer)
- Zoom presets: "Full Region", "Strait of Hormuz", "Persian Gulf", "Arabian Sea"
- Distance measurement tool
- Fullscreen toggle for the map

## Feature 2: Breaking News Feed

A constantly updating news panel on the right side of the dashboard.

### Data Sources (use ALL three, deduplicated):
1. **RSS Feeds** (primary, no API key needed): Parse feeds from Reuters, AP News, BBC, Al Jazeera — filter for keywords: "Iran", "US military", "Persian Gulf", "Strait of Hormuz", "CENTCOM", "IRGC", "Middle East tensions"
2. **NewsAPI.org**: Query the `/everything` endpoint with relevant keywords. Requires API key (store in `.env`)
3. **GNews API**: Secondary source, query with same keywords. Requires API key (store in `.env`)

### Feed Behavior:
- Auto-refresh every 60 seconds (configurable)
- Show a pulsing "LIVE" indicator when auto-refresh is active
- Each news item shows: headline, source, timestamp (relative, e.g., "12 min ago"), and a brief excerpt
- Click to expand full excerpt + link to original source
- Deduplicate across sources (fuzzy match on headlines)
- Color-code urgency: red border for items containing "attack", "strike", "escalation", "war"; amber for "deployment", "sanctions", "warning"; default for everything else
- Add a manual "refresh now" button
- Show total article count and source breakdown

### Backend:
- `/api/news` endpoint handles all three sources, deduplicates, and returns a unified feed
- Cache results for 2 minutes to avoid rate limits
- Include a `severity` field computed from keyword analysis

## Feature 3: Escalation Gauge / Threat Meter

A visual DEFCON-style escalation indicator.

### Design:
- Vertical or semicircular gauge with 5 levels:
  - **Level 1 (Green):** "Stable" — routine posturing, no unusual activity
  - **Level 2 (Yellow):** "Elevated" — increased rhetoric, troop movements
  - **Level 3 (Orange):** "High" — direct threats, asset repositioning, sanctions escalation
  - **Level 4 (Red):** "Severe" — proxy attacks, direct confrontation, military mobilization
  - **Level 5 (Flashing Red):** "Critical" — active hostilities, strikes confirmed
- Animate transitions between levels with a smooth sweep
- Show the current level prominently with a glowing indicator
- Below the gauge, show 3-5 bullet points explaining WHY the current level is set (sourced from recent events)

### Data Logic:
- Compute the level from a weighted scoring algorithm based on:
  - Number and severity of recent news articles (from the news feed)
  - Keywords detected (weighted: "strike" > "deployment" > "rhetoric")
  - Rate of change (sudden spike in articles = escalation signal)
  - Manual override capability (admin can pin a level)
- Expose as `/api/escalation` endpoint
- Update every time the news feed refreshes

## Feature 4: Event Timeline

A horizontal, scrollable timeline of key events in the conflict.

### Design:
- Horizontal scrolling bar at the bottom of the dashboard
- Each event is a node on the timeline with: date, title, category icon, and brief description
- Categories: Military (crosshair icon), Diplomatic (handshake icon), Economic/Sanctions (dollar icon), Cyber (terminal icon), Humanitarian (heart icon)
- Color-code nodes by escalation impact: red (escalatory), green (de-escalatory), gray (neutral)
- Click a node to expand details + link to source
- "Today" marker with a pulsing indicator
- Auto-scroll to the most recent events on load

### Data:
- Pre-populate with key historical events (JSON file) going back to the 2020 Soleimani strike through present
- New events are automatically added from the news feed when they meet a significance threshold
- `/api/timeline` endpoint serves the merged historical + live events

## Feature 5: Key Players Panel

Profile cards for major decision-makers.

### Include:
- **US side:** President, Secretary of Defense, Secretary of State, CENTCOM Commander, Chairman of the Joint Chiefs
- **Iran side:** Supreme Leader, President, IRGC Commander, Foreign Minister, Navy Commander

### Each Card Shows:
- Name, title, photo (use a placeholder silhouette if no image available)
- Most recent relevant public statement or action (pulled from news feed or curated)
- A "hawkish ↔ dovish" stance indicator based on recent rhetoric
- Click to expand full bio + recent activity feed

### Data:
- Curated JSON file with bios and photos
- Recent statements auto-populated from the news feed (name matching)
- `/api/players` endpoint

## Feature 6: AI Analysis Panel (Claude-Powered)

An AI-generated situational assessment using the Anthropic API.

### Behavior:
- On page load and every 15 minutes, send the latest news headlines + current escalation data to the Claude API (claude-sonnet-4-5-20250514)
- Prompt Claude to generate:
  1. A 2-3 sentence **situation summary** (what's happening right now)
  2. A **risk assessment** (1-2 sentences on what could happen next)
  3. **Key developments to watch** (3 bullet points)
  4. An **escalation probability** (Low / Medium / High / Critical with brief reasoning)
- Display in a panel with a subtle "AI-generated" badge
- Include a "Refresh Analysis" button for on-demand updates
- Show the timestamp of the last analysis

### Backend:
- `/api/analysis` endpoint calls the Anthropic API
- System prompt should instruct Claude to be factual, measured, avoid sensationalism, cite the sources from the news feed, and caveat uncertainty
- Cache the result for 15 minutes
- API key stored in `.env` as `ANTHROPIC_API_KEY`

## Feature 7: Regional Impact View

Integrated into the map as a toggleable overlay.

### Shows:
- Strait of Hormuz shipping lane with daily tanker traffic volume indicator
- Oil price ticker (use a free oil/commodity API or scrape)
- Nearby allied nations highlighted with their base contributions
- Estimated shipping disruption zone if the Strait were blocked
- Major oil infrastructure (refineries, pipelines, export terminals) in the Gulf region

## Global UI/UX Requirements

### Dark Tactical Theme:
- Background: `#0a0f1a` (deep navy-black)
- Panel backgrounds: `#111827` with subtle `1px` border in `#1e3a5f`
- Primary text: `#e0e7ef` (off-white)
- Accent: `#00ff88` (tactical green) for positive indicators
- Warning: `#ff9500` (amber)
- Danger: `#ff3b3b` (red)
- Fonts: `"JetBrains Mono"` for data/numbers, `"Inter"` for body text
- Subtle CSS scanline overlay effect on the header (optional, toggle-able)
- All panels should have a slight `backdrop-blur` and `box-shadow` for depth

### Header:
- App title with a subtle radar sweep animation or pulsing dot
- Current UTC time (updating every second) and local time
- "System Status" indicator (green = all feeds operational, yellow = partial, red = outage)
- Data freshness indicator ("Last update: 45 seconds ago")

### Performance:
- Lazy load map tiles and heavy components
- Virtual scrolling for the news feed if > 50 items
- WebSocket or SSE for real-time updates if feasible, otherwise polling
- Target < 3s initial load time

## Environment Variables (.env.example)

```
MAPBOX_TOKEN=your_mapbox_token
NEWSAPI_KEY=your_newsapi_key
GNEWS_API_KEY=your_gnews_key
ANTHROPIC_API_KEY=your_anthropic_key
ADSB_API_KEY=your_adsb_key (optional)
PORT=3001
VITE_API_URL=http://localhost:3001
```

## File Structure

```
monitoring-the-situation/
├── client/                    # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map/           # MapView, AssetMarker, LayerControls
│   │   │   ├── NewsFeed/      # NewsFeed, NewsCard, LiveIndicator
│   │   │   ├── Escalation/    # EscalationGauge, LevelExplainer
│   │   │   ├── Timeline/      # EventTimeline, EventNode
│   │   │   ├── Players/       # PlayerPanel, PlayerCard
│   │   │   ├── Analysis/      # AIAnalysis, AnalysisBadge
│   │   │   ├── Regional/      # RegionalOverlay, OilTicker
│   │   │   └── Layout/        # Header, Dashboard, StatusBar
│   │   ├── hooks/             # Custom hooks for data fetching
│   │   ├── stores/            # Zustand stores
│   │   ├── utils/             # Helpers, formatters, keyword analysis
│   │   ├── data/              # Static JSON (bases, players, historical timeline)
│   │   ├── styles/            # Global CSS, theme variables
│   │   └── App.tsx
│   └── vite.config.ts
├── server/                    # Express backend
│   ├── routes/
│   │   ├── news.ts            # /api/news — aggregated feed
│   │   ├── assets.ts          # /api/assets — military positions
│   │   ├── escalation.ts      # /api/escalation — threat level
│   │   ├── timeline.ts        # /api/timeline — event history
│   │   ├── players.ts         # /api/players — key figures
│   │   └── analysis.ts        # /api/analysis — Claude AI summary
│   ├── services/
│   │   ├── rss.ts             # RSS feed parser
│   │   ├── newsapi.ts         # NewsAPI client
│   │   ├── gnews.ts           # GNews client
│   │   ├── deduplication.ts   # Fuzzy headline matching
│   │   ├── severity.ts        # Keyword-based severity scoring
│   │   └── anthropic.ts       # Claude API client
│   ├── data/
│   │   ├── bases.json         # US/allied bases in the region
│   │   ├── iranian-sites.json # Known Iranian military sites
│   │   ├── players.json       # Key players bios
│   │   └── timeline.json      # Historical events
│   └── index.ts
├── .env.example
├── package.json
└── README.md
```

## Getting Started

After scaffolding, the app should be runnable with:

```bash
npm install
cp .env.example .env  # User fills in API keys
npm run dev            # Starts both client (Vite) and server (Express) concurrently
```

## Important Notes

- **No mock data fallbacks in production** — if an API is down, show a clear "Source unavailable" message in the relevant panel rather than fake data
- **Source attribution everywhere** — every piece of data should show where it came from
- **Responsible framing** — the AI analysis panel and escalation gauge should include disclaimers that these are automated assessments, not intelligence products
- **Rate limit awareness** — NewsAPI free tier is limited; implement caching and backoff
- **Accessibility** — all interactive elements should be keyboard navigable, all images should have alt text, color is never the sole indicator (use icons + color)
