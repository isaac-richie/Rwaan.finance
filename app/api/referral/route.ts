import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase";

function generateCode(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("ref_codes")
    .select("wallet")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.wallet) {
    return NextResponse.json({ wallet: null }, { status: 200 });
  }

  return NextResponse.json({ wallet: data.wallet }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { wallet?: string };
    const wallet = body.wallet?.toLowerCase();
    if (!wallet) {
      return NextResponse.json({ error: "wallet is required" }, { status: 400 });
    }

    const existing = await supabaseAdmin
      .from("ref_codes")
      .select("code")
      .eq("wallet", wallet)
      .maybeSingle();

    if (existing.data?.code) {
      return NextResponse.json({ code: existing.data.code }, { status: 200 });
    }

    for (let i = 0; i < 5; i += 1) {
      const code = generateCode();
      const { error } = await supabaseAdmin
        .from("ref_codes")
        .insert({ code, wallet })
        .select("code")
        .maybeSingle();

      if (!error) {
        return NextResponse.json({ code }, { status: 200 });
      }
    }

    return NextResponse.json(
      { error: "Unable to allocate referral code" },
      { status: 500 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid payload" },
      { status: 400 }
    );
  }
}
