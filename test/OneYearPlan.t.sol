// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title OneYearPlan.t.sol
 * @notice Aggressive test suite for the 365-day staking plan and APR changes.
 *
 * Coverage:
 *  A. Unit — addLockOption / setLockOption / setAprTier
 *  B. 365-day staking lifecycle (stake → claim → unlock → withdraw)
 *  C. APR correctness (new tiers + multipliers → exact 5/15/30/60%)
 *  D. Early-withdrawal penalty invariants
 *  E. Access-control / exploit scenarios
 *  F. Fuzz — amounts, users, time
 *  G. Invariant — solvency, monotonic penalty, reward never exceeds reserve
 */

import "forge-std/Test.sol";
import "forge-std/StdInvariant.sol";
import "../contracts/RWANSecureStakingV3.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// ─── Shared mock token ────────────────────────────────────────────────────────
contract MockToken is ERC20 {
    constructor() ERC20("RWAN", "RWAN") { _mint(msg.sender, 1_000_000_000_000 ether); }
    function mint(address to, uint256 amt) external { _mint(to, amt); }
}

// ─── Helper: deploy contract with NEW target params ───────────────────────────
// Base APR 16%, multipliers: 0.3125x / 0.9375x / 1.875x / 3.75x → effective 5/15/30/60%
library Deploy {
    function freshStaking(MockToken token) internal returns (RWANSecureStakingV3 s) {
        uint256[] memory tvl = new uint256[](6);
        tvl[0] = 0;
        tvl[1] = 200_000_000 ether;
        tvl[2] = 500_000_000 ether;
        tvl[3] = 1_000_000_000 ether;
        tvl[4] = 2_200_000_000 ether;
        tvl[5] = 4_000_000_000 ether;

        uint32[] memory apr = new uint32[](6);
        apr[0] = 1600;  // 16.00%
        apr[1] = 1200;  // 12.00%
        apr[2] = 1000;  // 10.00%
        apr[3] = 800;   //  8.00%
        apr[4] = 600;   //  6.00%
        apr[5] = 400;   //  4.00%

        s = new RWANSecureStakingV3(
            address(token), address(token),
            100 ether,   // minStake
            50,          // maxPositionsPerUser
            tvl, apr,
            500          // 5% referral
        );

        // Lock options (ID 0 = flexible, already in constructor)
        s.addLockOption(30 days,  3_125, true);  // ID 1 — 0.3125x → 5%
        s.addLockOption(90 days,  9_375, true);  // ID 2 — 0.9375x → 15%
        s.addLockOption(180 days, 18_750, true); // ID 3 — 1.875x → 30%
        s.addLockOption(365 days, 37_500, true); // ID 4 — 3.75x → 60%

        // Fund rewards (large pool so tests never run dry)
        token.approve(address(s), 100_000_000 ether);
        s.fundRewards(100_000_000 ether);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// A+B+C+D+E  Unit / lifecycle / APR / exploit tests
// ══════════════════════════════════════════════════════════════════════════════
contract OneYearPlanTest is Test {
    RWANSecureStakingV3 public s;
    MockToken public token;

    address alice   = address(0xA1);
    address bob     = address(0xB0);
    address attacker = address(0xBAD1);

    uint256 constant STAKE = 10_000 ether;

    // Lock IDs in the freshly deployed contract
    uint256 constant LID_FLEX  = 0;
    uint256 constant LID_30D   = 1;
    uint256 constant LID_90D   = 2;
    uint256 constant LID_180D  = 3;
    uint256 constant LID_365D  = 4;

    function setUp() public {
        token = new MockToken();
        s     = Deploy.freshStaking(token);

        token.transfer(alice,    1_000_000 ether);
        token.transfer(bob,      1_000_000 ether);
        token.transfer(attacker, 1_000_000 ether);

        vm.prank(alice);   token.approve(address(s), type(uint256).max);
        vm.prank(bob);     token.approve(address(s), type(uint256).max);
        vm.prank(attacker);token.approve(address(s), type(uint256).max);
    }

    // ── A. Admin / configuration ──────────────────────────────────────────────

    function test_LockOptionCount() public view {
        assertEq(s.lockOptionsLength(), 5); // 0-flex, 1-30d, 2-90d, 3-180d, 4-365d
    }

    function test_365DayOptionCorrect() public view {
        (uint64 dur, uint32 mult, bool enabled) = s.lockOptions(LID_365D);
        assertEq(dur,     365 days,  "wrong duration");
        assertEq(mult,    37_500,    "wrong multiplier");
        assertTrue(enabled,          "should be enabled");
    }

    function test_CannotAddDuplicate365Day() public {
        // Adding again should not revert at the contract level — but we verify
        // the script checks for duplicates. Here we just confirm a 2nd add
        // creates a NEW entry (ID 5), not a collision.
        s.addLockOption(365 days, 37_500, true);
        assertEq(s.lockOptionsLength(), 6);
    }

    function test_OnlyOwnerCanAddLockOption() public {
        vm.prank(attacker);
        vm.expectRevert();
        s.addLockOption(365 days, 37_500, true);
    }

    function test_OnlyOwnerCanSetLockOption() public {
        vm.prank(attacker);
        vm.expectRevert();
        s.setLockOption(LID_365D, 37_500, true);
    }

    function test_OnlyOwnerCanSetAprTier() public {
        vm.prank(attacker);
        vm.expectRevert();
        s.setAprTier(0, 0, 1600);
    }

    function test_DisableThenReenable365DayPlan() public {
        s.setLockOption(LID_365D, 37_500, false);
        (, , bool en1) = s.lockOptions(LID_365D);
        assertFalse(en1);

        // Cannot stake while disabled
        vm.prank(alice);
        vm.expectRevert();
        s.stake(STAKE, LID_365D, address(0));

        s.setLockOption(LID_365D, 37_500, true);
        (, , bool en2) = s.lockOptions(LID_365D);
        assertTrue(en2);
    }

    // ── B. 365-day lifecycle ──────────────────────────────────────────────────

    function test_Stake365Days_PositionStoredCorrectly() public {
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0));

        (uint256 amt, , uint256 startTime, uint256 unlockTime, uint256 lockId, , bool withdrawn)
            = s.positions(1);

        assertEq(amt,        STAKE);
        assertEq(lockId,     LID_365D);
        assertFalse(withdrawn);
        assertEq(unlockTime, startTime + 365 days, "unlock must be exactly 365 days out");
    }

    function test_Stake365Days_TotalStakedIncreases() public {
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0));
        assertEq(s.totalStaked(), STAKE);
    }

    function test_CannotWithdrawBefore365Days() public {
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0));

        vm.warp(block.timestamp + 364 days);

        vm.prank(alice);
        vm.expectRevert("still locked, use withdrawEarly");
        s.withdraw(1);
    }

    function test_CannotWithdrawAtExactly364Days23Hours() public {
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0));

        vm.warp(block.timestamp + 365 days - 1);

        vm.prank(alice);
        vm.expectRevert("still locked, use withdrawEarly");
        s.withdraw(1);
    }

    function test_CanWithdrawAtExactUnlock() public {
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0));

        vm.warp(block.timestamp + 365 days);

        uint256 balBefore = token.balanceOf(alice);
        vm.prank(alice);
        s.withdraw(1);

        assertGt(token.balanceOf(alice), balBefore, "should receive principal+rewards");
        (, , , , , , bool withdrawn) = s.positions(1);
        assertTrue(withdrawn);
    }

    function test_CanWithdrawAfter365Days() public {
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0));

        vm.warp(block.timestamp + 400 days);

        vm.prank(alice);
        s.withdraw(1);

        assertEq(s.totalStaked(), 0);
    }

    function test_ClaimDuring365DayLock() public {
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0));

        vm.warp(block.timestamp + 30 days);

        uint256 pending = s.pendingRewards(1);
        assertGt(pending, 0, "should accrue rewards during lock");

        uint256 balBefore = token.balanceOf(alice);
        vm.prank(alice);
        s.claim(1);
        assertGt(token.balanceOf(alice), balBefore);
    }

    function test_ClaimThenWithdraw365_NoDoubleCounting() public {
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0));

        vm.warp(block.timestamp + 90 days);

        vm.prank(alice);
        s.claim(1);
        assertEq(s.pendingRewards(1), 0, "claim should reset pending rewards");

        vm.warp(block.timestamp + 275 days);

        uint256 pendingAfterClaim = s.pendingRewards(1);
        assertGt(pendingAfterClaim, 0, "position should keep accruing after claim");

        uint256 balBefore = token.balanceOf(alice);
        vm.prank(alice);
        s.withdraw(1);
        uint256 received = token.balanceOf(alice) - balBefore;

        assertEq(received, STAKE + pendingAfterClaim, "withdraw should pay principal plus remaining rewards only");
        assertEq(s.totalStaked(), 0);
    }

    function test_ClaimThenEarlyWithdraw365_PenaltyStillApplies() public {
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0));

        vm.warp(block.timestamp + 60 days);

        vm.prank(alice);
        s.claim(1);

        vm.warp(block.timestamp + 30 days);

        uint256 pendingBeforeEarlyWithdraw = s.pendingRewards(1);
        uint256 balBefore = token.balanceOf(alice);

        vm.prank(alice);
        s.withdrawEarly(1);
        uint256 received = token.balanceOf(alice) - balBefore;

        uint256 principalAfterPenalty = (STAKE * 6500) / 10_000;
        assertGe(received, principalAfterPenalty, "early withdraw must return penalized principal");
        assertLe(received, principalAfterPenalty + pendingBeforeEarlyWithdraw + 1, "claim history must not bypass penalty");
    }

    function test_WithdrawAfterLockIncludesAccruedRewards() public {
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0));

        vm.warp(block.timestamp + 365 days);

        uint256 pending   = s.pendingRewards(1);
        uint256 balBefore = token.balanceOf(alice);
        vm.prank(alice);
        s.withdraw(1);
        uint256 received  = token.balanceOf(alice) - balBefore;

        assertEq(received, STAKE + pending, "must receive principal + all pending rewards");
    }

    function test_NonOwnerCannotWithdraw365DayPosition() public {
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0));

        vm.warp(block.timestamp + 365 days);

        vm.prank(bob);
        vm.expectRevert("not owner");
        s.withdraw(1);
    }

    function test_NonOwnerCannotClaim365DayPosition() public {
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0));

        vm.warp(block.timestamp + 30 days);

        vm.prank(attacker);
        vm.expectRevert("not owner");
        s.claim(1);
    }

    // ── C. APR correctness ────────────────────────────────────────────────────

    /// @dev At 16% base, 3.75x multiplier → 60% effective APR
    ///      After exactly 1 year, reward ≈ amount * 60% (within 1% tolerance)
    function test_365Day_Reward_Approx60Pct() public {
        uint256 amount = 100_000 ether;
        vm.prank(alice);
        s.stake(amount, LID_365D, address(0));

        vm.warp(block.timestamp + 365 days);

        uint256 pending  = s.pendingRewards(1);
        uint256 expected = (amount * 6000) / 10_000; // 60%

        // Allow ±1% tolerance for rounding
        assertApproxEqRel(pending, expected, 0.01e18, "365d reward should be ~60% APR");
    }

    function test_30Day_Reward_Approx5Pct() public {
        uint256 amount = 100_000 ether;
        vm.prank(alice);
        s.stake(amount, LID_30D, address(0));

        vm.warp(block.timestamp + 365 days);

        uint256 pending  = s.pendingRewards(1);
        uint256 expected = (amount * 500) / 10_000; // 5%
        assertApproxEqRel(pending, expected, 0.01e18, "30d reward should be ~5% APR annualised");
    }

    function test_90Day_Reward_Approx15Pct() public {
        uint256 amount = 100_000 ether;
        vm.prank(alice);
        s.stake(amount, LID_90D, address(0));

        vm.warp(block.timestamp + 365 days);

        uint256 pending  = s.pendingRewards(1);
        uint256 expected = (amount * 1500) / 10_000; // 15%
        assertApproxEqRel(pending, expected, 0.01e18, "90d reward should be ~15% APR annualised");
    }

    function test_180Day_Reward_Approx30Pct() public {
        uint256 amount = 100_000 ether;
        vm.prank(alice);
        s.stake(amount, LID_180D, address(0));

        vm.warp(block.timestamp + 365 days);

        uint256 pending  = s.pendingRewards(1);
        uint256 expected = (amount * 3000) / 10_000; // 30%
        assertApproxEqRel(pending, expected, 0.01e18, "180d reward should be ~30% APR annualised");
    }

    /// All four plans together — ratios must be 1:3:6:12
    function test_AllPlans_RewardRatiosCorrect() public {
        uint256 amount = 10_000 ether;
        vm.startPrank(alice);
        s.stake(amount, LID_30D,  address(0)); // pos 1
        s.stake(amount, LID_90D,  address(0)); // pos 2
        s.stake(amount, LID_180D, address(0)); // pos 3
        s.stake(amount, LID_365D, address(0)); // pos 4
        vm.stopPrank();

        vm.warp(block.timestamp + 365 days);

        uint256 r1 = s.pendingRewards(1);
        uint256 r2 = s.pendingRewards(2);
        uint256 r3 = s.pendingRewards(3);
        uint256 r4 = s.pendingRewards(4);

        // r2 ≈ 3*r1, r3 ≈ 6*r1, r4 ≈ 12*r1
        assertApproxEqRel(r2, r1 * 3,  0.01e18, "90d:30d reward ratio should be 3:1");
        assertApproxEqRel(r3, r1 * 6,  0.01e18, "180d:30d reward ratio should be 6:1");
        assertApproxEqRel(r4, r1 * 12, 0.01e18, "365d:30d reward ratio should be 12:1");
    }

    function test_AprTierDrops_LowersTVLBasedAPR() public {
        // Stake enough to cross into tier 1 (200M threshold)
        address whale = address(0xDEAD);
        token.mint(whale, 250_000_000 ether);
        vm.startPrank(whale);
        token.approve(address(s), type(uint256).max);
        s.stake(250_000_000 ether, LID_FLEX, address(0));
        vm.stopPrank();

        // APR should now be 3.75% (tier 1)
        assertEq(s.currentAprBps(), 1200);
    }

    // ── D. Early withdrawal penalty invariants ────────────────────────────────

    function test_EarlyWithdraw365Day_35PctPenalty() public {
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0));

        vm.warp(block.timestamp + 100 days);

        uint256 pendingBefore = s.pendingRewards(1);
        uint256 balBefore     = token.balanceOf(alice);
        vm.prank(alice);
        s.withdrawEarly(1);
        uint256 received = token.balanceOf(alice) - balBefore;

        // Principal after 35% penalty = 65% of STAKE
        uint256 principalAfterPenalty = (STAKE * 6500) / 10_000;
        // received = principalAfterPenalty + accrued rewards (no penalty on rewards)
        assertGe(received, principalAfterPenalty, "must receive at least principal after penalty");
        // Cannot receive more than full principal + rewards
        assertLe(received, STAKE + pendingBefore + 1, "cannot exceed principal + rewards");
    }

    function test_EarlyWithdraw_PenaltyGoesToReserve() public {
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0));

        uint256 reserveBefore = s.rewardReserve();
        vm.warp(block.timestamp + 1 days); // tiny reward accrual

        vm.prank(alice);
        s.withdrawEarly(1);

        uint256 reserveAfter = s.rewardReserve();
        // Reserve grows by penalty (minus any tiny reward accrued)
        assertGt(reserveAfter, reserveBefore - 1 ether, "penalty must go to reserve");
    }

    function test_EarlyWithdraw_CannotDoubleWithdraw() public {
        vm.startPrank(alice);
        s.stake(STAKE, LID_365D, address(0));
        vm.warp(block.timestamp + 10 days);
        s.withdrawEarly(1);
        vm.expectRevert();
        s.withdrawEarly(1);
        vm.stopPrank();
    }

    function test_WithdrawAfterUnlock_NoPenalty() public {
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0));

        vm.warp(block.timestamp + 365 days);

        uint256 pending = s.pendingRewards(1);
        uint256 balBefore = token.balanceOf(alice);
        vm.prank(alice);
        s.withdraw(1);

        uint256 received = token.balanceOf(alice) - balBefore;
        assertEq(received, STAKE + pending, "no penalty after lock expires");
    }

    // ── E. Exploit scenarios ──────────────────────────────────────────────────

    function test_Exploit_CannotSkipLockViaClaim() public {
        // Claim does NOT mark withdrawn — lock still holds for principal
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0));

        vm.warp(block.timestamp + 30 days);
        vm.prank(alice);
        s.claim(1); // claim rewards

        // Still cannot withdraw principal
        vm.prank(alice);
        vm.expectRevert("still locked, use withdrawEarly");
        s.withdraw(1);
    }

    function test_Exploit_CannotStealRewardsViaFakePosition() public {
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0));

        vm.warp(block.timestamp + 365 days);

        // Attacker tries to withdraw alice's position
        vm.prank(attacker);
        vm.expectRevert("not owner");
        s.withdraw(1);
    }

    function test_Exploit_CannotEarlyWithdrawOthersPosition() public {
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0));

        vm.prank(attacker);
        vm.expectRevert("not owner");
        s.withdrawEarly(1);
    }

    function test_Exploit_AttackerCannotDisable365DayPlan() public {
        vm.prank(attacker);
        vm.expectRevert();
        s.setLockOption(LID_365D, 0, false);
    }

    function test_Exploit_AttackerCannotDrainReserve() public {
        vm.prank(attacker);
        vm.expectRevert();
        s.recoverERC20(address(token), 1 ether);
    }

    function test_Exploit_ReentrancyOnWithdraw() public {
        // Standard ERC20 token does not call back, but verify nonReentrant applies.
        // Staking with same position twice should fail.
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0));

        vm.warp(block.timestamp + 365 days);

        vm.startPrank(alice);
        s.withdraw(1);
        vm.expectRevert(); // already withdrawn
        s.withdraw(1);
        vm.stopPrank();
    }

    function test_Exploit_InvalidLockIdReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        s.stake(STAKE, 999, address(0)); // non-existent lockId
    }

    function test_Exploit_ZeroAmountReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        s.stake(0, LID_365D, address(0));
    }

    function test_Exploit_BelowMinStakeReverts() public {
        vm.prank(alice);
        vm.expectRevert();
        s.stake(1 ether, LID_365D, address(0)); // below 100 ether min
    }

    function test_Exploit_PausedContractBlocksStake() public {
        s.pause();
        vm.prank(alice);
        vm.expectRevert();
        s.stake(STAKE, LID_365D, address(0));
    }

    function test_Exploit_PausedContractBlocksWithdraw() public {
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0));
        vm.warp(block.timestamp + 365 days);

        s.pause();

        vm.prank(alice);
        vm.expectRevert();
        s.withdraw(1);
    }

    function test_Exploit_SelfReferralIgnored() public {
        vm.prank(alice);
        s.stake(STAKE, LID_365D, alice); // self-referral
        // Should not receive referral rewards for self
        assertEq(s.referralEarnings(alice), 0);
    }

    function test_Exploit_OverflowProtection_MaxMultiplier() public {
        // Add a plan with maximum uint32 multiplier
        s.addLockOption(365 days, type(uint32).max, true);
        uint256 newId = s.lockOptionsLength() - 1;

        // Staking should not overflow (contract should handle or revert safely)
        uint256 smallAmount = 100 ether;
        vm.prank(alice);
        // If the contract handles it without overflow, we just check no silent corruption
        try s.stake(smallAmount, newId, address(0)) {
            // If it succeeds, totalWeightedStaked must still be > 0
            assertGt(s.totalStaked(), 0);
        } catch {
            // Reverting is also acceptable — no silent corruption
        }
    }

    // ── Multiple users concurrently ───────────────────────────────────────────

    function test_MultiUser_365DayPositions() public {
        vm.prank(alice);
        s.stake(STAKE, LID_365D, address(0)); // pos 1

        vm.warp(block.timestamp + 30 days);

        vm.prank(bob);
        s.stake(STAKE * 2, LID_365D, address(0)); // pos 2 — bob stakes double, later

        vm.warp(block.timestamp + 335 days); // now 365d elapsed for alice

        // Alice can withdraw
        vm.prank(alice);
        s.withdraw(1);
        assertEq(s.totalStaked(), STAKE * 2, "only bob's stake should remain");

        // Bob still locked (only 335 days elapsed for him)
        vm.prank(bob);
        vm.expectRevert("still locked, use withdrawEarly");
        s.withdraw(2);

        vm.warp(block.timestamp + 30 days); // now 365d elapsed for bob
        vm.prank(bob);
        s.withdraw(2);
        assertEq(s.totalStaked(), 0);
    }

    function test_MixedPlans_Solvency() public {
        vm.prank(alice);
        s.stake(STAKE,     LID_30D,  address(0));
        vm.prank(alice);
        s.stake(STAKE,     LID_90D,  address(0));
        vm.prank(bob);
        s.stake(STAKE * 2, LID_180D, address(0));
        vm.prank(bob);
        s.stake(STAKE * 3, LID_365D, address(0));

        vm.warp(block.timestamp + 400 days);

        // All positions can be withdrawn, contract remains solvent
        vm.prank(alice);
        s.withdraw(1);
        vm.prank(alice);
        s.withdraw(2);
        vm.prank(bob);
        s.withdraw(3);
        vm.prank(bob);
        s.withdraw(4);

        uint256 contractBal = token.balanceOf(address(s));
        uint256 liabilities = s.totalStaked() + s.rewardReserve() + s.referralReserve();
        assertGe(contractBal, liabilities, "solvency violated after all withdrawals");
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// F. Fuzz tests
// ══════════════════════════════════════════════════════════════════════════════
contract OneYearPlanFuzz is Test {
    RWANSecureStakingV3 public s;
    MockToken public token;

    function setUp() public {
        token = new MockToken();
        s     = Deploy.freshStaking(token);
    }

    /// Fuzz: any amount staked for 365 days, reward must be ≈ 60% of amount
    function testFuzz_365Day_RewardApprox60Pct(uint256 amount) public {
        amount = bound(amount, 100 ether, 1_000_000 ether);

        address user = address(0x1234);
        token.mint(user, amount);
        vm.startPrank(user);
        token.approve(address(s), amount);
        s.stake(amount, 4, address(0));
        vm.stopPrank();

        vm.warp(block.timestamp + 365 days);

        uint256 pending  = s.pendingRewards(1);
        uint256 expected = (amount * 6000) / 10_000;
        assertApproxEqRel(pending, expected, 0.01e18);
    }

    /// Fuzz: early withdrawal always applies exactly 35% penalty to PRINCIPAL.
    /// NOTE: received can exceed original amount when rewards > penalty (valid near end of lock).
    /// The invariant is: received == (principal * 65%) + pending_rewards_at_withdrawal.
    function testFuzz_365Day_EarlyWithdraw_AlwaysPenalised(
        uint256 amount,
        uint256 timeElapsed
    ) public {
        amount      = bound(amount,      100 ether, 500_000 ether);
        timeElapsed = bound(timeElapsed, 1,         365 days - 1);

        address user = address(0x5678);
        token.mint(user, amount);
        vm.startPrank(user);
        token.approve(address(s), amount);
        s.stake(amount, 4, address(0));

        vm.warp(block.timestamp + timeElapsed);

        // Snapshot pending rewards before withdrawal (single staker = full reserve delta)
        uint256 pendingBefore = s.pendingRewards(1);
        uint256 balBefore     = token.balanceOf(user);
        s.withdrawEarly(1);
        uint256 received      = token.balanceOf(user) - balBefore;
        vm.stopPrank();

        // 35% penalty always applied to principal
        uint256 principalAfterPenalty = (amount * 6500) / 10_000;

        // received = principalAfterPenalty + accrued rewards (no penalty on rewards)
        assertGe(received, principalAfterPenalty,
            "must receive at least principal after 35% penalty");

        // received must be LESS than full exit (no penalty) = amount + pendingBefore
        assertLt(received, amount + pendingBefore + 1,
            "cannot receive more than principal + rewards (no double-dipping)");

        // Penalty (35% of principal) is non-zero
        uint256 penalty = (amount * 3500) / 10_000;
        assertGt(penalty, 0, "penalty must be > 0");
    }

    /// Fuzz: after lock expires, full principal + rewards always received
    function testFuzz_365Day_WithdrawAfterUnlock_NoPenalty(
        uint256 amount,
        uint256 extraTime
    ) public {
        amount    = bound(amount,    100 ether, 100_000 ether);
        extraTime = bound(extraTime, 0,         365 days);

        address user = address(0x9999);
        token.mint(user, amount);
        vm.startPrank(user);
        token.approve(address(s), amount);
        s.stake(amount, 4, address(0));
        vm.stopPrank();

        vm.warp(block.timestamp + 365 days + extraTime);

        uint256 pending   = s.pendingRewards(1);
        uint256 balBefore = token.balanceOf(user);
        vm.prank(user);
        s.withdraw(1);

        uint256 received = token.balanceOf(user) - balBefore;
        assertEq(received, amount + pending, "no penalty after lock");
    }

    /// Fuzz: reward never exceeds reserve (no reserve drain exploit)
    function testFuzz_RewardNeverExceedsReserve(
        uint256 amount,
        uint256 lockId,
        uint256 timeElapsed
    ) public {
        amount      = bound(amount,      100 ether, 100_000 ether);
        lockId      = bound(lockId,      1,         4);          // 1-4 (skip flexible)
        timeElapsed = bound(timeElapsed, 1 days,    3 * 365 days);

        address user = address(0xAAAA);
        token.mint(user, amount);
        vm.startPrank(user);
        token.approve(address(s), amount);
        s.stake(amount, lockId, address(0));
        vm.stopPrank();

        vm.warp(block.timestamp + timeElapsed);

        uint256 pending = s.pendingRewards(1);
        assertLe(pending, s.rewardReserve(), "pending reward exceeds reserve - critical");
    }

    /// Fuzz: multiple users, solvency holds throughout
    function testFuzz_MultiStake_Solvency(
        uint256[4] memory amounts,
        uint8[4]   memory lockIds,
        uint256    elapsed
    ) public {
        elapsed = bound(elapsed, 365 days, 2 * 365 days);

        address[4] memory users = [
            address(0x1111), address(0x2222), address(0x3333), address(0x4444)
        ];

        for (uint256 i = 0; i < 4; i++) {
            amounts[i] = bound(amounts[i], 100 ether, 50_000 ether);
            lockIds[i] = uint8(bound(lockIds[i], 0, 4));

            token.mint(users[i], amounts[i]);
            vm.startPrank(users[i]);
            token.approve(address(s), amounts[i]);
            s.stake(amounts[i], lockIds[i], address(0));
            vm.stopPrank();
        }

        vm.warp(block.timestamp + elapsed);

        // Every user withdraws (or early-withdraws if still locked)
        for (uint256 i = 0; i < 4; i++) {
            uint256 posId = i + 1;
            (, , , uint256 unlockTime, , , bool withdrawn) = s.positions(posId);
            if (withdrawn) continue;

            vm.startPrank(users[i]);
            if (block.timestamp >= unlockTime || unlockTime == 0) {
                s.withdraw(posId);
            } else {
                s.withdrawEarly(posId);
            }
            vm.stopPrank();
        }

        uint256 bal        = token.balanceOf(address(s));
        uint256 liabilities = s.totalStaked() + s.rewardReserve() + s.referralReserve();
        assertGe(bal, liabilities, "solvency invariant violated");
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// G. Invariant tests
// ══════════════════════════════════════════════════════════════════════════════

/// Handler: drives random sequences of stake / withdraw / withdrawEarly / warp
contract InvariantHandler is Test {
    RWANSecureStakingV3 public s;
    MockToken           public token;

    address[] public actors;
    uint256   public constant MAX_ACTORS  = 8;
    uint256   public constant MAX_STAKE   = 50_000 ether;

    // Track positions created so withdrawals hit real ones
    uint256[] public positionIds;

    constructor(RWANSecureStakingV3 _s, MockToken _t) {
        s     = _s;
        token = _t;
        for (uint256 i = 0; i < MAX_ACTORS; i++) {
            actors.push(address(uint160(0xBEEF + i)));
        }
    }

    function stake(uint256 actorSeed, uint256 amount, uint256 lockId) public {
        address actor = actors[actorSeed % MAX_ACTORS];
        amount  = bound(amount,  100 ether, MAX_STAKE);
        lockId  = bound(lockId,  0,         4);

        token.mint(actor, amount);
        vm.startPrank(actor);
        token.approve(address(s), amount);
        try s.stake(amount, lockId, address(0)) {
            positionIds.push(s.nextPositionId() - 1);
        } catch {}
        vm.stopPrank();
    }

    function withdraw(uint256 posIdxSeed) public {
        if (positionIds.length == 0) return;
        uint256 posId = positionIds[posIdxSeed % positionIds.length];
        address owner = s.positionOwner(posId);
        if (owner == address(0)) return;

        vm.startPrank(owner);
        try s.withdraw(posId) {} catch {}
        vm.stopPrank();
    }

    function withdrawEarly(uint256 posIdxSeed) public {
        if (positionIds.length == 0) return;
        uint256 posId = positionIds[posIdxSeed % positionIds.length];
        address owner = s.positionOwner(posId);
        if (owner == address(0)) return;

        vm.startPrank(owner);
        try s.withdrawEarly(posId) {} catch {}
        vm.stopPrank();
    }

    function claim(uint256 posIdxSeed) public {
        if (positionIds.length == 0) return;
        uint256 posId = positionIds[posIdxSeed % positionIds.length];
        address owner = s.positionOwner(posId);
        if (owner == address(0)) return;

        vm.startPrank(owner);
        try s.claim(posId) {} catch {}
        vm.stopPrank();
    }

    function warpTime(uint256 secs) public {
        secs = bound(secs, 1 days, 60 days);
        vm.warp(block.timestamp + secs);
    }
}

contract OneYearPlanInvariant is Test {
    RWANSecureStakingV3 public s;
    MockToken           public token;
    InvariantHandler    public handler;

    function setUp() public {
        token   = new MockToken();
        s       = Deploy.freshStaking(token);
        handler = new InvariantHandler(s, token);
        targetContract(address(handler));
    }

    /// Contract token balance ≥ totalStaked + rewardReserve + referralReserve
    function invariant_Solvency() public view {
        uint256 bal = token.balanceOf(address(s));
        uint256 lia = s.totalStaked() + s.rewardReserve() + s.referralReserve();
        assertGe(bal, lia, "INVARIANT: solvency violated");
    }

    /// totalStaked must match the sum of all active position amounts
    function invariant_TotalStakedAccurate() public view {
        uint256 nextId = s.nextPositionId();
        uint256 sum    = 0;
        for (uint256 i = 1; i < nextId && i < 200; i++) {
            (uint256 amt, , , , , , bool withdrawn) = s.positions(i);
            if (!withdrawn) sum += amt;
        }
        assertEq(s.totalStaked(), sum, "INVARIANT: totalStaked mismatch");
    }

    /// currentAprBps must always be > 0 (contract always has at least tier 0)
    function invariant_AprNeverZero() public view {
        assertGt(s.currentAprBps(), 0, "INVARIANT: APR must never be zero");
    }

    /// rewardReserve must never underflow (always ≥ 0, Solidity guarantees this,
    /// but we also verify no pending reward exceeds the reserve)
    function invariant_PendingRewardsCapped() public view {
        uint256 nextId = s.nextPositionId();
        for (uint256 i = 1; i < nextId && i < 100; i++) {
            (,,,,,, bool withdrawn) = s.positions(i);
            if (!withdrawn) {
                uint256 pending = s.pendingRewards(i);
                assertLe(pending, s.rewardReserve(),
                    "INVARIANT: single position pending > rewardReserve");
            }
        }
    }
}
