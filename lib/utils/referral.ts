import { isAddress, getAddress, type Address } from "viem";

const STORAGE_KEY = "rwaan:referrer";

/**
 * Reads `?ref=0x...` from the URL and stores it locally, first-touch only
 * (an existing stored referrer is never overwritten by a later link click).
 */
export function captureReferrerFromUrl(): void {
  if (typeof window === "undefined") return;
  const ref = new URLSearchParams(window.location.search).get("ref");
  if (!ref || !isAddress(ref)) return;
  if (window.localStorage.getItem(STORAGE_KEY)) return;
  window.localStorage.setItem(STORAGE_KEY, getAddress(ref));
}

export function getStoredReferrer(): Address | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored || !isAddress(stored)) return null;
  return getAddress(stored);
}

export function buildReferralLink(address: Address): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/?ref=${address}`;
}
