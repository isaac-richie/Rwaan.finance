import { useWriteContract } from "wagmi";
import { zeroAddress } from "viem";

import { RWAN_STAKING_ABI } from "@/lib/contracts/rwanStakingAbi";
import { RWAN_STAKING_ADDRESS } from "@/lib/utils/constants";

export function useStakeFlexible() {
  const { writeContractAsync, isPending } = useWriteContract();

  const stakeFlexible = async (amount: bigint, referrer?: `0x${string}`) => {
    const referral = referrer ?? zeroAddress;
    // V3: lockId 0 = flexible/no lock
    const result = await writeContractAsync?.({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "stake",
      args: [amount, 0n, referral]
    });
    return result;
  };

  return { stakeFlexible, isPending: isPending };
}

export function useStakeLocked() {
  const { writeContractAsync, isPending } = useWriteContract();

  const stakeLocked = async (
    amount: bigint,
    lockId: bigint,
    referrer?: `0x${string}`
  ) => {
    const referral = referrer ?? zeroAddress;
    const result = await writeContractAsync?.({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "stake",
      args: [amount, lockId, referral]
    });
    return result;
  };

  return { stakeLocked, isPending: isPending };
}

export function useClaimPosition() {
  const { writeContractAsync, isPending } = useWriteContract();

  const claim = async (positionId: bigint) => {

    const result = await writeContractAsync?.({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "claim",
      args: [positionId]
    });
    return result;
  };

  return { claim, isPending: isPending };
}

export function useWithdrawPosition() {
  const { writeContractAsync, isPending } = useWriteContract();

  const withdraw = async (positionId: bigint) => {

    const result = await writeContractAsync?.({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "withdraw",
      args: [positionId]
    });
    return result;
  };

  return { withdraw, isPending: isPending };
}

export function useAddLockOption() {
  const { writeContractAsync, isPending } = useWriteContract();

  const addLockOption = async (
    duration: number | bigint,
    multiplierBps: number | bigint,
    enabled: boolean
  ) => {
    const result = await writeContractAsync?.({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "addLockOption",
      args: [
        BigInt(duration),
        Number(multiplierBps),
        enabled
      ],
    });
    return result;
  };

  return { addLockOption, isPending: isPending };
}

export function useSetLockOption() {
  const { writeContractAsync, isPending } = useWriteContract();

  const setLockOption = async (
    lockId: number | bigint,
    multiplierBps: number | bigint,
    enabled: boolean
  ) => {
    const result = await writeContractAsync?.({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "setLockOption",
      args: [
        BigInt(lockId),
        Number(multiplierBps),
        enabled
      ],
    });
    return result;
  };

  return { setLockOption, isPending: isPending };
}

export function useFundRewards() {
  const { writeContractAsync, isPending } = useWriteContract();

  const fundRewards = async (amount: bigint) => {

    const result = await writeContractAsync?.({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "fundRewards",
      args: [amount]
    });
    return result;
  };

  return { fundRewards, isPending: isPending };
}

export function useFundReferralRewards() {
  const { writeContractAsync, isPending } = useWriteContract();

  const fundReferralRewards = async (amount: bigint) => {

    const result = await writeContractAsync?.({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "fundReferralRewards",
      args: [amount]
    });
    return result;
  };

  return { fundReferralRewards, isPending: isPending };
}

export function useRecoverERC20() {
  const { writeContractAsync, isPending } = useWriteContract();

  const recoverERC20 = async (
    token: `0x${string}`,
    amount: bigint
  ) => {
    const result = await writeContractAsync?.({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "recoverERC20",
      args: [token, amount],
    });
    return result;
  };

  return { recoverERC20, isPending: isPending };
}

export function useTransferOwnership() {
  const { writeContractAsync, isPending } = useWriteContract();

  const transferOwnership = async (newOwner: `0x${string}`) => {

    const result = await writeContractAsync?.({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "transferOwnership",
      args: [newOwner],
    });
    return result;
  };

  return { transferOwnership, isPending: isPending };
}

// Pause/Unpause
export function usePause() {
  const { writeContractAsync, isPending } = useWriteContract();

  const pause = async () => {

    const result = await writeContractAsync?.({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "pause",
    });
    return result;
  };

  return { pause, isPending: isPending };
}

export function useUnpause() {
  const { writeContractAsync, isPending } = useWriteContract();

  const unpause = async () => {

    const result = await writeContractAsync?.({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "unpause",
    });
    return result;
  };

  return { unpause, isPending: isPending };
}

// Staking Settings
export function useSetMinStakeAmount() {
  const { writeContractAsync, isPending } = useWriteContract();

  const setMinStakeAmount = async (amount: bigint) => {

    const result = await writeContractAsync?.({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "setMinStakeAmount",
      args: [amount]
    });
    return result;
  };

  return { setMinStakeAmount, isPending: isPending };
}

export function useSetMaxPositionsPerUser() {
  const { writeContractAsync, isPending } = useWriteContract();

  const setMaxPositionsPerUser = async (maxPositions: bigint) => {

    const result = await writeContractAsync?.({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "setMaxPositionsPerUser",
      args: [maxPositions]
    });
    return result;
  };

  return { setMaxPositionsPerUser, isPending: isPending };
}

// Referral Settings
export function useSetReferralBps() {
  const { writeContractAsync, isPending } = useWriteContract();

  const setReferralBps = async (bps: bigint) => {

    const result = await writeContractAsync?.({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "setReferralBps",
      args: [bps]
    });
    return result;
  };

  return { setReferralBps, isPending: isPending };
}

export function useSetMinReferrerStake() {
  const { writeContractAsync, isPending } = useWriteContract();

  const setMinReferrerStake = async (amount: bigint) => {

    const result = await writeContractAsync?.({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "setMinReferrerStake",
      args: [amount]
    });
    return result;
  };

  return { setMinReferrerStake, isPending: isPending };
}

export function usePauseReferrals() {
  const { writeContractAsync, isPending } = useWriteContract();

  const pauseReferrals = async () => {

    const result = await writeContractAsync?.({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "pauseReferrals",
    });
    return result;
  };

  return { pauseReferrals, isPending: isPending };
}

export function useUnpauseReferrals() {
  const { writeContractAsync, isPending } = useWriteContract();

  const unpauseReferrals = async () => {

    const result = await writeContractAsync?.({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "unpauseReferrals",
    });
    return result;
  };

  return { unpauseReferrals, isPending: isPending };
}

export function useEmergencyRecoverRewards() {
  const { writeContractAsync, isPending } = useWriteContract();

  const emergencyRecoverRewards = async (to: `0x${string}`) => {
    const result = await writeContractAsync?.({
      address: RWAN_STAKING_ADDRESS,
      abi: RWAN_STAKING_ABI,
      functionName: "emergencyRecoverRewards",
      args: [to]
    });
    return result;
  };

  return { emergencyRecoverRewards, isPending: isPending };
}
