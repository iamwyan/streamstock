"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { money } from "@/lib/market";

type UserRow = {
  id: string;
  username: string;
  cash: number;
  portfolio: number;
  netWorth: number;
};

export default function LeaderboardPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    setLoading(true);

    // Load profiles first so brand-new users with no holdings still appear.
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, cash_balance");

    if (profilesError) {
      console.error("Leaderboard profiles error:", profilesError);
      setLoading(false);
      return;
    }

    const profileIds = (profiles || []).map((p: any) => p.id);

    let holdings: any[] = [];

    if (profileIds.length > 0) {
      const { data: holdingsData, error: holdingsError } = await supabase
        .from("holdings")
        .select(`
          user_id,
          shares,
          streamers (
            current_price
          )
        `)
        .in("user_id", profileIds);

      if (holdingsError) {
        console.error("Leaderboard holdings error:", holdingsError);
      } else {
        holdings = holdingsData || [];
      }
    }

    const portfolioByUser = new Map<string, number>();

    for (const holding of holdings) {
      const value =
        Number(holding.shares || 0) *
        Number(holding.streamers?.current_price || 0);

      portfolioByUser.set(
        holding.user_id,
        (portfolioByUser.get(holding.user_id) || 0) + value
      );
    }

    const ranked: UserRow[] = (profiles || []).map((profile: any) => {
      const cash = Number(profile.cash_balance || 0);
      const portfolio = portfolioByUser.get(profile.id) || 0;

      return {
        id: profile.id,
        username: profile.username || "Unknown Trader",
        cash,
        portfolio,
        netWorth: cash + portfolio,
      };
    });

    ranked.sort((a, b) => b.netWorth - a.netWorth);

    setUsers(ranked.slice(0, 100));
    setLoading(false);
  }

  if (loading) {
    return (
      <section className="panel full">
        Loading leaderboard...
      </section>
    );
  }

  return (
    <>
      <section className="panel full">
        <p className="eyebrow">Leaderboard</p>

        <h1>Top 100 richest users</h1>

        <p className="muted">
          Ranked by real StreamStock net worth.
        </p>
      </section>

      <section className="panel full">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>User</th>
                <th>Cash</th>
                <th>Portfolio</th>
                <th>Net Worth</th>
              </tr>
            </thead>

            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    No users found yet.
                  </td>
                </tr>
              ) : (
                users.map((u, i) => (
                  <tr key={u.id}>
                    <td>#{i + 1}</td>

                    <td>
                      <Link href={`/user/${encodeURIComponent(u.username)}`}>
                        <strong>{u.username}</strong>
                      </Link>
                    </td>

                    <td>{money(u.cash)}</td>

                    <td>{money(u.portfolio)}</td>

                    <td>
                      <strong>{money(u.netWorth)}</strong>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
