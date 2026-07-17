import { useMemo } from "react";
import { useAccount, useReadContracts } from "wagmi";

import { RWAN_STAKING_ABI } from "@/lib/contracts/rwanStakingAbi";
import { RWAN_STAKING_ADDRESS } from "@/lib/utils/constants";
import type { PositionWithRewards } from "@/types/staking";
import { useUserPositionIds } from "./use-staking-reads";
import { useWalletReady } from "./use-wallet-guard";

export function usePositionsWithRewards() {
  const { address } = useAccount();
  const walletReady = useWalletReady();
  const ids = useUserPositionIds();
  const positionIds = (ids.data ?? []) as bigint[];

  const positionReads = useReadContracts({
    contracts: positionIds.map((positionId) => ({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "positions" as const,
      args: [positionId] as const,
    })) as any,
    query: {
      // CRITICAL: Only fetch when wallet is connected
      enabled: walletReady && positionIds.length > 0,
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
    },
  });

  const rewardsReads = useReadContracts({
    contracts: positionIds.map((positionId) => ({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "pendingRewards" as const,
      args: [positionId] as const,
    })) as any,
    query: {
      // CRITICAL: Only fetch when wallet is connected
      enabled: walletReady && positionIds.length > 0,
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
    },
  });

  const positions = useMemo(() => {
    // If wallet disconnected, return empty array immediately
    if (!address) return [];

    return positionIds
      .map((id, index) => {
        const position = positionReads.data?.[index]?.result as
          | {
            amount: bigint;
            weightedAmount: bigint;
            startTime: bigint;
            unlockTime: bigint;
            lockId: bigint;
            rewardDebt: bigint;
            withdrawn: boolean;
          }
          | readonly [bigint, bigint, bigint, bigint, bigint, bigint, boolean]
          | undefined;
        const pendingRewards = rewardsReads.data?.[index]?.result as
          | bigint
          | undefined;
        if (!position) return null;
        const amount = "amount" in position ? position.amount : position[0];
        const weightedAmount =
          "weightedAmount" in position ? position.weightedAmount : position[1];
        const startTime =
          "startTime" in position ? position.startTime : position[2];
        const unlockTime =
          "unlockTime" in position ? position.unlockTime : position[3];
        const lockId = "lockId" in position ? position.lockId : position[4];
        const rewardDebt =
          "rewardDebt" in position ? position.rewardDebt : position[5];
        const withdrawn = "withdrawn" in position ? position.withdrawn : position[6];

        // Filter out withdrawn positions
        if (withdrawn) return null;

        return {
          id,
          amount,
          weightedAmount,
          startTime,
          unlockTime,
          lockId,
          withdrawn,
          rewardDebt,
          pendingRewards: pendingRewards ?? 0n,
        } satisfies PositionWithRewards;
      })
      .filter(Boolean) as PositionWithRewards[];
  }, [address, positionIds, positionReads.data, rewardsReads.data]);

  return {
    positions,
    isLoading: ids.isLoading || positionReads.isLoading || rewardsReads.isLoading,
    error: ids.error ?? positionReads.error ?? rewardsReads.error,
  };
}
