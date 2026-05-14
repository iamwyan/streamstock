"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useStreamStock } from "@/lib/useStreamStock";
import { compact, money, priceFor } from "@/lib/market";

const rivalNames = ["ClipWhale", "PurpleBull", "ChatAlpha", "CandleGoblin", "HypeCycle", "DipBuyer"];

export default function HomePage() {
  const app = useStreamStock();
  const [q, setQ] = useState("");

  const sorted = [...app.state.streamers];
  const gainers = [...sorted].sort((a, b) => b.dayChange - a.dayChange).slice(0, 4);
  const losers = [...sorted].sort((a, b) => a.dayChange - b.dayChange).slice(0, 4);
  const trending = [...sorted].sort((a, b) => priceFor(b) - priceFor(a)).slice(0, 4);
  const filtered = app.state.streamers.filter((s) => `${s.name} ${s.ticker}`.toLowerCase().includes(q.toLowerCase()));
  const marketCap = app.state.streamers.reduce((sum, s) => sum + priceFor(s) * 1_000_000, 0);
  const avgMove = app.state.streamers.reduce((sum, s) => sum + s.dayChange, 0) / Math.max(1, app.state.streamers.length);
  const totalVolume = app.state.streamers.reduce((sum, s) => sum + Math.abs(s.netFlow) * 18 + s.avgViewers * 12, 0);

  const leaderboard = useMemo(
    () => [
      { name: app.state.username, value: app.accountValue, tag: "You" },
      ...rivalNames.map((name, i) => ({
        name,
        value: 98000 - i * 9300 + Math.sin(i) * 2500,
        tag: i === 0 ? "Leader" : "Rival",
      })),
    ].sort((a, b) => b.value - a.value).slice(0, 6),
    [app.state.username, app.accountValue]
  );

  const yourRank = leaderboard.findIndex((u) => u.name === app.state.username) + 1 || 24;

  const MiniMarketRow = ({ s, rank }: { s: any; rank: number }) => (
    <Link className="home-mini-row" href={`/streamer/${s.ticker}`}>
      <span className="home-rank">#{rank}</span>
      <span className="avatar-dot">{s.ticker.slice(0, 1)}</span>
      <span className="home-streamer-name">
        <strong>{s.name}</strong>
        <em>{s.ticker} · {compact(s.avgViewers)} avg viewers</em>
      </span>
      <span className="home-price">
        <strong>{money(priceFor(s))}</strong>
        <em className={s.dayChange >= 0 ? "gain" : "loss"}>{s.dayChange >= 0 ? "+" : ""}{s.dayChange}%</em>
      </span>
    </Link>
  );

  return (
    <>
      <section className="home-command-center">
        <article className="panel home-hero-card">
          <div className="pill">Season 01 · streamer investing game</div>
          <h1>Invest in streamers. Race to the richest account.</h1>
          <p className="big-muted">
            StreamStock prices move from followers, average viewers, stream hours, recent growth, and market demand. Buy the breakout, sell the falloff, climb the board.
          </p>
          <div className="hero-actions">
            <Link className="primary-btn" href="#market">Open Market</Link>
            <Link className="secondary-btn" href="/portfolio">View Portfolio</Link>
          </div>
        </article>

        <aside className="panel account-snapshot-card">
          <div className="snapshot-top">
            <div>
              <p className="eyebrow">Your account</p>
              <strong className="snapshot-money">{money(app.accountValue)}</strong>
            </div>
            <span className="rank-chip">Rank #{yourRank}</span>
          </div>
          <div className="snapshot-grid">
            <div><span>Cash</span><b>{money(app.state.cash)}</b></div>
            <div><span>Return</span><b className={app.totalReturn >= 0 ? "gain" : "loss"}>{app.totalReturn >= 0 ? "+" : ""}{money(app.totalReturn)}</b></div>
            <div><span>Portfolio</span><b>{money(app.portfolioValue)}</b></div>
            <div><span>Positions</span><b>{Object.keys(app.state.positions).length}</b></div>
          </div>
        </aside>
      </section>

      <section className="home-metrics-grid">
        <article className="panel home-metric-card"><span>Total Stream Market</span><strong>{money(marketCap)}</strong><em className={avgMove >= 0 ? "gain" : "loss"}>{avgMove >= 0 ? "+" : ""}{avgMove.toFixed(2)}% avg today</em></article>
        <article className="panel home-metric-card"><span>24h Demand</span><strong>{money(totalVolume)}</strong><em>Fake currency flow</em></article>
        <article className="panel home-metric-card"><span>Active Tickers</span><strong>{app.state.streamers.length}</strong><em>Streamer stocks listed</em></article>
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
              <div className={u.name === app.state.username ? "home-leader-row you" : "home-leader-row"} key={u.name}>
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
              <b>{money(priceFor(s))}</b>
              <em className={s.dayChange >= 0 ? "gain" : "loss"}>{s.dayChange >= 0 ? "+" : ""}{s.dayChange}% today</em>
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
            <thead><tr><th>Streamer</th><th>Ticker</th><th>Followers</th><th>Avg Viewers</th><th>Price</th><th>Day</th><th></th></tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.ticker}>
                  <td><strong>{s.name}</strong></td>
                  <td><span className="ticker-badge">{s.ticker}</span></td>
                  <td>{compact(s.followers)}</td>
                  <td>{compact(s.avgViewers)}</td>
                  <td>{money(priceFor(s))}</td>
                  <td className={s.dayChange >= 0 ? "gain" : "loss"}>{s.dayChange >= 0 ? "+" : ""}{s.dayChange}%</td>
                  <td><Link className="row-btn" href={`/streamer/${s.ticker}`}>Trade</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
