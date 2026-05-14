"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useStreamStock } from "@/lib/useStreamStock";
import { compact, money, priceFor } from "@/lib/market";

type Tab = "summary" | "positions" | "activity";

export default function PortfolioPage(){
  const app = useStreamStock();
  const [tab, setTab] = useState<Tab>("summary");
  const [range, setRange] = useState("1Y");
  const entries = Object.entries(app.state.positions);
  const accountValue = app.accountValue;
  const cash = app.state.cash;
  const portfolio = app.portfolioValue;
  const totalCost = entries.reduce((sum,[,pos]) => sum + pos.averageCost * pos.shares, 0);
  const returnPct = totalCost ? (app.totalReturn / totalCost) * 100 : 0;

  const positions = entries.map(([ticker,pos])=>{
    const s = app.state.streamers.find(x=>x.ticker===ticker);
    if(!s) return null;
    const p = priceFor(s);
    const value = p * pos.shares;
    const cost = pos.averageCost * pos.shares;
    const gain = value - cost;
    const gainPct = cost ? (gain / cost) * 100 : 0;
    return { ticker, pos, streamer:s, price:p, value, cost, gain, gainPct };
  }).filter(Boolean) as any[];

  const movers = useMemo(()=>{
    const held = positions.length ? positions.map(p=>p.streamer) : app.state.streamers;
    return [...held].sort((a,b)=>Math.abs(b.dayChange)-Math.abs(a.dayChange)).slice(0,6);
  }, [positions, app.state.streamers]);

  const orders = app.state.orders.slice(0, 10);

  return <div className="portfolio-rework">
    <section className="portfolio-topbar panel">
      <div>
        <p className="eyebrow">Portfolio</p>
        <h1>All accounts</h1>
        <p className="muted">Game account, streamer positions, open orders, and buying power.</p>
      </div>
      <div className="portfolio-money-strip">
        <div><span>Total value</span><strong>{money(accountValue)}</strong></div>
        <div><span>Cash</span><strong>{money(cash)}</strong></div>
        <div><span>Invested</span><strong>{money(portfolio)}</strong></div>
        <div><span>Total return</span><strong className={app.totalReturn>=0?"gain":"loss"}>{app.totalReturn>=0?"+":""}{money(app.totalReturn)}</strong></div>
      </div>
    </section>

    <nav className="account-tabs clean-tabs" aria-label="Portfolio sections">
      <button className={tab==="summary"?"active":""} onClick={()=>setTab("summary")}>Summary</button>
      <button className={tab==="positions"?"active":""} onClick={()=>setTab("positions")}>Positions</button>
      <button className={tab==="activity"?"active":""} onClick={()=>setTab("activity")}>Activity &amp; Orders</button>
    </nav>

    {tab === "summary" && <>
      <section className="portfolio-summary-layout">
        <article className="summary-card balance-card panel">
          <div className="card-heading"><h2>Balance</h2><span className="circle-info">i</span></div>
          <h3>{money(accountValue)}</h3>
          <p><span className={app.totalReturn>=0?"gain":"loss"}>{app.totalReturn>=0?"+":""}{money(app.totalReturn)} ({returnPct>=0?"+":""}{returnPct.toFixed(2)}%)</span> <span className="muted">total gain/loss</span></p>
          <div className="mini-performance-chart" aria-hidden="true"><svg viewBox="0 0 520 180" preserveAspectRatio="none"><path className="grid-line" d="M0 45H520M0 95H520M0 145H520"/><path className="chart-line" d="M0 135 C35 125, 55 150, 80 132 S125 118, 145 122 S175 38, 205 52 S260 62, 290 50 S340 70, 370 60 S420 100, 450 88 S485 45, 520 30"/></svg><div className="chart-axis"><span>30 days ago</span><span>{compact(Math.round(accountValue))}</span><span>Today</span></div></div>
          <div className="range-pills">{["1M","YTD","1Y","3Y"].map(r => <button key={r} type="button" className={range === r ? "active" : ""} onClick={() => setRange(r)}>{r}</button>)}</div>
          <button type="button" className="text-button" onClick={()=>setTab("positions")}>View all positions</button>
        </article>

        <article className="summary-card movers-card panel">
          <div className="card-heading stacked-heading"><div><h2>Your top and bottom movers</h2><p className="muted">Largest percentage moves from your holdings. No overlap, no text pileup.</p></div><button type="button" onClick={()=>setTab("positions")} className="row-btn small">Positions</button></div>
          <div className="movers-list clean-movers">
            {movers.map(s=><Link href={`/streamer/${s.ticker}`} className="mover-row-card" key={s.ticker}>
              <div className="symbol-cell"><span className="avatar-dot">{s.ticker.slice(0,1)}</span><div><strong>{s.ticker}</strong><span>{s.name}</span></div></div>
              <div className="mover-change"><span>Today</span><strong className={s.dayChange>=0?"gain":"loss"}>{s.dayChange>=0?"+":""}{s.dayChange}%</strong></div>
              <div className="mover-price"><span>Price</span><strong>{money(priceFor(s))}</strong></div>
            </Link>)}
          </div>
        </article>
      </section>

      <section className="portfolio-card-grid">
        <article className="panel mini-account-card"><span>Buying power</span><strong>{money(cash)}</strong><p className="muted">Available for market and limit orders.</p><Link className="primary-btn wide" href="/">Find streamers</Link></article>
        <article className="panel mini-account-card"><span>Positions</span><strong>{positions.length}</strong><p className="muted">Streamer stocks currently owned.</p><button type="button" className="secondary-btn wide" onClick={()=>setTab("positions")}>Open positions</button></article>
        <article className="panel mini-account-card"><span>Open orders</span><strong>{orders.filter(o=>o.status === "Open").length}</strong><p className="muted">Limit orders waiting to fill.</p><button type="button" className="secondary-btn wide" onClick={()=>setTab("activity")}>View activity</button></article>
      </section>
    </>}

    {tab === "positions" && <section id="positions" className="positions-panel panel reworked-positions">
      <div className="positions-toolbar"><div><h2>Positions</h2><p className="muted">Your streamer holdings and account weight.</p></div><select defaultValue="overview"><option value="overview">Overview</option><option value="performance">Performance</option><option value="fundamentals">Fundamentals</option></select></div>
      <div className="positions-table-wrap"><table className="positions-table cleaner-table"><thead><tr><th>Streamer</th><th>Price</th><th>Day</th><th>Shares</th><th>Avg cost</th><th>Current value</th><th>Total gain/loss</th><th>% account</th><th></th></tr></thead><tbody>
        <tr><td><strong>Cash</strong><br/><span className="muted">Buying power</span></td><td colSpan={4}></td><td>{money(cash)}</td><td></td><td>{accountValue?((cash/accountValue)*100).toFixed(2):"0.00"}%</td><td></td></tr>
        {positions.length ? positions.map(p=><tr key={p.ticker}><td><Link href={`/streamer/${p.ticker}`} className="table-name"><span className="avatar-dot">{p.ticker.slice(0,1)}</span><div><strong>{p.ticker}</strong><span>{p.streamer.name}</span></div></Link></td><td>{money(p.price)}</td><td className={p.streamer.dayChange>=0?"gain":"loss"}>{p.streamer.dayChange>=0?"+":""}{p.streamer.dayChange}%</td><td>{p.pos.shares}</td><td>{money(p.pos.averageCost)}</td><td>{money(p.value)}</td><td className={p.gain>=0?"gain":"loss"}>{p.gain>=0?"+":""}{money(p.gain)}<br/><span>{p.gainPct>=0?"+":""}{p.gainPct.toFixed(2)}%</span></td><td>{accountValue?((p.value/accountValue)*100).toFixed(2):"0.00"}%</td><td><Link className="row-btn small" href={`/streamer/${p.ticker}`}>Trade</Link></td></tr>) : <tr><td colSpan={9}><div className="empty-state">No positions yet. Open a streamer and place a trade to populate this page.</div></td></tr>}
        <tr className="total-row"><td><strong>Account total</strong></td><td colSpan={4}></td><td><strong>{money(accountValue)}</strong></td><td className={app.totalReturn>=0?"gain":"loss"}>{app.totalReturn>=0?"+":""}{money(app.totalReturn)}</td><td>100.00%</td><td></td></tr>
      </tbody></table></div>
    </section>}

    {tab === "activity" && <section className="activity-layout">
      <article className="panel activity-card"><div className="panel-head"><div><h2>Activity & Orders</h2><p className="muted">Recent market and limit order activity.</p></div><Link className="row-btn small" href="/">Trade more</Link></div>
        <div className="activity-list">
          {orders.length ? orders.map(o=><div className="activity-row" key={o.id}><div><strong>{o.side.toUpperCase()} {o.shares} {o.ticker}</strong><span>{o.orderType} order · {new Date(o.createdAt).toLocaleString()}</span></div><div><strong>{money(o.price)}</strong><span className={o.status === "Open" ? "warning" : "gain"}>{o.status}</span></div></div>) : <div className="empty-state">No limit orders yet. Market orders execute instantly and update your positions.</div>}
        </div>
      </article>
      <article className="panel activity-card"><h2>Quick notes</h2><div className="info-list"><div><span>Market orders</span><strong>Fill instantly</strong></div><div><span>Limit orders</span><strong>Stay open</strong></div><div><span>Leaderboard</span><strong>Based on net worth</strong></div></div></article>
    </section>}
  </div>
}
