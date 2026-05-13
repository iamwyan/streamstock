"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Shell({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    const saved = localStorage.getItem("ss_theme")?.replaceAll('"', '') || "dark";
    setTheme(saved); document.documentElement.setAttribute("data-theme", saved);
  }, []);
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next); localStorage.setItem("ss_theme", next); document.documentElement.setAttribute("data-theme", next);
  }
  return <>
    <div className="bg-grid" />
    <header className="site-header">
      <Link className="brand" href="/"><span className="brand-mark">S</span><span>Stream<span style={{color:"var(--accent)"}}>Stock</span></span></Link>
      <div className="header-search"><input type="search" placeholder="Search streamers or tickers..." /></div>
      <nav className="desktop-nav"><Link href="/">Markets</Link><Link href="/portfolio">Portfolio</Link><Link href="/leaderboard">Leaderboard</Link><Link href="/profile">Profile</Link></nav>
      <div className="header-actions"><button className="ghost-btn" onClick={toggleTheme}>{theme === "dark" ? "Light mode" : "Dark mode"}</button><Link className="ghost-btn" href="/login">Login</Link></div>
    </header>
    <div className="app-shell">
      <aside className="side-rail">
        <div className="side-links">
          <Link className="side-link" href="/">⌂ Markets</Link>
          <Link className="side-link" href="/portfolio">▧ Portfolio</Link>
          <Link className="side-link" href="/leaderboard">♕ Leaderboard</Link>
          <Link className="side-link" href="/profile">◎ Profile</Link>
        </div>
        <div>
          <div className="side-promo"><strong>Top Trader</strong><span>Climb the leaderboard with fake cash, real ego.</span><Link className="primary-btn" href="/leaderboard">View Board</Link></div>
          <div className="side-foot">© 2026 StreamStock<br/>Fantasy investing only.</div>
        </div>
      </aside>
      <main className="next-main">{children}</main>
    </div>
    <footer><strong>StreamStock</strong><span>Fantasy investing only. Not affiliated with Twitch. No real securities, brokerages, or payouts.</span></footer>
  </>;
}
