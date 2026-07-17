"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Calculator, TrendingUp } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAprTiers, useCurrentAprBps, useLockOptions, useTotalStaked } from "@/hooks/use-staking-reads";
import { useMounted } from "@/hooks/use-mounted";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { STAKING_PLANS } from "@/lib/utils/constants";
import { formatBps, formatUsd } from "@/lib/utils/format";
import { AprTier, aprForTVL } from "@/lib/utils/staking";
import { useCryptoPrices } from "@/components/crypto/use-crypto-prices";

const YEAR_SECONDS = 365 * 24 * 60 * 60;

export function RewardPreview() {
  const mounted = useMounted();
  const isMobile = useIsMobile();
  const [amount, setAmount] = useState("1000");
  const [selectedPlanId, setSelectedPlanId] = useState("flexible");
  const lockOptions = useLockOptions();
  const totalStaked = useTotalStaked();
  const aprTiers = useAprTiers();
  const currentApr = useCurrentAprBps();
  const { prices } = useCryptoPrices();
  const rwanPriceUsd = prices.find((item) => item.symbol === "$Rwaan")?.priceUsd ?? 0;

  const planOptions = useMemo(
    () => [
      { id: "flexible", label: "Flexible", durationSeconds: 0 },
      ...STAKING_PLANS,
    ],
    []
  );

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

  const selectedPlan = planOptions.find((plan) => plan.id === selectedPlanId);
  const selectedOption = lockOptions.options
    .filter((option): option is NonNullable<typeof option> => Boolean(option))
    .find(
      (option) =>
        Boolean(selectedPlan) &&
        option.duration === BigInt(selectedPlan!.durationSeconds)
    );

  const multiplierBps =
    selectedPlanId === "flexible"
      ? 10_000n
      : selectedOption?.multiplierBps ? BigInt(selectedOption.multiplierBps) : 10_000n;
  const isSelectedPlanActive = selectedPlanId === "flexible" || (selectedOption?.active === true);
  // Use on-chain APR when plan is active, else use target APR from constants
  const targetAprForPlan = STAKING_PLANS.find(p => p.id === selectedPlanId)?.targetAprBps ?? 0n;
  const effectiveAprBps = isSelectedPlanActive && baseAprBps > 0n
    ? (baseAprBps * multiplierBps) / 10_000n
    : targetAprForPlan;

  const normalizedAmount = amount.replace(/,/g, "").trim();
  const parsedAmount = Number(normalizedAmount);
  const amountUsd =
    Number.isFinite(parsedAmount) && parsedAmount > 0 && rwanPriceUsd > 0
      ? parsedAmount * rwanPriceUsd
      : null;
  const yearlyReward =
    Number.isFinite(parsedAmount) && parsedAmount > 0
      ? (parsedAmount * Number(effectiveAprBps)) / 10_000
      : 0;
  const periodReward =
    selectedPlan && selectedPlan.durationSeconds > 0
      ? (yearlyReward * selectedPlan.durationSeconds) / YEAR_SECONDS
      : yearlyReward / 12;

  return (
    <motion.div
      initial={isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      animate={isMobile ? { opacity: 1, y: 0 } : undefined}
      whileInView={isMobile ? undefined : { opacity: 1, y: 0 }}
      viewport={isMobile ? undefined : { once: true, amount: 0.2 }}
      transition={isMobile ? { duration: 0 } : { duration: 0.3 }}
      className="premium-card rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-4 sm:px-6 sm:pt-6">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#F3BA2F]/10 bg-[#F3BA2F]/[0.06]">
          <Calculator className="h-3.5 w-3.5 text-[#F3BA2F]" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/35">
          Staking Simulator
        </span>
      </div>

      <div className="p-4 sm:p-6 pt-3 sm:pt-4">
        <div className="grid gap-4 sm:gap-5 grid-cols-1 md:grid-cols-[1.1fr_1fr]">
          {/* Left: Inputs */}
          <div className="space-y-3">
            <Input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Amount to stake"
              inputMode="decimal"
            />
            <div className="text-[12px] text-white/25 pl-1">
              {amountUsd !== null ? `≈ ${formatUsd(amountUsd)}` : "—"}
            </div>
            <Select
              value={selectedPlanId}
              onValueChange={setSelectedPlanId}
              onOpenChange={(open) => {
                if (open && typeof document !== "undefined") {
                  (document.activeElement as HTMLElement | null)?.blur();
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {planOptions.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-3 text-[12px] text-white/25 pl-1">
              <span>Base APR: <span className="text-white/50">{baseAprBps ? formatBps(baseAprBps) : "—"}</span></span>
              <span className="h-3 w-px bg-white/[0.06]" />
              <span>Multiplier: <span className="text-white/50">
                {!mounted ? (
                  <Skeleton className="inline-block h-3.5 w-6" />
                ) : (
                  `${Number(multiplierBps) / 10_000}x`
                )}
              </span></span>
            </div>
          </div>

          {/* Right: Result */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400/60" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/25">
                Estimated rewards
              </span>
            </div>
            <div className="text-2xl font-bold text-white">
              {yearlyReward.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              <span className="text-sm font-normal text-white/30 ml-1.5">$Rwaan/year</span>
            </div>
            <div className="mt-2 text-[13px] text-white/35">
              {selectedPlanId === "flexible"
                ? `~${periodReward.toLocaleString(undefined, { maximumFractionDigits: 2 })} $Rwaan/month`
                : `~${periodReward.toLocaleString(undefined, { maximumFractionDigits: 2 })} $Rwaan over ${selectedPlan?.label}`}
            </div>
            <div className="mt-4 pt-3 border-t border-white/[0.04] text-[11px] text-white/20">
              Estimates use the current APR tier and assume no compounding.
            </div>
          </div>
        </div>

        <div className="mt-4 text-[11px] text-white/20">
          Rewards accrue immediately and can be claimed anytime.
          Estimates use current APR tiers and live emissions.
        </div>
      </div>
    </motion.div>
  );
}
