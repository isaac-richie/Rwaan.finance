// hooks/use-early-withdrawal.ts
import { useReadContract, useWriteContract } from 'wagmi';
import { RWAN_STAKING_ABI, RWAN_STAKING_ADDRESS } from '@/lib/contracts/rwanStakingAbi';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook to check if a position can be withdrawn without penalty
 */
export function useCanWithdrawWithoutPenalty(positionId: bigint | undefined) {
  return useReadContract({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    functionName: 'canWithdrawWithoutPenalty',
    args: positionId !== undefined ? [positionId] : undefined,
    query: { enabled: positionId !== undefined },
  });
}

/**
 * Hook to calculate early withdrawal penalty for a position
 * Returns [penaltyAmount, netAmount]
 */
export function useEarlyWithdrawalPenalty(positionId: bigint | undefined) {
  return useReadContract({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    functionName: 'calculateEarlyWithdrawalPenalty',
    args: positionId !== undefined ? [positionId] : undefined,
    query: { enabled: positionId !== undefined },
  });
}

/**
 * Hook to get the early withdrawal penalty constant (35%)
 */
export function useEarlyWithdrawalPenaltyBps() {
  return useReadContract({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    functionName: 'EARLY_WITHDRAWAL_PENALTY_BPS',
    query: {
      // Solidity constant — hardcoded at compile time, can never change.
      staleTime: Infinity,
      gcTime: 24 * 60 * 60_000,
    },
  });
}

/**
 * Hook to perform early withdrawal with penalty
 */
export function useWithdrawEarly() {
  const queryClient = useQueryClient();

  return useWriteContract({
    mutation: {
      onSuccess() {
        // Invalidate all position-related queries
        queryClient.invalidateQueries();
      },
    },
  });
}
