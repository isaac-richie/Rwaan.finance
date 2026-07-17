// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/RWANSecureStakingV3.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1_000_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract RWANSecureStakingV3Test is Test {
    // Mirror OpenZeppelin Pausable custom error so we can match it in tests
    error EnforcedPause();

    RWANSecureStakingV3 public staking;
    MockERC20 public token;

    address public owner = address(this);
    address public alice = address(0x1);
    address public bob = address(0x2);
    address public charlie = address(0x3);

    uint256 constant INITIAL_BALANCE = 100_000 ether;
    uint256 constant REWARD_POOL = 50_000 ether;

    function setUp() public {
        // Deploy token
        token = new MockERC20();

        // Setup APR tiers
        uint256[] memory tierTVL = new uint256[](6);
        tierTVL[0] = 0;
        tierTVL[1] = 200_000_000 ether;
        tierTVL[2] = 500_000_000 ether;
        tierTVL[3] = 1_000_000_000 ether;
        tierTVL[4] = 2_200_000_000 ether;
        tierTVL[5] = 4_000_000_000 ether;

        uint32[] memory tierAprBps = new uint32[](6);
        tierAprBps[0] = 1600; // 16%
        tierAprBps[1] = 1200; // 12%
        tierAprBps[2] = 1000; // 10%
        tierAprBps[3] = 800;  // 8%
        tierAprBps[4] = 600;  // 6%
        tierAprBps[5] = 400;  // 4%

        // Deploy staking contract
        staking = new RWANSecureStakingV3(
            address(token),
            address(token),
            100 ether,  // minStakeAmount
            10,         // maxPositionsPerUser
            tierTVL,
            tierAprBps,
            500         // 5% referral
        );

        // Add lock options
        staking.addLockOption(90 days, 12500, true);  // 3 months, 1.25x
        staking.addLockOption(180 days, 20000, true); // 6 months, 2x

        // Fund reward pool
        token.approve(address(staking), REWARD_POOL);
        staking.fundRewards(REWARD_POOL);

        // Setup test users
        token.transfer(alice, INITIAL_BALANCE);
        token.transfer(bob, INITIAL_BALANCE);
        token.transfer(charlie, INITIAL_BALANCE);

        vm.prank(alice);
        token.approve(address(staking), type(uint256).max);

        vm.prank(bob);
        token.approve(address(staking), type(uint256).max);

        vm.prank(charlie);
        token.approve(address(staking), type(uint256).max);
    }

    // ============================================
    // Test: Basic Staking
    // ============================================

    function testStakeFlexible() public {
        uint256 amount = 1000 ether;

        vm.prank(alice);
        staking.stake(amount, 0, address(0));

        assertEq(staking.totalStaked(), amount);
        assertEq(token.balanceOf(alice), INITIAL_BALANCE - amount);

        (uint256 posAmount, , , uint256 unlockTime, , , ) = staking.positions(1);
        assertEq(posAmount, amount);
        assertEq(unlockTime, 0); // Flexible
    }

    function testStakeLocked3Months() public {
        uint256 amount = 1000 ether;

        vm.prank(alice);
        staking.stake(amount, 1, address(0)); // Lock ID 1 = 3 months

        (uint256 posAmount, , , uint256 unlockTime, uint256 lockId, , ) = staking.positions(1);
        assertEq(posAmount, amount);
        assertEq(lockId, 1);
        assertGt(unlockTime, block.timestamp);
    }

    function testStakeLocked6Months() public {
        uint256 amount = 1000 ether;

        vm.prank(alice);
        staking.stake(amount, 2, address(0)); // Lock ID 2 = 6 months

        (uint256 posAmount, , , uint256 unlockTime, uint256 lockId, , ) = staking.positions(1);
        assertEq(posAmount, amount);
        assertEq(lockId, 2);
        assertGt(unlockTime, block.timestamp);
    }

    // ============================================
    // Test: Flexible Withdrawal (No Penalty)
    // ============================================

    function testWithdrawFlexible() public {
        uint256 amount = 1000 ether;

        // Stake flexible
        vm.prank(alice);
        staking.stake(amount, 0, address(0));

        // Wait 30 days
        vm.warp(block.timestamp + 30 days);

        // Withdraw
        vm.prank(alice);
        staking.withdraw(1);

        // Should get principal + rewards
        assertGt(token.balanceOf(alice), INITIAL_BALANCE); // More than initial (got rewards)
        assertEq(staking.totalStaked(), 0);
    }

    // ============================================
    // Test: Locked Withdrawal After Unlock (No Penalty)
    // ============================================

    function testWithdrawLockedAfterUnlock() public {
        uint256 amount = 1000 ether;

        // Stake locked 3 months
        vm.prank(alice);
        staking.stake(amount, 1, address(0));

        // Wait 90 days (unlock period)
        vm.warp(block.timestamp + 90 days);

        // Withdraw (no penalty)
        vm.prank(alice);
        staking.withdraw(1);

        // Should get principal + rewards
        assertGt(token.balanceOf(alice), INITIAL_BALANCE); // Got rewards
        assertEq(staking.totalStaked(), 0);
    }

    // ============================================
    // Test: Early Withdrawal with 35% Penalty
    // ============================================

    function testWithdrawEarly35Penalty() public {
        uint256 amount = 1000 ether;

        // Stake locked 3 months
        vm.prank(alice);
        staking.stake(amount, 1, address(0));

        // Wait only 30 days (still locked)
        vm.warp(block.timestamp + 30 days);

        uint256 rewardReserveBefore = staking.rewardReserve();
        uint256 pendingRewardsBefore = staking.pendingRewards(1);
        uint256 balanceBefore = token.balanceOf(alice);

        // Withdraw early
        vm.prank(alice);
        staking.withdrawEarly(1);

        // Calculate expected amounts
        uint256 expectedPenalty = (amount * 3500) / 10_000; // 35%
        uint256 expectedPrincipalAfterPenalty = amount - expectedPenalty;

        // User gets: principal (minus penalty) + rewards
        uint256 received = token.balanceOf(alice) - balanceBefore;
        assertGt(received, expectedPrincipalAfterPenalty); // Should have rewards too
        assertLt(received, amount); // Should be less than original (due to penalty)
        
        // Penalty added, rewards subtracted
        uint256 expectedReserveAfter = rewardReserveBefore + expectedPenalty - pendingRewardsBefore;
        assertApproxEqAbs(staking.rewardReserve(), expectedReserveAfter, 1 ether);
        assertEq(staking.totalStaked(), 0);
    }

    function testWithdrawEarly35PenaltyExactCalculation() public {
        uint256 amount = 10_000 ether;

        vm.prank(alice);
        staking.stake(amount, 2, address(0)); // 6 month lock

        vm.warp(block.timestamp + 60 days); // Still locked (180 days total)

        // Check penalty calculation
        (uint256 amountAfterPenalty, uint256 penaltyAmount) = staking.calculateEarlyWithdrawalPenalty(1);
        
        uint256 expectedPenalty = (amount * 3500) / 10_000; // 3500 ether
        uint256 expectedAfterPenalty = amount - expectedPenalty; // 6500 ether

        assertEq(penaltyAmount, expectedPenalty);
        assertEq(amountAfterPenalty, expectedAfterPenalty);

        uint256 balanceBefore = token.balanceOf(alice);

        // Execute withdrawal
        vm.prank(alice);
        staking.withdrawEarly(1);

        uint256 received = token.balanceOf(alice) - balanceBefore;
        
        // Should receive principal (minus penalty) + rewards
        assertGt(received, expectedAfterPenalty); // Has rewards
        assertLt(received, amount); // Less than original due to penalty
    }

    function testCannotWithdrawEarlyUnlockedPosition() public {
        uint256 amount = 1000 ether;

        vm.prank(alice);
        staking.stake(amount, 1, address(0));

        // Wait until unlocked
        vm.warp(block.timestamp + 90 days);

        // Try withdrawEarly (should revert)
        vm.prank(alice);
        vm.expectRevert("already unlocked, use withdraw");
        staking.withdrawEarly(1);
    }

    function testCannotWithdrawEarlyFlexiblePosition() public {
        uint256 amount = 1000 ether;

        vm.prank(alice);
        staking.stake(amount, 0, address(0)); // Flexible

        vm.prank(alice);
        vm.expectRevert("not locked, use withdraw");
        staking.withdrawEarly(1);
    }

    function testCannotWithdrawLockedBeforeUnlock() public {
        uint256 amount = 1000 ether;

        vm.prank(alice);
        staking.stake(amount, 1, address(0));

        vm.warp(block.timestamp + 30 days); // Still locked

        vm.prank(alice);
        vm.expectRevert("still locked, use withdrawEarly");
        staking.withdraw(1);
    }

    // ============================================
    // Test: Rewards with Early Withdrawal
    // ============================================

    function testEarlyWithdrawalStillClaimsRewards() public {
        uint256 amount = 1000 ether;

        // Stake locked
        vm.prank(alice);
        staking.stake(amount, 1, address(0));

        // Wait 30 days (accrue rewards)
        vm.warp(block.timestamp + 30 days);

        uint256 pendingBefore = staking.pendingRewards(1);
        assertGt(pendingBefore, 0); // Should have rewards

        uint256 balanceBefore = token.balanceOf(alice);

        // Withdraw early
        vm.prank(alice);
        staking.withdrawEarly(1);

        uint256 balanceAfter = token.balanceOf(alice);
        uint256 received = balanceAfter - balanceBefore;

        // Calculate expected
        uint256 expectedPenalty = (amount * 3500) / 10_000;
        uint256 expectedPrincipal = amount - expectedPenalty;
        uint256 expectedTotal = expectedPrincipal + pendingBefore;

        // Should receive: principal (minus penalty) + all rewards
        assertApproxEqAbs(received, expectedTotal, 1 ether); // Allow 1 token rounding
    }

    // ============================================
    // Test: Multiple Positions
    // ============================================

    function testMultiplePositionsEarlyWithdrawal() public {
        uint256 amount1 = 1000 ether;
        uint256 amount2 = 2000 ether;

        // Alice stakes 2 positions
        vm.startPrank(alice);
        staking.stake(amount1, 1, address(0)); // Position 1 (3 month)
        staking.stake(amount2, 2, address(0)); // Position 2 (6 month)
        vm.stopPrank();

        vm.warp(block.timestamp + 30 days);

        uint256 balanceBefore = token.balanceOf(alice);

        // Withdraw position 1 early
        vm.prank(alice);
        staking.withdrawEarly(1);

        uint256 received = token.balanceOf(alice) - balanceBefore;
        uint256 expectedPenalty1 = (amount1 * 3500) / 10_000;
        
        // Should get principal (minus penalty) + rewards
        assertGt(received, amount1 - expectedPenalty1);
        assertLt(received, amount1); // Less than original due to penalty

        // Position 2 still exists
        (uint256 pos2Amount, , , , , , bool pos2Withdrawn) = staking.positions(2);
        assertEq(pos2Amount, amount2);
        assertFalse(pos2Withdrawn);
    }

    // ============================================
    // Test: Penalty Goes to Reward Pool
    // ============================================

    function testPenaltyGoesToRewardPool() public {
        uint256 amount = 1000 ether;
        uint256 rewardReserveBefore = staking.rewardReserve();

        vm.prank(alice);
        staking.stake(amount, 1, address(0));

        vm.warp(block.timestamp + 30 days);

        uint256 pendingRewardsBefore = staking.pendingRewards(1);

        vm.prank(alice);
        staking.withdrawEarly(1);

        uint256 expectedPenalty = (amount * 3500) / 10_000;
        uint256 rewardReserveAfter = staking.rewardReserve();

        // Penalty added to reserve, rewards paid from reserve
        uint256 expectedReserveAfter = rewardReserveBefore + expectedPenalty - pendingRewardsBefore;
        assertApproxEqAbs(rewardReserveAfter, expectedReserveAfter, 1 ether);
    }

    // ============================================
    // Test: View Functions
    // ============================================

    function testCanWithdrawWithoutPenalty() public {
        vm.prank(alice);
        staking.stake(1000 ether, 1, address(0));

        // Before unlock
        assertFalse(staking.canWithdrawWithoutPenalty(1));

        // After unlock
        vm.warp(block.timestamp + 90 days);
        assertTrue(staking.canWithdrawWithoutPenalty(1));
    }

    function testCanWithdrawWithoutPenaltyFlexible() public {
        vm.prank(alice);
        staking.stake(1000 ether, 0, address(0));

        // Flexible always true
        assertTrue(staking.canWithdrawWithoutPenalty(1));
    }

    function testCalculateEarlyWithdrawalPenalty() public {
        uint256 amount = 10_000 ether;

        vm.prank(alice);
        staking.stake(amount, 1, address(0));

        (uint256 afterPenalty, uint256 penalty) = staking.calculateEarlyWithdrawalPenalty(1);

        assertEq(penalty, (amount * 3500) / 10_000); // 3500 ether
        assertEq(afterPenalty, amount - penalty);    // 6500 ether
    }

    function testCalculateEarlyWithdrawalPenaltyAfterUnlock() public {
        uint256 amount = 10_000 ether;

        vm.prank(alice);
        staking.stake(amount, 1, address(0));

        vm.warp(block.timestamp + 90 days); // Unlocked

        (uint256 afterPenalty, uint256 penalty) = staking.calculateEarlyWithdrawalPenalty(1);

        assertEq(penalty, 0);           // No penalty
        assertEq(afterPenalty, amount); // Full amount
    }

    // ============================================
    // Test: Emergency Withdraw (No Penalty)
    // ============================================

    function testEmergencyWithdrawNoPenalty() public {
        uint256 amount = 1000 ether;

        vm.prank(alice);
        staking.stake(amount, 2, address(0)); // 6 month lock

        vm.warp(block.timestamp + 30 days); // Still locked

        // Pause contract
        staking.pause();

        // Emergency withdraw (no penalty, no rewards)
        vm.prank(alice);
        staking.emergencyWithdraw(1);

        assertEq(token.balanceOf(alice), INITIAL_BALANCE); // Full principal back
    }

    // ============================================
    // Test: Edge Cases
    // ============================================

    function testCannotWithdrawTwice() public {
        vm.prank(alice);
        staking.stake(1000 ether, 0, address(0));

        vm.prank(alice);
        staking.withdraw(1);

        vm.prank(alice);
        vm.expectRevert("already withdrawn");
        staking.withdraw(1);
    }

    function testCannotWithdrawEarlyTwice() public {
        vm.prank(alice);
        staking.stake(1000 ether, 1, address(0));

        vm.warp(block.timestamp + 30 days);

        vm.prank(alice);
        staking.withdrawEarly(1);

        vm.prank(alice);
        vm.expectRevert("already withdrawn");
        staking.withdrawEarly(1);
    }

    function testOnlyOwnerCanWithdraw() public {
        vm.prank(alice);
        staking.stake(1000 ether, 0, address(0));

        vm.prank(bob);
        vm.expectRevert("not owner");
        staking.withdraw(1);
    }

    // ============================================
    // Test: Paused State Guards
    // ============================================

    function testWithdrawRevertsWhenPaused() public {
        vm.prank(alice);
        staking.stake(1000 ether, 0, address(0));

        // Pause the contract
        staking.pause();

        // Normal withdraw should revert due to whenNotPaused
        vm.prank(alice);
        vm.expectRevert(EnforcedPause.selector);
        staking.withdraw(1);
    }

    function testWithdrawEarlyRevertsWhenPaused() public {
        vm.prank(alice);
        staking.stake(1000 ether, 1, address(0));

        // Move forward but still before unlock
        vm.warp(block.timestamp + 30 days);

        // Pause the contract
        staking.pause();

        // Early withdraw should revert due to whenNotPaused
        vm.prank(alice);
        vm.expectRevert(EnforcedPause.selector);
        staking.withdrawEarly(1);
    }

    // ============================================
    // Test: Gas Optimization
    // ============================================

    function testGasWithdrawEarly() public {
        vm.prank(alice);
        staking.stake(1000 ether, 1, address(0));

        vm.warp(block.timestamp + 30 days);

        vm.prank(alice);
        uint256 gasBefore = gasleft();
        staking.withdrawEarly(1);
        uint256 gasUsed = gasBefore - gasleft();

        console.log("Gas used for withdrawEarly:", gasUsed);
        assertLt(gasUsed, 200_000); // Should be < 200k gas
    }

    // ============================================
    // Test: Referral System
    // ============================================

    function testReferralBonusNotAffectedByEarlyWithdrawal() public {
        // Set min referrer stake to 0 (allow Alice to be referrer immediately)
        staking.setMinReferrerStake(0);

        // Alice stakes (becomes eligible referrer)
        vm.prank(alice);
        staking.stake(5000 ether, 0, address(0));

        // Fund referral rewards first
        token.approve(address(staking), 1000 ether);
        staking.fundReferralRewards(1000 ether);

        uint256 aliceBalanceBefore = token.balanceOf(alice);
        uint256 referralReserveBefore = staking.referralReserve();

        // Bob stakes with Alice as referrer
        vm.prank(bob);
        staking.stake(1000 ether, 1, alice); // Alice as referrer

        uint256 aliceBalanceAfter = token.balanceOf(alice);
        uint256 referralBonus = aliceBalanceAfter - aliceBalanceBefore;

        assertGt(referralBonus, 0); // Alice got referral bonus
        assertEq(referralBonus, (1000 ether * 500) / 10_000); // 5% of Bob's stake
        assertEq(staking.referralReserve(), referralReserveBefore - referralBonus);

        uint256 aliceBalanceBeforeWithdraw = token.balanceOf(alice);

        // Bob withdraws early (shouldn't affect Alice's bonus)
        vm.warp(block.timestamp + 30 days);
        vm.prank(bob);
        staking.withdrawEarly(2);

        assertEq(token.balanceOf(alice), aliceBalanceBeforeWithdraw); // Alice keeps bonus
    }

    // ============================================
    // Test: Comprehensive Scenario
    // ============================================

    function testComprehensiveScenario() public {
        // Alice: Flexible stake
        vm.prank(alice);
        staking.stake(5000 ether, 0, address(0));

        // Bob: 3 month locked
        vm.prank(bob);
        staking.stake(3000 ether, 1, address(0));

        // Charlie: 6 month locked
        vm.prank(charlie);
        staking.stake(2000 ether, 2, address(0));

        // Fast forward 30 days
        vm.warp(block.timestamp + 30 days);

        // Alice withdraws flexible (no penalty)
        vm.prank(alice);
        staking.withdraw(1);
        assertGt(token.balanceOf(alice), INITIAL_BALANCE); // Got rewards

        // Bob withdraws early (35% penalty)
        uint256 bobBalanceBefore = token.balanceOf(bob);
        vm.prank(bob);
        staking.withdrawEarly(2);
        uint256 bobReceived = token.balanceOf(bob) - bobBalanceBefore;
        uint256 bobExpectedPenalty = (3000 ether * 3500) / 10_000;
        assertGt(bobReceived, 3000 ether - bobExpectedPenalty); // Got rewards
        assertLt(bobReceived, 3000 ether); // Lost penalty

        // Charlie waits full period
        vm.warp(block.timestamp + 150 days); // Total 180 days

        vm.prank(charlie);
        staking.withdraw(3);
        assertGt(token.balanceOf(charlie), INITIAL_BALANCE); // Full amount + rewards
    }
}
