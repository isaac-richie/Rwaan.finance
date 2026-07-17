import type { Address } from "viem";

// V4 surface used by the public staking terminal. Keep this intentionally small
// so the UI cannot drift into admin-only or legacy V3 methods.
export const RWAN_V4_ABI = [
  { type: "function", name: "stakingToken", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "minStakeAmount", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "stakingPaused", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "claimsPaused", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "withdrawalsPaused", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "totalStaked", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "stakingRewardReserve", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "stakePlansLength", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "pendingRewards", inputs: [{ name: "positionId", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "positionUnpaidRewards", inputs: [{ name: "positionId", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  {
    type: "function", name: "stakePlans", inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "lockDuration", type: "uint64" },
      { name: "dailyRateBps", type: "uint32" },
      { name: "earlyPenaltyBps", type: "uint32" },
      { name: "enabled", type: "bool" },
    ], stateMutability: "view",
  },
  {
    type: "function", name: "marketplaceBenefits", inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "minStakeAmount", type: "uint256" }, { name: "bonusDailyRateBps", type: "uint32" },
      { name: "creditBps", type: "uint32" }, { name: "claimAfterUnlock", type: "bool" },
      { name: "vipEligible", type: "bool" }, { name: "enabled", type: "bool" },
    ], stateMutability: "view",
  },
  {
    type: "function", name: "stake", inputs: [
      { name: "amount", type: "uint256" }, { name: "planId", type: "uint256" }, { name: "referrer", type: "address" },
    ], outputs: [], stateMutability: "nonpayable",
  },
  { type: "function", name: "claim", inputs: [{ name: "positionId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "withdraw", inputs: [{ name: "positionId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "withdrawEarly", inputs: [{ name: "positionId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "claimMarketplaceCredit", inputs: [{ name: "positionId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  // ── Admin param reads ──────────────────────────────────────────────
  { type: "function", name: "minStakeAmount", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  // ── Network / downline reads ────────────────────────────────────────
  { type: "function", name: "referrerOf", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "teamStake", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalUserStaked", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "affiliateEarned", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  {
    type: "function", name: "userRanks",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "rankId", type: "uint32" },
      { name: "accrued", type: "uint256" },
      { name: "lastUpdate", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function", name: "rankConfigs",
    inputs: [{ name: "rankId", type: "uint256" }],
    outputs: [
      { name: "minPersonalStake", type: "uint256" },
      { name: "minTeamStake", type: "uint256" },
      { name: "weightBps", type: "uint32" },
      { name: "enabled", type: "bool" },
    ],
    stateMutability: "view",
  },
  { type: "function", name: "rankConfigsLength", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  // ── Staked event for indexing downline members ──────────────────────
  {
    type: "event", name: "Staked",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "positionId", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "planId", type: "uint256", indexed: false },
      { name: "referrer", type: "address", indexed: false },
    ],
  },
] as const;

export const RWAN_V4_STAKING_ADDRESS =
  process.env.NEXT_PUBLIC_RWAN_V4_STAKING_ADDRESS as Address | undefined;
