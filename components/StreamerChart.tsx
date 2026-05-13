"use client";
import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries } from "lightweight-charts";
import { seedCandles, type Streamer } from "@/lib/market";

const intervals = ["1m", "5m", "10m", "1D", "30D"];

export default function StreamerChart({ streamer }: { streamer: Streamer }) {
  const ref = useRef<HTMLDivElement>(null);
  const [interval, setIntervalValue] = useState("1D");
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const chart = createChart(ref.current, {
      height: ref.current.clientHeight || 480,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: getComputedStyle(document.documentElement).getPropertyValue("--muted") || "#9aa4b2" },
      grid: { vertLines: { color: "rgba(140,140,160,.12)" }, horzLines: { color: "rgba(140,140,160,.12)" } },
      rightPriceScale: { borderColor: "rgba(140,140,160,.25)" },
      timeScale: { borderColor: "rgba(140,140,160,.25)", timeVisible: true },
      handleScroll: true,
      handleScale: true
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#00d084", downColor: "#ff4d6d", borderVisible: false, wickUpColor: "#00d084", wickDownColor: "#ff4d6d"
    });
    series.setData(seedCandles(streamer, interval, interval === "30D" ? 120 : 90) as any);
    chart.timeScale().fitContent();
    const resize = () => chart.applyOptions({ width: ref.current?.clientWidth || 0, height: ref.current?.clientHeight || 480 });
    window.addEventListener("resize", resize); resize();
    return () => { window.removeEventListener("resize", resize); chart.remove(); };
  }, [streamer, interval]);
  return <div>
    <div className="timeframe-row">{intervals.map(x => <button key={x} className={x === interval ? "primary-btn" : "ghost-btn"} onClick={() => setIntervalValue(x)}>{x}</button>)}</div>
    <div ref={ref} className="chart-host" />
    <p className="muted">Scroll to move through candles. Pinch or mouse wheel to zoom.</p>
  </div>;
}
