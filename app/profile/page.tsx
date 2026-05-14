"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useStreamStock } from "@/lib/useStreamStock";
import { money, priceFor } from "@/lib/market";

export default function ProfilePage() {
  const app = useStreamStock();
  const [name, setName] = useState(app.state.username);
  const [bio, setBio] = useState(app.state.bio);
  const [showNetWorth, setShowNetWorth] = useState(app.state.showNetWorth);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!app.ready) return;
    setName(app.state.username);
    setBio(app.state.bio);
    setShowNetWorth(app.state.showNetWorth);
  }, [app.ready, app.state.username, app.state.bio, app.state.showNetWorth]);

  const topHolding = Object.entries(app.state.positions)
    .map(([ticker, position]) => {
      const streamer = app.state.streamers.find((s) => s.ticker === ticker);
      return streamer ? { ticker, streamer, value: position.shares * priceFor(streamer), shares: position.shares } : null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.value - a.value)[0] as any;

  function saveProfile(e: FormEvent) {
    e.preventDefault();
    app.updateProfile({ username: name.trim() || "DemoTrader", bio: bio.trim(), showNetWorth });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <section className="profile-rework">
      <article className="panel profile-hero-card">
        <div className="profile-identity-block">
          <div className="profile-avatar-xl">{(app.state.username || "D").slice(0, 1).toUpperCase()}</div>
          <div>
            <p className="eyebrow">Player profile</p>
            <h1>{app.state.username}</h1>
            <p className="big-muted profile-bio-preview">{app.state.bio || "No bio yet. Add one so other traders know who they are up against."}</p>
          </div>
        </div>
        <div className="profile-public-stats">
          <div>
            <span>Public Net Worth</span>
            <strong>{app.state.showNetWorth ? money(app.accountValue) : "Hidden"}</strong>
          </div>
          <div>
            <span>Rank</span>
            <strong>#24</strong>
          </div>
          <div>
            <span>Positions</span>
            <strong>{Object.keys(app.state.positions).length}</strong>
          </div>
        </div>
      </article>

      <div className="profile-page-grid">
        <form className="panel profile-editor-card" onSubmit={saveProfile}>
          <div className="panel-head stacked-heading">
            <div>
              <p className="eyebrow">Edit profile</p>
              <h2>Public identity</h2>
              <p className="muted">This is what other players will see when they view your trader profile.</p>
            </div>
          </div>

          <label>
            Username
            <input className="search" value={name} maxLength={22} onChange={(e) => setName(e.target.value)} placeholder="Your trader name" />
          </label>

          <label>
            Bio
            <textarea className="profile-textarea" value={bio} maxLength={180} onChange={(e) => setBio(e.target.value)} placeholder="Tell people your trading style..." />
          </label>
          <div className="bio-counter">{bio.length}/180 characters</div>

          <div className="privacy-setting-row">
            <div>
              <strong>Show net worth on profile</strong>
              <p className="muted">Turn this off if you want your account value hidden from other users.</p>
            </div>
            <button type="button" className={showNetWorth ? "toggle-switch on" : "toggle-switch"} onClick={() => setShowNetWorth((v) => !v)} aria-pressed={showNetWorth}>
              <span></span>
            </button>
          </div>

          <div className="profile-actions-row">
            <button className="primary-btn" type="submit">Save profile</button>
            {saved && <span className="save-confirm">Saved</span>}
          </div>
        </form>

        <aside className="panel public-preview-card">
          <p className="eyebrow">Preview</p>
          <div className="preview-card-inner">
            <div className="profile-avatar-lg">{(name || "D").slice(0, 1).toUpperCase()}</div>
            <h2>{name || "DemoTrader"}</h2>
            <p>{bio || "No bio yet."}</p>
            <div className="preview-networth-box">
              <span>Net Worth</span>
              <strong>{showNetWorth ? money(app.accountValue) : "Hidden by user"}</strong>
            </div>
          </div>
        </aside>

        <section className="panel profile-stats-card">
          <div className="panel-head stacked-heading">
            <div>
              <p className="eyebrow">Account stats</p>
              <h2>Trader snapshot</h2>
            </div>
          </div>
          <div className="profile-stat-grid">
            <div><span>Cash</span><strong>{money(app.state.cash)}</strong></div>
            <div><span>Portfolio</span><strong>{money(app.portfolioValue)}</strong></div>
            <div><span>Total Return</span><strong className={app.totalReturn >= 0 ? "gain" : "loss"}>{app.totalReturn >= 0 ? "+" : ""}{money(app.totalReturn)}</strong></div>
            <div><span>Open Orders</span><strong>{app.state.orders.length}</strong></div>
          </div>
        </section>

        <section className="panel profile-stats-card">
          <div className="panel-head stacked-heading">
            <div>
              <p className="eyebrow">Trading identity</p>
              <h2>Current style</h2>
            </div>
          </div>
          <div className="profile-insight-list">
            <div><span>Largest position</span><strong>{topHolding ? `${topHolding.streamer.name} (${topHolding.ticker})` : "No positions yet"}</strong></div>
            <div><span>Favorite market</span><strong>{topHolding ? "Streamer momentum" : "Start trading to unlock"}</strong></div>
            <div><span>Privacy</span><strong>{app.state.showNetWorth ? "Net worth visible" : "Net worth hidden"}</strong></div>
          </div>
          <div className="profile-secondary-actions">
            <Link className="secondary-btn" href="/portfolio">View portfolio</Link>
            <button className="ghost-btn" type="button" onClick={app.reset}>Reset local demo account</button>
          </div>
        </section>
      </div>
    </section>
  );
}
