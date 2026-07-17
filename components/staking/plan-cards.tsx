"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { Clock, Zap, Crown, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { MagneticCard } from "@/components/ui/magnetic-card";
import { Skeleton } from "@/components/ui/skeleton";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BorderBeam } from "@/components/ui/border-beam";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAprTiers, useCurrentAprBps, useLockOptions, useTotalStaked } from "@/hooks/use-staking-reads";
import { useMounted } from "@/hooks/use-mounted";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { STAKING_PLANS } from "@/lib/utils/constants";
import { formatBps, formatDuration } from "@/lib/utils/format";
import { AprTier, aprForTVL } from "@/lib/utils/staking";
import { cn } from "@/lib/utils/cn";

const planIcons = [Clock, Star, Crown, Zap];
const planAccents = [
  { border: "border-white/[0.06]", glow: "hover:shadow-[0_0_30px_rgba(243,186,47,0.06)]", tag: "bg-white/[0.04] text-white/50" },
  { border: "border-white/[0.06]", glow: "hover:shadow-[0_0_30px_rgba(243,186,47,0.08)]", tag: "bg-[#F3BA2F]/[0.08] text-[#F3BA2F]/80" },
  { border: "border-[#F3BA2F]/10", glow: "hover:shadow-[0_0_40px_rgba(243,186,47,0.1)]", tag: "bg-[#F3BA2F]/[0.1] text-[#F3BA2F]" },
  { border: "border-[#F3BA2F]/15", glow: "hover:shadow-[0_0_40px_rgba(243,186,47,0.12)]", tag: "bg-[#F3BA2F]/[0.12] text-[#F3BA2F]" },
];

export function PlanCards() {
  const mounted = useMounted();
  const isMobile = useIsMobile();
  const lockOptions = useLockOptions();
  const totalStaked = useTotalStaked();
  const aprTiers = useAprTiers();
  const currentApr = useCurrentAprBps();

  const baseAprBps = useMemo(() => {
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
  }, [currentApr.data, totalStaked.data, aprTiers.tiers]);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: 0.1 },
        },
      }}
      className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2"
    >
      {STAKING_PLANS.map((plan, index) => {
        const option = lockOptions.options
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .find((item) => item.duration === BigInt(plan.durationSeconds));
        const isActive = option?.active === true;
        const multiplierBps = option?.multiplierBps ? BigInt(option.multiplierBps) : 10_000n;
        // Use on-chain APR when active, fall back to target APR from constants
        const effectiveAprBps = isActive && baseAprBps > 0n
          ? (baseAprBps * multiplierBps) / 10_000n
          : plan.targetAprBps;
        const isBestValue = plan.id === "plan-1y";
        const accent = planAccents[Math.min(index, planAccents.length - 1)];
        const Icon = planIcons[Math.min(index, planIcons.length - 1)];

        return (
          <MagneticCard key={plan.id} className="relative">
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
              }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "premium-card relative h-full overflow-hidden rounded-2xl p-4 sm:p-6 md:p-7 transition-all duration-300",
                accent.border,
                accent.glow,
                !isActive && "opacity-80",
              )}
            >
              {/* Border beam on best value */}
              {isBestValue && (
                <BorderBeam size={250} duration={12} delay={9} borderWidth={1.5} colorFrom="#F3BA2F" colorTo="#F3BA2F" />
              )}

              {/* Top row: Icon + Tag + APR badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl border",
                    isBestValue
                      ? "border-[#F3BA2F]/20 bg-[#F3BA2F]/[0.08]"
                      : "border-white/[0.06] bg-white/[0.03]"
                  )}>
                    <Icon className={cn("h-4.5 w-4.5", isBestValue ? "text-[#F3BA2F]" : "text-white/40")} />
                  </span>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn("text-[10px] uppercase tracking-[0.2em] font-semibold", accent.tag, "px-2 py-0.5 rounded-md")}>
                        {plan.label}
                      </span>
                      {isBestValue && (
                        <span className="text-[9px] uppercase tracking-[0.15em] font-bold text-[#F3BA2F] bg-[#F3BA2F]/[0.08] px-1.5 py-0.5 rounded-md border border-[#F3BA2F]/15">
                          Best Value
                        </span>
                      )}
                      {!isActive && mounted && (
                        <span className="text-[9px] uppercase tracking-[0.15em] font-bold text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded-md border border-white/[0.06]">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <div className={cn("text-2xl font-bold sm:text-3xl", isBestValue ? "text-white" : "text-white/90")}>
                      {formatDuration(plan.durationSeconds)}
                    </div>
                  </div>
                </div>
                <Badge
                  variant="accent"
                  className={cn(
                    "px-3 py-1.5 text-sm font-bold tracking-wide",
                    isBestValue && "shadow-[0_0_12px_rgba(243,186,47,0.15)]",
                    !isActive && "opacity-70"
                  )}
                >
                  {!mounted ? (
                    <Skeleton className="h-4 w-14 bg-[#F3BA2F]/20" />
                  ) : effectiveAprBps ? (
                    <span className="flex items-center gap-0.5">
                      <NumberTicker value={Number(effectiveAprBps) / 100} decimalPlaces={2} className="text-[#F3BA2F]" />
                      <span>%</span>
                    </span>
                  ) : (
                    "—"
                  )}
                </Badge>
              </div>

              {/* Divider */}
              <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

              {/* Details grid */}
              <div className="grid gap-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-white/30">Lock duration</span>
                  <span className="font-medium text-white/70">{formatDuration(plan.durationSeconds)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/30">Boost multiplier</span>
                  <span className="font-medium text-white/70">
                    {!mounted ? (
                      <Skeleton className="inline-block h-4 w-8" />
                    ) : isActive ? (
                      `${(Number(multiplierBps) / 10000).toFixed(1)}x`
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex cursor-default items-center justify-between">
                        <span className="text-white/30">Reward claiming</span>
                        <span className={cn("font-medium", isActive ? "text-emerald-400/80" : "text-white/30")}>
                          {isActive ? "Anytime" : "—"}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isActive
                        ? "Rewards accrue immediately and can be claimed anytime."
                        : "This plan is not yet active. Check back soon."}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </motion.div>
          </MagneticCard>
        );
      })}
    </motion.div>
  );
}
