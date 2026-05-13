"use client";
import { useEffect, useMemo, useState } from "react";
import { defaultStreamers, STARTING_CASH, priceFor, type Streamer, type Position, type Order } from "./market";

type State = { streamers: Streamer[]; cash: number; positions: Record<string, Position>; orders: Order[]; username: string };
const initial: State = { streamers: defaultStreamers, cash: STARTING_CASH, positions: {}, orders: [], username: "DemoTrader" };

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}
function write(key: string, value: unknown) { if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(value)); }

export function useStreamStock() {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<State>(initial);

  useEffect(() => {
    setState({
      streamers: read("ss_streamers", defaultStreamers),
      cash: read("ss_cash", STARTING_CASH),
      positions: read("ss_positions", {}),
      orders: read("ss_orders", []),
      username: read("ss_username", "DemoTrader")
    });
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    write("ss_streamers", state.streamers); write("ss_cash", state.cash); write("ss_positions", state.positions); write("ss_orders", state.orders); write("ss_username", state.username);
  }, [ready, state]);

  const portfolioValue = useMemo(() => Object.entries(state.positions).reduce((sum, [ticker, pos]) => {
    const s = state.streamers.find(x => x.ticker === ticker);
    return s ? sum + pos.shares * priceFor(s) : sum;
  }, 0), [state.positions, state.streamers]);

  const costBasis = useMemo(() => Object.values(state.positions).reduce((sum, p) => sum + p.shares * p.averageCost, 0), [state.positions]);

  function placeOrder(ticker: string, side: "buy" | "sell", shares: number, orderType: "market" | "limit" = "market", limitPrice?: number) {
    const qty = Math.max(0, Number(shares));
    if (!qty) return { ok: false, message: "Enter a share amount." };
    const streamer = state.streamers.find(s => s.ticker === ticker);
    if (!streamer) return { ok: false, message: "Streamer not found." };
    const price = priceFor(streamer);
    if (orderType === "limit" && limitPrice && ((side === "buy" && limitPrice < price) || (side === "sell" && limitPrice > price))) {
      const order: Order = { id: crypto.randomUUID(), ticker, side, orderType, shares: qty, price: limitPrice, status: "Open", createdAt: new Date().toISOString() };
      setState(s => ({ ...s, orders: [order, ...s.orders] }));
      return { ok: true, message: "Limit order placed." };
    }
    const total = qty * price;
    const current = state.positions[ticker] || { shares: 0, averageCost: 0 };
    if (side === "buy" && state.cash < total) return { ok: false, message: "Not enough buying power." };
    if (side === "sell" && current.shares < qty) return { ok: false, message: "Not enough shares." };
    const nextStreamers = state.streamers.map(s => s.ticker === ticker ? { ...s, netFlow: s.netFlow + (side === "buy" ? total : -total), dayChange: Number((s.dayChange + (side === "buy" ? 0.18 : -0.18)).toFixed(2)) } : s);
    const nextPositions = { ...state.positions };
    if (side === "buy") {
      const newShares = current.shares + qty;
      nextPositions[ticker] = { shares: newShares, averageCost: ((current.shares * current.averageCost) + total) / newShares };
    } else {
      const remaining = current.shares - qty;
      if (remaining <= 0) delete nextPositions[ticker]; else nextPositions[ticker] = { ...current, shares: remaining };
    }
    setState(s => ({ ...s, streamers: nextStreamers, cash: side === "buy" ? s.cash - total : s.cash + total, positions: nextPositions }));
    return { ok: true, message: `${side === "buy" ? "Bought" : "Sold"} ${qty} ${ticker}.` };
  }

  function reset() { setState(initial); localStorage.clear(); }
  function setUsername(username: string) { setState(s => ({ ...s, username })); }

  return { state, ready, portfolioValue, accountValue: state.cash + portfolioValue, totalReturn: portfolioValue - costBasis, placeOrder, reset, setUsername };
}
