import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  // Production path:
  // 1. Verify Supabase user session server-side.
  // 2. Fetch current streamer price from database.
  // 3. Validate user cash/shares.
  // 4. Insert order/trade in a transaction.
  // 5. Update holdings, cash balance, candles, and market demand.
  // 6. Return the executed order.

  return NextResponse.json({
    ok: false,
    message: "Backend order execution is scaffolded. Connect Supabase tables before enabling live orders.",
    received: body
  }, { status: 501 });
}
