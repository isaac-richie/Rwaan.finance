import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { supabaseAdmin } from "@/lib/server/supabase";

const ADMIN_WALLET = process.env.DEPLOYER_WALLET?.toLowerCase() ?? "0xd70cb45504251b8fe08e467109b0c7d7cb880153";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const { wallet, reason, admin } = body as { wallet?: string; reason?: string; admin?: string };

  if (!admin || admin.toLowerCase() !== ADMIN_WALLET) return unauthorized();
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: "invalid wallet" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("blocked_referrers")
    .upsert({ wallet: wallet.toLowerCase(), reason: reason ?? "", blocked_at: new Date().toISOString() });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ blocked: true, wallet: wallet.toLowerCase() });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();
  const admin = searchParams.get("admin")?.toLowerCase();

  if (!admin || admin !== ADMIN_WALLET) return unauthorized();
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: "invalid wallet" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("blocked_referrers")
    .delete()
    .eq("wallet", wallet);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ unblocked: true, wallet });
}
