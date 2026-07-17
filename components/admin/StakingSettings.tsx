"use client";

import { useMemo, useState } from "react";
import { parseUnits } from "viem";
import { Settings as SettingsIcon, Pause, Play, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransactionToasts } from "@/hooks/use-transaction-toasts";
import {
  useMinStakeAmount,
  useMaxPositionsPerUser,
  useReferralBps,
  useReferralsPaused,
} from "@/hooks/use-staking-reads";
import {
  useSetMinStakeAmount,
  useSetMaxPositionsPerUser,
  useSetReferralBps,
  usePauseReferrals,
  useUnpauseReferrals,
} from "@/hooks/use-staking-writes";
import { RWAN_DECIMALS } from "@/lib/utils/constants";
import { formatToken, formatBps } from "@/lib/utils/format";

export function StakingSettings() {
  const minStake = useMinStakeAmount();
  const maxPositions = useMaxPositionsPerUser();
  const referralBps = useReferralBps();
  const referralsPaused = useReferralsPaused();
  
  const { setMinStakeAmount, isPending: isSettingMinStake } = useSetMinStakeAmount();
  const { setMaxPositionsPerUser, isPending: isSettingMaxPos } = useSetMaxPositionsPerUser();
  const { setReferralBps, isPending: isSettingReferral } = useSetReferralBps();
  const { pauseReferrals, isPending: isPausingRef } = usePauseReferrals();
  const { unpauseReferrals, isPending: isUnpausingRef } = useUnpauseReferrals();
  const { trackTx } = useTransactionToasts();

  const [minStakeInput, setMinStakeInput] = useState("");
  const [maxPosInput, setMaxPosInput] = useState("");
  const [referralInput, setReferralInput] = useState("");

  const parsedMinStake = useMemo(() => {
    if (!minStakeInput) return null;
    try {
      return parseUnits(minStakeInput, RWAN_DECIMALS);
    } catch {
      return null;
    }
  }, [minStakeInput]);

  const parsedMaxPos = useMemo(() => {
    const num = Number(maxPosInput);
    return Number.isFinite(num) && num >= 0 ? BigInt(Math.floor(num)) : null;
  }, [maxPosInput]);

  const parsedReferralBps = useMemo(() => {
    const num = Number(referralInput);
    // Convert percentage to bps (5% = 500 bps)
    return Number.isFinite(num) && num >= 0 && num <= 100
      ? BigInt(Math.floor(num * 100))
      : null;
  }, [referralInput]);

  const handleSetMinStake = async () => {
    if (!parsedMinStake) return;
    const hash = await setMinStakeAmount(parsedMinStake);
    if (!hash) return;
    trackTx(hash, {
      title: "Update min stake",
      successMessage: "Minimum stake amount updated.",
      errorMessage: "Failed to update min stake.",
      retry: handleSetMinStake,
    });
    setMinStakeInput("");
  };

  const handleSetMaxPos = async () => {
    if (parsedMaxPos === null) return;
    const hash = await setMaxPositionsPerUser(parsedMaxPos);
    if (!hash) return;
    trackTx(hash, {
      title: "Update max positions",
      successMessage: "Max positions per user updated.",
      errorMessage: "Failed to update max positions.",
      retry: handleSetMaxPos,
    });
    setMaxPosInput("");
  };

  const handleSetReferralBps = async () => {
    if (parsedReferralBps === null) return;
    const hash = await setReferralBps(parsedReferralBps);
    if (!hash) return;
    trackTx(hash, {
      title: "Update referral rate",
      successMessage: "Referral rate updated.",
      errorMessage: "Failed to update referral rate.",
      retry: handleSetReferralBps,
    });
    setReferralInput("");
  };

  const handlePauseReferrals = async () => {
    const hash = await pauseReferrals();
    if (!hash) return;
    trackTx(hash, {
      title: "Pause referrals",
      successMessage: "Referral system paused.",
      errorMessage: "Failed to pause referrals.",
      retry: handlePauseReferrals,
    });
  };

  const handleUnpauseReferrals = async () => {
    const hash = await unpauseReferrals();
    if (!hash) return;
    trackTx(hash, {
      title: "Unpause referrals",
      successMessage: "Referral system resumed.",
      errorMessage: "Failed to unpause referrals.",
      retry: handleUnpauseReferrals,
    });
  };

  return (
    <div className="glass glass-solid rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-primary" />
        <div className="text-lg font-semibold">Staking settings</div>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Configure staking parameters and limits.
      </div>

      <div className="mt-4 space-y-4">
        {/* Current Settings */}
        <div className="grid gap-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Min stake amount</span>
            <span className="text-foreground">
              {minStake.isLoading ? (
                <Skeleton className="h-4 w-24" />
              ) : (
                `${formatToken(minStake.data, RWAN_DECIMALS)} $Rwaan`
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Max positions/user</span>
            <span className="text-foreground">
              {maxPositions.isLoading ? (
                <Skeleton className="h-4 w-16" />
              ) : maxPositions.data === 0n ? (
                "Unlimited"
              ) : (
                maxPositions.data?.toString()
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Referral reward</span>
            <span className="text-foreground">
              {referralBps.isLoading ? (
                <Skeleton className="h-4 w-12" />
              ) : (
                formatBps(referralBps.data)
              )}
            </span>
          </div>
        </div>

        {/* Update Min Stake */}
        <div className="border-t border-white/10 pt-4">
          <div className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Update min stake
          </div>
          <div className="grid gap-2">
            <Input
              placeholder="Minimum stake amount"
              value={minStakeInput}
              onChange={(e) => setMinStakeInput(e.target.value)}
              inputMode="decimal"
            />
            <Button
              size="sm"
              disabled={!parsedMinStake || isSettingMinStake}
              onClick={handleSetMinStake}
            >
              {isSettingMinStake ? "Updating..." : "Update min stake"}
            </Button>
          </div>
        </div>

        {/* Update Max Positions */}
        <div className="border-t border-white/10 pt-4">
          <div className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Update max positions
          </div>
          <div className="grid gap-2">
            <Input
              placeholder="Max positions (0 = unlimited)"
              value={maxPosInput}
              onChange={(e) => setMaxPosInput(e.target.value)}
              inputMode="numeric"
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={parsedMaxPos === null || isSettingMaxPos}
              onClick={handleSetMaxPos}
            >
              {isSettingMaxPos ? "Updating..." : "Update max positions"}
            </Button>
          </div>
        </div>

        {/* Update Referral Rate */}
        <div className="border-t border-white/10 pt-4">
          <div className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Update referral rate
          </div>
          <div className="grid gap-2">
            <Input
              placeholder="Referral % (e.g., 5 for 5%)"
              value={referralInput}
              onChange={(e) => setReferralInput(e.target.value)}
              inputMode="decimal"
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={parsedReferralBps === null || isSettingReferral}
              onClick={handleSetReferralBps}
            >
              {isSettingReferral ? "Updating..." : "Update referral rate"}
            </Button>
          </div>
        </div>

        {/* Referral Controls */}
        <div className="border-t border-white/10 pt-4">
          <div className="mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Referral controls
            </div>
          </div>
          
          {/* Status Display */}
          <div className="mb-3 flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            <span className="text-xs text-muted-foreground">Referral status</span>
            {referralsPaused.isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <span
                className={`text-xs font-semibold ${
                  referralsPaused.data ? "text-red-400" : "text-green-400"
                }`}
              >
                {referralsPaused.data ? "PAUSED" : "ACTIVE"}
              </span>
            )}
          </div>

          {/* Control Button */}
          {referralsPaused.data ? (
            <>
              <Button
                size="sm"
                className="w-full bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-600/30"
                disabled={isUnpausingRef}
                onClick={handleUnpauseReferrals}
              >
                <Play className="mr-2 h-4 w-4" />
                {isUnpausingRef ? "Resuming..." : "Resume referrals"}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Referrals are currently paused. Click to resume.
              </p>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-destructive text-destructive hover:bg-destructive/10"
                disabled={isPausingRef}
                onClick={handlePauseReferrals}
              >
                <Pause className="mr-2 h-4 w-4" />
                {isPausingRef ? "Pausing..." : "Pause referrals"}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Pause the referral system temporarily without changing rates.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
