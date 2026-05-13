# StreamStock

A clean static prototype for a fantasy Twitch streamer investing website.

## Features

- Fake currency trading dashboard
- Streamer tickers based on subscriber count
- Price formula: `1 subscriber = $0.0005` fake stock value
- Top gainers and losers
- User profile / portfolio view
- Buy and sell market orders
- Buy and sell limit orders
- Manual ticker manager
- Browser localStorage demo state
- Mobile and desktop responsive design

## How to edit streamer tickers

Open `app.js` and edit the `defaultStreamers` array:

```js
const defaultStreamers = [
  { name: "Kai Cenat", ticker: "KAI", subscribers: 165000, dayChange: 8.24 }
];
```

The app also includes an on-page ticker manager. Tickers added there are saved in your browser only.

## Deploy to Vercel

1. Upload this folder to a GitHub repo.
2. Go to Vercel.
3. Import the repo.
4. Framework preset: **Other** or **Static**.
5. Deploy.

No build command is required.

## Production notes

This is a front-end prototype. For real accounts, persistent users, admin-only ticker controls, leaderboards, and secure trading logic, connect it to a backend such as Supabase, Firebase, or a custom Node/Express API.
