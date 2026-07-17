import { NextRequest, NextResponse } from "next/server";

// Server-side only. Prefer non-NEXT_PUBLIC names so RPC provider keys never
// get bundled into the browser.
const RPC_ENDPOINTS = [
  process.env.BSC_ALCHEMY_RPC_URL,
  process.env.BSC_ALCHEMY_RPC_URL2,
  process.env.BSC_ALCHEMY_RPC_URL3,
  process.env.BSC_ALCHEMY_RPC_URL4,
  process.env.BSC_ALCHEMY_RPC_URL5,
  // Backward compatibility for existing local/Vercel envs. Move these to the
  // BSC_ALCHEMY_RPC_URL* names when updating deployment settings.
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY2,
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY3,
  process.env.NEXT_PUBLIC_ALCHEMY_API_KEY4,
  process.env.BSC_RPC_URL,
  "https://bsc-dataseed.binance.org",
  "https://bsc.publicnode.com",
].filter(Boolean) as string[];

export async function POST(req: NextRequest) {
  const body = await req.text();

  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // try next endpoint
    }
  }

  return NextResponse.json({ error: "All RPC endpoints failed" }, { status: 502 });
}
