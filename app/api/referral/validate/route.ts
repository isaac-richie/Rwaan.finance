/**
 * Validates a referral link before the frontend stores the referrer.
 *
 * The staker check reads `totalUserStaked` straight from the contract rather
 * than from leaderboard_stats — a lagging read here silently drops real
 * referrals. See lib/server/referrer.ts for the shared logic.
 */
import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { validateReferrer } from "@/lib/server/referrer";

export const revalidate = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();

  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ valid: false, reason: "invalid address" });
  }

  return NextResponse.json(await validateReferrer(wallet));
}
