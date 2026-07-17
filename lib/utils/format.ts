import { formatUnits } from "viem";

export function formatToken(
  value: bigint | undefined,
  decimals: number,
  maxFraction = 4
) {
  if (value === undefined) return "—";
  const parsed = Number(formatUnits(value, decimals));
  if (Number.isNaN(parsed)) return "—";
  return parsed.toLocaleString(undefined, {
    maximumFractionDigits: maxFraction,
  });
}

export function formatDuration(seconds: bigint | number) {
  const totalSeconds = typeof seconds === "bigint" ? Number(seconds) : seconds;
  if (!totalSeconds || totalSeconds <= 0) return "Flexible";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const parts = [
    days ? `${days}d` : null,
    hours ? `${hours}h` : null,
    mins ? `${mins}m` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : "0m";
}

export function formatMultiplier(multiplierBps?: bigint) {
  if (!multiplierBps) return "1.0x";
  const value = Number(multiplierBps) / 100;
  return `${value.toFixed(2)}x`;
}

export function formatBps(bps?: bigint | number, maxFraction = 2) {
  if (bps === undefined || bps === null) return "—";
  const numeric = typeof bps === "bigint" ? Number(bps) : bps;
  if (!Number.isFinite(numeric)) return "—";
  const percent = numeric / 100;
  return `${percent.toFixed(maxFraction)}%`;
}

export function formatAddress(address?: string) {
  if (!address) return "—";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatDateFromSeconds(seconds: number) {
  if (!seconds) return "—";
  const date = new Date(seconds * 1000);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatUsd(value?: number, maxFraction = 2, locale = "en-US") {
  if (value === undefined || value === null) return "—";
  if (!Number.isFinite(value)) return "—";
  return value.toLocaleString(locale, {
    style: "currency",
    currency: "USD",
    currencyDisplay: "symbol",
    maximumFractionDigits: maxFraction,
  });
}
