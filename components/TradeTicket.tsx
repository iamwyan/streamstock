"use client";

import { useMemo, useState } from "react";
import { money, priceFor, type Streamer } from "@/lib/market";
import { supabase } from "@/lib/supabaseClient";

export default function TradeTicket({ streamer }: { streamer: Streamer }) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [shares, setShares] = useState(1);
  const [limitPrice, setLimitPrice] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const price = priceFor(streamer);
  const estimatedTotal = useMemo(() => shares * price, [shares, price]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!Number.isFinite(shares) || shares <= 0) {
        setMessage("Enter a valid share amount.");
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setMessage("Please login first.");
        setLoading(false);
        return;
      }

      // Limit orders are still UI-only for now. Market orders execute instantly.
      // We keep the dropdown visible, but block limit orders until the backend order book is added.
      if (orderType === "limit") {
        setMessage("Limit orders are coming next. Use Market for now.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc("place_trade", {
        p_ticker: streamer.ticker,
        p_side: side,
        p_shares: shares,
      });

      if (error) {
        setMessage(error.message || "Trade failed.");
        setLoading(false);
        return;
      }

      const oldPrice = Number(data?.old_price ?? price);
      const newPrice = Number(data?.new_price ?? price);
      const total = Number(data?.total ?? estimatedTotal);

      setMessage(
        `${side === "buy" ? "Bought" : "Sold"} ${shares} ${streamer.ticker} @ ${money(
          oldPrice
        )}. New price: ${money(newPrice)}. Total: ${money(total)}`
      );

      // Let the rest of the app refresh current balance/price without a full manual refresh.
    } catch (err) {
      console.error(err);
      setMessage("Trade failed.");
    }

    setLoading(false);
  }

  return (
    <form className="panel trade-ticket" onSubmit={submit}>
      <div className="panel-head">
        <div>
          <h3>Trade {streamer.ticker}</h3>
          <p className="muted">Market orders execute instantly.</p>
        </div>
        <span>{money(price)}</span>
      </div>

      <label>
        Side
        <select value={side} onChange={(e) => setSide(e.target.value as "buy" | "sell")}>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
      </label>

      <label>
        Order Type
        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value as "market" | "limit")}
        >
          <option value="market">Market</option>
          <option value="limit">Limit</option>
        </select>
      </label>

      {orderType === "limit" && (
        <label>
          Limit Price
          <input
            type="number"
            min="0"
            step="0.01"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            placeholder="Coming soon"
          />
        </label>
      )}

      <label>
        Shares
        <input
          type="number"
          min="1"
          step="1"
          value={shares}
          onChange={(e) => setShares(Math.max(1, Number(e.target.value)))}
        />
      </label>

      <div className="metric-tile">
        <span>Estimated Total</span>
        <strong>{money(estimatedTotal)}</strong>
      </div>

      <button className="primary-btn" type="submit" disabled={loading}>
        {loading ? "Processing..." : `Place ${side} order`}
      </button>

      {message && <p className="muted">{message}</p>}
    </form>
  );
}
