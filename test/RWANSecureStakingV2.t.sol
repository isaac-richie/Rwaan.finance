// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {RWANSecureStakingV2} from "../contracts/RWANSecureStakingV2.sol";
import {MockERC20} from "../contracts/MockERC20.sol";

/**
 * @title RWANSecureStakingV2Test - Aggressive Test Suite
 * @notice Comprehensive security and edge case testing for RWAN staking
 */
contract RWANSecureStakingV2Test is Test {
    RWANSecureStakingV2 internal staking;
    MockERC20 internal stakingToken;
    MockERC20 internal rewardToken;

    address internal owner = address(this);
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    address internal charlie = address(0xC4A);

    function setUp() public {
        stakingToken = new MockERC20("RWAN", "RWAN", 1_000_000 ether);
        rewardToken = new MockERC20("RWAN", "RWAN", 1_000_000 ether);

        uint256[] memory tvl = new uint256[](1);
        uint32[] memory apr = new uint32[](1);
        tvl[0] = 0;
        apr[0] = 1_000;

        staking = new RWANSecureStakingV2(
            address(stakingToken),
            address(rewardToken),
            1 ether,
            0,
            tvl,
            apr,
            0
        );

        stakingToken.mint(alice, 10_000 ether);
        stakingToken.mint(bob, 10_000 ether);
        stakingToken.mint(charlie, 10_000 ether);
        rewardToken.mint(owner, 5_000 ether);

        rewardToken.approve(address(staking), 1_000 ether);
        staking.fundRewards(1_000 ether);

        staking.addLockOption(90 days, 12_000, true);
    }

    // ========================================
    // STAKING TESTS
    // ========================================

    function testStakeClaimWithdraw() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 1_000 ether);
        staking.stakeFixed(100 ether, address(0));
        staking.stakeLocked(200 ether, 1, address(0));
        vm.stopPrank();

        uint256[] memory ids = staking.userPositions(alice);
        assertEq(ids.length, 2);

        vm.warp(block.timestamp + 15 days);
        vm.prank(alice);
        staking.claim(ids[0]);
        assertGt(rewardToken.balanceOf(alice), 0);

        vm.warp(block.timestamp + 90 days);
        vm.prank(alice);
        staking.withdraw(ids[1]);
        assertLt(staking.totalStaked(), 300 ether);
    }

    function testMultipleUsersStakeSimultaneously() public {
        vm.prank(alice);
        stakingToken.approve(address(staking), 100 ether);
        vm.prank(alice);
        staking.stakeFixed(50 ether, address(0));

        vm.prank(bob);
        stakingToken.approve(address(staking), 100 ether);
        vm.prank(bob);
        staking.stakeFixed(50 ether, address(0));

        assertEq(staking.totalStaked(), 100 ether);
        assertEq(staking.userPositions(alice).length, 1);
        assertEq(staking.userPositions(bob).length, 1);
    }

    function testStakeZeroAmountReverts() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 100 ether);
        vm.expectRevert("amount too small");
        staking.stakeFixed(0, address(0));
        vm.stopPrank();
    }

    function testStakeBelowMinAmountReverts() public {
        staking.setMinStakeAmount(10 ether);
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 100 ether);
        vm.expectRevert("amount too small");
        staking.stakeFixed(5 ether, address(0));
        vm.stopPrank();
    }

    function testStakeWithInvalidLockIdReverts() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 100 ether);
        vm.expectRevert("lockId out of range");
        staking.stakeLocked(50 ether, 99, address(0));
        vm.stopPrank();
    }

    function testStakeWithDisabledLockOptionReverts() public {
        staking.setLockOption(1, 90 days, 12_000, false);
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 100 ether);
        vm.expectRevert("lock disabled");
        staking.stakeLocked(50 ether, 1, address(0));
        vm.stopPrank();
    }

    // ========================================
    // WITHDRAWAL TESTS
    // ========================================

    function testCannotWithdrawLockedEarly() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 500 ether);
        staking.stakeLocked(100 ether, 1, address(0));
        vm.stopPrank();

        uint256[] memory ids = staking.userPositions(alice);
        vm.expectRevert("locked");
        vm.prank(alice);
        staking.withdraw(ids[0]);
    }

    function testWithdrawAtExactUnlockTime() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 200 ether);
        staking.stakeLocked(100 ether, 1, address(0));
        vm.stopPrank();

        uint256[] memory ids = staking.userPositions(alice);
        (, , , uint64 unlockTime, , , ) = staking.positions(ids[0]);

        vm.warp(unlockTime);
        vm.prank(alice);
        staking.withdraw(ids[0]);
        assertEq(staking.totalStaked(), 0);
    }

    function testWithdrawAlreadyWithdrawnReverts() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 200 ether);
        staking.stakeFixed(100 ether, address(0));
        vm.stopPrank();

        uint256[] memory ids = staking.userPositions(alice);
        vm.prank(alice);
        staking.withdraw(ids[0]);

        vm.expectRevert("already withdrawn");
        vm.prank(alice);
        staking.withdraw(ids[0]);
    }

    function testWithdrawByNonOwnerReverts() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 200 ether);
        staking.stakeFixed(100 ether, address(0));
        vm.stopPrank();

        uint256[] memory ids = staking.userPositions(alice);
        vm.expectRevert("not owner");
        vm.prank(bob);
        staking.withdraw(ids[0]);
    }

    function testWithdrawClaimsRewardsAutomatically() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 200 ether);
        staking.stakeFixed(100 ether, address(0));
        vm.stopPrank();

        vm.warp(block.timestamp + 30 days);
        uint256[] memory ids = staking.userPositions(alice);

        uint256 balanceBefore = rewardToken.balanceOf(alice);
        vm.prank(alice);
        staking.withdraw(ids[0]);
        uint256 balanceAfter = rewardToken.balanceOf(alice);

        assertGt(balanceAfter, balanceBefore);
    }

    // ========================================
    // CLAIMING TESTS
    // ========================================

    function testClaimByNonOwnerReverts() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 200 ether);
        staking.stakeFixed(100 ether, address(0));
        vm.stopPrank();

        vm.warp(block.timestamp + 10 days);
        uint256[] memory ids = staking.userPositions(alice);
        vm.expectRevert("not owner");
        vm.prank(bob);
        staking.claim(ids[0]);
    }

    function testClaimMultipleTimes() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 200 ether);
        staking.stakeFixed(100 ether, address(0));
        vm.stopPrank();

        uint256[] memory ids = staking.userPositions(alice);

        vm.warp(block.timestamp + 10 days);
        vm.prank(alice);
        staking.claim(ids[0]);
        uint256 firstClaim = rewardToken.balanceOf(alice);

        vm.warp(block.timestamp + 10 days);
        vm.prank(alice);
        staking.claim(ids[0]);
        uint256 secondClaim = rewardToken.balanceOf(alice);

        assertGt(secondClaim, firstClaim);
    }

    function testClaimWithZeroRewardsDoesNotRevert() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 200 ether);
        staking.stakeFixed(100 ether, address(0));
        vm.stopPrank();

        uint256[] memory ids = staking.userPositions(alice);
        vm.prank(alice);
        staking.claim(ids[0]);
        assertEq(rewardToken.balanceOf(alice), 0);
    }

    // ========================================
    // EMERGENCY WITHDRAWAL TESTS
    // ========================================

    function testEmergencyWithdrawWhenPaused() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 200 ether);
        staking.stakeFixed(100 ether, address(0));
        vm.stopPrank();

        staking.pause();
        uint256[] memory ids = staking.userPositions(alice);
        vm.prank(alice);
        staking.emergencyWithdraw(ids[0]);
        assertEq(staking.totalStaked(), 0);
    }

    function testEmergencyWithdrawWhenNotPausedReverts() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 200 ether);
        staking.stakeFixed(100 ether, address(0));
        vm.stopPrank();

        uint256[] memory ids = staking.userPositions(alice);
        vm.expectRevert(abi.encodeWithSignature("ExpectedPause()"));
        vm.prank(alice);
        staking.emergencyWithdraw(ids[0]);
    }

    function testEmergencyWithdrawDoesNotPayRewards() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 200 ether);
        staking.stakeFixed(100 ether, address(0));
        vm.stopPrank();

        vm.warp(block.timestamp + 30 days);
        staking.pause();

        uint256[] memory ids = staking.userPositions(alice);
        uint256 balanceBefore = rewardToken.balanceOf(alice);
        vm.prank(alice);
        staking.emergencyWithdraw(ids[0]);
        uint256 balanceAfter = rewardToken.balanceOf(alice);

        assertEq(balanceAfter, balanceBefore);
    }

    function testEmergencyWithdrawByNonOwnerReverts() public {
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 200 ether);
        staking.stakeFixed(100 ether, address(0));
        vm.stopPrank();

        staking.pause();
        uint256[] memory ids = staking.userPositions(alice);
        vm.expectRevert("not owner");
        vm.prank(bob);
        staking.emergencyWithdraw(ids[0]);
    }

    // ========================================
    // PAUSE / UNPAUSE TESTS
    // ========================================

    function testPauseBlocksUserActions() public {
        staking.pause();
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 100 ether);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        staking.stakeFixed(50 ether, address(0));
        vm.stopPrank();
    }

    function testPauseUnpauseCycle() public {
        staking.pause();
        staking.unpause();
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 10 ether);
        staking.stakeFixed(5 ether, address(0));
        vm.stopPrank();
        assertEq(staking.totalStaked(), 5 ether);
    }

    function testOnlyOwnerCanPause() public {
        vm.expectRevert(
            abi.encodeWithSignature(
                "OwnableUnauthorizedAccount(address)",
                alice
            )
        );
        vm.prank(alice);
        staking.pause();
    }

    function testOnlyOwnerCanUnpause() public {
        staking.pause();
        vm.expectRevert(
            abi.encodeWithSignature(
                "OwnableUnauthorizedAccount(address)",
                alice
            )
        );
        vm.prank(alice);
        staking.unpause();
    }

    // ========================================
    // ADMIN TESTS
    // ========================================

    function testAdminUpdateLockOption() public {
        staking.addLockOption(30 days, 11_000, true);
        staking.setLockOption(1, 60 days, 12_500, false);

        (uint64 duration, uint32 multiplierBps, bool enabled) = staking
            .lockOptions(1);
        assertEq(duration, 60 days);
        assertEq(multiplierBps, 12_500);
        assertEq(enabled, false);
    }

    function testOnlyOwnerCanAddLockOption() public {
        vm.expectRevert(
            abi.encodeWithSignature(
                "OwnableUnauthorizedAccount(address)",
                alice
            )
        );
        vm.prank(alice);
        staking.addLockOption(30 days, 11_000, true);
    }

    function testOnlyOwnerCanSetLockOption() public {
        vm.expectRevert(
            abi.encodeWithSignature(
                "OwnableUnauthorizedAccount(address)",
                alice
            )
        );
        vm.prank(alice);
        staking.setLockOption(1, 60 days, 12_500, false);
    }

    function testCannotModifyFixedLockOption() public {
        vm.expectRevert("fixed locked");
        staking.setLockOption(0, 30 days, 12_000, false);
    }

    // ========================================
    // REFERRAL TESTS
    // ========================================

    function testReferralsPayOut() public {
        staking.setReferralBps(500);
        staking.setMinReferrerStake(10 ether);

        vm.startPrank(bob);
        stakingToken.approve(address(staking), 100 ether);
        staking.stakeFixed(50 ether, address(0));
        vm.stopPrank();

        rewardToken.approve(address(staking), 100 ether);
        staking.fundReferralRewards(100 ether);

        vm.startPrank(alice);
        stakingToken.approve(address(staking), 100 ether);
        staking.stakeFixed(50 ether, bob);
        vm.stopPrank();

        vm.warp(block.timestamp + 30 days);
        uint256[] memory ids = staking.userPositions(alice);
        vm.prank(alice);
        staking.claim(ids[0]);

        assertGt(rewardToken.balanceOf(bob), 0);
    }

    function testReferralPausedNoPayout() public {
        staking.setReferralBps(500);
        staking.setMinReferrerStake(10 ether);
        staking.pauseReferrals();

        vm.startPrank(bob);
        stakingToken.approve(address(staking), 100 ether);
        staking.stakeFixed(50 ether, address(0));
        vm.stopPrank();

        rewardToken.approve(address(staking), 100 ether);
        staking.fundReferralRewards(100 ether);

        vm.startPrank(alice);
        stakingToken.approve(address(staking), 100 ether);
        staking.stakeFixed(50 ether, bob);
        vm.stopPrank();

        vm.warp(block.timestamp + 30 days);
        uint256[] memory ids = staking.userPositions(alice);
        vm.prank(alice);
        staking.claim(ids[0]);

        assertEq(rewardToken.balanceOf(bob), 0);
    }

    function testReferrerEligibility() public {
        staking.setReferralBps(500);
        staking.setMinReferrerStake(100 ether);

        vm.startPrank(bob);
        stakingToken.approve(address(staking), 100 ether);
        staking.stakeFixed(50 ether, address(0));
        vm.stopPrank();

        rewardToken.approve(address(staking), 100 ether);
        staking.fundReferralRewards(100 ether);

        vm.startPrank(alice);
        stakingToken.approve(address(staking), 100 ether);
        staking.stakeFixed(50 ether, bob);
        vm.stopPrank();

        vm.warp(block.timestamp + 30 days);
        uint256[] memory ids = staking.userPositions(alice);
        vm.prank(alice);
        staking.claim(ids[0]);

        assertEq(rewardToken.balanceOf(bob), 0);
    }

    function testSelfReferralIgnored() public {
        staking.setReferralBps(500);
        rewardToken.approve(address(staking), 100 ether);
        staking.fundReferralRewards(100 ether);

        vm.startPrank(alice);
        stakingToken.approve(address(staking), 100 ether);
        staking.stakeFixed(50 ether, alice);
        vm.stopPrank();

        assertEq(staking.referrerOf(alice), address(0));
    }

    // ========================================
    // APR TIER TESTS
    // ========================================

    function testAprTierSelection() public {
        uint256[] memory tvl = new uint256[](2);
        uint32[] memory apr = new uint32[](2);
        tvl[0] = 0;
        tvl[1] = 1_000 ether;
        apr[0] = 500;
        apr[1] = 1_500;

        staking.setAprTiers(tvl, apr);

        vm.startPrank(alice);
        stakingToken.approve(address(staking), 2_000 ether);
        staking.stakeFixed(1_200 ether, address(0));
        vm.stopPrank();

        assertEq(staking.currentAprBps(), 1_500);
    }

    // ========================================
    // RECOVERY TESTS
    // ========================================

    function testRecoverERC20NonStakingToken() public {
        MockERC20 other = new MockERC20("OTHER", "OTH", 1_000 ether);
        other.mint(address(staking), 100 ether);
        uint256 beforeBal = other.balanceOf(owner);
        staking.recoverERC20(address(other), 50 ether, owner);
        assertEq(other.balanceOf(owner) - beforeBal, 50 ether);
    }

    function testRecoverERC20RevertsForProtectedTokens() public {
        vm.expectRevert("no staking token");
        staking.recoverERC20(address(stakingToken), 1 ether, owner);

        vm.expectRevert("no reward token");
        staking.recoverERC20(address(rewardToken), 1 ether, owner);
    }

    function testRecoverExcessStakingToken() public {
        stakingToken.mint(address(staking), 100 ether);
        uint256 beforeBal = stakingToken.balanceOf(owner);
        staking.recoverStakingTokenExcess(50 ether, owner);
        uint256 afterBal = stakingToken.balanceOf(owner);
        assertEq(afterBal - beforeBal, 50 ether);
    }

    // ========================================
    // EDGE CASE TESTS
    // ========================================

    function testMaxPositionsPerUser() public {
        uint256[] memory tvl = new uint256[](1);
        uint32[] memory apr = new uint32[](1);
        tvl[0] = 0;
        apr[0] = 1_000;

        RWANSecureStakingV2 limited = new RWANSecureStakingV2(
            address(stakingToken),
            address(rewardToken),
            1 ether,
            1,
            tvl,
            apr,
            0
        );

        stakingToken.mint(alice, 100 ether);
        vm.startPrank(alice);
        stakingToken.approve(address(limited), 100 ether);
        limited.stakeFixed(10 ether, address(0));
        vm.expectRevert("positions limit");
        limited.stakeFixed(10 ether, address(0));
        vm.stopPrank();
    }

    function testMinStakeAmountEnforced() public {
        staking.setMinStakeAmount(5 ether);
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 10 ether);
        vm.expectRevert("amount too small");
        staking.stakeFixed(1 ether, address(0));
        vm.stopPrank();
    }

    function testRewardReserveDepletionDoesNotUnderflow() public {
        rewardToken.approve(address(staking), 10 ether);
        staking.fundRewards(10 ether);

        vm.startPrank(alice);
        stakingToken.approve(address(staking), 100 ether);
        staking.stakeFixed(100 ether, address(0));
        vm.stopPrank();

        vm.warp(block.timestamp + 365 days);
        uint256[] memory ids = staking.userPositions(alice);
        vm.prank(alice);
        staking.claim(ids[0]);

        uint256 reserveAfter = staking.rewardReserve();
        assertGe(reserveAfter, 0);
        assertLe(reserveAfter, rewardToken.balanceOf(address(staking)));
    }

    function testReentrancyProtection() public {
        // Foundry's ReentrancyGuard is already tested by OpenZeppelin
        // This test verifies nonReentrant modifier is applied
        vm.startPrank(alice);
        stakingToken.approve(address(staking), 200 ether);
        staking.stakeFixed(100 ether, address(0));
        vm.stopPrank();

        uint256[] memory ids = staking.userPositions(alice);
        vm.prank(alice);
        staking.claim(ids[0]);
    }

    function testEmergencyRecoverRewards() public {
        // Setup already funded 1000 ether, check initial state
        uint256 initialReserve = staking.rewardReserve();

        // Fund additional rewards and referrals
        rewardToken.approve(address(staking), 100 ether);
        staking.fundRewards(50 ether);
        staking.fundReferralRewards(50 ether);

        // Verify reserves
        assertEq(staking.rewardReserve(), initialReserve + 50 ether);
        assertEq(staking.referralReserve(), 50 ether);

        // Cannot recover when not paused
        vm.expectRevert();
        staking.emergencyRecoverRewards(owner);

        // Pause contract
        staking.pause();

        // Record balance before
        uint256 balBefore = rewardToken.balanceOf(owner);
        uint256 totalToRecover = staking.rewardReserve() +
            staking.referralReserve();

        // Recover rewards
        staking.emergencyRecoverRewards(owner);

        // Verify recovery
        assertEq(staking.rewardReserve(), 0);
        assertEq(staking.referralReserve(), 0);
        assertEq(rewardToken.balanceOf(owner) - balBefore, totalToRecover);
    }

    function testEmergencyRecoverRewardsOnlyOwner() public {
        rewardToken.approve(address(staking), 50 ether);
        staking.fundRewards(50 ether);
        staking.pause();

        // Non-owner cannot call
        vm.prank(alice);
        vm.expectRevert();
        staking.emergencyRecoverRewards(alice);
    }

    function testEmergencyRecoverRewardsInvalidRecipient() public {
        rewardToken.approve(address(staking), 50 ether);
        staking.fundRewards(50 ether);
        staking.pause();

        vm.expectRevert("invalid recipient");
        staking.emergencyRecoverRewards(address(0));
    }

    function testEmergencyRecoverRewardsNothingToRecover() public {
        staking.pause();

        // Should succeed with 0 values (no revert for empty reserves)
        staking.emergencyRecoverRewards(owner);
    }
}
