import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getTwitchToken() {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.TWITCH_CLIENT_ID!,
      client_secret: process.env.TWITCH_CLIENT_SECRET!,
      grant_type: "client_credentials",
    }),
  });

  return res.json();
}

export async function POST(req: Request) {
  const supabase = getAdminSupabase();

  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json(
      { error: "Not logged in." },
      { status: 401 }
    );
  }

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json(
      { error: "Invalid session." },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json(
      { error: "Admin only." },
      { status: 403 }
    );
  }

  const body = await req.json();

  const ticker = String(body.ticker || "")
    .trim()
    .toUpperCase();

  const twitchLogin = String(body.twitchLogin || "")
    .trim()
    .toLowerCase();

  const startingPrice = Number(
    body.startingPrice || 25
  );

  if (!ticker || !twitchLogin) {
    return NextResponse.json(
      {
        error:
          "Ticker and Twitch username are required.",
      },
      { status: 400 }
    );
  }

  const tokenData = await getTwitchToken();

  if (!tokenData.access_token) {
    return NextResponse.json(
      {
        error: "Could not get Twitch token.",
        tokenData,
      },
      { status: 500 }
    );
  }

  const twitchRes = await fetch(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(
      twitchLogin
    )}`,
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Client-Id":
          process.env.TWITCH_CLIENT_ID!,
      },
    }
  );

  const twitchJson = await twitchRes.json();
  const twitchUser = twitchJson.data?.[0];

  if (!twitchUser) {
    return NextResponse.json(
      { error: "Twitch user not found." },
      { status: 404 }
    );
  }

  const { data: streamer, error } =
    await supabase
      .from("streamers")
      .insert({
        ticker,
        display_name:
          twitchUser.display_name,
        twitch_login: twitchUser.login,
        followers: 0,
        avg_viewers: 0,
        stream_hours: 0,
        recent_growth: 0,
        market_demand: 35,
        current_price: startingPrice,
      })
      .select()
      .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  // AUTO TRIGGER TWITCH SYNC
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL;

    if (siteUrl) {
      await fetch(
        `${siteUrl}/api/twitch/sync`
      );
    }
  } catch (err) {
    console.error(
      "Failed to auto-sync Twitch:",
      err
    );
  }

  return NextResponse.json({
    success: true,
    streamer,
  });
}