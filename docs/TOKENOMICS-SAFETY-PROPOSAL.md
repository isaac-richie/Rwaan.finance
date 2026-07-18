# RWAAN Staking — Sustainable Rates & Safety Proposal (DRAFT)

**Status: draft for review. Nothing executed on-chain.**
Date: 2026-07-18 · Reserve state: 120M staking / 15.4M affiliate / 15.4M rank / 15.4M marketplace

---

## 1. The problem in one line

The 720-day tier at 1.00%/day promises **7.2x principal in rewards** — just **16.7M RWAAN**
staked full-term in that tier fully books the entire 120M reserve. The affiliate stack
(20/15/14 = 49%) exhausts its 15.4M pool after only ~31M of referred stakes.

## 2. FINAL agreed daily rates (client-approved ladder)

Design principle: **no token staked may cost the treasury more than ~2.2x itself
across ALL reward streams** (staking + affiliate + rank). All rates in contract bps
(1 bps = 0.01%/day).

| Tier | Current bps | **FINAL bps** | Daily % | Full-term total | Simple APY |
|------|------------|---------------|---------|-----------------|-----------|
| Flex (no lock) | 10 | **3** | 0.03% | — | ~11% |
| 30-day | 30 | **7** | 0.07% | 2.1% | ~26% |
| 90-day | 40 | **12** | 0.12% | 10.8% | ~44% |
| 180-day | 50 | **18** | 0.18% | 32.4% | ~66% |
| 360-day | 70 | **23** | 0.23% | 82.8% | ~84% |
| 540-day | 80 | **26** | 0.26% | 140.4% | ~95% |
| 720-day | 100 | **28** | 0.28% | **201.6%** | ~102% |

*(Plan IDs / exact durations to be confirmed against chain before any execution.)*

Ladder economics verified: locking longer always beats re-rolling shorter locks
(2×180d = 64.8% vs 360d = 82.8%; 2×360d = 165.6% vs 720d = 201.6%).

**Pitch:** top tier still reads "~3x your stake over 2 years" (principal + 201.6%).

**Full-stack cost check (720d, referred):** 201.6% staking + 10% affiliate
+ ~5% rank ≈ **2.17x** ✅ under the 2.2x ceiling.

**Reserve coverage:** 120M test tranche covers ~55M fully-booked top-tier TVL;
the planned 500M total deposit covers ~230M TVL even if every staker is referred
and in the top tier. (Reserves are funded in tranches deliberately — top up
publicly as TVL grows; each refill is a trust event.)

## 3. Affiliate restructure

| | Current | **FINAL** |
|---|---|---|
| L1 / L2 / L3 | 20% / 15% / 14% | **5% / 3% / 2%** |
| Combined | 49% | **10%** |

Apply via `setAffiliateLevels([500,300,200], 3)` and align `setMaxAffiliateTotalBps(1000)`.
Raise `minReferralStake` so dust wallets can't farm commissions. At 10% total,
self-referral rings become barely worth gas + lock risk (at 49% they were free money).

## 4. Hard safety rails (contract already supports these — biggest wins)

1. **`setMaxDailyStakingEmission(165_000e18)`** — protocol-wide cap ≈ 120M ÷ 730 days.
   Even if TVL explodes, the reserve *cannot* drain faster than a 24-month floor.
2. **`setDailyRankBudget(21_000e18)`** — rank pool capped ≈ 15.4M ÷ 730 days.
3. **Early-exit penalties**: raise `earlyPenaltyBps` on long tiers to 1500–2500
   (15–25%), and confirm penalties recycle into the reserve.
4. **`setMaxPositionsPerUser`** — sane cap (e.g. 20) to block position-splitting games.

## 5. Retention add-ons (keep people in without overpaying)

- **Re-lock bonus** via `setMarketplaceBenefit` `bonusDailyRateBps`: +3–5 bps for
  rolling a matured position into a new lock instead of withdrawing.
- **Marketplace credits as the flagship reward** — non-liquid, spendable, a real sink.
- **TVL-based rate taper** (cron, same infra as the minStake job): e.g.
  - TVL < 20M → rates as proposed above
  - 20–40M → top tier 26 bps
  - 40–60M → top tier 22 bps
  - > 60M → top tier 18 bps
  New positions only; published in advance so it reads as policy, not a rug.
- **Stagger the 720-day tier** (marketing cohorts) so unlock cliffs never sync.

## 6. Sell-pressure defense

- **Protocol-owned liquidity**: deploy part of the remaining 33.8M (paired) into
  PancakeSwap LP. Thin LP turns a 500k RWAAN claim-and-sell into a chart massacre;
  deep LP absorbs it.
- **Revenue buybacks** (if/when Rawli Analytics has product revenue) routed into the
  staking reserve — the only mechanism that makes yield real rather than redistributive.

## 7. Trust rules (what we never do)

- No pausing claims as a policy tool (emergency only).
- No opaque changes — every parameter change announced before it lands.
- No retroactive cuts to existing positions.

## 8. ⚠️ Pre-flight check before executing anything

Verify whether `stake()` snapshots the rate per position
(`positionRewardRateBps`) or whether positions read the **live** plan rate.
Line 244 of the contract falls back to `plan.dailyRateBps` when no per-position
rate is set — if existing positions are NOT snapshotted, calling
`updateStakePlan` would cut rates for **current stakers**, which violates the
trust rules above. If so: disable old plans (`enabled=false`) and add new plans
at the new rates instead of updating in place.

## 9. Rollout order

1. Confirm snapshot behavior (item 8).
2. Set emission caps (item 4.1, 4.2) — zero user-facing impact, instant safety floor.
3. Announce new rate card with a start date.
4. Apply new plan rates / affiliate levels for new positions.
5. Stand up the TVL taper cron + publish the policy table.
6. Deploy POL.
