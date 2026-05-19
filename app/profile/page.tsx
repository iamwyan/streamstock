"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { money } from "@/lib/market";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [cashBalance, setCashBalance] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);

  const [portfolioVisible, setPortfolioVisible] = useState(true);
  const [tradesVisible, setTradesVisible] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
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

    const portfolio =
      holdings?.reduce((sum: number, h: any) => {
        return (
          sum +
          Number(h.shares || 0) *
            Number(h.streamers?.current_price || 0)
        );
      }, 0) || 0;

    if (profile) {
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setCashBalance(Number(profile.cash_balance || 0));
      setPortfolioVisible(profile.portfolio_visible ?? true);
      setTradesVisible(profile.trades_visible ?? true);
      setPortfolioValue(portfolio);
    }

    setLoading(false);
  }

  async function saveProfile() {
    setSaving(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user;

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        username,
        bio,
        portfolio_visible: portfolioVisible,
        trades_visible: tradesVisible,
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Profile saved");
  }

  if (loading) {
    return (
      <main className="page-wrap">
        <section className="panel">Loading profile...</section>
      </main>
    );
  }

  const netWorth = cashBalance + portfolioValue;

  return (
    <main className="page-wrap">
      <section
        className="panel"
        style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div>
            <p className="eyebrow">Profile</p>
            <h1 style={{ fontSize: 38, marginBottom: 8 }}>
              Your trader identity
            </h1>
            <p className="muted">
              Username, bio, and public privacy settings.
            </p>
          </div>

          <div
            className="panel"
            style={{
              minWidth: 260,
              padding: 22,
            }}
          >
            <div className="muted">Public Net Worth</div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                marginTop: 8,
              }}
            >
              {money(netWorth)}
            </div>
            <p className="muted" style={{ marginTop: 8 }}>
              Always visible for leaderboard fairness.
            </p>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 22,
            marginTop: 32,
          }}
        >
          <div>
            <label>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your trader name"
              style={{
                width: "100%",
                padding: 14,
                marginTop: 8,
                borderRadius: 12,
              }}
            />
          </div>

          <div>
            <label>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other traders who you are..."
              rows={5}
              style={{
                width: "100%",
                padding: 14,
                marginTop: 8,
                borderRadius: 12,
                resize: "vertical",
              }}
            />
          </div>

          <div
            className="panel"
            style={{
              padding: 22,
            }}
          >
            <h2 style={{ marginBottom: 10 }}>Public profile rules</h2>

            <div
              style={{
                display: "grid",
                gap: 14,
                marginTop: 18,
              }}
            >
              <PrivacyRow
                title="Net worth"
                description="Always public. This keeps the race-to-richest leaderboard fair."
                locked
                checked
              />

              <PrivacyRow
                title="Portfolio visibility"
                description="Allow other users to view your current streamer positions."
                checked={portfolioVisible}
                onChange={setPortfolioVisible}
              />

              <PrivacyRow
                title="Trade history visibility"
                description="Allow other users to view your recent buys and sells."
                checked={tradesVisible}
                onChange={setTradesVisible}
              />
            </div>
          </div>

          <button
            className="primary-btn"
            onClick={saveProfile}
            disabled={saving}
            style={{
              width: "fit-content",
              padding: "14px 24px",
            }}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </section>
    </main>
  );
}

function PrivacyRow({
  title,
  description,
  checked,
  locked = false,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  locked?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 20,
        alignItems: "center",
        padding: 18,
        borderRadius: 16,
        border: "1px solid var(--border)",
      }}
    >
      <div>
        <strong>{title}</strong>
        <p className="muted" style={{ marginTop: 4 }}>
          {description}
        </p>
      </div>

      {locked ? (
        <span className="ticker-badge">Always public</span>
      ) : (
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
        />
      )}
    </div>
  );
}