"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { money } from "@/lib/market";

export default function Shell({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState("dark");
  const [cashBalance, setCashBalance] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [rank, setRank] = useState<number | null>(null);

  async function loadAccount() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      setIsLoggedIn(false);
      setUserId(null);
      setCashBalance(0);
      setPortfolioValue(0);
      setRank(null);
      return;
    }

    setIsLoggedIn(true);
    setUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("cash_balance")
      .eq("id", user.id)
      .single();

    const { data: holdings } = await supabase
      .from("holdings")
      .select(`
        shares,
        streamers (
          current_price
        )
      `)
      .eq("user_id", user.id);

    const cash = Number(profile?.cash_balance || 0);

    const portfolio =
      holdings?.reduce((sum: number, h: any) => {
        return (
          sum +
          Number(h.shares || 0) *
            Number(h.streamers?.current_price || 0)
        );
      }, 0) || 0;

    setCashBalance(cash);
    setPortfolioValue(portfolio);

    const { data: rankedProfiles } = await supabase
      .from("profiles")
      .select(`
        id,
        cash_balance,
        holdings (
          shares,
          streamers (
            current_price
          )
        )
      `);

    const rankings =
      rankedProfiles?.map((profileRow: any) => {
        const profilePortfolio =
          profileRow.holdings?.reduce((sum: number, h: any) => {
            return (
              sum +
              Number(h.shares || 0) * Number(h.streamers?.current_price || 0)
            );
          }, 0) || 0;

        return {
          id: profileRow.id,
          netWorth: Number(profileRow.cash_balance || 0) + profilePortfolio,
        };
      }) || [];

    rankings.sort((a, b) => b.netWorth - a.netWorth);

    const currentRank = rankings.findIndex((row) => row.id === user.id) + 1;
    setRank(currentRank > 0 ? currentRank : null);
  }

  useEffect(() => {
    const saved = localStorage.getItem("ss_theme")?.replaceAll('"', "") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  useEffect(() => {
    loadAccount();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadAccount();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`account-live-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        () => loadAccount()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "holdings",
          filter: `user_id=eq.${userId}`,
        },
        () => loadAccount()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "streamers",
        },
        () => loadAccount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("ss_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  const displayNetWorth = cashBalance + portfolioValue;

  return (
    <>
      <div className="bg-grid" />

      <header className="site-header">
        <Link className="brand" href="/">
          <span className="brand-mark">S</span>
          <span>
            Stream<span style={{ color: "var(--accent)" }}>Stock</span>
          </span>
        </Link>

        <div className="header-search">
          <input type="search" placeholder="Search streamers or tickers..." />
        </div>

        <nav className="desktop-nav">
          <Link href="/">Markets</Link>
          <Link href="/portfolio">Portfolio</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/profile">Profile</Link>
          <Link href="/faq">FAQ</Link>
        </nav>

        <div className="money-dock" aria-label="Account money snapshot">
          <Link href="/portfolio" className="money-chip primary-money">
            <span>Net Worth</span>
            <strong>{money(displayNetWorth)}</strong>
          </Link>

          <Link href="/portfolio" className="money-chip">
            <span>Cash</span>
            <strong>{money(cashBalance)}</strong>
          </Link>

          <Link href="/leaderboard" className="money-chip rank-money">
            <span>Rank</span>
            <strong>{rank ? `#${rank}` : "—"}</strong>
          </Link>
        </div>

        <div className="header-actions">
          <button className="ghost-btn" onClick={toggleTheme}>
            {theme === "dark" ? "Light" : "Dark"}
          </button>

          {isLoggedIn ? (
            <button className="ghost-btn" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <Link className="ghost-btn" href="/login">
              Login
            </Link>
          )}
        </div>
      </header>

      <div className="app-shell">
        <aside className="side-rail">
          <div className="side-links">
            <Link className="side-link" href="/">
              ⌂ Markets
            </Link>
            <Link className="side-link" href="/portfolio">
              ▧ Portfolio
            </Link>
            <Link className="side-link" href="/leaderboard">
              ♕ Leaderboard
            </Link>
            <Link className="side-link" href="/profile">
              ◎ Profile
            </Link>
          </div>

          <div>
            <div className="side-promo">
              <strong>Season Race</strong>
              <span>Build the biggest account by trading streamer momentum.</span>
              <Link className="primary-btn" href="/leaderboard">
                Leaderboard
              </Link>
            </div>

            <div className="side-foot">
              © 2026 StreamStock
              <br />
              Fantasy investing only.
            </div>
          </div>
        </aside>

        <main className="next-main">{children}</main>
      </div>

      <footer>
        <strong>StreamStock</strong>
        <span>
          Fantasy investing only. Not affiliated with Twitch. No real securities,
          brokerages, or payouts.
        </span>
      </footer>
    </>
  );
}