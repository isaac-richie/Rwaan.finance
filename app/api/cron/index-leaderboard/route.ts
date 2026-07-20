/**
 * Vercel Cron: reconciles on-chain staking/referral events into Supabase.
 *
 * Without this the network dashboard silently goes stale — affiliate earnings
 * and new referrals only land in Supabase when the indexer runs.
 *
 * Required env vars:
 *   CRON_SECRET              — Vercel cron bearer token (auto-set by Vercel)
 *   BSC_ALCHEMY_RPC_URL      — BSC RPC
 *   RWAN_V5_STAKING_ADDRESS  — falls back to NEXT_PUBLIC_RWAN_V5_STAKING_ADDRESS
 *   RWAN_V5_DEPLOY_BLOCK     — first block to scan on a cold start
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { NextRequest, NextResponse } from "next/server";
import { runLeaderboardIndex } from "@/lib/server/leaderboard-indexer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Vercel passes CRON_SECRET as a Bearer token. Matches the guard used by
  // the update-min-stake job: when the secret is unset (local dev) we skip
  // the check rather than lock the route out entirely.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runLeaderboardIndex();
    return NextResponse.json(result, { status: result.ok ? 200 : 200 });
  } catch (err) {
    // Returning 500 (not throwing) keeps the cron log readable. The block
    // cursor is only advanced on success, so the next run retries this range.
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "index failed" },
      { status: 500 },
    );
  }
}
