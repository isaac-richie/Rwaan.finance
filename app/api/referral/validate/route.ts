import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { supabaseAdmin } from "@/lib/server/supabase";

export const revalidate = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();

  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ valid: false, reason: "invalid address" });
  }

  // Check if referrer has an active stake
  const { data: stats } = await supabaseAdmin
    .from("leaderboard_stats")
    .select("active_staked")
    .eq("wallet", wallet)
    .maybeSingle();

  if (!stats || BigInt(stats.active_staked ?? 0) === 0n) {
    return NextResponse.json({ valid: false, reason: "referrer has no active stake" });
  }

  // Check if referrer is blocked (table may not exist yet — treat as not blocked)
  try {
    const { data: blocked } = await supabaseAdmin
      .from("blocked_referrers")
      .select("wallet")
      .eq("wallet", wallet)
      .maybeSingle();

    if (blocked) {
      return NextResponse.json({ valid: false, reason: "referrer is blocked" });
    }
  } catch {
    // Table doesn't exist yet — skip block check
  }

  return NextResponse.json({ valid: true });
}
