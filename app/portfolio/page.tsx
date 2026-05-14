"use client";
import Link from "next/link";
import { useStreamStock } from "@/lib/useStreamStock";
import { compact, money, priceFor } from "@/lib/market";

export default function PortfolioPage(){
  const app=useStreamStock();
  const entries=Object.entries(app.state.positions);
  const topMovers=[...app.state.streamers].sort((a,b)=>Math.abs(b.dayChange)-Math.abs(a.dayChange)).slice(0,6);
  const accountValue=app.accountValue;
  const cash=app.state.cash;
  const portfolio=app.portfolioValue;
  return <div className="accounts-page">
    <aside className="accounts-sidebar panel">
      <div className="accounts-sidebar-head">
        <div><h2>Accounts</h2><p>As of today</p></div><div className="icon-pair"><span>⚙</span><span>⇤</span></div>
      </div>
      <div className="account-total-card"><span>All accounts</span><strong>{money(accountValue)}</strong></div>
      <div className="account-group"><h4>Investment</h4><div className="account-list-row"><div><strong>StreamStock Cash</strong><span>Buying power</span></div><div><strong>{money(cash)}</strong><span>Available</span></div></div></div>
      <div className="account-group"><h4>Fantasy Portfolio</h4><div className="account-list-row active"><div><strong>Streamer Holdings</strong><span>{entries.length} positions</span></div><div><strong>{money(portfolio)}</strong><span className={app.totalReturn>=0?"gain":"loss"}>{app.totalReturn>=0?"+":""}{money(app.totalReturn)}</span></div></div></div>
      <div className="sidebar-actions"><button className="plain-action">＋ Open an account</button><button className="plain-action">🔗 Link external account</button></div>
    </aside>

    <main className="accounts-main">
      <section className="accounts-title-row">
        <div><h1>All accounts</h1><p className="muted">Portfolio, positions, activity, and balances for your StreamStock account.</p></div>
      </section>
      <nav className="account-tabs"><Link className="active" href="/portfolio">Summary</Link><a>Positions</a><a>Activity & Orders</a><a>Balances</a><a>Documents</a><a>Planning</a><a>More (4)</a></nav>

      <section className="account-summary-grid">
        <article className="summary-card balance-card panel">
          <div className="card-heading"><h2>Balance</h2><span className="circle-info">i</span></div>
          <h3>{money(accountValue)}</h3>
          <p><span className={app.totalReturn>=0?"gain":"loss"}>{app.totalReturn>=0?"+":""}{money(app.totalReturn)} ({app.totalReturn>=0?"+":""}{accountValue ? ((app.totalReturn/Math.max(accountValue-app.totalReturn,1))*100).toFixed(2) : "0.00"}%)</span> <span className="muted">Today's gain/loss</span></p>
          <div className="mini-performance-chart" aria-hidden="true"><svg viewBox="0 0 520 180" preserveAspectRatio="none"><path className="grid-line" d="M0 45H520M0 95H520M0 145H520"/><path className="chart-line" d="M0 135 C35 125, 55 150, 80 132 S125 118, 145 122 S175 38, 205 52 S260 62, 290 50 S340 70, 370 60 S420 100, 450 88 S485 45, 520 30"/></svg><div className="chart-axis"><span>30 days ago</span><span>{compact(accountValue)}</span><span>Today</span></div></div>
          <div className="range-pills"><button>1M</button><button>YTD</button><button className="active">1Y</button><button>3Y</button></div>
          <Link className="text-link" href="/portfolio">View your performance</Link>
        </article>

        <article className="summary-card movers-card panel">
          <h2>Your top and bottom movers</h2>
          <div className="movers-header"><span>Symbol</span><span>Today's gain/loss</span><span>Last price</span></div>
          <div className="movers-list">{topMovers.map(s=><Link href={`/streamer/${s.ticker}`} className="mover-row" key={s.ticker}><div className="symbol-cell"><span className="avatar-dot">{s.ticker.slice(0,1)}</span><div><strong>{s.ticker}</strong><span>{s.name}</span></div></div><strong className={s.dayChange>=0?"gain":"loss"}>{s.dayChange>=0?"+":""}{s.dayChange}%</strong><span>{money(priceFor(s))}</span></Link>)}</div>
          <Link className="text-link" href="#positions">All positions</Link>
        </article>
      </section>

      <section id="positions" className="positions-panel panel">
        <div className="positions-toolbar"><select defaultValue="overview"><option value="overview">Overview</option><option value="performance">Performance</option><option value="fundamentals">Fundamentals</option></select><div className="toolbar-icons"><span>⌕</span><span>◉</span><span>↻</span><span>⋮</span></div></div>
        <div className="positions-table-wrap"><table className="positions-table"><thead><tr><th>Symbol</th><th>Last price</th><th>Last price change</th><th>Today's gain/loss $</th><th>Today's gain/loss %</th><th>Total gain/loss $</th><th>Total gain/loss %</th><th>Current value</th><th>% of account</th><th>Quantity</th><th>Average cost basis</th><th>Cost basis total</th><th>52-week range</th></tr></thead><tbody>
          <tr className="account-section-row"><td colSpan={13}><strong>Individual</strong> <span>StreamStock</span><br/><Link href="/profile">Profile settings</Link></td></tr>
          <tr><td><strong>Cash</strong><br/><span className="muted">HELD IN FCASH</span></td><td colSpan={6}></td><td>{money(cash)}</td><td>{accountValue?((cash/accountValue)*100).toFixed(2):"0.00"}%</td><td colSpan={4}></td></tr>
          {entries.length?entries.map(([ticker,pos])=>{const s=app.state.streamers.find(x=>x.ticker===ticker); if(!s)return null; const p=priceFor(s); const value=p*pos.shares; const gain=value-(pos.averageCost*pos.shares); const gainPct=pos.averageCost?((p-pos.averageCost)/pos.averageCost)*100:0; return <tr key={ticker}><td><Link href={`/streamer/${ticker}`}><strong>{ticker}</strong><br/><span>{s.name}</span></Link></td><td>{money(p)}</td><td className={s.dayChange>=0?"gain":"loss"}>{s.dayChange>=0?"+":""}{money(p*(s.dayChange/100))}</td><td className={s.dayChange>=0?"gain":"loss"}>{s.dayChange>=0?"+":""}{money(value*(s.dayChange/100))}</td><td className={s.dayChange>=0?"gain":"loss"}>{s.dayChange>=0?"+":""}{s.dayChange}%</td><td className={gain>=0?"gain":"loss"}>{gain>=0?"+":""}{money(gain)}</td><td className={gainPct>=0?"gain":"loss"}>{gainPct>=0?"+":""}{gainPct.toFixed(2)}%</td><td>{money(value)}</td><td>{accountValue?((value/accountValue)*100).toFixed(2):"0.00"}%</td><td>{pos.shares}</td><td>{money(pos.averageCost)}</td><td>{money(pos.averageCost*pos.shares)}</td><td><div className="range-bar"><span>{money(p*.65)}</span><i style={{left:`${Math.min(92,Math.max(8,50+s.dayChange*2))}%`}}></i><span>{money(p*1.35)}</span></div></td></tr>}):<tr><td colSpan={13}><div className="empty-state">No positions yet. Open a streamer and place a demo trade to populate this table.</div></td></tr>}
          <tr className="total-row"><td><strong>Account total</strong></td><td colSpan={2}></td><td className={app.totalReturn>=0?"gain":"loss"}>{app.totalReturn>=0?"+":""}{money(app.totalReturn)}</td><td></td><td className={app.totalReturn>=0?"gain":"loss"}>{app.totalReturn>=0?"+":""}{money(app.totalReturn)}</td><td></td><td><strong>{money(accountValue)}</strong></td><td colSpan={5}></td></tr>
        </tbody></table></div>
      </section>
    </main>
  </div>
}
