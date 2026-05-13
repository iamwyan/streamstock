# StreamStock Next.js

This is the Next.js conversion of the StreamStock prototype.

It keeps the current features and layout, but moves the project into the structure you need for real login, saved user data, backend orders, Twitch API syncing, and live price updates.

## Run locally

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Deploy to Vercel

Push this folder to GitHub, then import the repo in Vercel.

Framework preset: **Next.js**

Build command:

```bash
npm run build
```

## Environment variables

Copy `.env.example` to `.env.local`.

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
```

## What is converted now

- App Router structure
- Separate pages:
  - `/`
  - `/portfolio`
  - `/profile`
  - `/leaderboard`
  - `/streamer/[ticker]`
  - `/login`
- Twitch + Fidelity style layout
- Dark/light theme toggle
- Interactive candlestick chart using `lightweight-charts`
- Buy/sell trade ticket
- Local saved portfolio state for testing
- API route scaffolds:
  - `/api/orders`
  - `/api/twitch/sync`
- Supabase client scaffold

## Next production steps

1. Create Supabase project.
2. Add Auth.
3. Create database tables: `profiles`, `streamers`, `streamer_metrics`, `holdings`, `orders`, `trades`, `price_candles`.
4. Move trade execution from local storage to `/api/orders`.
5. Connect `/api/twitch/sync` to Twitch API.
6. Use Supabase Realtime for live price/candle updates.
7. Remove all local demo storage once database orders are live.

## Pricing model

StreamStock price foundation:

```txt
Followers + Avg Viewers + Stream Hours + Recent Growth + Market Demand
```

Current implementation is in:

```txt
lib/market.ts
```
