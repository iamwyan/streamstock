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

export async function GET() {
  const tokenData = await getTwitchToken();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return NextResponse.json({ error: "No Twitch token", tokenData }, { status: 500 });
  }

  const { data: streamers } = await supabase
    .from("streamers")
    .select("id,ticker,twitch_login");

  if (!streamers?.length) {
    return NextResponse.json({ message: "No streamers found" });
  }

  const logins = streamers
    .map((s) => s.twitch_login)
    .filter(Boolean);

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
    const twitchUser = twitchUsers.find(
      (u: any) => u.login.toLowerCase() === streamer.twitch_login?.toLowerCase()
    );

    const live = liveStreams.find(
      (s: any) => s.user_login.toLowerCase() === streamer.twitch_login?.toLowerCase()
    );

    if (!twitchUser) continue;

    const avgViewers = live ? Number(live.viewer_count || 0) : 0;

    const recentGrowth = live ? Math.min(15, avgViewers / 10000) : -0.25;

    const marketDemand = live
      ? Math.min(100, 50 + avgViewers / 1000)
      : 35;

    const { error } = await supabase
      .from("streamers")
      .update({
        display_name: twitchUser.display_name,
        avg_viewers: avgViewers,
        recent_growth: recentGrowth,
        market_demand: marketDemand,
      })
      .eq("id", streamer.id);

    updates.push({
      ticker: streamer.ticker,
      twitch_login: streamer.twitch_login,
      live: Boolean(live),
      viewers: avgViewers,
      error,
    });
  }

  return NextResponse.json({
    success: true,
    updated: updates,
  });
}