import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase";

type NotificationInsert = {
  id: string;
  wallet: string;
  title: string;
  description?: string;
  kind?: string;
  amount?: string;
  timestamp: number;
  read: boolean;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();
  if (!wallet) {
    return NextResponse.json({ error: "wallet is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("wallet", wallet)
    .order("timestamp", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notifications: data ?? [] }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NotificationInsert;
    if (!body?.wallet || !body?.id || !body?.title) {
      return NextResponse.json(
        { error: "wallet, id, and title are required" },
        { status: 400 }
      );
    }

    const payload: NotificationInsert = {
      id: body.id,
      wallet: body.wallet.toLowerCase(),
      title: body.title,
      description: body.description,
      kind: body.kind,
      amount: body.amount,
      timestamp: body.timestamp ?? Date.now(),
      read: Boolean(body.read),
    };

    const { error } = await supabaseAdmin
      .from("notifications")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid payload" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      wallet?: string;
      action?: "markRead" | "markAllRead" | "clearAll";
      id?: string;
    };

    const wallet = body.wallet?.toLowerCase();
    if (!wallet || !body.action) {
      return NextResponse.json(
        { error: "wallet and action are required" },
        { status: 400 }
      );
    }

    if (body.action === "clearAll") {
      const { error } = await supabaseAdmin
        .from("notifications")
        .delete()
        .eq("wallet", wallet);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (body.action === "markAllRead") {
      const { error } = await supabaseAdmin
        .from("notifications")
        .update({ read: true })
        .eq("wallet", wallet);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (body.action === "markRead" && body.id) {
      const { error } = await supabaseAdmin
        .from("notifications")
        .update({ read: true })
        .eq("wallet", wallet)
        .eq("id", body.id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    return NextResponse.json(
      { error: "Invalid action or missing id" },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid payload" },
      { status: 400 }
    );
  }
}
