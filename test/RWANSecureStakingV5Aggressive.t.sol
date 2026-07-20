// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/MockERC20.sol";
import "../contracts/RWANSecureStakingV5.sol";

/// @notice Aggressive edge-case and stress tests for V5.
contract RWANSecureStakingV5AggressiveTest is Test {
    MockERC20 public token;
    RWANSecureStakingV5 public staking;

    address public admin = address(this);
    address public alice = address(0xA11CE);
    address public bob   = address(0xB0B);
    address public carol = address(0xCA401);
    address public dave  = address(0xDA7E);
    address public eve   = address(0xE7E);

    uint256 constant STAKING_RESERVE = 120_000_000 ether;
    uint256 constant AFFILIATE_RESERVE = 15_000_000 ether;
    uint256 constant RANK_RESERVE = 15_000_000 ether;
    uint256 constant MARKETPLACE_RESERVE = 15_000_000 ether;

    function setUp() public {
        token = new MockERC20("RWAAN", "RWAAN", 10_000_000_000 ether);
        staking = new RWANSecureStakingV5(
            address(token), address(token), admin, 100 ether, 50
        );

        // Production plans
        staking.addStakePlan(0,        3,  0,    true);  // 0: Flex
        staking.addStakePlan(30 days,  7,  3500, true);  // 1: 30d
        staking.addStakePlan(90 days,  12, 3500, true);  // 2: 90d
        staking.addStakePlan(120 days, 14, 3500, true);  // 3: 120d
        staking.addStakePlan(180 days, 18, 3500, true);  // 4: 180d
        staking.addStakePlan(360 days, 23, 3500, true);  // 5: 360d
        staking.addStakePlan(720 days, 28, 3500, true);  // 6: 720d

        // 2% single-level affiliate
        uint32[] memory levels = new uint32[](1);
        levels[0] = 200;
        staking.setMaxAffiliateTotalBps(200);
        staking.setAffiliateLevels(levels, 1);

        // Emission cap
        staking.setMaxDailyStakingEmission(165_000 ether);

        // Fund reserves
        token.approve(address(staking), type(uint256).max);
        staking.fundStakingRewards(STAKING_RESERVE);
        staking.fundAffiliateRewards(AFFILIATE_RESERVE);
        staking.fundRankRewards(RANK_RESERVE);
        staking.fundMarketplaceRewards(MARKETPLACE_RESERVE);

        // Milestones matching client's table
        staking.setMilestone(1,  40_000_000 ether,   50_000 ether,  true);
        staking.setMilestone(2,  80_000_000 ether,   100_000 ether, true);
        staking.setMilestone(3,  120_000_000 ether,  150_000 ether, true);
        staking.setMilestone(4,  200_000_000 ether,  200_000 ether, true);
        staking.setMilestone(5,  300_000_000 ether,  400_000 ether, true);
        staking.setMilestone(6,  400_000_000 ether,  500_000 ether, true);
        staking.setMilestone(7,  500_000_000 ether,  650_000 ether, true);
        staking.setMilestone(8,  600_000_000 ether,  750_000 ether, true);
        staking.setMilestone(9,  700_000_000 ether,  800_000 ether, true);
        staking.setMilestone(10, 800_000_000 ether,  1_000_000 ether, true);
        staking.setMilestone(11, 1_000_000_000 ether, 2_000_000 ether, true);
        staking.setMilestone(12, 2_000_000_000 ether, 4_000_000 ether, true);

        // Fund users
        address[5] memory users = [alice, bob, carol, dave, eve];
        for (uint256 i = 0; i < users.length; i++) {
            token.transfer(users[i], 1_000_000_000 ether);
            vm.prank(users[i]);
            token.approve(address(staking), type(uint256).max);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //              MILESTONE EDGE CASES
    // ═══════════════════════════════════════════════════════════════

    function testInvalidMilestoneIdZero() public {
        vm.prank(bob);
        vm.expectRevert("invalid milestone");
        staking.claimMilestone(0);
    }

    function testInvalidMilestoneIdTooHigh() public {
        vm.prank(bob);
        vm.expectRevert("invalid milestone");
        staking.claimMilestone(13); // only 12 exist
    }

    function testMilestoneRewardDrainsReserveCorrectly() public {
        uint256 reserveBefore = staking.rankRewardReserve();

        vm.prank(alice);
        staking.stake(50_000_000 ether, 0, bob);

        vm.prank(bob);
        staking.claimMilestone(1);

        assertEq(staking.rankRewardReserve(), reserveBefore - 50_000 ether);
    }

    function testMultipleUsersClaimSameMilestone() public {
        // Both Bob and Carol build teams that qualify for milestone 1
        vm.prank(alice);
        staking.stake(50_000_000 ether, 0, bob);

        vm.prank(dave);
        staking.stake(50_000_000 ether, 0, carol);

        uint256 reserveBefore = staking.rankRewardReserve();

        vm.prank(bob);
        staking.claimMilestone(1);
        vm.prank(carol);
        staking.claimMilestone(1);

        assertEq(staking.rankRewardReserve(), reserveBefore - 100_000 ether);
        assertTrue(staking.milestoneClaimed(bob, 1));
        assertTrue(staking.milestoneClaimed(carol, 1));
    }

    function testClaimAllMilestonesSequentially() public {
        // Build massive team for Bob
        for (uint256 i = 0; i < 20; i++) {
            address user = address(uint160(0xF000 + i));
            token.mint(user, 200_000_000 ether);
            vm.startPrank(user);
            token.approve(address(staking), type(uint256).max);
            staking.stake(100_000_000 ether, 0, bob);
            vm.stopPrank();
        }

        // Bob should have teamStake = 2B
        assertEq(staking.teamStake(bob), 2_000_000_000 ether);

        // Claim all 12 milestones one by one
        uint256 bobBefore = token.balanceOf(bob);
        for (uint256 i = 1; i <= 12; i++) {
            vm.prank(bob);
            staking.claimMilestone(i);
            assertTrue(staking.milestoneClaimed(bob, i));
        }

        uint256 totalMilestoneRewards = 50_000 ether + 100_000 ether + 150_000 ether
            + 200_000 ether + 400_000 ether + 500_000 ether + 650_000 ether
            + 750_000 ether + 800_000 ether + 1_000_000 ether + 2_000_000 ether + 4_000_000 ether;

        assertEq(token.balanceOf(bob) - bobBefore, totalMilestoneRewards);
        assertEq(totalMilestoneRewards, 10_600_000 ether, "total milestone rewards = 10.6M");
    }

    function testBatchClaimAllAtOnce() public {
        for (uint256 i = 0; i < 20; i++) {
            address user = address(uint160(0xF000 + i));
            token.mint(user, 200_000_000 ether);
            vm.startPrank(user);
            token.approve(address(staking), type(uint256).max);
            staking.stake(100_000_000 ether, 0, bob);
            vm.stopPrank();
        }

        uint256[] memory ids = new uint256[](12);
        for (uint256 i = 0; i < 12; i++) ids[i] = i + 1;

        uint256 bobBefore = token.balanceOf(bob);
        vm.prank(bob);
        staking.claimMultipleMilestones(ids);

        assertEq(token.balanceOf(bob) - bobBefore, 10_600_000 ether);
    }

    function testPartialBatchFailsIfOneInvalid() public {
        vm.prank(alice);
        staking.stake(50_000_000 ether, 0, bob);

        uint256[] memory ids = new uint256[](2);
        ids[0] = 1; // valid (teamStake >= 40M)
        ids[1] = 2; // invalid (teamStake < 80M)

        vm.prank(bob);
        vm.expectRevert("team stake too low");
        staking.claimMultipleMilestones(ids);

        // Neither should be claimed (atomic revert)
        assertFalse(staking.milestoneClaimed(bob, 1));
        assertFalse(staking.milestoneClaimed(bob, 2));
    }

    function testMilestoneWithTeamStakeFromMultipleReferrals() public {
        // 4 people each stake 25M under Bob
        address[4] memory stakers = [alice, carol, dave, eve];
        for (uint256 i = 0; i < 4; i++) {
            vm.prank(stakers[i]);
            staking.stake(25_000_000 ether, 0, bob);
        }

        assertEq(staking.teamStake(bob), 100_000_000 ether);

        // Bob qualifies for milestones 1 (40M) and 2 (80M) but not 3 (120M)
        uint256[] memory pending = staking.pendingMilestones(bob);
        assertEq(pending.length, 2);

        vm.prank(bob);
        vm.expectRevert("team stake too low");
        staking.claimMilestone(3);
    }

    // ═══════════════════════════════════════════════════════════════
    //              AFFILIATE EDGE CASES
    // ═══════════════════════════════════════════════════════════════

    function testAffiliateNotPaidIfReferrerHasNoStake() public {
        // Set minReferralStake to require referrer to have skin in the game
        staking.setMinReferralStake(1000 ether);

        vm.prank(alice);
        staking.stake(100_000 ether, 0, bob); // Bob has 0 staked

        vm.warp(block.timestamp + 1 days);

        uint256 bobBefore = token.balanceOf(bob);
        vm.prank(alice);
        staking.claim(1);

        // Bob gets nothing — doesn't meet minReferralStake
        assertEq(token.balanceOf(bob) - bobBefore, 0);
    }

    function testAffiliateStillPaidIfMinReferralStakeZero() public {
        // Default: minReferralStake = 0, so anyone qualifies
        vm.prank(alice);
        staking.stake(100_000 ether, 0, bob);

        vm.warp(block.timestamp + 1 days);

        uint256 bobBefore = token.balanceOf(bob);
        vm.prank(alice);
        staking.claim(1);

        assertEq(token.balanceOf(bob) - bobBefore, 0.6 ether);
    }

    function testAffiliatePausedStopsPayouts() public {
        vm.prank(alice);
        staking.stake(100_000 ether, 0, bob);

        staking.setPauseFlags(false, false, false, true, false); // affiliateRewardsPaused = true

        vm.warp(block.timestamp + 1 days);

        uint256 bobBefore = token.balanceOf(bob);
        vm.prank(alice);
        staking.claim(1);

        assertEq(token.balanceOf(bob) - bobBefore, 0, "affiliate paused = no payout");
    }

    function testAffiliateReserveDepletionGraceful() public {
        // Deploy with tiny affiliate reserve
        RWANSecureStakingV5 s2 = new RWANSecureStakingV5(
            address(token), address(token), admin, 100 ether, 50
        );
        s2.addStakePlan(0, 100, 0, true); // 1% daily
        uint32[] memory levels = new uint32[](1);
        levels[0] = 200;
        s2.setMaxAffiliateTotalBps(200);
        s2.setAffiliateLevels(levels, 1);

        token.approve(address(s2), type(uint256).max);
        s2.fundStakingRewards(10_000_000 ether);
        s2.fundAffiliateRewards(1 ether); // tiny

        vm.prank(alice);
        token.approve(address(s2), type(uint256).max);
        vm.prank(alice);
        s2.stake(1_000_000 ether, 0, bob);

        vm.warp(block.timestamp + 1 days);

        // Reward = 1M * 100/10000 = 10000. Affiliate 2% = 200. But reserve = 1.
        uint256 bobBefore = token.balanceOf(bob);
        vm.prank(alice);
        s2.claim(1);

        assertEq(token.balanceOf(bob) - bobBefore, 1 ether, "clipped to reserve");
        assertEq(s2.affiliateRewardReserve(), 0);
    }

    function testSelfReferralBlocked() public {
        vm.prank(alice);
        vm.expectRevert("self referral");
        staking.stake(1_000 ether, 0, alice);
    }

    function testReferralCycleBlocked() public {
        // Alice refers Bob
        vm.prank(bob);
        staking.stake(1_000 ether, 0, alice);

        // Bob tries to refer Alice back (cycle)
        vm.prank(alice);
        vm.expectRevert("referral cycle");
        staking.stake(1_000 ether, 0, bob);
    }

    function testReferrerCannotBeChangedOnce() public {
        vm.prank(alice);
        staking.stake(1_000 ether, 0, bob);

        // Second stake with different referrer — should ignore (referrer already set)
        vm.prank(alice);
        vm.expectRevert("referrer set");
        staking.stake(1_000 ether, 0, carol);
    }

    // ═══════════════════════════════════════════════════════════════
    //              STAKING EDGE CASES
    // ═══════════════════════════════════════════════════════════════

    function testCannotStakeBelowMinimum() public {
        vm.prank(alice);
        vm.expectRevert("amount too low");
        staking.stake(50 ether, 0, address(0)); // min is 100
    }

    function testCannotStakeInDisabledPlan() public {
        staking.updateStakePlan(0, 3, 0, false); // disable flex

        vm.prank(alice);
        vm.expectRevert("plan disabled");
        staking.stake(1_000 ether, 0, address(0));
    }

    function testCannotWithdrawBeforeUnlock() public {
        vm.prank(alice);
        staking.stake(10_000 ether, 1, address(0)); // 30-day lock

        vm.warp(block.timestamp + 15 days);

        vm.prank(alice);
        vm.expectRevert("still locked");
        staking.withdraw(1);
    }

    function testCanWithdrawAfterUnlock() public {
        vm.prank(alice);
        staking.stake(10_000 ether, 1, address(0)); // 30-day lock

        vm.warp(block.timestamp + 30 days);

        uint256 before = token.balanceOf(alice);
        vm.prank(alice);
        staking.withdraw(1);

        // Principal + rewards
        uint256 expectedReward = 10_000 ether * 7 * 30 / 10_000; // 2100
        assertEq(token.balanceOf(alice) - before, 10_000 ether + expectedReward);
    }

    function testFlexibleWithdrawAnytime() public {
        vm.prank(alice);
        staking.stake(10_000 ether, 0, address(0)); // Flex, no lock

        vm.warp(block.timestamp + 5 days);

        uint256 before = token.balanceOf(alice);
        vm.prank(alice);
        staking.withdraw(1);

        uint256 expectedReward = 10_000 ether * 3 * 5 / 10_000; // 15
        assertEq(token.balanceOf(alice) - before, 10_000 ether + expectedReward);
    }

    function testDoubleWithdrawBlocked() public {
        vm.prank(alice);
        staking.stake(10_000 ether, 0, address(0));

        vm.prank(alice);
        staking.withdraw(1);

        vm.prank(alice);
        vm.expectRevert("already withdrawn");
        staking.withdraw(1);
    }

    function testCannotClaimOtherUsersPosition() public {
        vm.prank(alice);
        staking.stake(10_000 ether, 0, address(0));

        vm.warp(block.timestamp + 1 days);

        vm.prank(bob);
        vm.expectRevert("not owner");
        staking.claim(1);
    }

    function testPositionsLimitEnforced() public {
        staking.setMaxPositionsPerUser(3);

        vm.startPrank(alice);
        staking.stake(1_000 ether, 0, address(0));
        staking.stake(1_000 ether, 0, address(0));
        staking.stake(1_000 ether, 0, address(0));

        vm.expectRevert("positions limit");
        staking.stake(1_000 ether, 0, address(0));
        vm.stopPrank();
    }

    // ═══════════════════════════════════════════════════════════════
    //              EMISSION CAP STRESS
    // ═══════════════════════════════════════════════════════════════

    function testEmissionCapRefillsOverTime() public {
        staking.setMaxDailyStakingEmission(1000 ether);

        vm.prank(alice);
        staking.stake(100_000_000 ether, 0, address(0));

        // Day 1: claim capped at 1000
        vm.warp(block.timestamp + 1 days);
        uint256 before = token.balanceOf(alice);
        vm.prank(alice);
        staking.claim(1);
        assertEq(token.balanceOf(alice) - before, 1000 ether);

        // Day 2: refilled, can claim another 1000
        vm.warp(block.timestamp + 1 days);
        before = token.balanceOf(alice);
        vm.prank(alice);
        staking.claim(1);
        assertEq(token.balanceOf(alice) - before, 1000 ether);
    }

    function testEmissionCapPartialDay() public {
        staking.setMaxDailyStakingEmission(1000 ether);

        vm.prank(alice);
        staking.stake(100_000_000 ether, 0, address(0));

        // Half day: should get ~500
        vm.warp(block.timestamp + 12 hours);
        uint256 before = token.balanceOf(alice);
        vm.prank(alice);
        staking.claim(1);
        assertEq(token.balanceOf(alice) - before, 500 ether);
    }

    // ═══════════════════════════════════════════════════════════════
    //              RESERVE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    function testFundAndWithdrawAllReserves() public {
        uint256 adminBefore = token.balanceOf(admin);

        // Withdraw all
        staking.withdrawStakingRewardReserve(admin, STAKING_RESERVE);
        staking.withdrawAffiliateRewardReserve(admin, AFFILIATE_RESERVE);
        staking.withdrawRankRewardReserve(admin, RANK_RESERVE);
        staking.withdrawMarketplaceRewardReserve(admin, MARKETPLACE_RESERVE);

        assertEq(staking.stakingRewardReserve(), 0);
        assertEq(staking.affiliateRewardReserve(), 0);
        assertEq(staking.rankRewardReserve(), 0);
        assertEq(staking.marketplaceCreditReserve(), 0);

        uint256 totalWithdrawn = token.balanceOf(admin) - adminBefore;
        assertEq(totalWithdrawn, STAKING_RESERVE + AFFILIATE_RESERVE + RANK_RESERVE + MARKETPLACE_RESERVE);
    }

    function testCannotWithdrawMoreThanReserve() public {
        vm.expectRevert("staking reserve low");
        staking.withdrawStakingRewardReserve(admin, STAKING_RESERVE + 1);
    }

    function testSurplusRecovery() public {
        // Send extra tokens directly to contract (not through fund functions)
        token.transfer(address(staking), 1000 ether);

        assertEq(staking.surplusTokenBalance(address(token)), 1000 ether);
        staking.recoverSurplusERC20(address(token), admin, 1000 ether);
        assertEq(staking.surplusTokenBalance(address(token)), 0);
    }

    function testCannotRecoverProtectedBalance() public {
        vm.expectRevert("exceeds surplus");
        staking.recoverSurplusERC20(address(token), admin, 1);
    }

    // ═══════════════════════════════════════════════════════════════
    //              TEAM STAKE PROPAGATION
    // ═══════════════════════════════════════════════════════════════

    function testTeamStakePropagatesUpMultipleLevels() public {
        // Chain: Dave -> Carol -> Bob -> Alice (referral chain)
        vm.prank(bob);
        staking.stake(1_000 ether, 0, alice);
        vm.prank(carol);
        staking.stake(1_000 ether, 0, bob);
        vm.prank(dave);
        staking.stake(50_000_000 ether, 0, carol);

        // teamStake propagates up: Carol gets 50M, Bob gets 50M, Alice gets 50M
        assertEq(staking.teamStake(carol), 50_000_000 ether);
        assertEq(staking.teamStake(bob), 50_000_000 ether + 1_000 ether);
        assertEq(staking.teamStake(alice), 50_000_000 ether + 1_000 ether + 1_000 ether);
    }

    function testTeamStakeDecreasePropagatesOnWithdraw() public {
        vm.prank(bob);
        staking.stake(1_000 ether, 0, alice);
        vm.prank(carol);
        staking.stake(50_000_000 ether, 0, bob);

        assertEq(staking.teamStake(bob), 50_000_000 ether);
        assertEq(staking.teamStake(alice), 50_000_000 ether + 1_000 ether);

        // Carol withdraws
        vm.prank(carol);
        staking.withdraw(2);

        assertEq(staking.teamStake(bob), 0);
        assertEq(staking.teamStake(alice), 1_000 ether);
    }

    function testTeamStakeWithEarlyWithdraw() public {
        vm.prank(alice);
        staking.stake(50_000_000 ether, 1, bob); // 30-day lock

        assertEq(staking.teamStake(bob), 50_000_000 ether);

        vm.warp(block.timestamp + 10 days);
        vm.prank(alice);
        staking.withdrawEarly(1);

        assertEq(staking.teamStake(bob), 0, "teamStake decreases on early withdraw");
    }

    // ═══════════════════════════════════════════════════════════════
    //              MARKETPLACE CREDITS
    // ═══════════════════════════════════════════════════════════════

    function testMarketplaceBenefitApplied() public {
        staking.setMarketplaceBenefit(1, 10_000 ether, 5, 500, true, true, true);
        // Plan 1 (30d, 7 bps) + bonus 5 bps = 12 bps total, 5% credit, VIP

        vm.prank(alice);
        staking.stake(100_000 ether, 1, address(0));

        // Check rate snapshot includes bonus
        assertEq(staking.positionRewardRateBps(1), 12);
        // Credit = 100k * 500/10000 = 5000
        assertEq(staking.positionMarketplaceCredit(1), 5_000 ether);
        assertTrue(staking.positionMarketplaceVipEligible(1));
    }

    function testMarketplaceCreditClaimableAfterUnlock() public {
        staking.setMarketplaceBenefit(1, 10_000 ether, 5, 500, true, false, true);

        vm.prank(alice);
        staking.stake(100_000 ether, 1, address(0));

        // Cannot claim before unlock
        assertFalse(staking.marketplaceCreditClaimable(1));

        vm.warp(block.timestamp + 30 days);
        assertTrue(staking.marketplaceCreditClaimable(1));

        uint256 before = token.balanceOf(alice);
        vm.prank(alice);
        staking.claimMarketplaceCredit(1);
        assertEq(token.balanceOf(alice) - before, 5_000 ether);
    }

    function testMarketplaceCreditForfeitsOnEarlyWithdraw() public {
        staking.setMarketplaceBenefit(1, 10_000 ether, 5, 500, true, false, true);

        vm.prank(alice);
        staking.stake(100_000 ether, 1, address(0));

        uint256 marketplaceReserveBefore = staking.marketplaceCreditReserve();

        vm.prank(alice);
        staking.withdrawEarly(1);

        // Credit returned to reserve
        assertEq(staking.marketplaceCreditReserve(), marketplaceReserveBefore + 5_000 ether);
    }

    // ═══════════════════════════════════════════════════════════════
    //              PAUSE & ACCESS CONTROL
    // ═══════════════════════════════════════════════════════════════

    function testGlobalPauseBlocksEverything() public {
        vm.prank(alice);
        staking.stake(10_000 ether, 0, address(0));

        staking.pause();

        vm.prank(alice);
        vm.expectRevert();
        staking.stake(1_000 ether, 0, address(0));

        vm.prank(alice);
        vm.expectRevert();
        staking.claim(1);

        vm.prank(alice);
        vm.expectRevert();
        staking.withdraw(1);
    }

    function testEmergencyWithdrawOnlyWhenPaused() public {
        vm.prank(alice);
        staking.stake(10_000 ether, 0, address(0));

        vm.prank(alice);
        vm.expectRevert("emergency unavailable");
        staking.emergencyWithdraw(1);

        staking.pause();

        uint256 before = token.balanceOf(alice);
        vm.prank(alice);
        staking.emergencyWithdraw(1);
        assertEq(token.balanceOf(alice) - before, 10_000 ether);
    }

    function testNonAdminCannotSetMilestone() public {
        vm.prank(alice);
        vm.expectRevert();
        staking.setMilestone(13, 3_000_000_000 ether, 5_000_000 ether, true);
    }

    function testNonAdminCannotWithdrawReserve() public {
        vm.prank(alice);
        vm.expectRevert();
        staking.withdrawStakingRewardReserve(alice, 1 ether);
    }

    // ═══════════════════════════════════════════════════════════════
    //              FULL LIFECYCLE STRESS TEST
    // ═══════════════════════════════════════════════════════════════

    function testFullLifecycleWith720DayPlan() public {
        // Remove emission cap for this test — we're testing staking math, not the cap
        staking.setMaxDailyStakingEmission(0);

        // Alice stakes 10M in 720-day plan, referred by Bob
        vm.prank(alice);
        staking.stake(10_000_000 ether, 6, bob);

        // 720 days pass
        vm.warp(block.timestamp + 720 days);

        uint256 aliceBefore = token.balanceOf(alice);
        uint256 bobBefore = token.balanceOf(bob);

        vm.prank(alice);
        staking.withdraw(1);

        uint256 aliceGot = token.balanceOf(alice) - aliceBefore;
        uint256 bobGot = token.balanceOf(bob) - bobBefore;

        // Alice: principal + full-term reward
        // Reward: 10M * 28 bps * 720 days / 10000 = 20,160,000
        uint256 expectedReward = 10_000_000 ether * 28 * 720 / 10_000;
        assertEq(expectedReward, 20_160_000 ether);
        assertEq(aliceGot, 10_000_000 ether + expectedReward);

        // Bob affiliate: 2% of 20.16M = 403,200
        assertEq(bobGot, expectedReward * 200 / 10_000);
    }

    function testEmissionCapThrottlesSingleLargeClaim() public {
        // With cap at 165k, a single claim after 720 days is limited
        vm.prank(alice);
        staking.stake(10_000_000 ether, 6, bob);

        vm.warp(block.timestamp + 720 days);

        uint256 aliceBefore = token.balanceOf(alice);
        vm.prank(alice);
        staking.withdraw(1);

        uint256 aliceGot = token.balanceOf(alice) - aliceBefore;
        // Emission cap = 165k. Even though 720 days passed, cap refills only to one day.
        // Principal 10M + capped reward 165k
        assertEq(aliceGot, 10_000_000 ether + 165_000 ether);
    }

    function testMultiplePositionsDifferentPlans() public {
        vm.startPrank(alice);
        staking.stake(1_000_000 ether, 0, bob);  // pos 1: flex
        staking.stake(1_000_000 ether, 1, address(0)); // pos 2: 30d
        staking.stake(1_000_000 ether, 6, address(0)); // pos 3: 720d
        vm.stopPrank();

        vm.warp(block.timestamp + 1 days);

        // Claim all — different rates
        uint256 before = token.balanceOf(alice);
        vm.prank(alice);
        staking.claim(1); // 3 bps
        vm.prank(alice);
        staking.claim(2); // 7 bps
        vm.prank(alice);
        staking.claim(3); // 28 bps

        uint256 total = token.balanceOf(alice) - before;
        uint256 expected = (1_000_000 ether * 3 / 10_000)
            + (1_000_000 ether * 7 / 10_000)
            + (1_000_000 ether * 28 / 10_000);
        assertEq(total, expected); // 300 + 700 + 2800 = 3800
    }

    function testStakingReserveDepletion() public {
        // Deploy with small reserve
        RWANSecureStakingV5 s2 = new RWANSecureStakingV5(
            address(token), address(token), admin, 100 ether, 50
        );
        s2.addStakePlan(0, 100, 0, true); // 1% daily

        token.approve(address(s2), type(uint256).max);
        s2.fundStakingRewards(500 ether);

        vm.prank(alice);
        token.approve(address(s2), type(uint256).max);
        vm.prank(alice);
        s2.stake(100_000 ether, 0, address(0));

        // After 1 day, reward = 1000, but reserve = 500
        vm.warp(block.timestamp + 1 days);

        uint256 before = token.balanceOf(alice);
        vm.prank(alice);
        s2.claim(1);

        assertEq(token.balanceOf(alice) - before, 500 ether, "clipped to staking reserve");
        assertEq(s2.stakingRewardReserve(), 0);
    }

    // ═══════════════════════════════════════════════════════════════
    //              INVARIANT CHECKS
    // ═══════════════════════════════════════════════════════════════

    function testProtectedBalanceNeverExceedsActualBalance() public {
        vm.prank(alice);
        staking.stake(10_000_000 ether, 0, bob);

        vm.warp(block.timestamp + 30 days);

        vm.prank(alice);
        staking.claim(1);

        uint256 actual = token.balanceOf(address(staking));
        uint256 protected = staking.protectedTokenBalance(address(token));
        assertGe(actual, protected, "actual balance must >= protected");
    }

    function testTotalStakedMatchesSumOfActivePositions() public {
        vm.prank(alice);
        staking.stake(5_000_000 ether, 0, address(0));
        vm.prank(bob);
        staking.stake(3_000_000 ether, 0, address(0));
        vm.prank(carol);
        staking.stake(2_000_000 ether, 0, address(0));

        assertEq(staking.totalStaked(), 10_000_000 ether);

        vm.prank(alice);
        staking.withdraw(1);

        assertEq(staking.totalStaked(), 5_000_000 ether);
    }
}
