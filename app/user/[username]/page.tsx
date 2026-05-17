"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { money } from "@/lib/market";

export default function PublicUserProfilePage() {
  const params = useParams<{ username: string }>();
  const username = decodeURIComponent(params.username || "");

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);

  useEffect(() => {
    loadPublicProfile();
  }, [username]);

  async function loadPublicProfile() {
    setLoading(true);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .single();

    if (!profileData) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setProfile(profileData);

    if (profileData.portfolio_visible) {
      const { data: holdingData } = await supabase
        .from("holdings")
        .select(`
          shares,
          average_cost,
          streamers (
            ticker,
            display_name,
            current_price
          )
        `)
        .eq("user_id", profileData.id);

      setHoldings(holdingData || []);
    } else {
      setHoldings([]);
    }

    if (profileData.trades_visible) {
      const { data: tradeData } = await supabase
        .from("trades")
        .select(`
          side,
          shares,
          price,
          total,
          created_at,
          streamers (
            ticker,
            display_name
          )
        `)
        .eq("user_id", profileData.id)
        .order("created_at", { ascending: false })
        .limit(20);

      setTrades(tradeData || []);
    } else {
      setTrades([]);
    }

    setLoading(false);
  }

  const stats = useMemo(() => {
    const portfolioValue = holdings.reduce(
      (sum, h) => sum + Number(h.shares || 0) * Number(h.streamers?.current_price || 0),
      0
    );

    const costBasis = holdings.reduce(
      (sum, h) => sum + Number(h.shares || 0) * Number(h.average_cost || 0),
      0
    );

    const unrealized = portfolioValue - costBasis;
    const unrealizedPct = costBasis > 0 ? (unrealized / costBasis) * 100 : 0;
    const netWorth = Number(profile?.cash_balance || 0) + portfolioValue;

    const topHolding = [...holdings]
      .sort(
        (a, b) =>
          Number(b.shares || 0) * Number(b.streamers?.current_price || 0) -
          Number(a.shares || 0) * Number(a.streamers?.current_price || 0)
      )[0];

    const buyCount = trades.filter((t) => t.side === "buy").length;
    const sellCount = trades.filter((t) => t.side === "sell").length;

    return {
      portfolioValue,
      costBasis,
      unrealized,
      unrealizedPct,
      netWorth,
      topHolding,
      buyCount,
      sellCount,
    };
  }, [profile, holdings, trades]);

  if (loading) {
    return (
      <main className="page-wrap">
        <section className="panel full" style={{ minHeight: 220, display: "grid", placeItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <p className="eyebrow">Trader Profile</p>
            <h2>Loading trader...</h2>
          </div>
        </section>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="page-wrap">
        <section className="panel full" style={{ padding: 28 }}>
          <p className="eyebrow">Not Found</p>
          <h1>Trader not found</h1>
          <p className="muted">That profile either does not exist or changed usernames.</p>
          <Link className="primary-btn" href="/leaderboard" style={{ marginTop: 16 }}>
            Back to leaderboard
          </Link>
        </section>
      </main>
    );
  }

  const initial = String(profile.username || "?").slice(0, 1).toUpperCase();

  return (
    <main className="page-wrap">
      <section
        className="panel full"
        style={{
          padding: "clamp(22px, 3vw, 34px)",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 90% 10%, var(--purple-soft), transparent 18rem), radial-gradient(circle at 8% 95%, var(--broker-soft), transparent 16rem), linear-gradient(145deg, var(--card), var(--card-2))",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: 22,
            alignItems: "start",
          }}
        >
          <div style={{ display: "flex", gap: 18, alignItems: "center", minWidth: 0 }}>
            <div
              style={{
                width: 86,
                height: 86,
                borderRadius: 28,
                display: "grid",
                placeItems: "center",
                color: "white",
                fontSize: "2.15rem",
                fontWeight: 950,
                background: "linear-gradient(135deg, var(--accent), var(--broker))",
                boxShadow: "0 18px 42px rgba(145,70,255,.25)",
                flex: "0 0 auto",
              }}
            >
              {initial}
            </div>

            <div style={{ minWidth: 0 }}>
              <p className="eyebrow">Public Trader</p>
              <h1 style={{ margin: "0 0 8px", overflowWrap: "anywhere" }}>{profile.username}</h1>
              <p className="muted" style={{ maxWidth: 760, margin: 0 }}>
                {profile.bio || "No bio yet. Mysterious trader energy."}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <span className="ticker-badge">Net worth public</span>
            <span className={profile.portfolio_visible ? "ticker-badge" : "rank-badge"}>
              Portfolio {profile.portfolio_visible ? "public" : "hidden"}
            </span>
            <span className={profile.trades_visible ? "ticker-badge" : "rank-badge"}>
              Trades {profile.trades_visible ? "public" : "hidden"}
            </span>
          </div>
        </div>

        <div
          className="metric-grid"
          style={{
            marginTop: 28,
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          }}
        >
          <div className="metric-tile">
            <span>Net Worth</span>
            <strong>{money(stats.netWorth)}</strong>
          </div>

          <div className="metric-tile">
            <span>Cash</span>
            <strong>{money(profile.cash_balance)}</strong>
          </div>

          <div className="metric-tile">
            <span>Portfolio</span>
            <strong>{profile.portfolio_visible ? money(stats.portfolioValue) : "Hidden"}</strong>
          </div>

          <div className="metric-tile">
            <span>Unrealized P/L</span>
            <strong className={stats.unrealized >= 0 ? "gain" : "loss"}>
              {profile.portfolio_visible ? money(stats.unrealized) : "Hidden"}
            </strong>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.15fr) minmax(300px, .85fr)",
          gap: 20,
          marginTop: 20,
          alignItems: "start",
        }}
      >
        <article className="panel" style={{ padding: 22, minWidth: 0 }}>
          <div className="panel-head wrap">
            <div>
              <p className="eyebrow">Holdings</p>
              <h2>Portfolio</h2>
            </div>
            {profile.portfolio_visible && holdings.length > 0 && (
              <span className={stats.unrealized >= 0 ? "gain" : "loss"} style={{ fontWeight: 900 }}>
                {stats.unrealized >= 0 ? "+" : ""}
                {stats.unrealizedPct.toFixed(2)}%
              </span>
            )}
          </div>

          {!profile.portfolio_visible ? (
            <div className="empty-state" style={{ marginTop: 16 }}>
              This trader has hidden their portfolio.
            </div>
          ) : holdings.length ? (
            <div className="activity-list" style={{ marginTop: 16 }}>
              {holdings.map((h, i) => {
                const shares = Number(h.shares || 0);
                const avgCost = Number(h.average_cost || 0);
                const current = Number(h.streamers?.current_price || 0);
                const value = shares * current;
                const pnl = value - shares * avgCost;
                const pnlPct = avgCost > 0 ? ((current - avgCost) / avgCost) * 100 : 0;

                return (
                  <Link
                    href={`/streamer/${h.streamers?.ticker}`}
                    className="activity-row"
                    key={i}
                    style={{ gridTemplateColumns: "minmax(0, 1fr) auto", textDecoration: "none" }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {h.streamers?.display_name || h.streamers?.ticker}
                      </strong>
                      <span>
                        {h.streamers?.ticker} · {shares.toFixed(2)} shares · avg {money(avgCost)}
                      </span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <strong>{money(value)}</strong>
                      <span className={pnl >= 0 ? "gain" : "loss"}>
                        {pnl >= 0 ? "+" : ""}
                        {money(pnl)} · {pnlPct >= 0 ? "+" : ""}
                        {pnlPct.toFixed(2)}%
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ marginTop: 16 }}>
              No public holdings yet.
            </div>
          )}
        </article>

        <aside style={{ display: "grid", gap: 20, minWidth: 0 }}>
          <article className="panel" style={{ padding: 22 }}>
            <p className="eyebrow">Trader Snapshot</p>
            <h2>Profile Stats</h2>

            <div className="metric-grid" style={{ marginTop: 16, gridTemplateColumns: "1fr 1fr" }}>
              <div className="metric-tile">
                <span>Positions</span>
                <strong>{profile.portfolio_visible ? holdings.length : "Hidden"}</strong>
              </div>
              <div className="metric-tile">
                <span>Recent Trades</span>
                <strong>{profile.trades_visible ? trades.length : "Hidden"}</strong>
              </div>
              <div className="metric-tile">
                <span>Buys</span>
                <strong>{profile.trades_visible ? stats.buyCount : "Hidden"}</strong>
              </div>
              <div className="metric-tile">
                <span>Sells</span>
                <strong>{profile.trades_visible ? stats.sellCount : "Hidden"}</strong>
              </div>
            </div>
          </article>

          <article className="panel" style={{ padding: 22 }}>
            <p className="eyebrow">Top Position</p>
            <h2>{profile.portfolio_visible && stats.topHolding ? stats.topHolding.streamers?.ticker : "Hidden"}</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              {profile.portfolio_visible && stats.topHolding
                ? `${stats.topHolding.streamers?.display_name} is currently this trader's largest visible holding.`
                : "This trader has not made their largest position public."}
            </p>
          </article>
        </aside>
      </section>

      <section className="panel full" style={{ marginTop: 20, padding: 22 }}>
        <div className="panel-head wrap">
          <div>
            <p className="eyebrow">Activity</p>
            <h2>Trade History</h2>
          </div>
          <Link className="secondary-btn small" href="/leaderboard">
            Back to leaderboard
          </Link>
        </div>

        {!profile.trades_visible ? (
          <div className="empty-state" style={{ marginTop: 16 }}>
            This trader has hidden their trade history.
          </div>
        ) : trades.length ? (
          <div className="activity-list" style={{ marginTop: 16 }}>
            {trades.map((t, i) => (
              <div className="activity-row" key={i}>
                <div style={{ minWidth: 0 }}>
                  <strong>
                    <span className={t.side === "buy" ? "gain" : "loss"}>{t.side.toUpperCase()}</span>{" "}
                    {Number(t.shares).toFixed(2)} {t.streamers?.ticker}
                  </strong>
                  <span>
                    {new Date(t.created_at).toLocaleString()} · {t.streamers?.display_name}
                  </span>
                </div>

                <div>
                  <strong>{money(t.total)}</strong>
                  <span>{money(t.price)}/share</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ marginTop: 16 }}>
            No public trades yet.
          </div>
        )}
      </section>
    </main>
  );
}
