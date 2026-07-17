"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { Activity } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useAprTiers, useCurrentAprBps, useTotalStaked } from "@/hooks/use-staking-reads";
import { useMounted } from "@/hooks/use-mounted";
import { RWAN_DECIMALS } from "@/lib/utils/constants";
import { formatBps, formatToken } from "@/lib/utils/format";
import { AprTier, aprForTVL, clamp } from "@/lib/utils/staking";
import { cn } from "@/lib/utils/cn";

export function AprTierMeter() {
  const mounted = useMounted();
  const totalStaked = useTotalStaked();
  const aprTiers = useAprTiers();
  const currentApr = useCurrentAprBps();

  const { currentTier, nextTier, progress, aprBps } = useMemo(() => {
    let baseApr = 0n;
    if (currentApr.data !== undefined && currentApr.data !== null) {
      const aprValue = BigInt(currentApr.data);
      if (aprValue > 0n) baseApr = aprValue;
    }
    if (baseApr === 0n) {
      const tiers = aprTiers.tiers.filter(Boolean) as AprTier[];
      if (totalStaked.data !== undefined && totalStaked.data !== null && tiers.length > 0) {
        const calculated = aprForTVL(totalStaked.data, tiers);
        if (calculated > 0n) baseApr = calculated;
      }
    }
    if (baseApr === 0n) baseApr = 1600n;

    const tiers = aprTiers.tiers.filter(Boolean) as AprTier[];
    if (!totalStaked.data || totalStaked.data === 0n || tiers.length === 0) {
      return { currentTier: tiers[0] ?? null, nextTier: tiers[1] ?? null, progress: 0, aprBps: baseApr };
    }
    const tvl = totalStaked.data;
    let current = tiers[0];
    let next: typeof tiers[0] | null = null;
    for (let i = 0; i < tiers.length; i++) {
      if (tvl >= tiers[i].minTVL) {
        current = tiers[i];
        next = tiers[i + 1] ?? null;
      } else break;
    }
    const range = next ? Number(next.minTVL - current.minTVL) : 0;
    const travelled = next ? Number(tvl - current.minTVL) : 0;
    const pct = range > 0 ? clamp(travelled / range, 0, 1) : 1;
    return { currentTier: current, nextTier: next, progress: pct, aprBps: baseApr };
  }, [totalStaked.data, aprTiers.tiers, currentApr.data]);

  const isLoading = totalStaked.isLoading || aprTiers.isLoading;

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-400/10 bg-emerald-400/[0.06]">
          <Activity className="h-3.5 w-3.5 text-emerald-400" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/35">
          Current APR Tier
        </span>
      </div>

      {/* APR value */}
      <div className="text-2xl font-bold text-white">
        {!mounted || isLoading ? <Skeleton className="h-7 w-24" /> : formatBps(aprBps)}
      </div>

      {/* TVL info */}
      <div className="mt-1.5 text-[11px] sm:text-[12px] text-white/25 break-all sm:break-normal">
        {!mounted || isLoading ? (
          "Loading TVL tiers..."
        ) : (
          <>
            TVL now:{" "}
            <span className="text-white/50 tabular-nums">
              {totalStaked.data !== undefined
                ? `${formatToken(totalStaked.data, RWAN_DECIMALS)} $Rwaan`
                : "0 $Rwaan"}
            </span>
          </>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-5">
        <div className="relative h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(progress * 100)}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-[#F3BA2F]"
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[10px] text-white/20">
          <span>
            {currentTier ? `${formatToken(currentTier.minTVL, RWAN_DECIMALS)} TVL` : "0 TVL"}
          </span>
          <span>
            {nextTier
              ? `Next at ${formatToken(nextTier.minTVL, RWAN_DECIMALS)}`
              : currentTier
                ? "Top tier"
                : "Next: 10M $Rwaan"}
          </span>
        </div>
      </div>
    </>
  );

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="premium-card rounded-2xl p-5 card-glow-rewards"
    >
      {content}
    </motion.div>
  );
}
