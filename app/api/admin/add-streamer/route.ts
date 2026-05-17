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

    if (
      !ticker ||
      !twitchLogin ||
      !startingPrice
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields.",
        },
        { status: 400 }
      );
    }

    // Auth check
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
      error: authError,
    } = await supabase.auth.getUser(
      token
    );

    if (authError || !user) {
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

    // Get Twitch user
    const twitchRes = await fetch(
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

    const twitchData =
      await twitchRes.json();

    const twitchUser =
      twitchData.data?.[0];

    if (!twitchUser) {
      return NextResponse.json(
        {
          error:
            "Twitch user not found.",
        },
        { status: 404 }
      );
    }

    // Prevent duplicate ticker
    const { data: existing } =
      await supabase
        .from("streamers")
        .select("id")
        .eq(
          "ticker",
          ticker.toUpperCase()
        )
        .single();

    if (existing) {
      return NextResponse.json(
        {
          error:
            "Ticker already exists.",
        },
        { status: 400 }
      );
    }

    // Default liquidity
    const liquidity =
      twitchUser.broadcaster_type ===
      "partner"
        ? 750000
        : 250000;

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
          current_price:
            Number(startingPrice),
          profile_image_url:
            twitchUser.profile_image_url,
          followers: 0,
          avg_viewers: 0,
          stream_hours: 0,
          recent_growth: 0,
          market_demand: 50,
          liquidity,
        })
        .select()
        .single();

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          error:
            error.message ||
            "Failed to add streamer.",
        },
        { status: 500 }
      );
    }

    // Fire and forget sync
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