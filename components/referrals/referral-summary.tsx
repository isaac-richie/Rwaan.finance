"use client";

import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { Users } from "lucide-react";

import { useReferralEarnings } from "@/hooks/use-staking-reads";
import { RWAN_DECIMALS } from "@/lib/utils/constants";
import { formatToken } from "@/lib/utils/format";
import { NumberTicker } from "@/components/ui/number-ticker";
import { formatUnits } from "viem";

export function ReferralSummary() {
  const { address } = useAccount();
  const { data: earnings } = useReferralEarnings(address);

  const earningsNum = earnings ? Number(formatUnits(earnings, RWAN_DECIMALS)) : 0;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="premium-card rounded-2xl p-4 sm:p-5 card-glow-staking"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#F3BA2F]/10 bg-[#F3BA2F]/[0.06]">
          <Users className="h-3.5 w-3.5 text-[#F3BA2F]" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/35">
          Total Referral Earnings
        </span>
      </div>

      <div className="text-2xl font-bold">
        <span className="text-gold-gradient">
          <NumberTicker value={earningsNum} decimalPlaces={2} className="text-gold-gradient" />
        </span>
        <span className="text-sm font-normal text-white/25 ml-1.5">$Rwaan</span>
      </div>

      <div className="mt-2 text-[12px] text-white/25">
        Reward sent instantly to wallet
      </div>
    </motion.div>
  );
}
