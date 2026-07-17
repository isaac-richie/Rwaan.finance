# RWANSecureStakingV4 Design

## Goal

V4 should support flexible staking rewards, a configurable affiliate reward flow, and a configurable rank reward flow while keeping every payout reserve-backed and auditable.

The contract should let admins tune product settings later, but admin flexibility must not allow withdrawal of user principal or already-accounted rewards.

## Core Model

V4 has four accounting buckets:

1. `totalStaked`
2. `stakingRewardReserve`
3. `affiliateRewardReserve`
4. `rankRewardReserve`

User principal is tracked separately from reward reserves. Admin recovery functions can withdraw surplus tokens only after subtracting all protected balances.

Staking and reserve funding require an exact token balance increase. Fee-on-transfer tokens are rejected before accounting is committed. The deployed RWAN token must not rebase or change transfer semantics.

Protected balance:

```text
protected = totalStaked + stakingRewardReserve + affiliateRewardReserve + rankRewardReserve + rewardAllocated
```

If staking token and reward token are the same token, surplus recovery must compare the contract token balance against the protected balance.

## Admin Roles

Use OpenZeppelin `AccessControl` plus multisig ownership/admin:

```text
DEFAULT_ADMIN_ROLE: multisig
PARAMETER_ROLE: update plans, rates, referral settings, ranks
TREASURY_ROLE: fund reserves, withdraw surplus
PAUSER_ROLE: pause/unpause
```

If we want simpler governance, use `Ownable` with the multisig as owner. `AccessControl` is better for V4 because it allows separating emergency actions from treasury actions.

Every mutable product figure must be changed through a role-gated setter. Parameter changes should emit an event and remain bounded by a hard protocol ceiling. The deployed multisig should hold `DEFAULT_ADMIN_ROLE` and approve the parameter, treasury, and pause roles.

Changing a plan duration is allowed for future positions through `setStakePlanDuration`. Existing positions are protected because their `unlockTime` is stored when they are created and is never recalculated from the current plan.

## Staking Plans

Each plan is admin-configurable:

```solidity
struct StakePlan {
    uint64 lockDuration;
    uint32 dailyRateBps;
    uint32 earlyPenaltyBps;
    bool enabled;
}
```

Initial proposed plan table:

```text
Flexible: 0 days, 10 bps daily = 0.1%
30 days: 20 bps daily = 0.2%
90 days: 30 bps daily = 0.3%
120 days: 40 bps daily = 0.4%
180 days: 50 bps daily = 0.5%
360 days: 60-70 bps daily = 0.6%-0.7%
```

Admin can:

```text
addStakePlan(lockDuration, dailyRateBps, earlyPenaltyBps, enabled)
updateStakePlan(planId, dailyRateBps, earlyPenaltyBps, enabled)
setMinStakeAmount(amount)
setMaxPositionsPerUser(max)
setGlobalDailyEmissionCap(amount)
```

Important invariant:

```text
Accrued rewards cannot exceed stakingRewardReserve.
```

## Position Accounting

Each stake creates an independent position:

```solidity
struct Position {
    address owner;
    uint256 amount;
    uint64 startTime;
    uint64 unlockTime;
    uint32 planId;
    uint256 rewardClaimed;
    bool withdrawn;
}
```

Pending reward:

```text
elapsed = min(block.timestamp, endTime if capped) - lastClaimTime
newAccrual = amount * dailyRateBps * elapsed / 1 days / 10_000
pending = positionUnpaidRewards[positionId] + newAccrual
payment = min(pending, available stakingRewardReserve and global emission capacity)
positionUnpaidRewards[positionId] = pending - payment
```

Withdrawals checkpoint pending rewards before closing a position. Unpaid debt remains claimable after principal exits and after claims resume.

We should decide whether flexible positions accrue forever or have a configurable max accrual window.

## Affiliate Flow

Use one permanent referrer per user.

Protections:

```text
No self-referral
No referrer changes after first stake unless admin migration mode is enabled
No circular referral chains
Max depth configurable but hard-capped by contract constant
Affiliate payouts come only from affiliateRewardReserve
```

Recommended storage:

```solidity
mapping(address => address) public referrerOf;
uint32[] public affiliateLevelBps;
uint8 public maxAffiliateDepth;
```

Initial proposed levels:

```text
Level 1: 25%
Level 2: 20%
Level 3: 20%
Level 4: 15%
Level 5: 15%
Level 6: 15%
Levels 7-10: 10%
Levels 11-15: 5%
Levels 16-20: 2%
```

Critical design choice:

Affiliate percent should be calculated from a user's claimed staking reward or from a defined deposit fee budget, not directly from user principal.

Recommended default:

```text
When user claims staking reward, affiliate rewards are calculated as a percentage of that claimed reward.
```

Example:

```text
User claims 1,000 RWAN staking reward.
Level 1 referrer gets up to 250 RWAN from affiliateRewardReserve.
If reserve is low, payout is clipped instead of touching principal.
```

Admin can:

```text
setAffiliateLevels(uint32[] bps, uint8 maxDepth)
setMaxAffiliateTotalBps(uint256 cap)
setMinReferralStake(amount)
setPauseFlags(..., affiliateRewardsPaused, ...)
```

The aggregate affiliate cap is adjustable downward or upward only within the hard contract ceiling. This lets governance tune the program without allowing an accidental or malicious unlimited payout configuration.

Hard limits:

```text
MAX_AFFILIATE_DEPTH = 20
REFERENCE_AFFILIATE_TOTAL = 185% of the claimed base reward
MAX_TOTAL_AFFILIATE_BPS = 20_000 (200% immutable safety ceiling)
Configured reference cap = 18_500 (185%)
```

