"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [cashBalance, setCashBalance] = useState(0);
  const [netWorthVisible, setNetWorthVisible] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setUsername(data.username || "");
        setBio(data.bio || "");
        setCashBalance(Number(data.cash_balance || 0));
        setNetWorthVisible(data.net_worth_visible ?? true);
      }

      setLoading(false);
    }

    loadProfile();
  }, []);

  async function saveProfile() {
    setSaving(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user;

    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        username,
        bio,
        net_worth_visible: netWorthVisible,
      })
      .eq("id", user.id);

    setSaving(false);

    if (!error) {
      alert("Profile saved");
    }
  }

  if (loading) {
    return (
      <main className="page-wrap">
        <div className="card">Loading profile...</div>
      </main>
    );
  }

  return (
    <main className="page-wrap">
      <div
        className="card"
        style={{
          maxWidth: 900,
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
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 36,
                marginBottom: 8,
              }}
            >
              Profile
            </h1>

            <p style={{ opacity: 0.7 }}>
              Customize your StreamStock account.
            </p>
          </div>

          <div
            className="card"
            style={{
              minWidth: 220,
              padding: 20,
            }}
          >
            <div style={{ opacity: 0.7 }}>
              Net Worth
            </div>

            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                marginTop: 8,
              }}
            >
              $
              {cashBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 32 }}>
          <label>Username</label>

          <input
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            style={{
              width: "100%",
              padding: 14,
              marginTop: 8,
              marginBottom: 20,
              borderRadius: 12,
            }}
          />

          <label>Bio</label>

          <textarea
            value={bio}
            onChange={(e) =>
              setBio(e.target.value)
            }
            rows={5}
            style={{
              width: "100%",
              padding: 14,
              marginTop: 8,
              borderRadius: 12,
              resize: "vertical",
            }}
          />

          <div
            style={{
              marginTop: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 20,
              borderRadius: 16,
              border: "1px solid var(--border)",
            }}
          >
            <div>
              <strong>
                Show net worth publicly
              </strong>

              <div
                style={{
                  opacity: 0.7,
                  marginTop: 4,
                }}
              >
                Let other users view your
                account value.
              </div>
            </div>

            <input
              type="checkbox"
              checked={netWorthVisible}
              onChange={(e) =>
                setNetWorthVisible(
                  e.target.checked
                )
              }
            />
          </div>

          <button
            onClick={saveProfile}
            style={{
              marginTop: 28,
              padding: "14px 24px",
              borderRadius: 14,
              border: "none",
              cursor: "pointer",
            }}
          >
            {saving
              ? "Saving..."
              : "Save Profile"}
          </button>
        </div>
      </div>
    </main>
  );
}