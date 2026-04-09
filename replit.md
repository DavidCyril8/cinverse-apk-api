# CINEVERSE - Movie App Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains an Expo React Native mobile app (CINEVERSE) and an Express API server proxy.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 (api-server)
- **Mobile app**: Expo SDK 53, React Native, expo-router
- **Build**: esbuild (CJS bundle for API server)

## Artifacts

### CINEVERSE Mobile App (`artifacts/cineverse`)
Expo React Native app that mirrors the CINEVERSE website (cineverse.sbs / cineverse.name.ng).

**Color Scheme**: Teal/cyan primary (`#13CFCF`), dark background (`#141414`), card (`#1f1f1f`)

**Features**:
- 4-tab navigation: Home, Search, Trending, Downloads
- Auto-play hero carousel (5s interval) with movie poster, genres, year, overview
- Movie cards with badges: year (top-left), color-coded rating (top-right), Movie/Series type (bottom-left)
- Movie detail screen: backdrop + poster layout with season/episode selector for series
- Watchlist saved to AsyncStorage
- Streaming via GZMovieBox API
- Downloads tab: grouped by Movies / per-series sections, tap anywhere on completed row to play, real device storage bar via FileSystem, delete fallback scans both CINEVERSE/CINVERSE albums
- Search: suggestions dismiss on keyboard submit
- Force-update screen: auto-downloads APK with animated progress bar, triggers install intent
- First-launch permissions: all Android dangerous permissions requested on first launch
- Media library album: "CINEVERSE" (preserved per user request)
- **Offline/network indicator**: NetworkContext polls API every 12s; OfflineBanner slides in when offline
- **Image caching (expo-image)**: MovieCard, HeroCarousel, detail page all use `cachePolicy="memory-disk"`
- **Error retry button**: Detail page shows "Try Again" button on fetch error
- **Skeleton loading (detail page)**: Shimmer skeleton replaces spinner while details load
- **Trailer button**: Extracts `trailerUrl` from API; opens via Linking when present
- **Continue Watching / Resume**: Uses WatchHistory to show "Resume at X:XX" button; pre-selects season/episode
- **Search history**: SearchHistoryContext (AsyncStorage) shows recent searches with remove/clear-all
- **Download Season**: "All Episodes" button batch-queues every episode in a season for download
- **Onboarding screen**: 3-slide intro (Discover, Stream, Download) shown only on first launch (AsyncStorage flag)
- **Continue Watching row**: tracks positionMs/durationMs via WatchHistoryContext
- **Recommendations row**: "Because you liked X" based on watchlist genres
- **Genre filter chips on Search**: All/Action/Comedy/Horror/Romance/Thriller/Sci-Fi/Animation/Drama/Crime
- **Quality picker in player**: fetches all stream qualities, allows mid-playback quality change
- **Skip Intro button**: shown between 30s–5min of playback
- **Auto-play next episode**: 5-second countdown when episode ends for TV shows
- **Position saving**: every 15s + on close via WatchHistoryContext; resumes from saved position
- **Download quality selector**: QualitySheet modal before download starts
- **Storage indicator**: bar in Downloads tab showing GB used
- **App badge count**: shows active download count via setBadgeCountAsync
- **Animated splash**: CINEVERSE logo scale-in + tagline + fade-out on launch
- **Animated empty states**: floating/pulsing animations on Search + Downloads
- **LinearGradient shimmer**: skeleton loading cards use sliding shimmer effect
- **Download retry**: failed downloads show a teal refresh-cw button; `retryDownload()` clears old record and re-queues using stored `subjectId`/`detailPath`
- **Downloads sort**: Date/Name/Size pill toggles in header; uses `sortedDownloads` in FlatList
- **Episode download indicators**: colored dot on each episode button — teal = downloaded, amber = downloading
- **Player scrub preview**: time label floats above thumb while scrubbing the seek bar
- **Player aspect ratio toggle**: cycles CONTAIN → COVER → STRETCH with minimize/maximize/crop icon in bottom bar
- **Player volume/brightness gesture**: vertical swipe on left half adjusts brightness (expo-brightness), right half adjusts volume; floating HUD shows icon + fill bar + percentage

**APIs Used**:
- Homepage: `https://moviebox.davidcyril.name.ng/api/homepage` (BANNER + SUBJECTS_MOVIE)
- Trending: `https://moviebox.davidcyril.name.ng/api/trending`
- Search: `https://gzmovieboxapi.septorch.tech/api/search?apikey=Godszeal&query=...`
- Movie details: `https://gzmovieboxapi.septorch.tech/api/item-details?subjectId=...`
- Stream: `POST https://gzmovieboxapi.septorch.tech/api/stream` → MP4 proxy URLs (360p/480p/720p/1080p)

**API Strategy**: On mobile (native), calls APIs directly. On web, routes through the API server proxy at `/api/movies/*`.

**Streaming Architecture**:
- CDN videos are IP-locked; only accessible via `gzmovieboxapi.septorch.tech/api/proxy?url=...`
- The proxy was missing `Accept-Ranges` and `Content-Range` headers → ExoPlayer couldn't start playing
- Fix: API server `/api/movies/relay` endpoint intercepts Range requests, adds proper headers, streams through
- `makeRelayUrl()` in movieApi.ts wraps raw proxy URLs for streaming (not for downloads)
- For streaming: picks **lowest resolution (360p)** for fast buffering; for downloads: picks highest resolution
- File sizes cached in-memory on relay for fast repeated requests

**Environment**: `EXPO_PUBLIC_API_URL` in `artifacts/cineverse/.env` points to the Replit dev domain.

### API Server (`artifacts/api-server`)
Express proxy for CORS-safe movie API access on web.

- `GET /api/movies/homepage` → proxies to moviebox.davidcyril.name.ng
- `GET /api/movies/trending` → proxies to moviebox.davidcyril.name.ng
- `GET /api/movies/search?query=...` → proxies to gzmovieboxapi.septorch.tech
- `GET /api/movies/details?id=...` → proxies to gzmovieboxapi.septorch.tech
- `GET /api/movies/stream?id=...&season=...&episode=...` → proxies to gzmovieboxapi.septorch.tech
- `GET /api/movies/relay?url=ENCODED_URL` → streaming relay; fixes missing `Accept-Ranges`/`Content-Range` headers for ExoPlayer
- `HEAD /api/movies/relay?url=ENCODED_URL` → returns file size with proper headers

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/cineverse run dev` — run Expo app

## Key Files

- `artifacts/cineverse/constants/colors.ts` — design tokens (teal theme)
- `artifacts/cineverse/lib/movieApi.ts` — all API calls with mobile/web switching
- `artifacts/cineverse/app/(tabs)/_layout.tsx` — 4-tab navigation
- `artifacts/cineverse/app/(tabs)/index.tsx` — home screen with hero carousel
- `artifacts/cineverse/app/(tabs)/search.tsx` — search screen
- `artifacts/cineverse/app/(tabs)/trending.tsx` — trending grid
- `artifacts/cineverse/app/(tabs)/downloads.tsx` — My List/watchlist
- `artifacts/cineverse/app/movie/[id].tsx` — movie detail screen
- `artifacts/cineverse/components/HeroCarousel.tsx` — auto-play hero
- `artifacts/cineverse/components/MovieCard.tsx` — card with badges
- `artifacts/cineverse/components/MovieRow.tsx` — horizontal movie row
- `artifacts/cineverse/context/WatchlistContext.tsx` — watchlist state
- `artifacts/api-server/src/routes/movies.ts` — proxy routes