## Rank Rewards

Ranks should not be unlimited guaranteed payouts. Use a daily rank budget funded from `rankRewardReserve`.

Recommended model:

```text
Admin funds rankRewardReserve.
Admin sets dailyRankBudget.
Each rank has a weight.
Eligible users share the daily budget according to rank weight.
Each assigned user snapshots the active rank weight. Updating a rank configuration affects future assignments; calling `setUserRank` refreshes an existing user's weight without retroactive rewards.
```

Rank table:

```solidity
struct RankConfig {
    uint256 minPersonalStake;
    uint256 minTeamStake;
    uint32 weightBps;
    bool enabled;
}
```

Initial rank weights can mirror the product language:

```text
Rank 1: 10
Rank 2: 15
Rank 3: 20
Rank 4: 25
Rank 5: 30
Rank 6: 35
Rank 7: 40
Rank 8: 45
Rank 9: 50
```

But these should be weights, not guaranteed percentages of all network activity.

Admin can:

```text
setRankConfig(rankId, minPersonalStake, minTeamStake, weightBps, enabled)
setUserRank(user, rankId)
setDailyRankBudget(amount)
pauseRankRewards()
unpauseRankRewards()
```

Open design question:

```text
Should ranks be assigned manually by admin, calculated on-chain, or imported via signed oracle/admin updates?
```

Recommended V4 start:

```text
Manual/admin-set ranks first, then add automated rank calculation later if needed.
```

## Treasury And Recovery

## Marketplace And VIP Benefits

Marketplace benefits are configured per staking plan. A 720-day plan can be configured with:

```text
minimum qualifying stake: 1,000 XERA (or the configured token amount)
bonus daily rate: 5 bps = 0.05%
marketplace credit: 1,000 bps = 10% of the staked amount
VIP eligibility: recorded on-chain for the service platform
credit timing: immediate or after unlock, controlled by governance
```

Marketplace credit is paid in `rewardToken` and must be funded in a dedicated marketplace reserve. At stake creation, the exact credit is moved from the available reserve into `marketplaceCreditAllocated`, which protects already-promised credits from treasury withdrawals. Each credit can be claimed once. Early withdrawal releases the allocated credit back to the reserve and does not grant the benefit.

The daily bonus rate and marketplace credit are snapshotted when a position is created. Disabling or reconfiguring the plan affects future positions only. VIP, airport, hotel, card, delivery, and other real-world services remain off-chain fulfillment responsibilities; the contract records eligibility and credit entitlement but cannot deliver those services itself.

Funding:

```solidity
fundStakingRewards(uint256 amount)
fundAffiliateRewards(uint256 amount)
fundRankRewards(uint256 amount)
fundMarketplaceRewards(uint256 amount)
```

Admin withdrawals:

```solidity
withdrawStakingRewardReserve(address to, uint256 amount)
withdrawAffiliateRewardReserve(address to, uint256 amount)
withdrawRankRewardReserve(address to, uint256 amount)
withdrawMarketplaceRewardReserve(address to, uint256 amount)
recoverSurplusERC20(address token, address to, uint256 amount)
recoverNative(address payable to, uint256 amount)
```

Rules:

```text
Reserve withdrawals can only withdraw unallocated reserve from that bucket.
Surplus recovery can withdraw unrelated tokens freely.
If token == staking/reward token, surplus recovery cannot reduce protected balance.
Global pause blocks reserve withdrawals, token rescue, native rescue, and parameter updates.
No function should allow withdrawing active user principal.
```

## Pausing

Separate pause flags configured through `setPauseFlags`:

```text
stakingPaused
claimsPaused
withdrawalsPaused
affiliateRewardsPaused
rankRewardsPaused
globalPause
```

Emergency behavior:

```text
If globalPause is active, users should still be able to emergencyWithdraw principal if we choose that policy.
Admin should not be able to block principal withdrawals permanently.
```

## Upgrade Strategy

Recommended:

```text
Deploy V4 as a new contract.
Keep V3 intact.
Offer migration from V3 to V4 only if users opt in.
```

Avoid proxy upgrade unless we already deployed V3 behind a proxy, which the current code does not indicate.

## Events

V4 should emit events for every major state change:

```text
PositionCreated
RewardClaimed
Withdrawn
WithdrawnEarly
ReferrerSet
AffiliateRewardPaid
RankRewardPaid
ReserveFunded
ReserveWithdrawn
StakePlanUpdated
AffiliateConfigUpdated
RankConfigUpdated
TreasuryRecovered
PauseUpdated
```

## Test Plan

Core tests:

```text
Cannot withdraw another user's position
Cannot recover user principal as surplus
Rewards are clipped when reserve is low
Affiliate payouts never exceed affiliateRewardReserve
Rank payouts never exceed rankRewardReserve
Admin can update all configurable rates
Non-admin cannot update parameters
No self-referral
No circular referral chain
Max referral depth respected
Emergency withdraw returns principal according to policy
Same-token accounting protects totalStaked plus reserves
```

Fuzz/invariant tests:

```text
contractBalance >= protectedBalance unless rewards are paid out correctly
totalStaked equals sum of active position amounts
all reserve buckets decrease only through valid payout/withdraw paths
no claim can make a reserve underflow
```

## Recommended First Implementation

Build V4 in phases:

```text
Phase 1: staking plans, independent positions, reserve-backed daily rewards
Phase 2: direct + multi-level affiliate rewards from affiliate reserve
Phase 3: rank budget distribution
Phase 4: frontend/admin panel updates
Phase 5: audit/invariant testing before deployment
```
