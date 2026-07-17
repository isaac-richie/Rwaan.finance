"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { Fuel } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  useAprTiers,
  useCurrentAprBps,
  useRewardReserve,
  useTotalStaked,
  useTotalWeightedStaked,
} from "@/hooks/use-staking-reads";
import { useMounted } from "@/hooks/use-mounted";
import { RWAN_DECIMALS } from "@/lib/utils/constants";
import { formatBps, formatToken } from "@/lib/utils/format";
import { AprTier, aprForTVL } from "@/lib/utils/staking";

const YEAR_SECONDS = 365n * 24n * 60n * 60n;
const DAY_SECONDS = 24n * 60n * 60n;

export function RewardRunway() {
  const mounted = useMounted();
  const rewardReserve = useRewardReserve();
  const totalWeighted = useTotalWeightedStaked();
  const totalStaked = useTotalStaked();
  const aprTiers = useAprTiers();
  const currentApr = useCurrentAprBps();

  const { rewardPerDay, runwayDays, aprBps } = useMemo(() => {
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

    if (!totalWeighted.data || totalWeighted.data === 0n) {
      return { rewardPerDay: 0n, runwayDays: null, aprBps: baseApr };
    }
    const rewardRatePerSecond = (totalWeighted.data * baseApr) / 10_000n / YEAR_SECONDS;
    const daily = rewardRatePerSecond * DAY_SECONDS;
    if (!rewardReserve.data || rewardRatePerSecond === 0n) {
      return { rewardPerDay: daily, runwayDays: null, aprBps: baseApr };
    }
    const runwaySeconds = rewardReserve.data / rewardRatePerSecond;
    const days = Number(runwaySeconds / DAY_SECONDS);
    return { rewardPerDay: daily, runwayDays: days, aprBps: baseApr };
  }, [totalWeighted.data, rewardReserve.data, totalStaked.data, aprTiers.tiers, currentApr.data]);

  const isLoading = rewardReserve.isLoading || totalWeighted.isLoading || totalStaked.isLoading || aprTiers.isLoading;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="premium-card rounded-2xl p-5 card-glow-analytics"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-400/10 bg-violet-400/[0.06]">
          <Fuel className="h-3.5 w-3.5 text-violet-400" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/35">
          Reward Reserve
        </span>
      </div>

      {/* Reserve amount */}
      <div className="text-lg sm:text-2xl font-bold text-white break-all sm:break-normal">
        {!mounted || isLoading ? (
          <Skeleton className="h-7 w-28" />
        ) : rewardReserve.data !== undefined ? (
          <>
            <span className="tabular-nums">{formatToken(rewardReserve.data, RWAN_DECIMALS)}</span>
            <span className="text-xs sm:text-sm font-normal text-white/25 ml-1">$Rwaan</span>
          </>
        ) : (
          <span className="text-white/20">Loading...</span>
        )}
      </div>

      <div className="mt-1.5 text-[12px] text-white/25">
        {!mounted || isLoading ? (
          <Skeleton className="h-3.5 w-32" />
        ) : (
          <>Current base APR: <span className="text-white/50">{formatBps(aprBps)}</span></>
        )}
      </div>

      {/* Runway card */}
      <div className="mt-4 rounded-xl border border-white/[0.04] bg-white/[0.015] p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/20">
          Estimated runway
        </div>
        <div className="mt-2 text-lg font-bold text-white">
          {runwayDays === null ? (
            <span className="text-white/20">—</span>
          ) : (
            <>
              {runwayDays}
              <span className="text-sm font-normal text-white/30 ml-1">days</span>
            </>
          )}
        </div>
        <div className="mt-1 text-[11px] text-white/20">
          Emissions ≈ {formatToken(rewardPerDay, RWAN_DECIMALS)} $Rwaan/day
        </div>
      </div>
    </motion.div>
  );
}
