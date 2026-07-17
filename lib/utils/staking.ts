export type AprTier = {
  minTVL: bigint;
  aprBps: bigint;
};

export function aprForTVL(tvl: bigint, tiers: AprTier[]) {
  if (!tiers.length) return 0n;
  let result = tiers[0].aprBps;
  for (const tier of tiers) {
    if (tvl < tier.minTVL) break;
    result = tier.aprBps;
  }
  return result;
}

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}
