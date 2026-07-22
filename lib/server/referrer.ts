/**
 * Shared referrer validation + code resolution, used by:
 *   - /api/referral/validate  (address in → is it a usable referrer?)
 *   - /api/referral/resolve   (code OR address in → resolved, validated referrer)
 *   - /api/referral/code       (claim/lookup a code for a wallet)
 *
 * Keeping this in one place means the link path and the code path apply the
 * exact same rules: a referrer must be an on-chain staker and not blocked.
 * The staker check reads totalUserStaked straight from the contract (not the
 * lagging index), for the reasons documented in the validate route.
 */
import { createPublicClient, http, isAddress, getAddress, type Address } from "viem";
import { bsc } from "viem/chains";
import { supabaseAdmin } from "@/lib/server/supabase";

const STAKING_ABI = [
  {
    type: "function",
    name: "totalUserStaked",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export interface ReferrerCheck {
  valid: boolean;
  reason?: string;
}

/** Every configured RPC, ending at the public node which has no cap. */
function rpcEndpoints(): string[] {
  return [
    process.env.BSC_ALCHEMY_RPC_URL,
    process.env.BSC_ALCHEMY_RPC_URL2,
    process.env.BSC_ALCHEMY_RPC_URL3,
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
    process.env.BSC_RPC_URL,
    "https://bsc-dataseed.binance.org/",
  ].filter((u): u is string => Boolean(u));
}

function stakingAddress(): string | undefined {
  return process.env.RWAN_V5_STAKING_ADDRESS || process.env.NEXT_PUBLIC_RWAN_V5_STAKING_ADDRESS;
}

/** Is this address blocked? Table may not exist yet — treat as not blocked. */
async function isBlocked(walletLower: string): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from("blocked_referrers")
      .select("wallet")
      .eq("wallet", walletLower)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

/** On-chain staked balance, trying each endpoint until one answers. null = no endpoint answered. */
async function totalStaked(walletLower: string): Promise<bigint | null> {
  const staking = stakingAddress();
  const endpoints = rpcEndpoints();
  if (!staking || endpoints.length === 0) return null;
  for (const rpc of endpoints) {
    try {
      const client = createPublicClient({
        chain: bsc,
        transport: http(rpc, { retryCount: 0, timeout: 4_000 }),
      });
      return (await client.readContract({
        address: getAddress(staking),
        abi: STAKING_ABI,
        functionName: "totalUserStaked",
        args: [getAddress(walletLower)],
      })) as bigint;
    } catch {
      // capped / timed out — try next
    }
  }
  return null;
}

/**
 * Validate a candidate referrer address: not blocked, and an on-chain staker.
 * Never fails open — if no RPC answers we report the referrer as unverified.
 */
export async function validateReferrer(address: string): Promise<ReferrerCheck> {
  const wallet = address.toLowerCase();
  if (!isAddress(wallet)) return { valid: false, reason: "invalid address" };

  if (await isBlocked(wallet)) return { valid: false, reason: "referrer is blocked" };

  const staked = await totalStaked(wallet);
  if (staked === null) return { valid: false, reason: "referral check unavailable" };
  if (staked === 0n) return { valid: false, reason: "referrer has no active stake" };
  return { valid: true };
}

/** A code is 3–16 chars, letters/digits only. Stored + compared lowercase. */
export function normalizeCode(raw: string): string | null {
  const c = raw.trim().toLowerCase();
  return /^[a-z0-9]{3,16}$/.test(c) ? c : null;
}

/**
 * Turn a "referred by" input (a raw 0x address OR a referral code) into a
 * checksummed referrer address, or null if it can't be resolved. Does NOT
 * validate staker/blocklist — callers pair this with validateReferrer.
 */
export async function resolveReferrerInput(input: string): Promise<Address | null> {
  const raw = input.trim();
  if (isAddress(raw)) return getAddress(raw);

  const code = normalizeCode(raw);
  if (!code) return null;
  try {
    const { data } = await supabaseAdmin
      .from("referral_codes")
      .select("wallet")
      .eq("code", code)
      .maybeSingle();
    if (data?.wallet && isAddress(data.wallet)) return getAddress(data.wallet);
  } catch {
    // table missing / lookup failed
  }
  return null;
}
