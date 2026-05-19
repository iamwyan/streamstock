"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import StreamerChart from "@/components/StreamerChart";
import TradeTicket from "@/components/TradeTicket";
import { supabase } from "@/lib/supabaseClient";
import { compact, fundamentalsFor, money, priceFor } from "@/lib/market";

export default function StreamerPage() {
  const params = useParams<{ ticker: string }>();
  const ticker = params?.ticker;

  const [streamer, setStreamer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [priceChange24h, setPriceChange24h] = useState(0);

  useEffect(() => {
    async function loadStreamer() {
      if (!ticker) return;

      const { data, error } = await supabase
        .from("streamers")
        .select(
          "id,ticker,display_name,twitch_login,followers,avg_viewers,stream_hours,recent_growth,market_demand,current_price,liquidity"
        )
        .eq("ticker", ticker.toUpperCase())
        .single();

      if (error) {
        console.error(error);
        setStreamer(null);
      } else {
        let realDayChange = 0;

        try {
          const res = await fetch("/api/market/price-changes", {
            cache: "no-store",
          });

          if (res.ok) {
            const changeData = await res.json();
            realDayChange = Number(
              changeData.changes?.[data.ticker]?.percent || 0
            );
          }
        } catch (changeError) {
          console.error("Failed to load 24h price change:", changeError);
        }

        setPriceChange24h(realDayChange);

        setStreamer({
          ...data,

          // camelCase fallbacks for old components
          name: data.display_name,
          avgViewers: data.avg_viewers,
          streamHours: data.stream_hours,
          recentGrowth: data.recent_growth,
          currentPrice: data.current_price,
          liquidity: data.liquidity,
          netFlow: data.market_demand,
          dayChange: realDayChange,
        });
      }

      setLoading(false);
    }

    loadStreamer();
  }, [ticker]);

  if (loading) {
    return (
      <section className="panel">
        <h1>Loading streamer...</h1>
      </section>
    );
  }

  if (!streamer) {
    return (
      <section className="panel">
        <h1>Streamer not found</h1>
        <Link className="primary-btn" href="/">
          Back to market
        </Link>
      </section>
    );
  }

  const f = fundamentalsFor(streamer);
  const p = priceFor(streamer);

  return (
    <>
      <section className="panel full">
        <div className="panel-head wrap">
          <div>
            <p className="eyebrow">{streamer.ticker}</p>
            <h1>{streamer.display_name || streamer.name}</h1>
            <p className="muted">
              Follower, viewership, consistency, growth, and demand-based streamer market.
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <p className="muted">Current Price</p>
            <h1>{money(p)}</h1>
            <p className={streamer.dayChange >= 0 ? "gain" : "loss"}>
              {streamer.dayChange >= 0 ? "+" : ""}
              {Number(streamer.dayChange || 0).toFixed(2)}% today
            </p>
          </div>
        </div>
      </section>

      <section className="streamer-layout">
        <div className="panel chart-panel">
          <StreamerChart streamer={streamer} />
        </div>

        <aside className="trade-sidebar">
          <div className="panel market-info-panel">
            <h3>Market Info</h3>

            <div className="metric-grid">
              <div className="metric-tile">
                <span>Followers</span>
                <strong>{compact(streamer.followers)}</strong>
              </div>

              <div className="metric-tile">
                <span>Avg Viewers</span>
                <strong>{compact(streamer.avg_viewers)}</strong>
              </div>

              <div className="metric-tile">
                <span>Stream Hours</span>
                <strong>{streamer.stream_hours}</strong>
              </div>

              <div className="metric-tile">
                <span>Twitch Momentum</span>
                <strong
                  className={streamer.recent_growth >= 0 ? "gain" : "loss"}
                >
                  {streamer.recent_growth >= 0 ? "+" : ""}
                  {Number(streamer.recent_growth || 0).toFixed(1)}%
                </strong>
              </div>

              <div className="metric-tile">
                <span>Market Demand</span>
                <strong>{Number(streamer.market_demand || 0).toFixed(2)}</strong>
              </div>

              <div className="metric-tile">
                <span>Current Value</span>
                <strong>{money(f.base)}</strong>
              </div>
            </div>
          </div>

          <TradeTicket streamer={streamer} />
        </aside>
      </section>
    </>
  );
}