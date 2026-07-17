import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase";

export const revalidate = 30; // cache ranked list for 30s

const METRICS = {
  active_staked: "active_staked",
  total_staked: "total_staked",
  rewards_earned: "rewards_earned",
  referral_earned: "referral_earned",
} as const;
type Metric = keyof typeof METRICS;

type Row = {
  wallet: string;
  active_staked: string;
  total_staked: string;
  rewards_earned: string;
  referral_earned: string;
  positions: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const metricParam = searchParams.get("metric") ?? "active_staked";
  const metric: Metric = metricParam in METRICS ? (metricParam as Metric) : "active_staked";
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 50), 1), 100);
  const wallet = searchParams.get("wallet")?.toLowerCase() ?? null;

  const column = METRICS[metric];

  // Top N by the chosen metric.
  const { data, error } = await supabaseAdmin
    .from("leaderboard_stats")
    .select("wallet, active_staked, total_staked, rewards_earned, referral_earned, positions")
    .gt(column, 0)
    .order(column, { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];
  const leaders = rows.map((r, i) => ({ rank: i + 1, ...r }));

  // Resolve the caller's own rank even if they're outside the top N.
  let me: (Row & { rank: number }) | null = null;
  if (wallet) {
    const inTop = leaders.find((r) => r.wallet === wallet);
    if (inTop) {
      me = inTop;
    } else {
      const { data: mine } = await supabaseAdmin
        .from("leaderboard_stats")
        .select("wallet, active_staked, total_staked, rewards_earned, referral_earned, positions")
        .eq("wallet", wallet)
        .maybeSingle();
      if (mine) {
        const value = (mine as Row)[column] as string;
        // rank = count of wallets strictly ahead + 1
        const { count } = await supabaseAdmin
          .from("leaderboard_stats")
          .select("wallet", { count: "exact", head: true })
          .gt(column, value);
        me = { rank: (count ?? 0) + 1, ...(mine as Row) };
      }
    }
  }

  return NextResponse.json({ metric, leaders, me });
}
