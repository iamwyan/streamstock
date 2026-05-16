export const STARTING_CASH = 10000;

export type Streamer = {
  id?: string;
  ticker: string;

  name?: string;
  display_name?: string;
  twitch_login?: string;

  followers?: number | string;

  avgViewers?: number | string;
  avg_viewers?: number | string;

  streamHours?: number | string;
  stream_hours?: number | string;

  recentGrowth?: number | string;
  recent_growth?: number | string;

  market_demand?: number | string;

  current_price?: number | string;
  currentPrice?: number | string;
  price?: number | string;

  dayChange?: number | string;
  netFlow?: number | string;
  liquidity?: number | string;
};

export type Position = {
  ticker: string;
  shares: number;
  avgCost: number;
};

export type Order = {
  id: string;
  ticker: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  shares: number;
  price: number;
  total?: number;
  status?: "Open" | "Filled" | "Cancelled";
  createdAt: string;
};

export const defaultStreamers: Streamer[] = [];

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function compact(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

/**
 * Supabase is the source of truth.
 * This reads current_price from the streamers table.
 */
export function priceFor(streamer: Streamer | any) {
  return Number(
    streamer?.current_price ??
      streamer?.currentPrice ??
      streamer?.price ??
      0
  );
}

export function fundamentalsFor(streamer: Streamer) {
  const followers = Number(streamer.followers || 0);

  const avgViewers = Number(
    streamer.avg_viewers ?? streamer.avgViewers ?? 0
  );

  const streamHours = Number(
    streamer.stream_hours ?? streamer.streamHours ?? 0
  );

  const recentGrowth = Number(
    streamer.recent_growth ?? streamer.recentGrowth ?? 0
  );

  const demand = Number(streamer.market_demand ?? 0);

  return {
    base: priceFor(streamer),
    followers,
    avgViewers,
    streamHours,
    recentGrowth,
    demand,
  };
}

export function percentChange(current: number, previous: number) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

export function seedCandles(streamer: Streamer, interval = "1m") {
  const current = priceFor(streamer) || 1;
  const candles = [];
  const count = interval === "30D" ? 60 : interval === "1D" ? 48 : 80;

  let lastClose = current;

  for (let i = count; i > 0; i--) {
    const movement = (Math.random() - 0.48) * current * 0.012;
    const open = lastClose;
    const close = Math.max(0.01, open + movement);
    const high =
      Math.max(open, close) + Math.random() * current * 0.006;
    const low = Math.max(
      0.01,
      Math.min(open, close) - Math.random() * current * 0.006
    );

    candles.push({
      time: Math.floor(Date.now() / 1000) - i * 60,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
    });

    lastClose = close;
  }

  return candles;
}