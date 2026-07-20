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

// ---------------------------------------------------------------------------
// In-memory response cache for deterministic read calls (eth_call, etc.)
// TTL keeps it fresh while collapsing identical calls within a window.
// ---------------------------------------------------------------------------
const CACHEABLE_METHODS = new Set([
  "eth_call",
  "eth_getBalance",
  "eth_getCode",
  "eth_getStorageAt",
  "eth_blockNumber",
]);
const CACHE_TTL_MS = 5_000;
const MAX_CACHE_SIZE = 500;

type CacheEntry = { data: unknown; expires: number };
const rpcCache = new Map<string, CacheEntry>();

function cacheKey(method: string, params: unknown): string {
  return `${method}:${JSON.stringify(params)}`;
}

function getCached(key: string): unknown | undefined {
  const entry = rpcCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    rpcCache.delete(key);
    return undefined;
  }
  return entry.data;
}

function setCache(key: string, data: unknown) {
  if (rpcCache.size >= MAX_CACHE_SIZE) {
    const oldest = rpcCache.keys().next().value;
    if (oldest) rpcCache.delete(oldest);
  }
  rpcCache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

// ---------------------------------------------------------------------------
// Forward a single RPC call upstream, trying each endpoint in order.
// ---------------------------------------------------------------------------
async function forwardSingle(body: string): Promise<unknown> {
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return await res.json();
    } catch {
      // try next endpoint
    }
  }
  return { jsonrpc: "2.0", id: null, error: { code: -32603, message: "All RPC endpoints failed" } };
}

// ---------------------------------------------------------------------------
// Process one JSON-RPC call — check cache first, forward if miss.
// ---------------------------------------------------------------------------
async function processCall(call: { method?: string; params?: unknown; id?: unknown }): Promise<unknown> {
  const method = call.method ?? "";
  if (CACHEABLE_METHODS.has(method)) {
    const key = cacheKey(method, call.params);
    const cached = getCached(key);
    if (cached !== undefined) {
      const result = cached as { id?: unknown };
      return { ...result, id: call.id };
    }
    const result = await forwardSingle(JSON.stringify(call));
    const obj = result as { error?: unknown };
    if (!obj.error) setCache(key, result);
    return result;
  }
  return forwardSingle(JSON.stringify(call));
}

// ---------------------------------------------------------------------------
// POST handler — supports both single and batch JSON-RPC requests.
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const raw = await req.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 },
    );
  }

  if (Array.isArray(parsed)) {
    const results = await Promise.all(parsed.map((call) => processCall(call)));
    return NextResponse.json(results);
  }

  const result = await processCall(parsed as { method?: string; params?: unknown; id?: unknown });
  return NextResponse.json(result);
}
