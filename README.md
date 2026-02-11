# 🎬 Story Party

**Jackbox meets Bandersnatch.** Friends use their phones to make choices that drive an interactive story on a shared screen.

## Architecture

```
┌──────────────┐     WebSocket     ┌──────────────┐     WebSocket     ┌──────────────┐
│  Host Screen │ ◄───────────────► │   Colyseus   │ ◄───────────────► │    Phone     │
│  (TV/Browser)│                   │   Server     │                   │  Controller  │
│  Vercel      │                   │   Fly.io     │                   │   Vercel     │
└──────────────┘                   └──────────────┘                   └──────────────┘
```

- **`server/`** — Colyseus game server (Node.js/TypeScript) → Fly.io
- **`host/`** — TV/shared screen React app → Vercel
- **`player/`** — Phone controller React app → Vercel
- **`stories/`** — JSON story graphs
- **`shared/`** — Shared TypeScript types

## Quick Start (Local Dev)

```bash
# Install all dependencies
npm install
cd server && npm install && cd ..
cd host && npm install && cd ..
cd player && npm install && cd ..

# Run everything (3 terminals)
cd server && npm run dev    # → http://localhost:2567
cd host && npm run dev      # → http://localhost:3000
cd player && npm run dev    # → http://localhost:3001
```

Open `localhost:3000` on your TV/monitor (host screen).
Open `localhost:3001` on your phone (player controller).

## Deploy

### 1. Server → Fly.io

```bash
cd server
fly launch          # First time — creates the app
fly deploy          # Subsequent deploys
```

Note your server URL: `https://story-party-server.fly.dev`

### 2. Host → Vercel

```bash
cd host
# Set env var in Vercel dashboard:
# VITE_SERVER_URL=wss://story-party-server.fly.dev
# VITE_PLAYER_URL=https://story-party-player.vercel.app
vercel --prod
```

### 3. Player → Vercel

```bash
cd player
# Set env var in Vercel dashboard:
# VITE_SERVER_URL=wss://story-party-server.fly.dev
vercel --prod
```

## How It Works

1. Host opens host screen → creates a room with 4-letter code
2. Players scan QR or go to player URL + enter code
3. VIP (first player) picks a story and starts
4. Story plays on host screen with narrative text
5. At decision points, players vote on their phones (12 second timer)
6. Majority wins, ties broken randomly
7. Story branches based on votes → 6 possible endings

## The Last Supper 🔪

The included murder mystery story has:
- 12 decision points
- 6 endings (good, bad, neutral, secret)
- ~18 minutes of gameplay
- Multiple investigation paths
