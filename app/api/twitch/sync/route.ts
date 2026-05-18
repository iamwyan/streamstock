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
    cache: "no-store",
  });

  const data = await res.json();

  if (!data.access_token) {
    throw new Error("Could not get Twitch token.");
  }

  return data.access_token as string;
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

  // Live viewers temporarily increase liquidity so live hype is harder to manipulate.
  const liveBoost = viewers * 12;

  return Math.round(baseLiquidity + liveBoost);
}

async function getFollowerCount(broadcasterId: string, accessToken: string) {
  const res = await fetch(
    `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${encodeURIComponent(
      broadcasterId
    )}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Client-Id": process.env.TWITCH_CLIENT_ID!,
      },
      cache: "no-store",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return {
      followers: 0,
      error: data?.message || "Could not fetch follower count.",
    };
  }

  return {
    followers: Number(data.total || 0),
    error: null,
  };
}

export async function GET() {
  try {
    const accessToken = await getTwitchToken();

    const { data: streamers, error: streamersError } = await supabase
      .from("streamers")
      .select("id,ticker,twitch_login,followers")
      .not("twitch_login", "is", null);

    if (streamersError) {
      throw new Error(streamersError.message);
    }

    if (!streamers?.length) {
      return NextResponse.json({
        success: true,
        updated: [],
        message: "No streamers found.",
      });
    }

    const logins = streamers
      .map((s) => String(s.twitch_login || "").trim().toLowerCase())
      .filter(Boolean);

    if (!logins.length) {
      return NextResponse.json({
        success: true,
        updated: [],
        message: "No Twitch logins found.",
      });
    }

    const twitchHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": process.env.TWITCH_CLIENT_ID!,
    };

    const usersUrl =
      "https://api.twitch.tv/helix/users?" +
      logins.map((login) => `login=${encodeURIComponent(login)}`).join("&");

    const streamsUrl =
      "https://api.twitch.tv/helix/streams?" +
      logins.map((login) => `user_login=${encodeURIComponent(login)}`).join("&");

    const [usersRes, streamsRes] = await Promise.all([
      fetch(usersUrl, {
        headers: twitchHeaders,
        cache: "no-store",
      }),
      fetch(streamsUrl, {
        headers: twitchHeaders,
        cache: "no-store",
      }),
    ]);

    const usersJson = await usersRes.json();
    const streamsJson = await streamsRes.json();

    if (!usersRes.ok) {
      throw new Error(usersJson?.message || "Could not fetch Twitch users.");
    }

    if (!streamsRes.ok) {
      throw new Error(streamsJson?.message || "Could not fetch Twitch streams.");
    }

    const twitchUsers = usersJson.data || [];
    const liveStreams = streamsJson.data || [];
    const updates = [];

    for (const streamer of streamers) {
      const twitchLogin = String(streamer.twitch_login || "").toLowerCase();

      const twitchUser = twitchUsers.find(
        (u: any) => String(u.login || "").toLowerCase() === twitchLogin
      );

      const live = liveStreams.find(
        (s: any) => String(s.user_login || "").toLowerCase() === twitchLogin
      );

      if (!twitchUser) {
        updates.push({
          ticker: streamer.ticker,
          twitch_login: streamer.twitch_login,
          live: false,
          viewers: 0,
          followers: Number(streamer.followers || 0),
          error: "Twitch user not found.",
        });
        continue;
      }

      const viewers = live ? Number(live.viewer_count || 0) : 0;

      const followerResult = await getFollowerCount(twitchUser.id, accessToken);
      const followers =
        followerResult.followers > 0
          ? followerResult.followers
          : Number(streamer.followers || 0);

      const recentGrowth = live ? Math.min(15, viewers / 10000) : -0.25;

      const marketDemand = live ? Math.min(100, 50 + viewers / 1000) : 35;

      const liquidity = calculateLiquidity(followers, viewers);

      const { error } = await supabase
        .from("streamers")
        .update({
          display_name: twitchUser.display_name,
          twitch_login: twitchUser.login,
          profile_image_url: twitchUser.profile_image_url,
          followers,
          avg_viewers: viewers,
          live: Boolean(live),
          recent_growth: recentGrowth,
          market_demand: marketDemand,
          liquidity,
        })
        .eq("id", streamer.id);

      updates.push({
        ticker: streamer.ticker,
        twitch_login: streamer.twitch_login,
        live: Boolean(live),
        viewers,
        followers,
        liquidity,
        follower_error: followerResult.error,
        error,
      });
    }

    return NextResponse.json({
      success: true,
      updated: updates,
    });
  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Twitch sync failed.",
      },
      { status: 500 }
    );
  }
}
