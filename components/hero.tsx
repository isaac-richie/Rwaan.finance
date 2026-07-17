"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useAccount } from "wagmi";
import { ArrowRight, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { usePositionsWithRewards } from "@/hooks/use-positions";
import { useMounted } from "@/hooks/use-mounted";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { RWAN_DECIMALS, RWAN_TOKEN_ADDRESS, STAKING_DAPP_URL } from "@/lib/utils/constants";
import { formatToken, formatUsd } from "@/lib/utils/format";
import { useRwanMarket } from "@/components/crypto/use-rwan-market";
import { HowToStakeGuide } from "@/components/staking/how-to-stake-guide";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export function Hero() {
  const { address } = useAccount();
  const { positions } = usePositionsWithRewards();
  const { fdv, isLoading: isFdvLoading } = useRwanMarket();
  const { toast } = useToast();
  const mounted = useMounted();
  const isMobile = useIsMobile();
  const [showHowToStake, setShowHowToStake] = useState(false);

  const totalRewards = positions.reduce(
    (sum, position) => sum + position.pendingRewards,
    0n
  );

  return (
    <motion.section
      initial={isMobile ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={isMobile ? { duration: 0 } : { duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl"
    >
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(225_20%_7%)] via-[hsl(225_22%_5%)] to-[hsl(225_25%_3%)]" />
      <div className="pointer-events-none absolute inset-0 bg-radial-glow opacity-60" />
      <div className="pointer-events-none absolute -top-20 -right-20 h-[300px] w-[300px] rounded-full bg-[#F3BA2F]/[0.06] blur-[100px] animate-hero-glow" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-[200px] w-[200px] rounded-full bg-violet/[0.04] blur-[80px]" />

      {/* Border highlight */}
      <div className="absolute inset-0 rounded-2xl sm:rounded-3xl border border-white/[0.06]" />
      <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[#F3BA2F]/20 to-transparent" />

      {/* Content */}
      <div className="relative z-10 p-4 sm:p-6 md:p-12 lg:p-14">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-12">
          {/* Left: Headline */}
          <div className="flex max-w-xl flex-col gap-4 sm:gap-6">
            {/* Protocol badge */}
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="flex items-center gap-2.5 w-fit"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#F3BA2F]/10 border border-[#F3BA2F]/20">
                <Zap className="h-2.5 w-2.5 text-[#F3BA2F]" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#F3BA2F]/80">
                Rwaan Staking Protocol
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.12, delayChildren: 0.3 },
                },
              }}
              className="text-[26px] font-bold leading-[1.1] tracking-tight sm:text-4xl md:text-[44px]"
            >
              <motion.span variants={fadeUp} className="block text-white">
                Stake $Rwaan.
              </motion.span>
              <motion.span variants={fadeUp} className="text-gold-gradient block">
                Earn premium yield.
              </motion.span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="text-sm leading-relaxed text-white/40 md:text-[15px] max-w-md"
            >
              Stake with confidence. Track every position, claim rewards precisely,
              and unlock at your own pace on BNB Chain.
            </motion.p>

            {/* CTA row */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.5 }}
              className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3"
            >
              <div className="flex gap-2.5 sm:gap-3">
                <Button
                  onClick={() => setShowHowToStake(true)}
                  className="gap-2 h-11 sm:h-12 px-5 sm:px-6 text-[13px] sm:text-sm font-semibold shadow-glow flex-1 sm:flex-none"
                >
                  How to Stake
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>

                <Button
                  asChild
                  variant="secondary"
                  className="h-11 sm:h-12 px-4 sm:px-5 text-[13px] sm:text-sm flex-1 sm:flex-none"
                >
                  <a href={`${STAKING_DAPP_URL}#staking-plans`} target="_blank" rel="noreferrer">
                    View Plans
                  </a>
                </Button>
              </div>

              <div className="flex items-center gap-2 justify-center sm:justify-start">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(RWAN_TOKEN_ADDRESS);
                    toast({
                      title: "Address copied",
                      description: "Contract address copied to clipboard",
                    });
                  }}
                  className="text-xs text-white/30 hover:text-white/60"
                >
                  Copy CA
                </Button>
                <span className="h-3 w-px bg-white/10" />
                <Button asChild variant="ghost" size="sm" className="text-xs text-white/30 hover:text-white/60">
                  <a
                    href={`https://pancakeswap.finance/swap?outputCurrency=${RWAN_TOKEN_ADDRESS}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Buy $Rwaan
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Right: Stats card */}
          <motion.div
            initial={isMobile ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full md:min-w-[280px] md:max-w-[320px] md:w-auto"
          >
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6 space-y-5">
              {/* FDV */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/30">
                  Total $Rwaan value
                </div>
                <div className="text-2xl font-bold text-white">
                  {isFdvLoading ? (
                    <Skeleton className="h-7 w-28" />
                  ) : (
                    fdv !== null ? formatUsd(fdv, 0) : "—"
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

              {/* Rewards */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/30">
                  Rewards available
                </div>
                <div className="text-lg font-semibold text-white">
                  {!mounted ? (
                    <Skeleton className="h-5 w-32" />
                  ) : address ? (
                    positions.length === 0 ? (
                      <span className="text-white/20">—</span>
                    ) : (
                      <span className="text-emerald">
                        {formatToken(totalRewards, RWAN_DECIMALS)} $Rwaan
                      </span>
                    )
                  ) : (
                    <span className="text-white/20">Connect wallet</span>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                <span className="text-[11px] text-white/25">
                  {!mounted
                    ? "Loading..."
                    : address
                      ? "Live — synced to your wallet"
                      : "Connect to view rewards"}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <HowToStakeGuide open={showHowToStake} onOpenChange={setShowHowToStake} />
    </motion.section>
  );
}
