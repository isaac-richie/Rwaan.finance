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
  const rpc = process.env.BSC_ALCHEMY_RPC_URL || process.env.BSC_RPC_URL;

  if (!staking || !rpc) {
    return NextResponse.json({ valid: false, reason: "referral check unavailable" });
  }

  try {
    const client = createPublicClient({ chain: bsc, transport: http(rpc) });
    const staked = (await client.readContract({
      address: getAddress(staking),
      abi: STAKING_ABI,
      functionName: "totalUserStaked",
      args: [getAddress(wallet)],
    })) as bigint;

    if (staked === 0n) {
      return NextResponse.json({ valid: false, reason: "referrer has no active stake" });
    }
  } catch {
    // Never fail open on an RPC hiccup — an unverified referrer must not be
    // stored, but say so explicitly so the caller can distinguish this from
    // a genuine "not a staker" rejection.
    return NextResponse.json({ valid: false, reason: "referral check unavailable" });
  }

  return NextResponse.json({ valid: true });
}
