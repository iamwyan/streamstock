# StreamStock

Fantasy stock-market prototype for Twitch streamers. Built as a static Vercel/GitHub site with fake currency, streamer tickers, portfolio pages, profile page, candlestick streamer detail pages, market and limit orders, and browser-based demo storage.

## Pages

- `index.html` — market overview, top gainers/losers, streamer table
- `streamer.html?ticker=KAI` — dedicated streamer stock page with candlestick chart, quote info, and trade ticket
- `portfolio.html` — user holdings, account value chart, open orders
- `profile.html` — user profile/account summary

## Pricing model

Each streamer now has a foundation price based on public-style streamer metrics:

`foundation = followers + average viewers + stream hours + recent growth`

In code, those values are weighted inside `PRICE_WEIGHTS` in `app.js`:

- `followers` = audience size foundation
- `avgViewers` = live attention / demand
- `streamHours` = consistency bonus
- `recentGrowth` = momentum bonus or penalty

The current market price then moves based on fake currency flowing into or out of that streamer:

`current price = foundation value × market demand multiplier`

Buying shares increases the streamer's `netFlow`, which can push the price up. Selling shares decreases `netFlow`, which can push the price down. Each streamer also has a `liquidity` value so larger streamers are harder to move.

## Adding tickers

Ticker adding is intentionally not user-facing. Edit the `defaultStreamers` array inside `app.js` to add or remove streamers. In a real production version, this would live behind an admin/backend dashboard connected to a database.

## Deploying

Upload these files to GitHub, then import the repo into Vercel. No build command is required.

## v5 updates
- Streamer detail page redesigned with a Fidelity-inspired brokerage layout.
- Large interactive candlestick chart uses Lightweight Charts from CDN.
- Timeframe buttons: 1m, 5m, 10m, Day, 30 Day.
- Chart supports mouse wheel zoom, drag scrolling, touch drag, and pinch zoom.
- Current quote/fundamental/flow information sits next to the candlestick chart.

## v8 updates
- Redesigned the interface into a Twitch-meets-brokerage style: purple streaming energy with a cleaner Fidelity-like market structure.
- Added a persistent light/dark mode toggle in the top header.
- Kept all existing features: market overview, separate profile, portfolio, leaderboard, streamer pages, candlestick chart, timeframe controls, market orders, and limit orders.
- Improved spacing, table readability, dropdown contrast, cards, trading layout, and mobile behavior.


## v9 UI cleanup
- Twitch + Fidelity inspired dashboard layout.
- Left rail navigation on desktop.
- Cleaner order ticket layout with no overflowing dropdowns/buttons.
- Top gainers/losers now display as balanced side-by-side panels.
- Dark mode defaults on first load; toggle still saves user preference.
- Current functionality retained: market, streamer detail pages, candlestick chart, buy/sell, portfolio, profile, leaderboard, local demo storage.


## v10 pricing update
- Rebuilt pricing around followers, average viewers, monthly stream hours, recent growth, and market demand.
- Removed subscriber-count-based pricing language from the UI.
- Streamer detail pages now show the new foundation metrics next to the candlestick chart.
