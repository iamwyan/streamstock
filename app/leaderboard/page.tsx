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

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(`
        id,
        username,
        cash_balance,
        portfolio_visible,
        trades_visible,
        holdings (
          shares,
          streamers (
            current_price
          )
        )
      `)

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const ranked =
      profiles?.map((user: any) => {
        const portfolio =
          user.holdings?.reduce(
            (sum: number, h: any) =>
              sum +
              Number(h.shares || 0) *
                Number(
                  h.streamers
                    ?.current_price || 0
                ),
            0
          ) || 0;

        const cash = Number(
          user.cash_balance || 0
        );

        return {
          id: user.id,
          username:
            user.username ||
            "Unknown Trader",
          cash,
          portfolio,
          netWorth:
            cash + portfolio,
        };
      }) || [];

    ranked.sort(
      (a, b) =>
        b.netWorth -
        a.netWorth
    );

    setUsers(
      ranked.slice(0, 100)
    );

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
        <p className="eyebrow">
          Leaderboard
        </p>

        <h1>
          Top 100 richest users
        </h1>

        <p className="muted">
          Ranked by real
          StreamStock net worth.
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
              {users.map(
                (u, i) => (
                  <tr key={u.id}>
                    <td>
                      #{i + 1}
                    </td>

                    <td>
                      <Link
                        href={`/user/${u.username}`}
                      >
                        <strong>
                          {
                            u.username
                          }
                        </strong>
                      </Link>
                    </td>

                    <td>
                      {money(
                        u.cash
                      )}
                    </td>

                    <td>
                      {money(
                        u.portfolio
                      )}
                    </td>

                    <td>
                      <strong>
                        {money(
                          u.netWorth
                        )}
                      </strong>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}