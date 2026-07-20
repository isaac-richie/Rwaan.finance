import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase";

export const revalidate = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();

  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }

  // L1 direct referrals with their individual stakes
  const { data: l1, error: l1Error } = await supabaseAdmin
    .from("referral_links")
    .select("referee, amount::text, joined_at")
    .eq("referrer", wallet)
    .order("amount", { ascending: false });

  if (l1Error) {
    return NextResponse.json({ error: l1Error.message }, { status: 500 });
  }

  const directMembers = l1 ?? [];
  const directAddresses = directMembers.map((r) => r.referee);

  // L2 members (referrals of L1)
  const { data: l2 } = directAddresses.length
    ? await supabaseAdmin
        .from("referral_links")
        .select("referee, referrer, amount::text")
        .in("referrer", directAddresses)
    : { data: [] };

  const l2Members = l2 ?? [];
  const l2Addresses = l2Members.map((r) => r.referee);

  // L3 members (referrals of L2)
  const { data: l3 } = l2Addresses.length
    ? await supabaseAdmin
        .from("referral_links")
        .select("referee, referrer, amount::text")
        .in("referrer", l2Addresses)
    : { data: [] };

  const l3Members = l3 ?? [];

  // Who referred this wallet
  const { data: upline } = await supabaseAdmin
    .from("referral_links")
    .select("referrer")
    .eq("referee", wallet)
    .maybeSingle();

  // Network stats summary
  const { data: stats } = await supabaseAdmin
    .from("network_stats")
    .select("*")
    .eq("wallet", wallet)
    .maybeSingle();

  // Affiliate earnings from leaderboard stats
  const { data: lbStats } = await supabaseAdmin
    .from("leaderboard_stats")
    .select("referral_earned::text")
    .eq("wallet", wallet)
    .maybeSingle();

  // Build L1 with their sub-member counts
  const l2ByReferrer: Record<string, typeof l2Members> = {};
  for (const m of l2Members) {
    if (!l2ByReferrer[m.referrer]) l2ByReferrer[m.referrer] = [];
    l2ByReferrer[m.referrer].push(m);
  }

  const l1WithSubs = directMembers.map((m) => ({
    ...m,
    sub_members: l2ByReferrer[m.referee]?.length ?? 0,
    sub_volume: (l2ByReferrer[m.referee] ?? []).reduce(
      (s, x) => s + BigInt(x.amount ?? 0),
      BigInt(0)
    ).toString(),
  }));

  // Identify big leg and small leg from L1 members by stake volume
  const sorted = [...l1WithSubs].sort(
    (a, b) => Number(BigInt(b.amount) - BigInt(a.amount))
  );
  const bigLeg = sorted[0] ?? null;
  const smallLegs = sorted.slice(1);
  const smallLegVolume = smallLegs.reduce(
    (s, m) => s + BigInt(m.amount ?? 0),
    BigInt(0)
  );

  return NextResponse.json({
    wallet,
    upline: upline?.referrer ?? null,
    direct_members: directMembers.length,
    l2_members: l2Members.length,
    l3_members: l3Members.length,
    total_members: directMembers.length + l2Members.length + l3Members.length,
    l1: l1WithSubs,
    big_leg: bigLeg
      ? {
          wallet: bigLeg.referee,
          volume: bigLeg.amount,
          sub_members: bigLeg.sub_members,
        }
      : null,
    small_leg_volume: smallLegVolume.toString(),
    small_leg_count: smallLegs.length,
    stats: stats ?? null,
    referral_earned: lbStats?.referral_earned ?? "0",
  });
}
