"use client";

import { useEffect, useState } from "react";
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
    }

    setLoading(false);
  }

  if (loading) {
    return <section className="panel full">Loading trader...</section>;
  }

  if (!profile) {
    return (
      <section className="panel full">
        <h1>Trader not found</h1>
        <Link className="primary-btn" href="/leaderboard">
          Back to leaderboard
        </Link>
      </section>
    );
  }

  const portfolioValue = holdings.reduce(
    (sum, h) =>
      sum +
      Number(h.shares || 0) *
        Number(h.streamers?.current_price || 0),
    0
  );

  const netWorth = Number(profile.cash_balance || 0) + portfolioValue;

  return (
    <main className="page-wrap">
      <section className="panel full">
        <p className="eyebrow">Trader Profile</p>
        <h1>{profile.username}</h1>
        <p className="muted">{profile.bio || "No bio yet."}</p>

        <div className="metric-grid" style={{ marginTop: 24 }}>
          <div className="metric-tile">
            <span>Net Worth</span>
            <strong>{money(netWorth)}</strong>
          </div>

          <div className="metric-tile">
            <span>Cash</span>
            <strong>{money(profile.cash_balance)}</strong>
          </div>

          <div className="metric-tile">
            <span>Portfolio</span>
            <strong>
              {profile.portfolio_visible
                ? money(portfolioValue)
                : "Hidden"}
            </strong>
          </div>
        </div>
      </section>

      <section className="panel full" style={{ marginTop: 20 }}>
        <h2>Portfolio</h2>

        {!profile.portfolio_visible ? (
          <p className="muted">This trader has hidden their portfolio.</p>
        ) : holdings.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Streamer</th>
                  <th>Shares</th>
                  <th>Avg Cost</th>
                  <th>Current Price</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h, i) => (
                  <tr key={i}>
                    <td>{h.streamers?.ticker}</td>
                    <td>{h.streamers?.display_name}</td>
                    <td>{Number(h.shares).toFixed(2)}</td>
                    <td>{money(h.average_cost)}</td>
                    <td>{money(h.streamers?.current_price)}</td>
                    <td>
                      {money(
                        Number(h.shares || 0) *
                          Number(h.streamers?.current_price || 0)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No public holdings yet.</p>
        )}
      </section>

      <section className="panel full" style={{ marginTop: 20 }}>
        <h2>Trade History</h2>

        {!profile.trades_visible ? (
          <p className="muted">This trader has hidden their trade history.</p>
        ) : trades.length ? (
          <div className="activity-list">
            {trades.map((t, i) => (
              <div className="activity-row" key={i}>
                <div>
                  <strong>
                    {t.side.toUpperCase()} {Number(t.shares)}{" "}
                    {t.streamers?.ticker}
                  </strong>
                  <span>
                    {new Date(t.created_at).toLocaleString()} ·{" "}
                    {t.streamers?.display_name}
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
          <p className="muted">No public trades yet.</p>
        )}
      </section>
    </main>
  );
}