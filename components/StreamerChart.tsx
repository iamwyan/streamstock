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

    const { data } = await supabase
      .from("price_candles")
      .select("*")
      .eq("streamer_id", streamer.id)
      .eq("interval", interval)
      .order("created_at", {
        ascending: true,
      });

    // no candles yet? seed from current price
    if (!data?.length) {
      const current = priceFor(streamer);

      const candles = [];
      let lastClose = current;

      const count = interval === "30D" ? 60 : 80;

      for (let i = count; i > 0; i--) {
        const movement =
          (Math.random() - 0.48) *
          current *
          0.012;

        const open = lastClose;
        const close = Math.max(
          0.01,
          open + movement
        );

        const high =
          Math.max(open, close) +
          Math.random() *
            current *
            0.006;

        const low = Math.max(
          0.01,
          Math.min(open, close) -
            Math.random() *
              current *
              0.006
        );

        candles.push({
          time:
            Math.floor(Date.now() / 1000) -
            i * 60,
          open: Number(open.toFixed(2)),
          high: Number(high.toFixed(2)),
          low: Number(low.toFixed(2)),
          close: Number(close.toFixed(2)),
        });

        lastClose = close;
      }

      seriesRef.current.setData(
        candles
      );
      return;
    }

    const formatted = data.map(
      (c) => ({
        time: Math.floor(
          new Date(
            c.created_at
          ).getTime() / 1000
        ),
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
      })
    );

    seriesRef.current.setData(
      formatted
    );
  }

  useEffect(() => {
    if (!ref.current) return;

    ref.current.innerHTML = "";

    const chart = createChart(
      ref.current,
      {
        height:
          ref.current.clientHeight ||
          480,

        layout: {
          background: {
            type: ColorType.Solid,
            color: "transparent",
          },
          textColor:
            getComputedStyle(
              document.documentElement
            ).getPropertyValue(
              "--muted"
            ) || "#9aa4b2",
        },

        grid: {
          vertLines: {
            color:
              "rgba(140,140,160,.12)",
          },
          horzLines: {
            color:
              "rgba(140,140,160,.12)",
          },
        },

        rightPriceScale: {
          borderColor:
            "rgba(140,140,160,.25)",
        },

        timeScale: {
          borderColor:
            "rgba(140,140,160,.25)",
          timeVisible: true,
        },

        handleScroll: true,
        handleScale: true,
      }
    );

    const series = chart.addSeries(
      CandlestickSeries,
      {
        upColor: "#00d084",
        downColor: "#ff4d6d",
        borderVisible: false,
        wickUpColor: "#00d084",
        wickDownColor: "#ff4d6d",
      }
    );

    chartRef.current = chart;
    seriesRef.current = series;

    loadCandles();

    chart.timeScale().fitContent();

    const resize = () =>
      chart.applyOptions({
        width:
          ref.current?.clientWidth ||
          0,
        height:
          ref.current
            ?.clientHeight || 480,
      });

    window.addEventListener(
      "resize",
      resize
    );

    resize();

    // realtime updates
    const channel = supabase
      .channel(
        `candles-${streamer.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "price_candles",
        },
        () => {
          loadCandles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );

      window.removeEventListener(
        "resize",
        resize
      );

      chart.remove();
    };
  }, [streamer, interval]);

  return (
    <div>
      <div className="timeframe-row">
        {intervals.map((x) => (
          <button
            key={x}
            className={
              x === interval
                ? "primary-btn"
                : "ghost-btn"
            }
            onClick={() =>
              setIntervalValue(x)
            }
          >
            {x}
          </button>
        ))}
      </div>

      <div
        ref={ref}
        className="chart-host"
      />

      <p className="muted">
        Scroll to move through
        candles. Pinch or mouse
        wheel to zoom.
      </p>
    </div>
  );
}