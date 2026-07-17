import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";

import { RWAN_STAKING_ABI, RWAN_STAKING_ADDRESS } from "@/lib/contracts/rwanStakingAbi";
import { MAX_LOCK_OPTIONS } from "@/lib/utils/constants";
import type { LockOption } from "@/types/staking";
import type { AprTier } from "@/lib/utils/staking";

export function useTotalStaked() {
  return useReadContract({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    functionName: "totalStaked",
    query: {
      refetchInterval: 60_000,
    },
  });
}

export function useStakingToken() {
  return useReadContract({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    functionName: "stakingToken",
    query: {
      // The staking token address is set at deploy time and never changes.
      staleTime: Infinity,
      gcTime: 24 * 60 * 60_000, // keep in cache for a full session day
    },
  });
}

export function useOwner() {
  return useReadContract({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    functionName: "owner",
    query: {
      // Owner changes are extremely rare (transferOwnership tx required).
      staleTime: Infinity,
      gcTime: 24 * 60 * 60_000,
    },
  });
}

export function useUserPositionIds() {
  const { address } = useAccount();
  return useReadContract({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    functionName: "userPositions",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
    },
  });
}

export function useLockOptions() {
  const count = useReadContract({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    functionName: "lockOptionsLength",
    query: {
      // Lock options are admin-configured and change very infrequently.
      staleTime: 5 * 60_000,  // treat as fresh for 5 min
      gcTime: 10 * 60_000,    // keep in cache for 10 min after unmount
    },
  });

  const size = Math.min(Number(count.data ?? 0), MAX_LOCK_OPTIONS);

  const optionsResult = useReadContracts({
    contracts: Array.from({ length: size }).map((_, index) => ({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "lockOptions" as const,
      args: [BigInt(index)] as const,
    })) as any,
    query: {
      // CRITICAL: Don't fire an empty multicall — Alchemy returns 400 for []
      enabled: size > 0,
      staleTime: 5 * 60_000,
      gcTime: 10 * 60_000,
    },
  });

  const options = useMemo(() => {
    return (
      optionsResult.data
        ?.map((item, index) => {
          const result = item.result as
            | {
              duration: bigint;
              multiplierBps: bigint;
              active: boolean;
            }
            | {
              duration: bigint;
              multiplierBps: bigint;
              enabled: boolean;
            }
            | readonly [bigint, bigint, boolean]
            | undefined;
          if (!result) return null;
          const duration =
            "duration" in result ? result.duration : result[0];
          const multiplierBps =
            "multiplierBps" in result ? result.multiplierBps : result[1];
          const active =
            "active" in result
              ? result.active
              : "enabled" in result
                ? result.enabled
                : result[2];
          return {
            id: BigInt(index),
            duration,
            multiplierBps,
            active,
          } satisfies LockOption;
        })
        .filter(Boolean) ?? []
    );
  }, [optionsResult.data]);

  return {
    count,
    options,
    isLoading: count.isLoading || optionsResult.isLoading,
    error: count.error ?? optionsResult.error,
  };
}

export function useAprTiers() {
  const count = useReadContract({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    functionName: "aprTiersLength",
    query: {
      // APR tiers are admin-set and very rarely change.
      staleTime: 5 * 60_000,   // treat as fresh for 5 min
      gcTime: 10 * 60_000,     // was 10s — now 10 min to survive remounts
    },
  });

  const size = Math.min(Number(count.data ?? 0), 25);

  const tiersResult = useReadContracts({
    contracts: Array.from({ length: size }).map((_, index) => ({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "aprTiers" as const,
      args: [BigInt(index)] as const,
    })) as any,
    query: {
      // CRITICAL: Don't fire an empty multicall — Alchemy returns 400 for []
      enabled: size > 0,
      staleTime: 5 * 60_000,
      gcTime: 10 * 60_000,
    },
  });

  const tiers = useMemo(() => {
    return (
      tiersResult.data
        ?.map((item) => {
          const result = item.result as
            | {
              minTVL: bigint;
              aprBps: bigint;
            }
            | readonly [bigint, bigint]
            | undefined;
          if (!result) return null;
          const minTVL = "minTVL" in result ? result.minTVL : result[0];
          const aprBps = "aprBps" in result ? result.aprBps : result[1];
          return { minTVL, aprBps } satisfies AprTier;
        })
        .filter(Boolean) ?? []
    );
  }, [tiersResult.data]);

  return {
    count,
    tiers,
    isLoading: count.isLoading || tiersResult.isLoading,
    error: count.error ?? tiersResult.error,
  };
}

export function useCurrentAprBps() {
  return useReadContract({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    functionName: "currentAprBps",
    query: {
      refetchInterval: 60_000,
    },
  });
}

export function useTotalWeightedStaked() {
  return useReadContract({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    functionName: "totalWeightedStaked",
    query: {
      refetchInterval: 60_000,
    },
  });
}

export function useRewardReserve() {
  return useReadContract({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    functionName: "rewardReserve",
    query: {
      refetchInterval: 60_000,
      gcTime: 60_000,
      staleTime: 60_000,
    },
  });
}

// Contract State
export function usePaused() {
  return useReadContract({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    functionName: "paused",
    query: {
      refetchInterval: 60_000,
    },
  });
}

export function useMinStakeAmount() {
  return useReadContract({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    functionName: "minStakeAmount",
    query: {
      // Admin-set value, changes are rare on-chain txs.
      staleTime: Infinity,
      gcTime: 24 * 60 * 60_000,
    },
  });
}

export function useMaxPositionsPerUser() {
  return useReadContract({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    functionName: "maxPositionsPerUser",
    query: {
      staleTime: Infinity,
      gcTime: 24 * 60 * 60_000,
    },
  });
}

export function useReferralBps() {
  return useReadContract({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    functionName: "referralBps",
    query: {
      staleTime: Infinity,
      gcTime: 24 * 60 * 60_000,
    },
  });
}

export function useMinReferrerStake() {
  return useReadContract({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    functionName: "minReferrerStake",
    query: {
      staleTime: Infinity,
      gcTime: 24 * 60 * 60_000,
    },
  });
}

export function useReferralsPaused() {
  return useReadContract({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    functionName: "referralsPaused",
    query: {
      // Referral pause state is admin-toggled, not user-facing churn.
      staleTime: 5 * 60_000,
      gcTime: 10 * 60_000,
    },
  });
}

export function useReferralReserve() {
  return useReadContract({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    functionName: "referralReserve",
    query: {
      refetchInterval: 60_000,
      gcTime: 60_000,
      staleTime: 60_000,
    },
  });
}

export function useStakingContractBalance() {
  return useReadContract({
    address: "0xACB921bf2Dac2F7E8E101AAd9CA013d6Af5C648a", // RWAN Token
    abi: [{
      name: "balanceOf",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "account", type: "address" }],
      outputs: [{ name: "", type: "uint256" }],
    }],
    functionName: "balanceOf",
    args: [RWAN_STAKING_ADDRESS],
    query: {
      refetchInterval: 60_000,
    },
  });
}

export function useReferralEarnings(address?: `0x${string}`) {
  return useReadContract({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    functionName: "referralEarnings",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
    },
  });
}
