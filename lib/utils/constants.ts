import { RWAN_STAKING_ADDRESS } from "@/lib/contracts/rwanStakingAbi";

// RWANSecureStakingV3 - Deployed on BSC Mainnet
// Features: Dynamic APR, Lock multipliers, 35% early withdrawal penalty, Referrals
export { RWAN_STAKING_ADDRESS };
export const RWAN_TOKEN_ADDRESS =
  "0xACB921bf2Dac2F7E8E101AAd9CA013d6Af5C648a";

export const MAX_LOCK_OPTIONS = 12;
export const RWAN_DECIMALS = 18;
export const ACCRUAL_DELAY_SECONDS = 3 * 24 * 60 * 60;
export const CLAIM_DELAY_SECONDS = 30 * 24 * 60 * 60;

export const BSC_SCAN_BASE = "https://bscscan.com/tx/";
export const STAKING_DAPP_URL = "https://www.stakingrawlianalytics.xyz";

// Target effective APRs per plan (base APR × multiplier)
// These are the intended staking parameters:
// 1mth = 5% | 3mth = 15% | 6mth = 30% | 1yr = 60%
export const STAKING_PLANS = [
  {
    id: "plan-1m",
    label: "30 Days",
    durationSeconds: 30 * 24 * 60 * 60,
    targetAprBps: 500n,   // 5%
  },
  {
    id: "plan-3m",
    label: "90 Days",
    durationSeconds: 90 * 24 * 60 * 60,
    targetAprBps: 1500n,  // 15%
  },
  {
    id: "plan-6m",
    label: "180 Days",
    durationSeconds: 180 * 24 * 60 * 60,
    targetAprBps: 3000n,  // 30%
  },
  {
    id: "plan-1y",
    label: "365 Days",
    durationSeconds: 365 * 24 * 60 * 60,
    targetAprBps: 6000n,  // 60%
  },
] as const;
