"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useStreamStock } from "@/lib/useStreamStock";
import { compact, money, priceFor } from "@/lib/market";

const rivalNames = ["ClipWhale", "PurpleBull", "ChatAlpha", "CandleGoblin", "HypeCycle", "DipBuyer"];

export default function HomePage() {
  const app = useStreamStock();
  const [q, setQ] = useState("");
  const gainers = [...app.state.streamers].sort((a,b)=>b.dayChange-a.dayChange).slice(0,5);
  const losers = [...app.state.streamers].sort((a,b)=>a.dayChange-b.dayChange).slice(0,5);
  const filtered = app.state.streamers.filter(s => `${s.name} ${s.ticker}`.toLowerCase().includes(q.toLowerCase()));
  const leaderboard = useMemo(()=>[
    { name: app.state.username, value: app.accountValue, tag: "You" },
    ...rivalNames.map((name,i)=>({ name, value: 98000 - i * 9300 + Math.sin(i) * 2500, tag: i === 0 ? "Leader" : "Rival" }))
  ].sort((a,b)=>b.value-a.value).slice(0,6), [app.state.username, app.accountValue]);
  const yourRank = leaderboard.findIndex(u=>u.name===app.state.username) + 1 || 24;

  const Row = ({s}:{s:any}) => <Link className="market-row clickable-row roomy-row" href={`/streamer/${s.ticker}`}>
    <div className="ticker-name"><span className="avatar-dot">{s.ticker.slice(0,1)}</span><div><strong>{s.name}</strong><p className="muted">{s.ticker} · {compact(s.followers)} followers · {compact(s.avgViewers)} avg viewers</p></div></div>
    <div className="price-stack"><strong>{money(priceFor(s))}</strong><p className={s.dayChange>=0?"gain":"loss"}>{s.dayChange>=0?"+":""}{s.dayChange}%</p></div>
  </Link>;

  return <>
    <section className="game-hero">
      <div className="hero-copy game-copy">
        <div className="pill">Season 01 · streamer investing game</div>
        <h1>Build the richest StreamStock account.</h1>
        <p className="big-muted">Buy streamer momentum, sell the hype, and climb the leaderboard. Prices move from followers, average viewers, stream hours, recent growth, and market demand.</p>
        <div className="hero-actions"><Link className="primary-btn" href="#market">Start Trading</Link><Link className="secondary-btn" href="/leaderboard">View Leaderboard</Link></div>
      </div>
      <aside className="game-score-card panel">
        <div className="score-label">Your Account</div>
        <strong className="score-money">{money(app.accountValue)}</strong>
        <div className="score-grid"><div><span>Cash</span><b>{money(app.state.cash)}</b></div><div><span>Rank</span><b>#{yourRank || "--"}</b></div><div><span>Return</span><b className={app.totalReturn>=0?"gain":"loss"}>{app.totalReturn>=0?"+":""}{money(app.totalReturn)}</b></div><div><span>Positions</span><b>{Object.keys(app.state.positions).length}</b></div></div>
      </aside>
    </section>

    <section className="dashboard-grid">
      <article className="panel board-card">
        <div className="panel-head"><div><p className="eyebrow">Market pulse</p><h2>Top gainers</h2></div><span className="gain">Today</span></div>
        <div className="list-stack">{gainers.map(s=><Row key={s.ticker} s={s}/>)}</div>
      </article>
      <article className="panel board-card">
        <div className="panel-head"><div><p className="eyebrow">Risk board</p><h2>Top losers</h2></div><span className="loss">Today</span></div>
        <div className="list-stack">{losers.map(s=><Row key={s.ticker} s={s}/>)}</div>
      </article>
      <article className="panel leaderboard-mini leaderboard-card-clean">
        <div className="leaderboard-card-top">
          <div>
            <p className="eyebrow">Race to richest</p>
            <h2>Leaderboard</h2>
            <p className="muted">Top net-worth players this season.</p>
          </div>
          <Link className="top100-pill" href="/leaderboard">View Top 100</Link>
        </div>
        <div className="leader-mini-list clean-rank-list">{leaderboard.map((u,i)=><div className={u.name===app.state.username?"leader-mini-row you":"leader-mini-row"} key={u.name}><span>#{i+1}</span><strong title={u.name}>{u.name}</strong><b>{money(u.value)}</b></div>)}</div>
      </article>
    </section>

    <section className="panel full market-board" id="market">
      <div className="panel-head wrap roomy-head"><div><p className="eyebrow">Trade board</p><h2>Streamer Market</h2><p className="muted">Open a streamer to view candles, metrics, and place orders.</p></div><input className="search" value={q} onChange={e=>setQ(e.target.value)} type="search" placeholder="Search streamer or ticker..." /></div>
      <div className="table-wrap"><table><thead><tr><th>Streamer</th><th>Ticker</th><th>Followers</th><th>Avg Viewers</th><th>Price</th><th>Day</th><th></th></tr></thead><tbody>{filtered.map(s=><tr key={s.ticker}><td><strong>{s.name}</strong></td><td><span className="ticker-badge">{s.ticker}</span></td><td>{compact(s.followers)}</td><td>{compact(s.avgViewers)}</td><td>{money(priceFor(s))}</td><td className={s.dayChange>=0?"gain":"loss"}>{s.dayChange>=0?"+":""}{s.dayChange}%</td><td><Link className="row-btn" href={`/streamer/${s.ticker}`}>Trade</Link></td></tr>)}</tbody></table></div>
    </section>
  </>;
}
