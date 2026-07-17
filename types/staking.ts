export type LockOption = {
  id: bigint;
  duration: bigint;
  multiplierBps: bigint;
  active: boolean;
};

export type Position = {
  id: bigint;
  amount: bigint;
  weightedAmount: bigint;
  startTime: bigint;
  unlockTime: bigint;
  lockId: bigint;
  withdrawn: boolean;
  rewardDebt: bigint;
};

export type PositionWithRewards = Position & {
  pendingRewards: bigint;
};
