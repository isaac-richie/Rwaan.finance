/**
 * Resolve a "referred by" input — a referral code OR a raw 0x address — into a
 * validated referrer address the frontend can pass to stake().
 *
 * Response: { valid, referrer?, reason? }
 *   valid=true  → referrer is a resolved, checksummed, on-chain-staker address
 *   valid=false → reason explains why (unknown code, not a staker, blocked, …)
 */
import { NextResponse } from "next/server";
import { resolveReferrerInput, validateReferrer } from "@/lib/server/referrer";

export const revalidate = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input")?.trim();

  if (!input) {
    return NextResponse.json({ valid: false, reason: "no code or address given" });
  }

  const referrer = await resolveReferrerInput(input);
  if (!referrer) {
    return NextResponse.json({ valid: false, reason: "unknown referral code" });
  }

  const check = await validateReferrer(referrer);
  if (!check.valid) {
    return NextResponse.json({ valid: false, reason: check.reason });
  }

  return NextResponse.json({ valid: true, referrer });
}
