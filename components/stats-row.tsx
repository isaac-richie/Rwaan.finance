"use client";

import { motion } from "framer-motion";
import { formatUnits } from "viem";
import { TrendingUp, Coins, Gift } from "lucide-react";

import { NumberTicker } from "@/components/ui/number-ticker";
import { Skeleton } from "@/components/ui/skeleton";
import { usePositionsWithRewards } from "@/hooks/use-positions";
import { useAprTiers, useCurrentAprBps, useLockOptions, useTotalStaked } from "@/hooks/use-staking-reads";
import { useMounted } from "@/hooks/use-mounted";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { RWAN_DECIMALS } from "@/lib/utils/constants";
import { formatBps, formatToken, formatUsd } from "@/lib/utils/format";
import { AprTier, aprForTVL } from "@/lib/utils/staking";
import { useCryptoPrices } from "@/components/crypto/use-crypto-prices";
import { MagneticCard } from "@/components/ui/magnetic-card";
import { cn } from "@/lib/utils/cn";

const statIcons = [
  { icon: Coins, color: "text-[#F3BA2F]", bg: "bg-[#F3BA2F]/8", border: "border-[#F3BA2F]/10" },
  { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/8", border: "border-emerald-400/10" },
  { icon: Gift, color: "text-violet-400", bg: "bg-violet-400/8", border: "border-violet-400/10" },
];

export function StatsRow({
  decimals = RWAN_DECIMALS,
  showData = true,
}: {
  decimals?: number;
  showData?: boolean;
}) {
  const mounted = useMounted();
  const isMobile = useIsMobile();
  const totalStaked = useTotalStaked();
  const { positions } = usePositionsWithRewards();
  const lockOptions = useLockOptions();
  const aprTiers = useAprTiers();
  const currentApr = useCurrentAprBps();
  const { prices, isLoading: isPricesLoading } = useCryptoPrices();
  const rwanPriceUsd = prices.find((item) => item.symbol === "$Rwaan")?.priceUsd ?? 0;

  const totalRewards = positions.reduce(
    (sum, position) => sum + position.pendingRewards,
    0n
  );
  const maxMultiplier = lockOptions.options
    .filter((option): option is NonNullable<typeof option> => Boolean(option))
    .reduce<bigint | null>(
      (max, option) => {
        const multiplier = BigInt(option.multiplierBps);
        return max === null || multiplier > max ? multiplier : max;
      },
      null
    );

  const baseAprBps = (() => {
    if (currentApr.data !== undefined && currentApr.data !== null) {
      const aprValue = BigInt(currentApr.data);
      if (aprValue > 0n) return aprValue;
    }
    if (totalStaked.data !== undefined && totalStaked.data !== null) {
      const tiers = aprTiers.tiers.filter(Boolean) as AprTier[];
      if (tiers.length > 0) {
        const calculated = aprForTVL(totalStaked.data, tiers);
        if (calculated > 0n) return calculated;
      }
    }
    return 1600n;
  })();

  const maxAprBps =
    maxMultiplier && baseAprBps > 0n
      ? (baseAprBps * maxMultiplier) / 10_000n
      : 0n;
  const totalStakedUsd =
    totalStaked.data !== undefined && rwanPriceUsd > 0
      ? Number(formatUnits(totalStaked.data, decimals)) * rwanPriceUsd
      : null;

  if (!mounted) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="premium-card p-5 sm:p-6">
            <Skeleton className="h-4 w-20 mb-4" />
            <Skeleton className="h-7 w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: 0.08, delayChildren: 0.1 },
        },
      }}
      className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
    >
      {/* Total Staked */}
      <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
        <MagneticCard className="premium-card p-5 sm:p-6 card-glow-staking">
          <div className="flex items-center gap-2.5 mb-3">
            <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg border", statIcons[0].bg, statIcons[0].border)}>
              <Coins className={cn("h-3.5 w-3.5", statIcons[0].color)} />
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/35">
              Total Staked
            </span>
          </div>
          <div className="text-2xl font-bold">
            {totalStaked.isLoading || isPricesLoading ? (
              <Skeleton className="h-7 w-32" />
            ) : totalStaked.data !== undefined ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-0.5 text-white">
                  <span className="text-white/50">$</span>
                  <NumberTicker value={totalStakedUsd ?? 0} decimalPlaces={0} className="text-white" />
                </div>
                <span className="text-xs text-white/25 flex items-center gap-1">
                  <NumberTicker value={Number(formatUnits(totalStaked.data, decimals))} decimalPlaces={2} className="text-white/25" />
                  <span>$Rwaan</span>
                </span>
              </div>
            ) : (
              <span className="text-white/20">—</span>
            )}
          </div>
        </MagneticCard>
      </motion.div>

      {/* Base APR */}
      <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
        <MagneticCard className="premium-card p-5 sm:p-6 card-glow-rewards">
          <div className="flex items-center gap-2.5 mb-3">
            <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg border", statIcons[1].bg, statIcons[1].border)}>
              <TrendingUp className={cn("h-3.5 w-3.5", statIcons[1].color)} />
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/35">
              Base APR
            </span>
          </div>
          <div className="text-2xl font-bold">
            {currentApr.isLoading || lockOptions.isLoading ? (
              <Skeleton className="h-7 w-28" />
            ) : baseAprBps > 0n ? (
              <div className="flex items-baseline gap-0.5">
                <NumberTicker value={Number(baseAprBps) / 100} decimalPlaces={2} className="text-emerald-400" />
                <span className="text-emerald-400/60">%</span>
              </div>
            ) : (
              <span className="text-white/20">—</span>
            )}
          </div>
        </MagneticCard>
      </motion.div>

      {/* Claimable */}
      <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
        <MagneticCard className="premium-card p-5 sm:p-6 card-glow-analytics">
          <div className="flex items-center gap-2.5 mb-3">
            <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg border", statIcons[2].bg, statIcons[2].border)}>
              <Gift className={cn("h-3.5 w-3.5", statIcons[2].color)} />
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/35">
              {showData ? "Your Claimable" : "Connect Wallet"}
            </span>
          </div>
          <div className="text-2xl font-bold">
            {!showData ? (
              <span className="text-sm font-normal text-white/25">
                Connect to view rewards
              </span>
            ) : positions.length === 0 ? (
              <span className="text-white/20">No positions</span>
            ) : (
              <div className="flex items-baseline gap-1.5">
                <NumberTicker value={Number(formatUnits(totalRewards, decimals))} decimalPlaces={2} className="text-violet-400" />
                <span className="text-sm font-normal text-white/25">$Rwaan</span>
              </div>
            )}
          </div>
        </MagneticCard>
      </motion.div>
    </motion.div>
  );
}
