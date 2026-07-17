/**
 * Vercel Cron: runs every 6 hours.
 * Fetches RWAAN/USD price from CoinGecko, computes $20 worth in tokens,
 * and calls setMinStakeAmount() on the staking contract if the on-chain
 * value has drifted more than DRIFT_THRESHOLD_PCT from the target.
 *
 * Required env vars:
 *   CRON_SECRET                  — Vercel cron bearer token (auto-set by Vercel)
 *   PARAMETER_ROLE_PRIVATE_KEY   — private key of the wallet holding PARAMETER_ROLE
 *   NEXT_PUBLIC_RWAN_V4_STAKING_ADDRESS — deployed staking contract
 *   BSC_ALCHEMY_RPC_URL          — BSC RPC (already in .env)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  formatUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";

// ── Config ───────────────────────────────────────────────────────────────────
const TARGET_USD           = 20;          // $20 minimum stake
const DRIFT_THRESHOLD_PCT  = 5;           // only update if drift ≥ 5%
const COINGECKO_PRICE_URL  =
  "https://api.coingecko.com/api/v3/simple/price?ids=rawli-analytics&vs_currencies=usd";

// Minimal ABI — only what this job needs
const STAKING_ABI = [
  {
    type: "function",
    name: "minStakeAmount",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setMinStakeAmount",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getRwaanPriceUsd(): Promise<number> {
  const res = await fetch(COINGECKO_PRICE_URL, {
    headers: { accept: "application/json" },
    next: { revalidate: 0 }, // always fresh
  });
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const data = await res.json();
  const price = data?.["rawli-analytics"]?.usd;
  if (!price || price <= 0) throw new Error("CoinGecko: invalid price");
  return price;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Vercel passes CRON_SECRET as a Bearer token to authenticate cron calls.
  // This prevents anyone from triggering the job via a public URL.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const contractAddress = process.env.NEXT_PUBLIC_RWAN_V4_STAKING_ADDRESS as
    | `0x${string}`
    | undefined;
  const rawKey = process.env.PARAMETER_ROLE_PRIVATE_KEY;
  const rpcUrl =
    process.env.BSC_ALCHEMY_RPC_URL || "https://bsc-dataseed.binance.org/";

  if (!contractAddress) {
    return NextResponse.json(
      { skipped: true, reason: "NEXT_PUBLIC_RWAN_V4_STAKING_ADDRESS not set yet" },
      { status: 200 }
    );
  }
  if (!rawKey) {
    return NextResponse.json(
      { error: "PARAMETER_ROLE_PRIVATE_KEY not configured" },
      { status: 500 }
    );
  }

  // ── 1) Fetch live price ───────────────────────────────────────────────────
  let priceUsd: number;
  try {
    priceUsd = await getRwaanPriceUsd();
  } catch (e) {
    return NextResponse.json(
      { error: `Price fetch failed: ${(e as Error).message}` },
      { status: 502 }
    );
  }

  // ── 2) Calculate target minimum ──────────────────────────────────────────
  // $20 / priceUsd = RWAAN amount, with 18 decimals
  const targetTokens = TARGET_USD / priceUsd;
  const targetWei    = parseUnits(targetTokens.toFixed(4), 18);

  // ── 3) Read current on-chain minimum ─────────────────────────────────────
  const publicClient = createPublicClient({
    chain: bsc,
    transport: http(rpcUrl),
  });

  const currentWei = await publicClient.readContract({
    address: contractAddress,
    abi: STAKING_ABI,
    functionName: "minStakeAmount",
  });

  const currentTokens = Number(formatUnits(currentWei, 18));
  const drift = Math.abs(targetTokens - currentTokens) / currentTokens * 100;

  const summary = {
    priceUsd,
    targetRwaan:  targetTokens.toFixed(2),
    currentRwaan: currentTokens.toFixed(2),
    driftPct:     drift.toFixed(2),
  };

  // ── 4) Skip if drift is within tolerance ─────────────────────────────────
  if (drift < DRIFT_THRESHOLD_PCT) {
    return NextResponse.json({
      updated: false,
      reason:  `Drift ${drift.toFixed(2)}% is below ${DRIFT_THRESHOLD_PCT}% threshold — no update needed`,
      ...summary,
    });
  }

  // ── 5) Send the update transaction ───────────────────────────────────────
  const key = rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`;
  const account = privateKeyToAccount(key as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: bsc,
    transport: http(rpcUrl),
  });

  const txHash = await walletClient.writeContract({
    address: contractAddress,
    abi: STAKING_ABI,
    functionName: "setMinStakeAmount",
    args: [targetWei],
  });

  console.log(
    `[min-stake-cron] updated minStakeAmount → ${targetTokens.toFixed(2)} RWAAN | tx ${txHash}`
  );

  return NextResponse.json({
    updated: true,
    txHash,
    ...summary,
  });
}
