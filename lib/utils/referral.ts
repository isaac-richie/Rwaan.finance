import { isAddress, getAddress, type Address } from "viem";

const STORAGE_KEY = "rwaan:referrer";

/**
 * Reads `?ref=<code|0x address>` from the URL, resolves + validates it via the
 * backend (code → wallet, must be an active staker and not blocked), then
 * stores the resolved referrer address locally. First-touch only — an existing
 * stored referrer is never overwritten.
 */
export async function captureReferrerFromUrl(): Promise<void> {
  if (typeof window === "undefined") return;
  const ref = new URLSearchParams(window.location.search).get("ref");
  if (!ref) return;
  if (window.localStorage.getItem(STORAGE_KEY)) return;

  const resolved = await resolveReferrer(ref);
  if (resolved) window.localStorage.setItem(STORAGE_KEY, resolved);
}

/**
 * Resolve a referral code OR raw address to a validated referrer address.
 * Returns the checksummed address if it's a usable referrer, else null.
 * Used by both URL capture and the manual "Referred by" field on the stake page.
 */
export async function resolveReferrer(input: string): Promise<Address | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const res = await fetch(`/api/referral/resolve?input=${encodeURIComponent(trimmed)}`);
    const data = await res.json();
    if (data.valid && isAddress(data.referrer)) return getAddress(data.referrer);
  } catch {
    // network error — treat as unresolved rather than storing an unchecked referrer
  }
  return null;
}

export function getStoredReferrer(): Address | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored || !isAddress(stored)) return null;
  return getAddress(stored);
}

/** Persist a referrer the user supplied manually (already resolved + validated). */
export function storeReferrer(address: Address): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, getAddress(address));
}

/** Share link by code (preferred — friendlier) or by address (fallback). */
export function buildReferralLink(codeOrAddress: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/?ref=${codeOrAddress}`;
}
