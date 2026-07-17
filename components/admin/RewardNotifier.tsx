"use client";

import { useMemo, useState } from "react";
import { parseUnits } from "viem";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransactionToasts } from "@/hooks/use-transaction-toasts";
import { useFundReferralRewards, useFundRewards } from "@/hooks/use-staking-writes";
import { useCurrentAprBps, useRewardReserve, useTotalStaked } from "@/hooks/use-staking-reads";
import { RWAN_DECIMALS } from "@/lib/utils/constants";
import { formatBps, formatToken } from "@/lib/utils/format";

export function RewardNotifier() {
  const totalStaked = useTotalStaked();
  const rewardReserve = useRewardReserve();
  const currentApr = useCurrentAprBps();
  const { fundRewards, isPending: isFundingRewards } = useFundRewards();
  const { fundReferralRewards, isPending: isFundingReferral } = useFundReferralRewards();
  const { trackTx } = useTransactionToasts();

  const [rewardAmount, setRewardAmount] = useState("");
  const [referralAmount, setReferralAmount] = useState("");

  const parsedRewardAmount = useMemo(() => {
    if (!rewardAmount) return null;
    try {
      return parseUnits(rewardAmount, RWAN_DECIMALS);
    } catch {
      return null;
    }
  }, [rewardAmount]);

  const parsedReferralAmount = useMemo(() => {
    if (!referralAmount) return null;
    try {
      return parseUnits(referralAmount, RWAN_DECIMALS);
    } catch {
      return null;
    }
  }, [referralAmount]);

  const handleFundRewards = async () => {
    if (!parsedRewardAmount) return;
    const hash = await fundRewards(parsedRewardAmount);
    if (!hash) return;
    trackTx(hash, {
      title: "Fund rewards",
      successMessage: "Reward reserve funded.",
      errorMessage: "Failed to fund rewards.",
      retry: handleFundRewards,
    });
    setRewardAmount("");
  };

  const handleFundReferral = async () => {
    if (!parsedReferralAmount) return;
    const hash = await fundReferralRewards(parsedReferralAmount);
    if (!hash) return;
    trackTx(hash, {
      title: "Fund referrals",
      successMessage: "Referral reserve funded.",
      errorMessage: "Failed to fund referrals.",
      retry: handleFundReferral,
    });
    setReferralAmount("");
  };

  return (
    <div className="glass glass-solid rounded-2xl p-5">
      <div className="text-lg font-semibold">Reward funding</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Fund staking and referral reserves.
      </div>

      <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Total staked</span>
          <span className="text-foreground">
            {totalStaked.isLoading ? (
              <Skeleton className="h-4 w-20" />
            ) : (
              `${formatToken(totalStaked.data, RWAN_DECIMALS)} $Rwaan`
            )}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Reward reserve</span>
          <span className="text-foreground">
            {rewardReserve.isLoading ? (
              <Skeleton className="h-4 w-16" />
            ) : (
              `${formatToken(rewardReserve.data, RWAN_DECIMALS)} $Rwaan`
            )}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Current base APR</span>
          <span className="text-foreground">
            {currentApr.isLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              formatBps(currentApr.data)
            )}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <Input
          placeholder="Fund staking rewards"
          value={rewardAmount}
          onChange={(event) => setRewardAmount(event.target.value)}
          inputMode="decimal"
        />
        <Button
          disabled={!parsedRewardAmount || isFundingRewards}
          onClick={handleFundRewards}
        >
          {isFundingRewards ? "Funding..." : "Fund rewards"}
        </Button>
        <Input
          placeholder="Fund referral rewards"
          value={referralAmount}
          onChange={(event) => setReferralAmount(event.target.value)}
          inputMode="decimal"
        />
        <Button
          variant="secondary"
          disabled={!parsedReferralAmount || isFundingReferral}
          onClick={handleFundReferral}
        >
          {isFundingReferral ? "Funding..." : "Fund referrals"}
        </Button>
      </div>
    </div>
  );
}
