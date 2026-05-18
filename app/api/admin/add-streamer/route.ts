import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getTwitchToken() {
  const res = await fetch(
    "https://id.twitch.tv/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id:
          process.env.TWITCH_CLIENT_ID!,
        client_secret:
          process.env.TWITCH_CLIENT_SECRET!,
        grant_type: "client_credentials",
      }),
    }
  );

  const data = await res.json();

  if (!data.access_token) {
    throw new Error(
      "Failed to get Twitch token"
    );
  }

  return data.access_token;
}

function calculateLiquidity(
  followers: number,
  viewers: number
) {
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

  const liveBoost = viewers * 12;

  return Math.round(
    baseLiquidity + liveBoost
  );
}

export async function POST(
  req: NextRequest
) {
  try {
    const body = await req.json();

    const {
      ticker,
      twitchLogin,
      startingPrice,
    } = body;

    const authHeader =
      req.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const token =
      authHeader.replace(
        "Bearer ",
        ""
      );

    const {
      data: { user },
    } = await supabase.auth.getUser(
      token
    );

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Invalid session.",
        },
        { status: 401 }
      );
    }

    const twitchToken =
      await getTwitchToken();

    // USER INFO
    const twitchUserRes =
      await fetch(
        `https://api.twitch.tv/helix/users?login=${encodeURIComponent(
          twitchLogin
        )}`,
        {
          headers: {
            Authorization: `Bearer ${twitchToken}`,
            "Client-Id":
              process.env
                .TWITCH_CLIENT_ID!,
          },
        }
      );

    const twitchUserJson =
      await twitchUserRes.json();

    const twitchUser =
      twitchUserJson.data?.[0];

    if (!twitchUser) {
      return NextResponse.json(
        {
          error:
            "Twitch user not found.",
        },
        { status: 404 }
      );
    }

    // FOLLOWERS
    const followerRes =
      await fetch(
        `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${twitchUser.id}`,
        {
          headers: {
            Authorization: `Bearer ${twitchToken}`,
            "Client-Id":
              process.env
                .TWITCH_CLIENT_ID!,
          },
        }
      );

    const followerJson =
      await followerRes.json();

    const followers = Number(
      followerJson.total || 0
    );

    // LIVE CHECK
    const liveRes = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(
        twitchLogin
      )}`,
      {
        headers: {
          Authorization: `Bearer ${twitchToken}`,
          "Client-Id":
            process.env
              .TWITCH_CLIENT_ID!,
        },
      }
    );

    const liveJson =
      await liveRes.json();

    const live =
      liveJson.data?.[0];

    const viewers = Number(
      live?.viewer_count || 0
    );

    const liquidity =
      calculateLiquidity(
        followers,
        viewers
      );

    const { data: streamer, error } =
      await supabase
        .from("streamers")
        .insert({
          ticker:
            ticker.toUpperCase(),
          twitch_login:
            twitchLogin.toLowerCase(),
          display_name:
            twitchUser.display_name,
          profile_image_url:
            twitchUser.profile_image_url,
          current_price:
            Number(startingPrice),

          followers,
          avg_viewers: viewers,
          live: Boolean(live),

          stream_hours: 0,
          recent_growth: live
            ? 5
            : 0,

          market_demand:
            live
              ? Math.min(
                  100,
                  50 +
                    viewers / 1000
                )
              : 50,

          liquidity,
        })
        .select()
        .single();

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        { status: 500 }
      );
    }

    // one-time sync
    const siteUrl =
      process.env
        .NEXT_PUBLIC_SITE_URL;

    if (siteUrl) {
      fetch(
        `${siteUrl}/api/twitch/sync`
      ).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      streamer,
    });
  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      {
        error:
          err.message ||
          "Server error",
      },
      { status: 500 }
    );
  }
}