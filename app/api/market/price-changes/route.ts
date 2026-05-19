import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: streamers, error: streamersError } = await supabase
      .from("streamers")
      .select("id,ticker,liquidity,current_price");

    if (streamersError) {
      return NextResponse.json(
        { success: false, error: streamersError.message },
        { status: 500 }
      );
    }

    const { data: trades, error: tradesError } = await supabase
      .from("trades")
      .select("streamer_id,side,total,created_at")
      .gte("created_at", since);

    if (tradesError) {
      return NextResponse.json(
        { success: false, error: tradesError.message },
        { status: 500 }
      );
    }

    const byStreamer = new Map<string, { netFlow: number; buyVolume: number; sellVolume: number }>();

    for (const trade of trades || []) {
      const streamerId = String(trade.streamer_id || "");
      const total = Number(trade.total || 0);
      const side = String(trade.side || "").toLowerCase();

      if (!streamerId || !Number.isFinite(total)) continue;

      const current =
        byStreamer.get(streamerId) || { netFlow: 0, buyVolume: 0, sellVolume: 0 };

      if (side === "buy") {
        current.netFlow += total;
        current.buyVolume += total;
      } else if (side === "sell") {
        current.netFlow -= total;
        current.sellVolume += total;
      }

      byStreamer.set(streamerId, current);
    }

    const changes: Record<string, any> = {};

    for (const streamer of streamers || []) {
      const flow = byStreamer.get(String(streamer.id)) || {
        netFlow: 0,
        buyVolume: 0,
        sellVolume: 0,
      };

      const liquidity = Math.max(120000, Number(streamer.liquidity || 250000));

      // Matches the trade impact model:
      // impact decimal = tradeTotal / liquidity * 0.30
      // percent = impact * 100 = tradeTotal / liquidity * 30
      const rawPercent = (flow.netFlow / liquidity) * 30;
      const percent = Number(Math.max(-99, Math.min(99, rawPercent)).toFixed(2));

      changes[String(streamer.ticker || "").toUpperCase()] = {
        percent,
        netFlow: Number(flow.netFlow.toFixed(2)),
        buyVolume: Number(flow.buyVolume.toFixed(2)),
        sellVolume: Number(flow.sellVolume.toFixed(2)),
        liquidity,
      };
    }

    return NextResponse.json({
      success: true,
      since,
      changes,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
