"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AddStreamerAdminPage() {
  const [ticker, setTicker] = useState("");
  const [twitchLogin, setTwitchLogin] = useState("");
  const [startingPrice, setStartingPrice] = useState("25");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setMessage("You need to be logged in.");
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const res = await fetch("/api/admin/add-streamer", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ticker,
          twitchLogin,
          startingPrice: Number(startingPrice),
        }),
      });

      clearTimeout(timeout);

      const text = await res.text();

      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(text || "Server returned a non-JSON response.");
      }

      if (!res.ok) {
        setMessage(data.error || "Failed to add streamer.");
        return;
      }

      setMessage(`Added ${data.streamer?.display_name || twitchLogin} as ${ticker.toUpperCase()}`);
      setTicker("");
      setTwitchLogin("");
      setStartingPrice("25");
    } catch (err: any) {
      console.error(err);

      if (err?.name === "AbortError") {
        setMessage("Request timed out. Check Vercel logs or the admin API route.");
      } else {
        setMessage(err?.message || "Request failed. Check Vercel logs.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-wrap">
      <section className="panel full" style={{ maxWidth: 760, margin: "24px auto" }}>
        <p className="eyebrow">Admin</p>
        <h1>Add Streamer</h1>
        <p className="muted">
          Add new tradable streamer tickers. Twitch info will be pulled automatically.
        </p>

        <form onSubmit={submit} style={{ display: "grid", gap: 16, marginTop: 24 }}>
          <label>
            Ticker
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="LUD"
              required
            />
          </label>

          <label>
            Twitch Username
            <input
              value={twitchLogin}
              onChange={(e) => setTwitchLogin(e.target.value.toLowerCase())}
              placeholder="ludwig"
              required
            />
          </label>

          <label>
            Starting Price
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={startingPrice}
              onChange={(e) => setStartingPrice(e.target.value)}
              required
            />
          </label>

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Streamer"}
          </button>

          {message && <p className="muted">{message}</p>}
        </form>
      </section>
    </main>
  );
}
