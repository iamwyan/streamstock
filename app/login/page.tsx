"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setLoading(false);
        setMessage(error.message);
        return;
      }

      if (data.user) {
        await supabase.from("profiles").insert({
          id: data.user.id,
          username: username || email.split("@")[0],
          cash_balance: 10000,
          bio: "",
          net_worth_visible: true,
        });
      }

      setLoading(false);
      setMessage("Account created.");
      router.push("/profile");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    setLoading(false);
    router.push("/profile");
  }

  const isLogin = mode === "login";

  return (
    <main
      className="auth-page"
      style={{
        minHeight: "calc(100vh - 120px)",
        display: "grid",
        placeItems: "center",
        padding: "32px 16px",
      }}
    >
      <section
        style={{
          width: "min(1060px, 100%)",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(360px, 0.95fr)",
          gap: 22,
          alignItems: "stretch",
        }}
        className="auth-shell"
      >
        <article
          className="panel"
          style={{
            padding: "clamp(26px, 4vw, 46px)",
            minHeight: 520,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflow: "hidden",
            position: "relative",
            background:
              "radial-gradient(circle at 15% 15%, var(--purple-soft), transparent 18rem), radial-gradient(circle at 90% 75%, var(--broker-soft), transparent 16rem), linear-gradient(145deg, var(--card), var(--card-2))",
          }}
        >
          <div style={{ position: "relative", zIndex: 1 }}>
            <span className="pill">StreamStock</span>
            <h1 style={{ maxWidth: 560, marginBottom: 16 }}>
              Trade creators like the market never sleeps.
            </h1>
            <p className="big-muted" style={{ maxWidth: 560 }}>
              Build a fake-cash portfolio, chase live momentum, and climb the leaderboard before everyone else spots the breakout.
            </p>
          </div>

          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
              marginTop: 28,
            }}
            className="auth-feature-grid"
          >
            <div className="auth-feature-tile">
              <span>Starting Cash</span>
              <strong>$10,000</strong>
            </div>
            <div className="auth-feature-tile">
              <span>Market</span>
              <strong>Live Data</strong>
            </div>
            <div className="auth-feature-tile">
              <span>Goal</span>
              <strong>Top 100</strong>
            </div>
          </div>
        </article>

        <article
          className="panel auth-card"
          style={{
            margin: 0,
            maxWidth: "none",
            padding: "clamp(24px, 3vw, 34px)",
            display: "grid",
            alignContent: "center",
            gap: 20,
          }}
        >
          <div>
            <p className="eyebrow">{isLogin ? "Welcome back" : "Join the market"}</p>
            <h2 style={{ fontSize: "clamp(2rem, 3vw, 2.8rem)", marginBottom: 8 }}>
              {isLogin ? "Log in" : "Create account"}
            </h2>
            <p className="muted" style={{ margin: 0 }}>
              {isLogin
                ? "Jump back into your portfolio and check the latest streamer moves."
                : "Start with $10,000 fake cash and make your first trade."}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              padding: 6,
              borderRadius: 16,
              background: "var(--bg-soft)",
              border: "1px solid var(--line)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
              style={{
                border: 0,
                borderRadius: 12,
                padding: "11px 12px",
                fontWeight: 950,
                color: isLogin ? "#fff" : "var(--muted)",
                background: isLogin
                  ? "linear-gradient(135deg, var(--accent), var(--accent-dark))"
                  : "transparent",
              }}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setMessage("");
              }}
              style={{
                border: 0,
                borderRadius: 12,
                padding: "11px 12px",
                fontWeight: 950,
                color: !isLogin ? "#fff" : "var(--muted)",
                background: !isLogin
                  ? "linear-gradient(135deg, var(--accent), var(--broker))"
                  : "transparent",
              }}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" style={{ display: "grid", gap: 14 }}>
            {mode === "signup" && (
              <label>
                Username
                <input
                  placeholder="burntpeanutbull"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <button className="primary-btn" type="submit" disabled={loading} style={{ minHeight: 52 }}>
              {loading
                ? isLogin
                  ? "Logging in..."
                  : "Creating account..."
                : isLogin
                  ? "Log in"
                  : "Create account"}
            </button>
          </form>

          {message && (
            <p
              className="auth-message"
              style={{
                margin: 0,
                padding: "12px 14px",
                borderRadius: 14,
                background: "var(--bg-soft)",
                border: "1px solid var(--line)",
                color: "var(--muted)",
                fontWeight: 800,
              }}
            >
              {message}
            </p>
          )}

          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setMessage("");
            }}
            style={{
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: "12px 14px",
              background: "var(--bg-soft)",
              color: "var(--text)",
              fontWeight: 900,
            }}
          >
            {mode === "login"
              ? "Need an account? Sign up"
              : "Already have an account? Log in"}
          </button>
        </article>
      </section>

      <style jsx>{`
        .auth-feature-tile {
          min-width: 0;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid var(--line-soft);
          background: color-mix(in srgb, var(--bg-soft) 82%, transparent);
        }

        .auth-feature-tile span {
          display: block;
          color: var(--muted);
          font-size: 0.72rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          margin-bottom: 7px;
        }

        .auth-feature-tile strong {
          display: block;
          font-size: 1.1rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 900px) {
          .auth-shell {
            grid-template-columns: 1fr !important;
          }

          .auth-shell > article:first-child {
            min-height: auto !important;
          }
        }

        @media (max-width: 560px) {
          .auth-feature-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
