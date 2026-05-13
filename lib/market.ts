export type Streamer = {
  name: string;
  ticker: string;
  followers: number;
  avgViewers: number;
  streamHours: number;
  recentGrowth: number;
  dayChange: number;
  netFlow: number;
  liquidity: number;
};

export type Position = { shares: number; averageCost: number };
export type Order = { id: string; ticker: string; side: "buy" | "sell"; orderType: "market" | "limit"; shares: number; price: number; status: string; createdAt: string };

export const STARTING_CASH = 10000;
export const DEFAULT_LIQUIDITY = 25000;
export const MAX_FLOW_MOVE = 0.65;

export const PRICE_WEIGHTS = {
  followers: 0.000025,
  avgViewers: 0.018,
  streamHours: 0.085,
  growth: 0.65
};

export const defaultStreamers: Streamer[] = [
  { name: "Kai Cenat", ticker: "KAI", followers: 15200000, avgViewers: 82000, streamHours: 178, recentGrowth: 12.4, dayChange: 8.24, netFlow: 4200, liquidity: 36000 },
  { name: "xQc", ticker: "XQC", followers: 12100000, avgViewers: 46000, streamHours: 132, recentGrowth: -1.7, dayChange: -2.15, netFlow: -1300, liquidity: 28000 },
  { name: "Pokimane", ticker: "POKI", followers: 9400000, avgViewers: 19000, streamHours: 64, recentGrowth: 3.8, dayChange: 3.4, netFlow: 1600, liquidity: 25000 },
  { name: "IShowSpeed", ticker: "SPEED", followers: 35000000, avgViewers: 118000, streamHours: 96, recentGrowth: 18.2, dayChange: 11.88, netFlow: 5200, liquidity: 30000 },
  { name: "Ludwig", ticker: "LUD", followers: 6400000, avgViewers: 24000, streamHours: 82, recentGrowth: 2.6, dayChange: 1.25, netFlow: 500, liquidity: 22000 },
  { name: "HasanAbi", ticker: "HASAN", followers: 2900000, avgViewers: 31000, streamHours: 190, recentGrowth: -4.2, dayChange: -4.7, netFlow: -2400, liquidity: 24000 },
  { name: "Ninja", ticker: "NINJA", followers: 19000000, avgViewers: 14500, streamHours: 58, recentGrowth: -2.1, dayChange: -1.35, netFlow: -650, liquidity: 21000 },
  { name: "Tarik", ticker: "TARIK", followers: 3500000, avgViewers: 53000, streamHours: 150, recentGrowth: 7.4, dayChange: 5.72, netFlow: 2100, liquidity: 24000 }
];

export function money(num: number) {
  return `$${Number(num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}
export function compact(num: number) { return Number(num || 0).toLocaleString(); }
export function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }

export function fundamentalsFor(streamer: Streamer) {
  const followerValue = Number(streamer.followers || 0) * PRICE_WEIGHTS.followers;
  const viewerValue = Number(streamer.avgViewers || 0) * PRICE_WEIGHTS.avgViewers;
  const hoursValue = Number(streamer.streamHours || 0) * PRICE_WEIGHTS.streamHours;
  const growthValue = Math.max(-20, Number(streamer.recentGrowth || 0)) * PRICE_WEIGHTS.growth;
  const base = Math.max(0.25, followerValue + viewerValue + hoursValue + growthValue);
  return { followerValue, viewerValue, hoursValue, growthValue, base };
}
export function priceFor(streamer: Streamer) {
  const base = fundamentalsFor(streamer).base;
  const multiplier = 1 + clamp(Number(streamer.netFlow || 0) / Number(streamer.liquidity || DEFAULT_LIQUIDITY), -MAX_FLOW_MOVE, MAX_FLOW_MOVE);
  return base * multiplier;
}

export function seedCandles(streamer: Streamer, interval = "1D", count = 80) {
  const now = Math.floor(Date.now() / 1000);
  const step = interval === "1m" ? 60 : interval === "5m" ? 300 : interval === "10m" ? 600 : interval === "30D" ? 86400 : 3600;
  let last = priceFor(streamer) * 0.92;
  return Array.from({ length: count }, (_, i) => {
    const drift = (Math.sin(i / 4) + Math.cos(i / 9)) * 0.01 + streamer.dayChange / 10000;
    const open = last;
    const close = Math.max(0.01, open * (1 + drift));
    const high = Math.max(open, close) * (1 + 0.012 + Math.random() * 0.012);
    const low = Math.min(open, close) * (1 - 0.012 - Math.random() * 0.012);
    last = close;
    return { time: now - (count - i) * step, open, high, low, close };
  });
}
