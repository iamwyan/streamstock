import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

function calculateLiquidity(followers: number, viewers: number) {
  let baseLiquidity = 120000;

  if (followers >= 10000000) {
    baseLiquidity = 5000000;
  } else if (followers >= 5000000) {
    baseLiquidity = 3000000;
  } else if (followers >= 2000000) {
    baseLiquidity = 1750000;
  } else if (followers >= 1000000) {
    baseLiquidity = 900000;
  } else if (followers >= 500000) {
    baseLiquidity = 450000;
  } else if (followers >= 100000) {
    baseLiquidity = 220000;
  }

  // Live viewers temporarily add liquidity so hot/live streamers
  // are slightly harder to manipulate during hype.
  const liveBoost = viewers * 12;

  return Math.round(baseLiquidity + liveBoost);
}

export async function GET() {
  const tokenData = await getTwitchToken();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return NextResponse.json(
      { error: "No Twitch token", tokenData },
      { status: 500 }
    );
  }

  const { data: streamers, error: streamerError } = await supabase
    .from("streamers")
    .select("id,ticker,twitch_login,followers,liquidity");

  if (streamerError) {
    return NextResponse.json(
      { error: streamerError.message },
      { status: 500 }
    );
  }

  if (!streamers?.length) {
    return NextResponse.json({
      message: "No streamers found",
    });
  }

  const logins = streamers
    .map((s) => s.twitch_login)
    .filter(Boolean);

  if (!logins.length) {
    return NextResponse.json({
      message: "No Twitch logins found",
    });
  }

  const usersUrl =
    "https://api.twitch.tv/helix/users?" +
    logins.map((login) => `login=${encodeURIComponent(login)}`).join("&");

  const usersRes = await fetch(usersUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": process.env.TWITCH_CLIENT_ID!,
    },
  });

  const usersJson = await usersRes.json();
  const twitchUsers = usersJson.data || [];

  const streamUrl =
    "https://api.twitch.tv/helix/streams?" +
    logins.map((login) => `user_login=${encodeURIComponent(login)}`).join("&");

  const streamsRes = await fetch(streamUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": process.env.TWITCH_CLIENT_ID!,
    },
  });

  const streamsJson = await streamsRes.json();
  const liveStreams = streamsJson.data || [];

  const updates = [];

  for (const streamer of streamers) {
    const twitchLogin = streamer.twitch_login?.toLowerCase();

    const twitchUser = twitchUsers.find(
      (u: any) => u.login.toLowerCase() === twitchLogin
    );

    const live = liveStreams.find(
      (s: any) => s.user_login.toLowerCase() === twitchLogin
    );

    if (!twitchUser) continue;

    const avgViewers = live ? Number(live.viewer_count || 0) : 0;

    const recentGrowth = live ? Math.min(15, avgViewers / 10000) : -0.25;

    const marketDemand = live ? Math.min(100, 50 + avgViewers / 1000) : 35;

    // Twitch Helix /users does NOT return follower count.
    // Keep the follower value already stored in Supabase.
    const followers = Number(streamer.followers || 0);

    const liquidity = calculateLiquidity(followers, avgViewers);

    const { error } = await supabase
      .from("streamers")
      .update({
        display_name: twitchUser.display_name,
        profile_image_url: twitchUser.profile_image_url,
        avg_viewers: avgViewers,
        recent_growth: recentGrowth,
        market_demand: marketDemand,
        liquidity,
      })
      .eq("id", streamer.id);

    updates.push({
      ticker: streamer.ticker,
      twitch_login: streamer.twitch_login,
      live: Boolean(live),
      viewers: avgViewers,
      followers,
      liquidity,
      error,
    });
  }

  return NextResponse.json({
    success: true,
    updated: updates,
  });
}
