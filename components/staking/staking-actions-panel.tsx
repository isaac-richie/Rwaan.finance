"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { parseUnits, formatUnits } from "viem";
import { useAccount, useChainId } from "wagmi";
import { bsc } from "wagmi/chains";
import confetti from "canvas-confetti";
import { HelpCircle, Lock, Unlock, AlertCircle, Link2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useTokenAllowance, useTokenBalance, useTokenMetadata, useApproveToken } from "@/hooks/use-erc20";
import { useReferral } from "@/hooks/use-referral";
import { useTransactionToasts } from "@/hooks/use-transaction-toasts";
import { useAprTiers, useCurrentAprBps, useLockOptions, useMaxPositionsPerUser, useMinStakeAmount, useStakingToken, useTotalStaked, useUserPositionIds } from "@/hooks/use-staking-reads";
import { useStakeFlexible, useStakeLocked } from "@/hooks/use-staking-writes";
import { RWAN_DECIMALS, RWAN_TOKEN_ADDRESS, STAKING_PLANS } from "@/lib/utils/constants";
import { formatAddress, formatBps, formatToken, formatUsd } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AprTier, aprForTVL } from "@/lib/utils/staking";
import { useCryptoPrices } from "@/components/crypto/use-crypto-prices";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { HowToStakeGuide } from "@/components/staking/how-to-stake-guide";
import { useMounted } from "@/hooks/use-mounted";
import { parseContractError } from "@/lib/utils/contract-errors";

