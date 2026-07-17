"use client";

import { AlertTriangle, Pause, Play, ArrowDownToLine } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransactionToasts } from "@/hooks/use-transaction-toasts";
import { usePaused } from "@/hooks/use-staking-reads";
import { usePause, useUnpause, useEmergencyRecoverRewards } from "@/hooks/use-staking-writes";
import { isAddress } from "viem";

export function EmergencyControls() {
  const paused = usePaused();
  const { pause, isPending: isPausing } = usePause();
  const { unpause, isPending: isUnpausing } = useUnpause();
  const { emergencyRecoverRewards, isPending: isRecovering } = useEmergencyRecoverRewards();
  const { trackTx } = useTransactionToasts();
  
  const [recipientAddress, setRecipientAddress] = useState("");

  const handlePause = async () => {
    const hash = await pause();
    if (!hash) return;
    trackTx(hash, {
      title: "Pause contract",
      successMessage: "Contract paused.",
      errorMessage: "Failed to pause contract.",
      retry: handlePause,
    });
  };

  const handleUnpause = async () => {
    const hash = await unpause();
    if (!hash) return;
    trackTx(hash, {
      title: "Unpause contract",
      successMessage: "Contract unpaused.",
      errorMessage: "Failed to unpause contract.",
      retry: handleUnpause,
    });
  };

  const handleEmergencyRecoverRewards = async () => {
    if (!recipientAddress || !isAddress(recipientAddress)) {
      alert("Please enter a valid recipient address");
      return;
    }
    
    const hash = await emergencyRecoverRewards(recipientAddress as `0x${string}`);
    if (!hash) return;
    
    trackTx(hash, {
      title: "Emergency recover rewards",
      successMessage: "Rewards recovered successfully.",
      errorMessage: "Failed to recover rewards.",
      retry: handleEmergencyRecoverRewards,
    });
    
    // Clear input on success
    setRecipientAddress("");
  };

  const isPausedState = Boolean(paused.data);

  return (
    <div className="glass glass-solid rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-red-400" />
        <div className="text-lg font-semibold">Emergency controls</div>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        Pause all staking/withdrawal operations in case of emergency.
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
          <span className="text-xs text-muted-foreground">Contract status</span>
          {paused.isLoading ? (
            <Skeleton className="h-6 w-20" />
          ) : (
            <span
              className={`text-xs font-semibold ${
                isPausedState ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {isPausedState ? "PAUSED" : "ACTIVE"}
            </span>
          )}
        </div>

        {isPausedState ? (
          <Button
            variant="default"
            className="w-full h-10"
            disabled={isUnpausing}
            onClick={handleUnpause}
          >
            <Play className="mr-2 h-4 w-4" />
            {isUnpausing ? "Unpausing..." : "Unpause contract"}
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full h-10 border-destructive text-destructive hover:bg-destructive/10"
            disabled={isPausing}
            onClick={handlePause}
          >
            <Pause className="mr-2 h-4 w-4" />
            {isPausing ? "Pausing..." : "Pause contract"}
          </Button>
        )}

        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-400">
          <strong>Warning:</strong> Pausing will prevent all stake, claim, and withdraw
          operations. Users can still use emergency withdraw with penalty.
        </div>

        {/* Emergency Recover Rewards Section */}
        <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4 text-amber-400" />
            <div className="text-sm font-semibold">Emergency recover rewards</div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Recover all reward tokens when contract is paused. Only use in emergencies.
          </div>

          <Input
            type="text"
            placeholder="Recipient address (0x...)"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            className="font-mono text-xs h-9"
            disabled={!isPausedState || isRecovering}
          />

          <Button
            variant="outline"
            className="w-full h-10 border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
            disabled={!isPausedState || !recipientAddress || isRecovering}
            onClick={handleEmergencyRecoverRewards}
          >
            <ArrowDownToLine className="mr-2 h-4 w-4" />
            {isRecovering ? "Recovering..." : "Recover rewards"}
          </Button>

          <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-400">
            <strong>Note:</strong> This function only works when contract is PAUSED.
            It transfers ALL reward tokens to the specified address.
          </div>
        </div>
      </div>
    </div>
  );
}
