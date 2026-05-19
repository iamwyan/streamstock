import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase environment variables." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("trades")
      .select("total")
      .gte("created_at", since);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const total = (data || []).reduce(
      (sum, trade) => sum + Number(trade.total || 0),
      0
    );

    return NextResponse.json({
      success: true,
      total,
      since,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load 24h cash flow." },
      { status: 500 }
    );
  }
}
