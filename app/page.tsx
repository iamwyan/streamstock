"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { compact, money, priceFor } from "@/lib/market";

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
    current_price: Number(row.current_price || 0),
    currentPrice: Number(row.current_price || 0),
  };
}

function streamerPrice(s: any) {
  return priceFor(s);
}

function StreamerProfileCard({ s }: { s: any }) {
  const isLive = Number(s.avgViewers || 0) > 0;

  return (
    <Link
      href={`/streamer/${s.ticker}`}
      className={isLive ? "panel streamer-profile-card is-live" : "panel streamer-profile-card"}
    >
      <div className="streamer-card-top">
        <div className="streamer-card-name">
          <div className="streamer-avatar">{s.ticker.slice(0, 1)}</div>
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
          <span className="live-viewers">{compact(s.avgViewers)} viewers watching now</span>
        ) : (
          <span className="muted">Not currently live</span>
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
          <span>Followers</span>
          <b>{compact(s.followers)}</b>
        </div>
        <div>
          <span>Demand</span>
          <b>{Number(s.marketDemand || 0).toFixed(1)}</b>
        </div>
        <div>
          <span>Hours</span>
          <b>{Number(s.streamHours || 0)}</b>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [q, setQ] = useState("");
  const [streamers, setStreamers] = useState<any[]>([]);
  const [loadingMarket, setLoadingMarket] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadStreamers() {
      const { data, error } = await supabase
        .from("streamers")
        .select(
          "id,ticker,display_name,twitch_login,followers,avg_viewers,stream_hours,recent_growth,market_demand,current_price"
        )
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
      .on("postgres_changes", { event: "*", schema: "public", table: "streamers" }, () => loadStreamers())
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const gainers = [...streamers].sort((a, b) => b.dayChange - a.dayChange).slice(0, 4);
  const losers = [...streamers].sort((a, b) => a.dayChange - b.dayChange).slice(0, 4);
  const filtered = streamers.filter((s) => `${s.name} ${s.ticker}`.toLowerCase().includes(q.toLowerCase()));
  const marketCap = streamers.reduce((sum, s) => sum + streamerPrice(s) * 1_000_000, 0);
  const avgMove = streamers.reduce((sum, s) => sum + Number(s.dayChange || 0), 0) / Math.max(1, streamers.length);
  const totalDemand = streamers.reduce((sum, s) => sum + Math.abs(Number(s.netFlow || 0)) * 18 + Number(s.avgViewers || 0) * 12, 0);

  const MiniMarketRow = ({ s, rank }: { s: any; rank: number }) => (
    <Link className="home-mini-row" href={`/streamer/${s.ticker}`}>
      <span className="home-rank">#{rank}</span>
      <span className="avatar-dot">{s.ticker.slice(0, 1)}</span>
      <span className="home-streamer-name">
        <strong>{s.name}</strong>
        <em>{s.ticker} · {compact(s.avgViewers)} viewers</em>
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
      <section className="home-command-center home-command-center-single">
        <article className="panel home-hero-card">
          <div className="pill">Season 01 · streamer investing game</div>
          <h1>Invest in streamers. Race to the richest account.</h1>
          <p className="big-muted">
            StreamStock prices move from followers, average viewers, stream hours, recent growth,
            and market demand. Buy the breakout, sell the falloff, climb the board.
          </p>
          <div className="hero-actions">
            <Link className="primary-btn" href="#market">Open Market</Link>
            <Link className="secondary-btn" href="/portfolio">View Portfolio</Link>
          </div>
        </article>
      </section>

      <section className="panel full streamer-watch-panel">
        <div className="panel-head wrap roomy-head">
          <div>
            <p className="eyebrow">Streamer Watch</p>
            <h2>Streamer Market</h2>
            <p className="muted">Invest in creators as they rise. Live streamers move faster — momentum matters.</p>
          </div>
        </div>

        {loadingMarket ? (
          <div className="empty-state">Loading streamer market...</div>
        ) : (
          <div className="streamer-card-grid">
            {streamers.map((s) => <StreamerProfileCard key={s.ticker} s={s} />)}
          </div>
        )}
      </section>

      <section className="home-metrics-grid">
        <article className="panel home-metric-card">
          <span>Total Stream Market</span>
          <strong>{money(marketCap)}</strong>
          <em className={avgMove >= 0 ? "gain" : "loss"}>{avgMove >= 0 ? "+" : ""}{avgMove.toFixed(2)}% avg today</em>
        </article>
        <article className="panel home-metric-card">
          <span>24h Demand</span>
          <strong>{money(totalDemand)}</strong>
          <em>Fake currency flow</em>
        </article>
        <article className="panel home-metric-card">
          <span>Active Tickers</span>
          <strong>{streamers.length}</strong>
          <em>{loadingMarket ? "Loading Supabase market..." : "Streamer stocks listed"}</em>
        </article>
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
      </section>

      <section className="panel full market-board home-market-table" id="market">
        <div className="panel-head wrap roomy-head">
          <div>
            <p className="eyebrow">Trade board</p>
            <h2>All Streamer Stocks</h2>
            <p className="muted">Open a streamer to view candles, metrics, and place orders.</p>
          </div>
          <input className="search" value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Search streamer or ticker..." />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Streamer</th>
                <th>Ticker</th>
                <th>Status</th>
                <th>Followers</th>
                <th>Viewers</th>
                <th>Price</th>
                <th>Day</th>
                <th></th>
              </tr>
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
