/**
 * Referral codes — one per wallet, one wallet per code.
 *
 *   GET  ?wallet=0x..   → { code } the wallet already owns, or { code: null }
 *   POST { wallet, code, signature }
 *        → claims `code` for `wallet`, after verifying:
 *          1. the signature over a fixed message recovers to `wallet`
 *             (proves the claimer controls the wallet — a code can only ever
 *              point to a wallet its owner signed for),
 *          2. the wallet is a valid referrer (on-chain staker, not blocked),
 *          3. the wallet has no code yet, and the code isn't taken.
 *
 * The signed message is reconstructed server-side from the posted wallet+code,
 * so a signature captured for one code can't be replayed to claim another.
 */
import { NextResponse } from "next/server";
import { getAddress, isAddress, verifyMessage } from "viem";
import { supabaseAdmin } from "@/lib/server/supabase";
import { normalizeCode, validateReferrer } from "@/lib/server/referrer";

export const dynamic = "force-dynamic";

/** Canonical message the frontend must sign. Keep in sync with the client. */
export function claimMessage(code: string, walletChecksum: string): string {
  return `Claim RWAAN referral code "${code}" for ${walletChecksum}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ code: null, reason: "invalid address" }, { status: 400 });
  }
  try {
    const { data } = await supabaseAdmin
      .from("referral_codes")
      .select("code")
      .eq("wallet", wallet)
      .maybeSingle();
    return NextResponse.json({ code: data?.code ?? null });
  } catch {
    return NextResponse.json({ code: null });
  }
}

export async function POST(request: Request) {
  let body: { wallet?: string; code?: string; signature?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad request" }, { status: 400 });
  }

  const walletRaw = body.wallet?.toLowerCase();
  if (!walletRaw || !isAddress(walletRaw)) {
    return NextResponse.json({ ok: false, reason: "invalid address" }, { status: 400 });
  }
  const code = body.code ? normalizeCode(body.code) : null;
  if (!code) {
    return NextResponse.json(
      { ok: false, reason: "code must be 3–16 letters or numbers" },
      { status: 400 },
    );
  }
  const signature = body.signature;
  if (!signature || !/^0x[0-9a-fA-F]+$/.test(signature)) {
    return NextResponse.json({ ok: false, reason: "missing signature" }, { status: 400 });
  }

  const walletChecksum = getAddress(walletRaw);

  // 1) signature must recover to the wallet claiming the code
  let sigOk = false;
  try {
    sigOk = await verifyMessage({
      address: walletChecksum,
      message: claimMessage(code, walletChecksum),
      signature: signature as `0x${string}`,
    });
  } catch {
    sigOk = false;
  }
  if (!sigOk) {
    return NextResponse.json({ ok: false, reason: "signature does not match wallet" }, { status: 401 });
  }

  // 2) only real referrers (on-chain stakers, not blocked) may hold a code
  const check = await validateReferrer(walletRaw);
  if (!check.valid) {
    return NextResponse.json({ ok: false, reason: check.reason }, { status: 403 });
  }

  // 3) one code per wallet — return the existing one instead of erroring
  try {
    const { data: existing } = await supabaseAdmin
      .from("referral_codes")
      .select("code")
      .eq("wallet", walletRaw)
      .maybeSingle();
    if (existing?.code) {
      return NextResponse.json({ ok: true, code: existing.code, existing: true });
    }
  } catch {
    return NextResponse.json({ ok: false, reason: "codes unavailable" }, { status: 500 });
  }

  // 4) claim — the PK on `code` and UNIQUE on `wallet` enforce both directions;
  //    a race that loses the insert surfaces as a conflict.
  const { error } = await supabaseAdmin.from("referral_codes").insert({
    code,
    wallet: walletRaw,
  });
  if (error) {
    const taken = /duplicate|unique|conflict/i.test(error.message);
    return NextResponse.json(
      { ok: false, reason: taken ? "that code is already taken" : error.message },
      { status: taken ? 409 : 500 },
    );
  }

  return NextResponse.json({ ok: true, code });
}
