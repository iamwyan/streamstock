"use client";
import { useState } from "react";
import { money, priceFor, type Streamer } from "@/lib/market";
import { useStreamStock } from "@/lib/useStreamStock";

export default function TradeTicket({ streamer }: { streamer: Streamer }) {
  const app = useStreamStock();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [shares, setShares] = useState(1);
  const [limit, setLimit] = useState(priceFor(streamer).toFixed(2));
  const [message, setMessage] = useState("");
  const price = priceFor(app.state.streamers.find(s => s.ticker === streamer.ticker) || streamer);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = app.placeOrder(streamer.ticker, side, shares, orderType, Number(limit));
    setMessage(res.message);
  }
  return <form className="panel trade-ticket" onSubmit={submit}>
    <div className="panel-head"><h3>Trade {streamer.ticker}</h3><span>{money(price)}</span></div>
    <label>Side<select value={side} onChange={e => setSide(e.target.value as any)}><option value="buy">Buy</option><option value="sell">Sell</option></select></label>
    <label>Order Type<select value={orderType} onChange={e => setOrderType(e.target.value as any)}><option value="market">Market</option><option value="limit">Limit</option></select></label>
    <label>Shares<input type="number" min="1" value={shares} onChange={e => setShares(Number(e.target.value))}/></label>
    {orderType === "limit" && <label>Limit Price<input type="number" step="0.01" value={limit} onChange={e => setLimit(e.target.value)}/></label>}
    <div className="metric-tile"><span>Estimated Total</span><strong>{money(shares * price)}</strong></div>
    <button className="primary-btn" type="submit">Place {side} order</button>
    {message && <p className="muted">{message}</p>}
  </form>;
}
