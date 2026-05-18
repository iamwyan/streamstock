"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
} from "lightweight-charts";
import { supabase } from "@/lib/supabaseClient";
import { type Streamer, priceFor } from "@/lib/market";

const intervals = ["1m", "5m", "10m", "1D", "30D"];

function intervalToSeconds(interval: string) {
  switch (interval) {
    case "5m":
      return 5 * 60;
    case "10m":
      return 10 * 60;
    case "1D":
      return 24 * 60 * 60;
    case "30D":
      return 30 * 24 * 60 * 60;
    case "1m":
    default:
      return 60;
  }
}

function makeFlatFallback(price: number, interval: string) {
  const count = interval === "30D" ? 12 : interval === "1D" ? 30 : 80;
  const step = intervalToSeconds(interval);
  const now = Math.floor(Date.now() / 1000);
  const close = Number(Math.max(0.01, price).toFixed(2));

  return Array.from({ length: count }, (_, index) => {
    const remaining = count - index;

    return {
      time: now - remaining * step,
      open: close,
      high: close,
      low: close,
      close,
    };
  });
}

export default function StreamerChart({
  streamer,
}: {
  streamer: Streamer;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);

  const [interval, setIntervalValue] = useState("1D");

  async function loadCandles() {
    if (!streamer?.id || !seriesRef.current) return;

    const { data, error } = await supabase
      .from("price_candles")
      .select("created_at,open,high,low,close")
      .eq("streamer_id", streamer.id)
      .eq("interval", interval)
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error("Failed to load price candles:", error);
    }

    if (!data?.length) {
      const fallback = makeFlatFallback(priceFor(streamer), interval);
      seriesRef.current.setData(fallback);
      chartRef.current?.timeScale().fitContent();
      return;
    }

    const formatted = data
      .map((c) => ({
        time: Math.floor(new Date(c.created_at).getTime() / 1000),
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
      }))
      .filter(
        (c) =>
          Number.isFinite(c.time) &&
          Number.isFinite(c.open) &&
          Number.isFinite(c.high) &&
          Number.isFinite(c.low) &&
          Number.isFinite(c.close)
      );

    seriesRef.current.setData(formatted);
    chartRef.current?.timeScale().fitContent();
  }

  useEffect(() => {
    if (!ref.current) return;

    ref.current.innerHTML = "";

    const chart = createChart(ref.current, {
      height: ref.current.clientHeight || 480,

      layout: {
        background: {
          type: ColorType.Solid,
          color: "transparent",
        },
        textColor:
          getComputedStyle(document.documentElement).getPropertyValue("--muted") ||
          "#9aa4b2",
      },

      grid: {
        vertLines: {
          color: "rgba(140,140,160,.12)",
        },
        horzLines: {
          color: "rgba(140,140,160,.12)",
        },
      },

      rightPriceScale: {
        borderColor: "rgba(140,140,160,.25)",
      },

      timeScale: {
        borderColor: "rgba(140,140,160,.25)",
        timeVisible: true,
      },

      handleScroll: true,
      handleScale: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#00d084",
      downColor: "#ff4d6d",
      borderVisible: false,
      wickUpColor: "#00d084",
      wickDownColor: "#ff4d6d",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    loadCandles();

    const resize = () =>
      chart.applyOptions({
        width: ref.current?.clientWidth || 0,
        height: ref.current?.clientHeight || 480,
      });

    window.addEventListener("resize", resize);

    resize();

    const channel = supabase
      .channel(`candles-${streamer.id}-${interval}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "price_candles",
          filter: `streamer_id=eq.${streamer.id}`,
        },
        () => {
          loadCandles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("resize", resize);
      chart.remove();
    };
  }, [streamer, interval]);

  return (
    <div>
      <div className="timeframe-row">
        {intervals.map((x) => (
          <button
            key={x}
            className={x === interval ? "primary-btn" : "ghost-btn"}
            onClick={() => setIntervalValue(x)}
            type="button"
          >
            {x}
          </button>
        ))}
      </div>

      <div ref={ref} className="chart-host" />
    </div>
  );
}
