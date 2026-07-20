/**
 * Validates a referral link before the frontend stores the referrer.
 *
 * The staker check reads `totalUserStaked` straight from the contract rather
 * than from leaderboard_stats. Supabase lags the chain by however long it has
 * been since the indexer last ran, and a lagging read here silently drops real
 * referrals: a legitimate staker's link is rejected, the referrer is never
 * stored, and the referee then stakes with a zero referrer — which emits no
 * ReferrerSet event, so the referral is lost with no way to recover it.
 *
 * The blocklist stays on Supabase; it's admin-set state, not chain-derived,
 * so it has no staleness problem.
 */
import { NextResponse } from "next/server";
import { createPublicClient, http, isAddress, getAddress } from "viem";
import { bsc } from "viem/chains";
import { supabaseAdmin } from "@/lib/server/supabase";

export const revalidate = 30;

const STAKING_ABI = [
  {
    type: "function",
    name: "totalUserStaked",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();

  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ valid: false, reason: "invalid address" });
  }

  // Blocklist first — it's the cheap check, and a blocked referrer should be
  // rejected regardless of stake. Table may not exist yet: treat as unblocked.
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
    // blocked_referrers not provisioned — skip
  }

  const staking =
    process.env.RWAN_V5_STAKING_ADDRESS || process.env.NEXT_PUBLIC_RWAN_V5_STAKING_ADDRESS;

  // Try every configured endpoint in turn. `||` is not enough: a key that is
  // present but rate-capped (Alchemy 429) is truthy, so it would be picked and
  // never fall through — silently dropping every referral. We must actually
  // retry on error, ending at the public BSC node which has no cap.
  const endpoints = [
    process.env.BSC_ALCHEMY_RPC_URL,
    process.env.BSC_ALCHEMY_RPC_URL2,
    process.env.BSC_ALCHEMY_RPC_URL3,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
    process.env.BSC_RPC_URL,
    "https://bsc-dataseed.binance.org/",
  ].filter((u): u is string => Boolean(u));

  if (!staking || endpoints.length === 0) {
    return NextResponse.json({ valid: false, reason: "referral check unavailable" });
  }

  let staked: bigint | null = null;
  for (const rpc of endpoints) {
    try {
      // Fail fast per endpoint: no retries and a short timeout, so a capped or
      // slow endpoint is abandoned in ~1 attempt rather than burning seconds of
      // backoff before we fall through to the next one.
      const client = createPublicClient({
        chain: bsc,
        transport: http(rpc, { retryCount: 0, timeout: 4_000 }),
      });
      staked = (await client.readContract({
        address: getAddress(staking),
        abi: STAKING_ABI,
        functionName: "totalUserStaked",
        args: [getAddress(wallet)],
      })) as bigint;
      break; // got a definitive answer — stop trying endpoints
    } catch {
      // this endpoint errored (cap/timeout) — fall through to the next
    }
  }

  // Never fail open: if no endpoint answered, treat as unverified rather than
  // storing an unchecked referrer. Distinct reason so the caller can tell this
  // apart from a genuine "not a staker".
  if (staked === null) {
    return NextResponse.json({ valid: false, reason: "referral check unavailable" });
  }

  if (staked === 0n) {
    return NextResponse.json({ valid: false, reason: "referrer has no active stake" });
  }

  return NextResponse.json({ valid: true });
}
