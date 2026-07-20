import type { Address } from "viem";

// V5 surface used by the public staking terminal + network page.
export const RWAN_V5_ABI = [
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
  { type: "function", name: "userPositions", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256[]" }], stateMutability: "view" },
  {
    type: "function", name: "positions", inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "owner", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "startTime", type: "uint64" },
      { name: "unlockTime", type: "uint64" },
      { name: "lastClaimTime", type: "uint64" },
      { name: "planId", type: "uint32" },
      { name: "rewardClaimed", type: "uint256" },
      { name: "withdrawn", type: "bool" },
    ], stateMutability: "view",
  },
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
  // ── Network / referral reads ────────────────────────────────────────
  { type: "function", name: "referrerOf", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "teamStake", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalUserStaked", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  // ── Milestone system ────────────────────────────────────────────────
  { type: "function", name: "milestonesCount", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  {
    type: "function", name: "milestones", inputs: [{ name: "milestoneId", type: "uint256" }],
    outputs: [
      { name: "minTeamStake", type: "uint256" },
      { name: "reward", type: "uint256" },
      { name: "enabled", type: "bool" },
    ], stateMutability: "view",
  },
  { type: "function", name: "milestoneClaimed", inputs: [{ name: "user", type: "address" }, { name: "milestoneId", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "pendingMilestones", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256[]" }], stateMutability: "view" },
  { type: "function", name: "claimMilestone", inputs: [{ name: "milestoneId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "claimMultipleMilestones", inputs: [{ name: "milestoneIds", type: "uint256[]" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "rankRewardReserve", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  // ── Events for indexing ─────────────────────────────────────────────
  {
    type: "event", name: "PositionCreated",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "positionId", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "planId", type: "uint32", indexed: true },
      { name: "unlockTime", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event", name: "MilestoneClaimed",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "milestoneId", type: "uint256", indexed: true },
      { name: "reward", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "ReferrerSet",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "referrer", type: "address", indexed: true },
    ],
  },
] as const;

export const RWAN_V5_STAKING_ADDRESS =
  process.env.NEXT_PUBLIC_RWAN_V5_STAKING_ADDRESS as Address | undefined;