export function StakingActionsPanel() {
  const mounted = useMounted();
  const { address } = useAccount();
  const chainId = useChainId();
  const tokenAddress = useStakingToken();
  const effectiveTokenAddress = (tokenAddress.data as `0x${string}` | undefined) ?? RWAN_TOKEN_ADDRESS;
  const tokenMeta = useTokenMetadata(effectiveTokenAddress);
  const decimals = tokenMeta.decimals ?? RWAN_DECIMALS;
  const balance = useTokenBalance(effectiveTokenAddress, address);
  const allowance = useTokenAllowance(effectiveTokenAddress, address);
  const approve = useApproveToken(effectiveTokenAddress);
  const { stakeLocked, isPending: isStakeLockedPending } = useStakeLocked();
  const { stakeFlexible, isPending: isStakeFlexiblePending } = useStakeFlexible();
  const { trackTx } = useTransactionToasts();
  const lockOptions = useLockOptions();
  const totalStaked = useTotalStaked();
  const minStakeAmount = useMinStakeAmount();
  const maxPositionsPerUser = useMaxPositionsPerUser();
  const userPositionIds = useUserPositionIds();
  const aprTiers = useAprTiers();
  const currentApr = useCurrentAprBps();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { referrer, shareUrl } = useReferral(address);
  const { prices } = useCryptoPrices();
  const rwanPriceUsd = prices.find((item) => item.symbol === "$Rwaan")?.priceUsd ?? 0;

  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"flexible" | "locked">("locked");
  const [selectedPlanId, setSelectedPlanId] = useState<(typeof STAKING_PLANS)[number]["id"]>(STAKING_PLANS[0].id);
  const [showHowToStake, setShowHowToStake] = useState(false);

  const parsedAmount = useMemo(() => {
    if (!amount) return null;
    try { return parseUnits(amount, decimals); } catch { return null; }
  }, [amount, decimals]);

  const normalizedAmount = amount.replace(/,/g, "").trim();
  const amountNumber = Number(normalizedAmount);
  const amountUsd = Number.isFinite(amountNumber) && amountNumber > 0 && rwanPriceUsd > 0 ? amountNumber * rwanPriceUsd : null;

  // $20 minimum — expressed in RWAAN at current price, falls back to contract value
  const minStakeUsd = 20;
  const minStakeRwaan = rwanPriceUsd > 0
    ? minStakeUsd / rwanPriceUsd
    : typeof minStakeAmount.data === "bigint"
      ? Number(formatUnits(minStakeAmount.data, decimals))
      : 0;
  const belowMinimum = amountNumber > 0 && amountNumber < minStakeRwaan;

  const selectedPlan = STAKING_PLANS.find((plan) => plan.id === selectedPlanId);
  const selectedOption = lockOptions.options
    .filter((option): option is NonNullable<typeof option> => Boolean(option))
    .find((option) => Boolean(selectedPlan) && option.active && option.duration === BigInt(selectedPlan!.durationSeconds));

  const baseAprBps = useMemo(() => {
    if (currentApr.data !== undefined && currentApr.data !== null) {
      const v = BigInt(currentApr.data); if (v > 0n) return v;
    }
    if (totalStaked.data !== undefined && totalStaked.data !== null) {
      const tiers = aprTiers.tiers.filter(Boolean) as AprTier[];
      if (tiers.length > 0) { const c = aprForTVL(totalStaked.data, tiers); if (c > 0n) return c; }
    }
    return 1600n;
  }, [currentApr.data, totalStaked.data, aprTiers.tiers]);

  const balanceFormatted = formatToken(balance.data, decimals);
  const needsApproval = parsedAmount !== null && allowance.data !== undefined && allowance.data < parsedAmount;
  const isWrongNetwork = address ? chainId !== bsc.id : false;
  const hasReachedPositionsLimit =
    typeof maxPositionsPerUser.data === "bigint" &&
    Array.isArray(userPositionIds.data) &&
    BigInt(userPositionIds.data.length) >= maxPositionsPerUser.data;

  const disabled = !address || isWrongNetwork || !parsedAmount || parsedAmount <= 0n || tokenAddress.isLoading || !tokenAddress.data || allowance.isLoading;

  const handleApprove = async () => {
    if (!address) { toast({ title: "Wallet not connected", description: "Please connect your wallet to approve tokens." }); return; }
    if (isWrongNetwork) { toast({ title: "Wrong network", description: "Please switch to BNB Smart Chain before approving." }); return; }
    if (!parsedAmount) return;
    try {
      const hash = await approve.approve(parsedAmount);
      if (!hash) return;
      trackTx(hash, { title: "Approve $Rwaan", successMessage: "Approval confirmed.", errorMessage: "Approval failed.", retry: handleApprove });
    } catch (error) {
      const parsed = parseContractError(error);
      toast({ title: parsed.title, description: parsed.description });
    }
  };

  const handleStakeLocked = async () => {
    if (!address) { toast({ title: "Wallet not connected", description: "Please connect your wallet to stake." }); return; }
    if (isWrongNetwork) { toast({ title: "Wrong network", description: "Please switch to BNB Smart Chain before staking." }); return; }
    if (!parsedAmount || !selectedOption) return;
    if (typeof minStakeAmount.data === "bigint" && parsedAmount < minStakeAmount.data) {
      toast({ title: "Amount too low", description: `Minimum stake is $20 (~${Math.ceil(minStakeRwaan).toLocaleString()} RWAAN at current price).` }); return;
    }
    if (hasReachedPositionsLimit) { toast({ title: "Position limit reached", description: "You reached the max number of open staking positions." }); return; }
    try {
      const hash = await stakeLocked(parsedAmount, selectedOption.id, referrer ?? undefined);
      if (!hash) return;
      const formattedAmount = formatToken(parsedAmount, decimals);
      const planLabel = STAKING_PLANS.find(p => BigInt(p.durationSeconds) === selectedOption.duration)?.label || "locked";
      trackTx(hash, { title: "Stake $Rwaan", successMessage: "Locked position created.", errorMessage: "Stake failed.", retry: handleStakeLocked, action: "Staked", amount: `${formattedAmount} $Rwaan (${planLabel})` });
      confetti({ particleCount: isMobile ? 40 : 100, spread: isMobile ? 40 : 70, origin: { y: 0.6 }, colors: ["#F3BA2F", "#ffffff"] });
      setAmount("");
    } catch (error) {
      const parsed = parseContractError(error);
      toast({ title: parsed.title, description: parsed.description });
    }
  };

  const handleStakeFlexible = async () => {
    if (!address) { toast({ title: "Wallet not connected", description: "Please connect your wallet to stake." }); return; }
    if (isWrongNetwork) { toast({ title: "Wrong network", description: "Please switch to BNB Smart Chain before staking." }); return; }
    if (!parsedAmount) return;
    if (typeof minStakeAmount.data === "bigint" && parsedAmount < minStakeAmount.data) {
      toast({ title: "Amount too low", description: `Minimum stake is $20 (~${Math.ceil(minStakeRwaan).toLocaleString()} RWAAN at current price).` }); return;
    }
    if (hasReachedPositionsLimit) { toast({ title: "Position limit reached", description: "You reached the max number of open staking positions." }); return; }
    try {
      const hash = await stakeFlexible(parsedAmount, referrer ?? undefined);
      if (!hash) return;
      const formattedAmount = formatToken(parsedAmount, decimals);
      trackTx(hash, { title: "Stake $Rwaan", successMessage: "Flexible position created.", errorMessage: "Stake failed.", retry: handleStakeFlexible, action: "Staked", amount: `${formattedAmount} $Rwaan (Flexible)` });
      confetti({ particleCount: isMobile ? 40 : 100, spread: isMobile ? 40 : 70, origin: { y: 0.6 }, colors: ["#F3BA2F", "#ffffff"] });
      setAmount("");
    } catch (error) {
      const parsed = parseContractError(error);
      toast({ title: parsed.title, description: parsed.description });
    }
  };

  const handleCopyReferral = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: "Referral link copied", description: "Share it to earn referral rewards." });
  };

  if (!mounted) {
    return (
      <div className="premium-card rounded-2xl p-6 space-y-4">
        <div className="h-6 w-40 rounded-lg bg-white/[0.04]" />
        <div className="h-4 w-64 rounded-lg bg-white/[0.04]" />
        <div className="h-12 w-full rounded-xl bg-white/[0.04]" />
        <div className="h-12 w-full rounded-xl bg-white/[0.04]" />
      </div>
    );
  }

  return (
    <div className="premium-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 sm:p-6 pb-0">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-white">Stake $Rwaan</h3>
          <p className="text-[13px] text-white/30 mt-1">
            Choose flexible or locked staking, approve $Rwaan, and create a position.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowHowToStake(true)}
          className="flex items-center gap-2 text-[#F3BA2F]/70 hover:text-[#F3BA2F] hover:bg-[#F3BA2F]/[0.06]"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-[13px]">How to Stake</span>
        </Button>
      </div>

      <div className="p-4 sm:p-6 pt-3 sm:pt-4 space-y-4 sm:space-y-5">
        {!address ? (
          <EmptyState title="Wallet required" description="Connect your wallet to start staking $Rwaan." />
        ) : (
          <>
            {(() => {
              const isFlexibleEnabled = lockOptions.options.some((opt) => opt && opt.duration === 0n && opt.active);
              // Show ALL plans — active ones are selectable, inactive show as "Coming Soon"
              const activeLockedPlans = STAKING_PLANS;

              return (
                <Tabs value={mode} onValueChange={(value) => setMode(value as "flexible" | "locked")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="locked" className="gap-1.5">
                      <Lock className="h-3 w-3" />
                      Locked
                    </TabsTrigger>
                    {isFlexibleEnabled ? (
                      <TabsTrigger value="flexible" className="gap-1.5">
                        <Unlock className="h-3 w-3" />
                        Flexible
                      </TabsTrigger>
                    ) : (
                      <TabsTrigger value="flexible" disabled className="opacity-40 cursor-not-allowed gap-1.5">
                        <Unlock className="h-3 w-3" />
                        Flexible
                      </TabsTrigger>
                    )}
                  </TabsList>

                  <TabsContent value="flexible">
                    {isFlexibleEnabled ? (
                      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-[13px] text-white/35">
                        Withdraw anytime. No lockup, standard rewards.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4 text-[13px] text-amber-300/70">
                        Flexible staking is currently disabled for new deposits.
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="locked">
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {activeLockedPlans.map((plan) => {
                          const option = lockOptions.options
                            .filter((item): item is NonNullable<typeof item> => Boolean(item))
                            .find((item) => item.duration === BigInt(plan.durationSeconds));
                          const isPlanActive = option?.active === true;
                          const multiplierBps = option?.multiplierBps ? BigInt(option.multiplierBps) : 10_000n;
                          // Use on-chain APR when active, target APR as preview when not yet active
                          const effectiveAprBps = isPlanActive && baseAprBps > 0n
                            ? (baseAprBps * multiplierBps) / 10_000n
                            : plan.targetAprBps;
                          const isSelected = selectedPlanId === plan.id;

                          return (
                            <motion.button
                              key={plan.id}
                              type="button"
                              whileHover={isMobile ? undefined : { y: -2 }}
                              whileTap={isMobile ? undefined : { scale: 0.98 }}
                              onClick={() => isPlanActive && setSelectedPlanId(plan.id)}
                              disabled={!isPlanActive}
                              className={cn(
                                "relative rounded-xl border px-4 py-3.5 text-left transition-all duration-200 sm:px-5 sm:py-4",
                                isPlanActive
                                  ? isSelected
                                    ? "border-[#F3BA2F]/25 bg-[#F3BA2F]/[0.04] shadow-[0_0_20px_rgba(243,186,47,0.08)]"
                                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.03]"
                                  : "border-white/[0.04] bg-white/[0.01] opacity-50 cursor-not-allowed"
                              )}
                            >
                              {isSelected && isPlanActive && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#F3BA2F] shadow-[0_0_8px_rgba(243,186,47,0.4)]"
                                >
                                  <Check className="h-3 w-3 text-black" />
                                </motion.div>
                              )}
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className={cn("text-[10px] uppercase tracking-[0.2em] font-medium", isSelected && isPlanActive ? "text-[#F3BA2F]/80" : "text-white/25")}>
                                  Plan
                                </div>
                                {!isPlanActive && (
                                  <span className="text-[9px] uppercase tracking-[0.1em] font-semibold text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded-md border border-white/[0.04]">
                                    Soon
                                  </span>
                                )}
                              </div>
                              <div className={cn("text-base font-semibold sm:text-lg", isSelected && isPlanActive ? "text-white" : "text-white/70")}>
                                {plan.label}
                              </div>
                              <div className={cn("mt-0.5 text-[13px]", isSelected && isPlanActive ? "text-[#F3BA2F]/70" : "text-white/25")}>
                                {effectiveAprBps ? `${formatBps(effectiveAprBps)} APR` : "APR —"}
                              </div>
                            </motion.button>
                          );
                        })}
                    </div>
                  </TabsContent>
                </Tabs>
              );
            })()}

            {/* Balance + Input */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[12px] px-1">
                <span className="text-white/25">Available balance</span>
                <span className="text-white/50 font-medium">
                  {balance.isLoading ? "Loading..." : balance.data !== undefined ? `${balanceFormatted} $Rwaan` : "0 $Rwaan"}
                </span>
              </div>
              <Input placeholder="Enter amount" value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" />
              <div className="flex items-center justify-between text-[11px] px-1">
                <span className="text-white/20">
                  {amountUsd !== null ? `≈ ${formatUsd(amountUsd)}` : "—"}
                </span>
                <span className={belowMinimum ? "text-rose-400/80" : "text-white/20"}>
                  Min $20
                  {minStakeRwaan > 0 ? ` (~${Math.ceil(minStakeRwaan).toLocaleString()} RWAAN)` : ""}
                </span>
              </div>
              {belowMinimum && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2 text-[11px] text-rose-300/80">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  Minimum stake is $20 (~{Math.ceil(minStakeRwaan).toLocaleString()} RWAAN at current price)
                </div>
              )}
            </div>

            {/* Warnings */}
            {mode === "locked" && !selectedOption && (
              <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/15 bg-rose-500/[0.04] px-4 py-3 text-[12px] text-rose-300/70">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Selected plan is not available on-chain yet.
              </div>
            )}

            {disabled && (
              <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-4 py-3 text-[12px] text-amber-300/60">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {!address ? "Wallet required to stake" : !parsedAmount || parsedAmount <= 0n ? "Enter amount to stake" : tokenAddress.isLoading ? "Loading token info..." : allowance.isLoading ? "Checking allowance..." : "Checking requirements..."}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {!address ? (
                <div className="w-full rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-4 py-3 text-center text-[13px] font-semibold text-amber-300/60">
                  Wallet required to stake
                </div>
              ) : (
                <>
                  {needsApproval && (
                    <Button variant="secondary" disabled={disabled || approve.isPending} onClick={handleApprove} className="w-full sm:w-auto">
                      {approve.isPending ? "Approving..." : "Approve"}
                    </Button>
                  )}
                  <Button
                    disabled={disabled || needsApproval || (mode === "locked" && !selectedOption) || (mode === "locked" ? isStakeLockedPending : isStakeFlexiblePending)}
                    onClick={mode === "locked" ? handleStakeLocked : handleStakeFlexible}
                    className="w-full sm:w-auto"
                  >
                    {mode === "locked"
                      ? isStakeLockedPending ? "Staking..." : "Stake locked"
                      : isStakeFlexiblePending ? "Staking..." : "Stake flexible"}
                  </Button>
                </>
              )}
            </div>

            {/* Referral */}
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-3.5 w-3.5 text-white/20" />
                <span className="text-[10px] uppercase tracking-[0.15em] font-semibold text-white/25">Referral link</span>
              </div>
              <p className="text-[12px] text-white/20">
                Share your link and earn referral rewards when friends stake.
              </p>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <Input value={shareUrl} placeholder="Wallet required to generate your link" readOnly className="text-[12px]" />
                <Button type="button" variant="secondary" onClick={handleCopyReferral} disabled={!shareUrl} className="w-full sm:w-auto">
                  Copy link
                </Button>
              </div>
              {referrer && (
                <div className="text-[11px] text-emerald-400/60">
                  Referrer applied: {formatAddress(referrer)}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <HowToStakeGuide open={showHowToStake} onOpenChange={setShowHowToStake} />
    </div>
  );
}
