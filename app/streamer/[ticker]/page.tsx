"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import StreamerChart from "@/components/StreamerChart";
import TradeTicket from "@/components/TradeTicket";
import { useStreamStock } from "@/lib/useStreamStock";
import { compact, fundamentalsFor, money, priceFor } from "@/lib/market";

export default function StreamerPage() {
  const { ticker } = useParams<{ticker:string}>();
  const app = useStreamStock();
  const streamer = app.state.streamers.find(s => s.ticker.toLowerCase() === ticker.toLowerCase());
  if (!streamer) return <section className="panel"><h1>Streamer not found</h1><Link className="primary-btn" href="/">Back to market</Link></section>;
  const f = fundamentalsFor(streamer);
  const p = priceFor(streamer);
  return <>
    <section className="panel full"><div className="panel-head wrap"><div><p className="eyebrow">{streamer.ticker}</p><h1>{streamer.name}</h1><p className="muted">Follower, viewership, consistency, growth, and demand-based streamer market.</p></div><div style={{textAlign:"right"}}><p className="muted">Current Price</p><h1>{money(p)}</h1><p className={streamer.dayChange>=0?"gain":"loss"}>{streamer.dayChange>=0?"+":""}{streamer.dayChange}% today</p></div></div></section>
    <section className="section-grid"><div className="panel full"><StreamerChart streamer={streamer}/></div><aside><div className="panel"><h3>Market Info</h3><div className="metric-grid"><div className="metric-tile"><span>Followers</span><strong>{compact(streamer.followers)}</strong></div><div className="metric-tile"><span>Avg Viewers</span><strong>{compact(streamer.avgViewers)}</strong></div><div className="metric-tile"><span>Stream Hours</span><strong>{streamer.streamHours}</strong></div><div className="metric-tile"><span>Recent Growth</span><strong className={streamer.recentGrowth>=0?"gain":"loss"}>{streamer.recentGrowth}%</strong></div><div className="metric-tile"><span>Market Demand</span><strong>{money(streamer.netFlow)}</strong></div><div className="metric-tile"><span>Base Value</span><strong>{money(f.base)}</strong></div></div></div><TradeTicket streamer={streamer}/></aside></section>
  </>;
}
