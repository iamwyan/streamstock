"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useStreamStock } from "@/lib/useStreamStock";
import { compact, money, priceFor } from "@/lib/market";

const rivalNames = ["ClipWhale", "PurpleBull", "ChatAlpha", "CandleGoblin", "HypeCycle", "DipBuyer"];

type DbStreamer = {
  id?: string;
  ticker: string;
  display_name: string;
  twitch_login?: string | null;
  followers?: number | string | null;
  avg_viewers?: number | string | null;
  stream_hours?: number | string | null;
  recent_growth?: number | string | null;
  market_demand?: number | string | null;
  current_price?: number | string | null;
  profile_image_url?: string | null;
  liquidity?: number | string | null;
};

function mapStreamer(row: DbStreamer) {
  return {
    id: row.id,
    ticker: row.ticker,
    name: row.display_name,
    twitchLogin: row.twitch_login || row.ticker.toLowerCase(),
    followers: Number(row.followers || 0),
    avgViewers: Number(row.avg_viewers || 0),
    streamHours: Number(row.stream_hours || 0),
    recentGrowth: Number(row.recent_growth || 0),
    marketDemand: Number(row.market_demand || 0),
    netFlow: Number(row.market_demand || 0) * 100,
    dayChange: Number(row.recent_growth || 0),
    currentPrice: Number(row.current_price || 0),
    profileImageUrl: row.profile_image_url || null,
    liquidity: Number(row.liquidity || 250000),
  };
}

function streamerPrice(s: any) {
  if (typeof s.currentPrice === "number" && s.currentPrice > 0) return s.currentPrice;
  return priceFor(s);
}

function streamerLiquidity(s: any) {
  return Math.max(120000, Number(s.liquidity || 250000));
}

function shortMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function StreamerAvatar({ s }: { s: any }) {
  return (
    <div className="streamer-avatar streamer-avatar-image-wrap">
      <span className="streamer-avatar-fallback">{s.ticker?.slice(0, 1)}</span>
      {s.profileImageUrl && (
        <img
          className="streamer-avatar-img"
          src={s.profileImageUrl}
          alt={`${s.name} profile`}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
    </div>
  );
}

function StreamerProfileCard({ s }: { s: any }) {
  const isLive = Number(s.avgViewers || 0) > 0;

  return (
    <Link
      href={`/streamer/${s.ticker}`}
      className={isLive ? "panel streamer-profile-card is-live" : "panel streamer-profile-card"}
      title={`${s.name} (${s.ticker})`}
    >
      <div className="streamer-card-top">
        <div className="streamer-card-name">
          <StreamerAvatar s={s} />
          <div>
            <h3>{s.name}</h3>
            <p>{s.ticker}</p>
          </div>
        </div>

        <span className={isLive ? "live-pill live" : "live-pill offline"}>
          <span className="live-dot" />
          {isLive ? "LIVE" : "OFFLINE"}
        </span>
      </div>

      <div className="streamer-card-live-line">
        {isLive ? (
          <p className="live-viewers" style={{ margin: 0 }}>
            {compact(s.avgViewers)} viewers
          </p>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Not currently live
          </p>
        )}
      </div>

      <div className="streamer-card-price">
        <div>
          <strong>{money(streamerPrice(s))}</strong>
          <p className={s.dayChange >= 0 ? "gain" : "loss"}>
            {s.dayChange >= 0 ? "+" : ""}
            {Number(s.dayChange || 0).toFixed(2)}% today
          </p>
        </div>
      </div>

      <div className="streamer-stat-row">
        <div>
          <span>Viewers</span>
          <b>{compact(s.avgViewers)}</b>
        </div>
        <div>
          <span>Demand</span>
          <b>{Number(s.marketDemand || 0).toFixed(1)}</b>
        </div>
        <div>
          <span>Liquidity</span>
          <b title={money(streamerLiquidity(s))}>{shortMoney(streamerLiquidity(s))}</b>
        </div>
      </div>
    </Link>
  );
}

function MarketTickerTape({ streamers }: { streamers: any[] }) {
  const tickerItems = streamers
    .filter((s) => s?.ticker)
    .sort((a, b) => Math.abs(Number(b.dayChange || 0)) - Math.abs(Number(a.dayChange || 0)))
    .slice(0, 40);

  if (!tickerItems.length) return null;

  const loopItems = [...tickerItems, ...tickerItems];

  return (
    <section className="market-ticker-tape" aria-label="Streamer ticker tape">
      <div className="market-ticker-track">
        {loopItems.map((s, index) => {
          const move = Number(s.dayChange || 0);
          const isUp = move >= 0;

          return (
            <Link
              href={`/streamer/${s.ticker}`}
              className="market-ticker-item"
              key={`${s.ticker}-${index}`}
              title={`${s.name} ${isUp ? "+" : ""}${move.toFixed(2)}%`}
            >
              <strong>{s.ticker}</strong>
              <span>{money(streamerPrice(s))}</span>
              <em className={isUp ? "gain" : "loss"}>
                {isUp ? "+" : ""}{move.toFixed(2)}%
              </em>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function HomePage() {
  const app = useStreamStock();
  const [q, setQ] = useState("");
  const [streamers, setStreamers] = useState<any[]>([]);
  const [loadingMarket, setLoadingMarket] = useState(true);
  const [cashFlow24h, setCashFlow24h] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadCashFlow24h() {
      try {
        const res = await fetch("/api/market/24h-cash-flow", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`24h cash flow route failed: ${res.status}`);
        }

        const data = await res.json();

        if (!mounted) return;

        setCashFlow24h(Number(data.total || 0));
      } catch (err) {
        console.error("24h cash flow request failed:", err);
        if (mounted) setCashFlow24h(0);
      }
    }

    loadCashFlow24h();

    const interval = window.setInterval(loadCashFlow24h, 30000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadPriceChanges() {
      try {
        const res = await fetch("/api/market/price-changes", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`price changes route failed: ${res.status}`);
        }

        const data = await res.json();

        if (!mounted) return;

        const changes = data.changes || {};

        setStreamers((current) =>
          current.map((s) => {
            const change = changes[s.ticker];

            if (!change) return s;

            return {
              ...s,
              dayChange: Number(change.percent || 0),
              netFlow: Number(change.netFlow || 0),
            };
          })
        );
      } catch (err) {
        console.error("price changes request failed:", err);
      }
    }

    loadPriceChanges();

    const interval = window.setInterval(loadPriceChanges, 30000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadStreamers() {
      const { data, error } = await supabase
        .from("streamers")
        .select("id,ticker,display_name,twitch_login,followers,avg_viewers,stream_hours,recent_growth,market_demand,current_price,profile_image_url,liquidity")
        .order("current_price", { ascending: false });

      if (!mounted) return;

      if (error) {
        console.error("Error loading streamers:", error.message);
        setStreamers([]);
      } else {
        setStreamers((data || []).map(mapStreamer));
      }

      setLoadingMarket(false);
    }

    loadStreamers();

    const channel = supabase
      .channel("public:streamers-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "streamers" }, () =>
        loadStreamers()
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const sorted = [...streamers];
  const gainers = [...sorted].sort((a, b) => b.dayChange - a.dayChange).slice(0, 4);
  const losers = [...sorted].sort((a, b) => a.dayChange - b.dayChange).slice(0, 4);
  const trending = [...sorted].sort((a, b) => streamerPrice(b) - streamerPrice(a)).slice(0, 4);
  const featured = [...sorted]
    .sort((a, b) => {
      const liveDiff = Number(b.avgViewers > 0) - Number(a.avgViewers > 0);
      if (liveDiff) return liveDiff;
      return Number(b.dayChange || 0) - Number(a.dayChange || 0);
    })
    .slice(0, 12);

  const filtered = streamers.filter((s) =>
    `${s.name} ${s.ticker}`.toLowerCase().includes(q.toLowerCase())
  );

  const totalLiquidity = streamers.reduce((sum, s) => sum + streamerLiquidity(s), 0);
  const avgMove =
    streamers.reduce((sum, s) => sum + Number(s.dayChange || 0), 0) /
    Math.max(1, streamers.length);
  const totalVolume = streamers.reduce(
    (sum, s) => sum + Math.abs(Number(s.netFlow || 0)) * 18 + Number(s.avgViewers || 0) * 12,
    0
  );

  const leaderboard = useMemo(
    () =>
      [
        { name: app.state.username || "You", value: app.accountValue || 0, tag: "You" },
        ...rivalNames.map((name, i) => ({
          name,
          value: 98000 - i * 9300 + Math.sin(i) * 2500,
          tag: i === 0 ? "Leader" : "Rival",
        })),
      ]
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    [app.state.username, app.accountValue]
  );

  const MiniMarketRow = ({ s, rank }: { s: any; rank: number }) => (
    <Link className="home-mini-row" href={`/streamer/${s.ticker}`}>
      <span className="home-rank">#{rank}</span>
      <span className="avatar-dot">{s.ticker.slice(0, 1)}</span>
      <span className="home-streamer-name">
        <strong>{s.name}</strong>
        <em>
          {s.ticker} · {compact(s.avgViewers)} viewers
        </em>
      </span>
      <span className="home-price">
        <strong>{money(streamerPrice(s))}</strong>
        <em className={s.dayChange >= 0 ? "gain" : "loss"}>
          {s.dayChange >= 0 ? "+" : ""}
          {Number(s.dayChange || 0).toFixed(2)}%
        </em>
      </span>
    </Link>
  );

  return (
    <>
      <MarketTickerTape streamers={streamers} />

      <section className="home-command-center home-command-center-single">
        <article className="panel home-hero-card" style={{ gridColumn: "1 / -1" }}>
          <div className="pill">Season 01 · streamer investing game</div>
          <h1>Invest in streamers. Race to the richest account.</h1>
          <p className="big-muted">
            StreamStock prices move from followers, average viewers, stream hours, recent growth,
            and market demand. Buy the breakout, sell the falloff, climb the board.
          </p>
          <div className="hero-actions">
            <Link className="primary-btn" href="#market">
              Open Market
            </Link>
            <Link className="secondary-btn" href="/portfolio">
              View Portfolio
            </Link>
          </div>
        </article>
      </section>

      <section className="home-metrics-grid">
        <article className="panel home-metric-card">
          <span>Total Market Liquidity</span>
          <strong>{money(totalLiquidity)}</strong>
          <em className={avgMove >= 0 ? "gain" : "loss"}>
            {avgMove >= 0 ? "+" : ""}
            {avgMove.toFixed(2)}% avg today
          </em>
        </article>

        <article className="panel home-metric-card">
          <span>24h Demand</span>
          <strong>{money(cashFlow24h)}</strong>
          <em>Estimated Cash flow</em>
        </article>

        <article className="panel home-metric-card">
          <span>Active Tickers</span>
          <strong>{streamers.length}</strong>
          <em>{loadingMarket ? "Loading Supabase market..." : "Streamer stocks listed"}</em>
        </article>
      </section>

      <section className="panel full streamer-watch-panel">
        <div className="panel-head wrap roomy-head">
          <div>
            <p className="eyebrow">Featured</p>
            <h2>Featured Streamers</h2>
            <p className="muted">Watch live momentum, price movement, and creator demand in one quick view.</p>
          </div>
          <Link className="secondary-btn small" href="#market">See all</Link>
        </div>

        <div className="streamer-card-scroller" aria-label="Featured streamer cards">
          {featured.map((s) => (
            <StreamerProfileCard key={s.ticker} s={s} />
          ))}
        </div>
      </section>

      <section className="home-main-grid">
        <article className="panel home-board-card">
          <div className="panel-head">
            <div><p className="eyebrow">Market pulse</p><h2>Top gainers</h2></div>
            <span className="gain">Today</span>
          </div>
          <div className="home-list">{gainers.map((s, i) => <MiniMarketRow key={s.ticker} s={s} rank={i + 1} />)}</div>
        </article>

        <article className="panel home-board-card">
          <div className="panel-head">
            <div><p className="eyebrow">Risk board</p><h2>Top losers</h2></div>
            <span className="loss">Today</span>
          </div>
          <div className="home-list">{losers.map((s, i) => <MiniMarketRow key={s.ticker} s={s} rank={i + 1} />)}</div>
        </article>

        <article className="panel home-leaderboard-card">
          <div className="leaderboard-card-top v16-leader-top">
            <div>
              <p className="eyebrow">Race to richest</p>
              <h2>Leaderboard</h2>
              <p className="muted">Top fake-money traders this season.</p>
            </div>
            <Link className="top100-pill v16-top100" href="/leaderboard">Top 100</Link>
          </div>
          <div className="home-leader-list">
            {leaderboard.map((u, i) => (
              <div className={u.name === (app.state.username || "You") ? "home-leader-row you" : "home-leader-row"} key={u.name}>
                <span>#{i + 1}</span>
                <strong title={u.name}>{u.name}</strong>
                <b>{money(u.value)}</b>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel home-wide-card">
        <div className="panel-head wrap roomy-head">
          <div>
            <p className="eyebrow">Trending</p>
            <h2>Most valuable streamer stocks</h2>
          </div>
          <Link className="secondary-btn small" href="#market">See all</Link>
        </div>
        <div className="trending-strip">
          {trending.map((s) => (
            <Link href={`/streamer/${s.ticker}`} className="trend-card" key={s.ticker}>
              <span className="ticker-badge">{s.ticker}</span>
              <strong>{s.name}</strong>
              <b>{money(streamerPrice(s))}</b>
              <em className={s.dayChange >= 0 ? "gain" : "loss"}>{s.dayChange >= 0 ? "+" : ""}{Number(s.dayChange || 0).toFixed(2)}% today</em>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel full market-board home-market-table" id="market">
        <div className="panel-head wrap roomy-head">
          <div>
            <p className="eyebrow">Trade board</p>
            <h2>Streamer Market</h2>
            <p className="muted">Open a streamer to view candles, metrics, and place orders.</p>
          </div>
          <input className="search" value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Search streamer or ticker..." />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Streamer</th><th>Ticker</th><th>Status</th><th>Followers</th><th>Avg Viewers</th><th>Price</th><th>Day</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const isLive = Number(s.avgViewers || 0) > 0;
                return (
                  <tr key={s.ticker}>
                    <td><strong>{s.name}</strong></td>
                    <td><span className="ticker-badge">{s.ticker}</span></td>
                    <td><span className={isLive ? "live-pill live" : "live-pill offline"}><span className="live-dot" />{isLive ? "LIVE" : "OFFLINE"}</span></td>
                    <td>{compact(s.followers)}</td>
                    <td>{compact(s.avgViewers)}</td>
                    <td>{money(streamerPrice(s))}</td>
                    <td className={s.dayChange >= 0 ? "gain" : "loss"}>{s.dayChange >= 0 ? "+" : ""}{Number(s.dayChange || 0).toFixed(2)}%</td>
                    <td><Link className="row-btn" href={`/streamer/${s.ticker}`}>Trade</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}