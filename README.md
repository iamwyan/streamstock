# StreamStock

Fantasy stock-market prototype for Twitch streamers. Built as a static Vercel/GitHub site with fake currency, streamer tickers, portfolio pages, profile page, candlestick streamer detail pages, market and limit orders, and browser-based demo storage.

## Pages

- `index.html` — market overview, top gainers/losers, streamer table
- `streamer.html?ticker=KAI` — dedicated streamer stock page with candlestick chart, quote info, and trade ticket
- `portfolio.html` — user holdings, account value chart, open orders
- `profile.html` — user profile/account summary

## Pricing model

Each streamer has a baseline/fundamental price from subscriber count:

`subscriber count × $0.0005`

The current market price then moves based on fake currency flowing into or out of that streamer:

`current price = fundamental value × market pressure multiplier`

Buying shares increases the streamer's `netFlow`, which can push the price up. Selling shares decreases `netFlow`, which can push the price down. Each streamer also has a `liquidity` value so larger streamers are harder to move.

## Adding tickers

Ticker adding is intentionally not user-facing. Edit the `defaultStreamers` array inside `app.js` to add or remove streamers. In a real production version, this would live behind an admin/backend dashboard connected to a database.

## Deploying

Upload these files to GitHub, then import the repo into Vercel. No build command is required.
