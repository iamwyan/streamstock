"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { money } from "@/lib/market";

type Tab = "summary" | "positions" | "activity";

export default function PortfolioPage() {
  const [tab, setTab] = useState<Tab>("summary");
  const [range, setRange] = useState("1Y");
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<any>(null);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);

  useEffect(() => {
    loadPortfolio();
  }, []);

  async function loadPortfolio() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const { data: holdingData } = await supabase
      .from("holdings")
      .select(`
        *,
        streamers (
          id,
          ticker,
          display_name,
          current_price,
          followers,
          avg_viewers,
          stream_hours,
          recent_growth,
          market_demand
        )
      `)
      .eq("user_id", user.id);

    const { data: tradeData } = await supabase
      .from("trades")
      .select(`
        *,
        streamers (
          ticker,
          display_name
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setProfile(profileData);
    setHoldings(holdingData || []);
    setTrades(tradeData || []);
    setLoading(false);
  }

  const cash = Number(profile?.cash_balance || 0);

  const positions = holdings.map((h) => {
    const streamer = h.streamers;
    const shares = Number(h.shares || 0);
    const avgCost = Number(h.average_cost || 0);
    const price = Number(streamer?.current_price || 0);
    const value = shares * price;
    const cost = shares * avgCost;
    const gain = value - cost;
    const gainPct = cost ? (gain / cost) * 100 : 0;

    return {
      id: h.id,
      ticker: streamer?.ticker,
      name: streamer?.display_name,
      shares,
      avgCost,
      price,
      value,
      cost,
      gain,
      gainPct,
    };
  });

  const portfolioValue = positions.reduce((sum, p) => sum + p.value, 0);
  const totalCost = positions.reduce((sum, p) => sum + p.cost, 0);
  const totalReturn = portfolioValue - totalCost;
  const accountValue = cash + portfolioValue;
  const returnPct = totalCost ? (totalReturn / totalCost) * 100 : 0;

  const movers = useMemo(() => {
    return [...positions]
      .sort((a, b) => Math.abs(b.gainPct) - Math.abs(a.gainPct))
      .slice(0, 6);
  }, [positions]);

  if (loading) {
    return (
      <div className="portfolio-rework">
        <section className="panel">
          Loading portfolio...
        </section>
      </div>
    );
  }

  return (
    <div className="portfolio-rework">
      <section className="portfolio-topbar panel">
        <div>
          <p className="eyebrow">Portfolio</p>
          <h1>All accounts</h1>
          <p className="muted">Your real StreamStock holdings, trades, and buying power.</p>
        </div>

        <div className="portfolio-money-strip">
          <div>
            <span>Total value</span>
            <strong>{money(accountValue)}</strong>
          </div>
          <div>
            <span>Cash</span>
            <strong>{money(cash)}</strong>
          </div>
          <div>
            <span>Invested</span>
            <strong>{money(portfolioValue)}</strong>
          </div>
          <div>
            <span>Total return</span>
            <strong className={totalReturn >= 0 ? "gain" : "loss"}>
              {totalReturn >= 0 ? "+" : ""}
              {money(totalReturn)}
            </strong>
          </div>
        </div>
      </section>

      <nav className="account-tabs clean-tabs">
        <button className={tab === "summary" ? "active" : ""} onClick={() => setTab("summary")}>
          Summary
        </button>
        <button className={tab === "positions" ? "active" : ""} onClick={() => setTab("positions")}>
          Positions
        </button>
        <button className={tab === "activity" ? "active" : ""} onClick={() => setTab("activity")}>
          Activity &amp; Orders
        </button>
      </nav>

      {tab === "summary" && (
        <>
          <section className="portfolio-summary-layout">
            <article className="summary-card balance-card panel">
              <div className="card-heading">
                <h2>Balance</h2>
              </div>

              <h3>{money(accountValue)}</h3>

              <p>
                <span className={totalReturn >= 0 ? "gain" : "loss"}>
                  {totalReturn >= 0 ? "+" : ""}
                  {money(totalReturn)} ({returnPct >= 0 ? "+" : ""}
                  {returnPct.toFixed(2)}%)
                </span>{" "}
                <span className="muted">total gain/loss</span>
              </p>

              <div className="mini-performance-chart">
                <svg viewBox="0 0 520 180" preserveAspectRatio="none">
                  <path className="grid-line" d="M0 45H520M0 95H520M0 145H520" />
                  <path
                    className="chart-line"
                    d="M0 135 C35 125, 55 150, 80 132 S125 118, 145 122 S175 38, 205 52 S260 62, 290 50 S340 70, 370 60 S420 100, 450 88 S485 45, 520 30"
                  />
                </svg>
              </div>

              <div className="range-pills">
                {["1M", "YTD", "1Y", "3Y"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={range === r ? "active" : ""}
                    onClick={() => setRange(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <button type="button" className="text-button" onClick={() => setTab("positions")}>
                View all positions
              </button>
            </article>

            <article className="summary-card movers-card panel">
              <div className="card-heading stacked-heading">
                <div>
                  <h2>Your top and bottom movers</h2>
                  <p className="muted">Based on your real holdings.</p>
                </div>
              </div>

              <div className="movers-list clean-movers">
                {movers.length ? (
                  movers.map((p) => (
                    <Link href={`/streamer/${p.ticker}`} className="mover-row-card" key={p.id}>
                      <div className="symbol-cell">
                        <span className="avatar-dot">{p.ticker?.slice(0, 1)}</span>
                        <div>
                          <strong>{p.ticker}</strong>
                          <span>{p.name}</span>
                        </div>
                      </div>

                      <div className="mover-change">
                        <span>Return</span>
                        <strong className={p.gainPct >= 0 ? "gain" : "loss"}>
                          {p.gainPct >= 0 ? "+" : ""}
                          {p.gainPct.toFixed(2)}%
                        </strong>
                      </div>

                      <div className="mover-price">
                        <span>Value</span>
                        <strong>{money(p.value)}</strong>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="empty-state">
                    No movers yet. Buy a streamer stock to start tracking performance.
                  </div>
                )}
              </div>
            </article>
          </section>

          <section className="portfolio-card-grid">
            <article className="panel mini-account-card">
              <span>Buying power</span>
              <strong>{money(cash)}</strong>
              <p className="muted">Available for market orders.</p>
              <Link className="primary-btn wide" href="/">
                Find streamers
              </Link>
            </article>

            <article className="panel mini-account-card">
              <span>Positions</span>
              <strong>{positions.length}</strong>
              <p className="muted">Streamer stocks currently owned.</p>
              <button type="button" className="secondary-btn wide" onClick={() => setTab("positions")}>
                Open positions
              </button>
            </article>

            <article className="panel mini-account-card">
              <span>Trades</span>
              <strong>{trades.length}</strong>
              <p className="muted">Total completed buy/sell actions.</p>
              <button type="button" className="secondary-btn wide" onClick={() => setTab("activity")}>
                View activity
              </button>
            </article>
          </section>
        </>
      )}

      {tab === "positions" && (
        <section className="positions-panel panel reworked-positions">
          <div className="positions-toolbar">
            <div>
              <h2>Positions</h2>
              <p className="muted">Your streamer holdings and account weight.</p>
            </div>
          </div>

          <div className="positions-table-wrap">
            <table className="positions-table cleaner-table">
              <thead>
                <tr>
                  <th>Streamer</th>
                  <th>Price</th>
                  <th>Shares</th>
                  <th>Avg cost</th>
                  <th>Current value</th>
                  <th>Total gain/loss</th>
                  <th>% account</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>
                    <strong>Cash</strong>
                    <br />
                    <span className="muted">Buying power</span>
                  </td>
                  <td colSpan={3}></td>
                  <td>{money(cash)}</td>
                  <td></td>
                  <td>{accountValue ? ((cash / accountValue) * 100).toFixed(2) : "0.00"}%</td>
                  <td></td>
                </tr>

                {positions.length ? (
                  positions.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/streamer/${p.ticker}`} className="table-name">
                          <span className="avatar-dot">{p.ticker?.slice(0, 1)}</span>
                          <div>
                            <strong>{p.ticker}</strong>
                            <span>{p.name}</span>
                          </div>
                        </Link>
                      </td>
                      <td>{money(p.price)}</td>
                      <td>{p.shares}</td>
                      <td>{money(p.avgCost)}</td>
                      <td>{money(p.value)}</td>
                      <td className={p.gain >= 0 ? "gain" : "loss"}>
                        {p.gain >= 0 ? "+" : ""}
                        {money(p.gain)}
                        <br />
                        <span>
                          {p.gainPct >= 0 ? "+" : ""}
                          {p.gainPct.toFixed(2)}%
                        </span>
                      </td>
                      <td>{accountValue ? ((p.value / accountValue) * 100).toFixed(2) : "0.00"}%</td>
                      <td>
                        <Link className="row-btn small" href={`/streamer/${p.ticker}`}>
                          Trade
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        No positions yet. Open a streamer and place a trade.
                      </div>
                    </td>
                  </tr>
                )}

                <tr className="total-row">
                  <td>
                    <strong>Account total</strong>
                  </td>
                  <td colSpan={3}></td>
                  <td>
                    <strong>{money(accountValue)}</strong>
                  </td>
                  <td className={totalReturn >= 0 ? "gain" : "loss"}>
                    {totalReturn >= 0 ? "+" : ""}
                    {money(totalReturn)}
                  </td>
                  <td>100.00%</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "activity" && (
        <section className="activity-layout">
          <article className="panel activity-card">
            <div className="panel-head">
              <div>
                <h2>Activity & Orders</h2>
                <p className="muted">Your completed StreamStock trades.</p>
              </div>
              <Link className="row-btn small" href="/">
                Trade more
              </Link>
            </div>

            <div className="activity-list">
              {trades.length ? (
                trades.map((t) => (
                  <div className="activity-row" key={t.id}>
                    <div>
                      <strong>
                        {t.side.toUpperCase()} {Number(t.shares)} {t.streamers?.ticker}
                      </strong>
                      <span>
                        {new Date(t.created_at).toLocaleString()} · {t.streamers?.display_name}
                      </span>
                    </div>

                    <div>
                      <strong>{money(Number(t.total))}</strong>
                      <span className={t.side === "buy" ? "gain" : "warning"}>
                        {money(Number(t.price))}/share
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No trades yet.</div>
              )}
            </div>
          </article>
        </section>
      )}
    </div>
  );
}