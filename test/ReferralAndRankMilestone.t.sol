// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/MockERC20.sol";
import "../contracts/RWANSecureStakingV4.sol";

/// @notice Tests for the simplified referral system (2% single-level)
///         and verifies teamStake tracking that powers off-chain rank milestones.
contract ReferralAndRankMilestoneTest is Test {
    MockERC20 public token;
    RWANSecureStakingV4 public staking;

    address public admin = address(this);
    address public alice = address(0xA11CE);
    address public bob   = address(0xB0B);
    address public carol = address(0xCA401);
    address public dave  = address(0xDA7E);
    address public eve   = address(0xE7E);

    uint256 constant INITIAL_BALANCE = 500_000_000 ether;
    uint256 constant STAKING_RESERVE = 120_000_000 ether;
    uint256 constant AFFILIATE_RESERVE = 15_400_000 ether;
    uint256 constant RANK_RESERVE = 15_400_000 ether;

    function setUp() public {
        token = new MockERC20("RWAAN", "RWAAN", 1_000_000_000 ether);
        staking = new RWANSecureStakingV4(
            address(token), address(token), admin, 100 ether, 10
        );

        // Add the 7 plans matching production
        staking.addStakePlan(0,        3,  0,    true);  // plan 0: Flex
        staking.addStakePlan(30 days,  7,  3500, true);  // plan 1: 30d
        staking.addStakePlan(90 days,  12, 3500, true);  // plan 2: 90d
        staking.addStakePlan(120 days, 14, 3500, true);  // plan 3: 120d
        staking.addStakePlan(180 days, 18, 3500, true);  // plan 4: 180d
        staking.addStakePlan(360 days, 23, 3500, true);  // plan 5: 360d
        staking.addStakePlan(720 days, 28, 3500, true);  // plan 6: 720d

        // Fund reserves
        token.approve(address(staking), type(uint256).max);
        staking.fundStakingRewards(STAKING_RESERVE);
        staking.fundAffiliateRewards(AFFILIATE_RESERVE);
        staking.fundRankRewards(RANK_RESERVE);

        // Set the NEW 2% single-level affiliate
        uint32[] memory levels = new uint32[](1);
        levels[0] = 200; // 2%
        staking.setMaxAffiliateTotalBps(200);
        staking.setAffiliateLevels(levels, 1);

        // Emission cap
        staking.setMaxDailyStakingEmission(165_000 ether);

        // Distribute tokens to test users
        address[5] memory users = [alice, bob, carol, dave, eve];
        for (uint256 i = 0; i < users.length; i++) {
            token.transfer(users[i], INITIAL_BALANCE / 5);
            vm.prank(users[i]);
            token.approve(address(staking), type(uint256).max);
        }
    }

    // ───────── 2% SINGLE-LEVEL REFERRAL ─────────

    function testAffiliateLevelsSetCorrectly() public view {
        assertEq(staking.affiliateLevelBps(0), 200);
        assertEq(staking.maxAffiliateDepth(), 1);
        assertEq(staking.maxAffiliateTotalBps(), 200);
    }

    function testDirectReferrerGets2Percent() public {
        // Bob refers Alice. Alice stakes 100k in Flex (plan 0, 3 bps/day).
        vm.prank(alice);
        staking.stake(100_000 ether, 0, bob);

        // Advance 1 day
        vm.warp(block.timestamp + 1 days);

        uint256 bobBefore = token.balanceOf(bob);
        uint256 aliceBefore = token.balanceOf(alice);

        vm.prank(alice);
        staking.claim(1); // positionId 1

        uint256 aliceReward = token.balanceOf(alice) - aliceBefore;
        uint256 bobReward = token.balanceOf(bob) - bobBefore;

        // Alice's daily reward: 100_000 * 3 / 10_000 = 30 tokens
        assertEq(aliceReward, 30 ether, "alice should get 30 RWAAN");

        // Bob's affiliate: 2% of 30 = 0.6 tokens
        assertEq(bobReward, 0.6 ether, "bob should get 2% = 0.6 RWAAN");
    }

    function testNoL2OrL3Payouts() public {
        // Chain: Carol -> Bob -> Alice (Carol referred Bob, Bob referred Alice)
        vm.prank(bob);
        staking.stake(1_000 ether, 0, carol); // Bob stakes, Carol is referrer

        vm.prank(alice);
        staking.stake(100_000 ether, 0, bob); // Alice stakes, Bob is referrer

        vm.warp(block.timestamp + 1 days);

        uint256 carolBefore = token.balanceOf(carol);
        uint256 bobBefore = token.balanceOf(bob);

        // Alice claims — only Bob (L1) should get paid, not Carol (L2)
        vm.prank(alice);
        staking.claim(2); // Alice's position

        uint256 bobReward = token.balanceOf(bob) - bobBefore;
        uint256 carolReward = token.balanceOf(carol) - carolBefore;

        assertGt(bobReward, 0, "bob (L1) should get affiliate reward");
        assertEq(carolReward, 0, "carol (L2) should get NOTHING with depth 1");
    }

    function testNoReferrerMeansNoAffiliatePayout() public {
        // Alice stakes with no referrer
        vm.prank(alice);
        staking.stake(100_000 ether, 0, address(0));

        vm.warp(block.timestamp + 1 days);

        uint256 reserveBefore = staking.affiliateRewardReserve();

        vm.prank(alice);
        staking.claim(1);

        // Affiliate reserve unchanged — nothing paid out
        assertEq(staking.affiliateRewardReserve(), reserveBefore, "reserve should not change");
    }

    function testMultipleReferralsAccumulate() public {
        // Bob refers Alice AND Carol. Both stake, both claim.
        vm.prank(alice);
        staking.stake(100_000 ether, 0, bob);

        vm.prank(carol);
        staking.stake(200_000 ether, 0, bob);

        vm.warp(block.timestamp + 1 days);

        uint256 bobBefore = token.balanceOf(bob);

        vm.prank(alice);
        staking.claim(1);

        vm.prank(carol);
        staking.claim(2);

        uint256 bobTotal = token.balanceOf(bob) - bobBefore;

        // Alice reward: 100k * 3/10000 = 30, affiliate 2% = 0.6
        // Carol reward: 200k * 3/10000 = 60, affiliate 2% = 1.2
        // Total to Bob: 1.8
        assertEq(bobTotal, 1.8 ether, "bob should get 2% of both referrals");
    }

    function testAffiliateClippedByReserve() public {
        // Deploy a fresh contract with tiny affiliate reserve
        RWANSecureStakingV4 s2 = new RWANSecureStakingV4(
            address(token), address(token), admin, 100 ether, 10
        );
        s2.addStakePlan(0, 100, 0, true); // 1% daily for fast test

        token.approve(address(s2), type(uint256).max);
        s2.fundStakingRewards(1_000_000 ether);
        s2.fundAffiliateRewards(0.1 ether); // tiny reserve

        uint32[] memory levels = new uint32[](1);
        levels[0] = 200;
        s2.setMaxAffiliateTotalBps(200);
        s2.setAffiliateLevels(levels, 1);

        vm.prank(alice);
        token.approve(address(s2), type(uint256).max);
        vm.prank(bob);
        token.approve(address(s2), type(uint256).max);

        vm.prank(alice);
        s2.stake(100_000 ether, 0, bob);

        vm.warp(block.timestamp + 1 days);

        uint256 bobBefore = token.balanceOf(bob);
        vm.prank(alice);
        s2.claim(1);

        uint256 bobGot = token.balanceOf(bob) - bobBefore;
        // 2% of 1000 reward = 20, but reserve is only 0.1 — clipped
        assertEq(bobGot, 0.1 ether, "affiliate should clip to reserve");
        assertEq(s2.affiliateRewardReserve(), 0, "reserve should be drained");
    }

    function testSelfReferralBlocked() public {
        vm.prank(alice);
        vm.expectRevert("self referral");
        staking.stake(1_000 ether, 0, alice);
    }

    // ───────── TEAM STAKE TRACKING (powers off-chain rank milestones) ─────────

    function testTeamStakeTrackedOnStake() public {
        // Bob refers Alice. Alice stakes 40M.
        vm.prank(alice);
        staking.stake(40_000_000 ether, 0, bob);

        assertEq(staking.teamStake(bob), 40_000_000 ether, "bob teamStake = 40M");
    }

    function testTeamStakeAggregatesMultipleReferrals() public {
        // Bob refers Alice, Carol, Dave — all stake different amounts
        vm.prank(alice);
        staking.stake(40_000_000 ether, 0, bob);

        vm.prank(carol);
        staking.stake(30_000_000 ether, 0, bob);

        vm.prank(dave);
        staking.stake(10_000_000 ether, 0, bob);

        assertEq(
            staking.teamStake(bob),
            80_000_000 ether,
            "bob teamStake = 80M (40+30+10)"
        );
    }

    function testTeamStakeDecreasesOnWithdraw() public {
        vm.prank(alice);
        staking.stake(40_000_000 ether, 0, bob);

        assertEq(staking.teamStake(bob), 40_000_000 ether);

        // Alice withdraws from flex (plan 0, no lock)
        vm.prank(alice);
        staking.withdraw(1);

        assertEq(staking.teamStake(bob), 0, "teamStake should decrease on withdraw");
    }

    function testTeamStakeMilestoneThresholds() public {
        // Simulate building up to each milestone threshold using multiple referrals
        uint256[13] memory milestones = [
            uint256(40_000_000 ether),
            80_000_000 ether,
            120_000_000 ether,
            200_000_000 ether,
            300_000_000 ether,
            400_000_000 ether,
            500_000_000 ether,
            600_000_000 ether,
            700_000_000 ether,
            800_000_000 ether,
            1_000_000_000 ether,
            2_000_000_000 ether,
            3_000_000_000 ether
        ];

        // Raise positions limit for stress test
        staking.setMaxPositionsPerUser(50);

        // Use multiple users to avoid per-user position limits
        // Each user stakes one large amount referencing Bob
        uint256 staked = 0;
        for (uint256 i = 0; i < milestones.length; i++) {
            uint256 toStake = milestones[i] - staked;
            address user = address(uint160(0xF000 + i));
            token.mint(user, toStake);
            vm.startPrank(user);
            token.approve(address(staking), type(uint256).max);
            staking.stake(toStake, 0, bob);
            vm.stopPrank();
            staked = milestones[i];

            assertGe(
                staking.teamStake(bob),
                milestones[i],
                "teamStake should cross milestone"
            );
        }

        // Final check: Bob's teamStake == 3B
        assertEq(staking.teamStake(bob), 3_000_000_000 ether, "final teamStake = 3B");
    }

    // ───────── ON-CHAIN RANK CONFIG (existing contract rank system) ─────────

    function testRankConfigMatchesClientTable() public {
        // Set up rank configs matching the client's milestone table
        // Rank rewards will use the contract's weighted drip, but configs
        // match the client's teamStake thresholds
        staking.setRankConfig(1,  0, 40_000_000 ether,   100, true);
        staking.setRankConfig(2,  0, 80_000_000 ether,   200, true);
        staking.setRankConfig(3,  0, 120_000_000 ether,  300, true);
        staking.setRankConfig(4,  0, 200_000_000 ether,  400, true);
        staking.setRankConfig(5,  0, 300_000_000 ether,  500, true);
        staking.setRankConfig(6,  0, 400_000_000 ether,  600, true);
        staking.setRankConfig(7,  0, 500_000_000 ether,  700, true);
        staking.setRankConfig(8,  0, 600_000_000 ether,  800, true);
        staking.setRankConfig(9,  0, 700_000_000 ether,  900, true);
        staking.setRankConfig(10, 0, 800_000_000 ether, 1000, true);
        staking.setRankConfig(11, 0, 1_000_000_000 ether, 1500, true);
        staking.setRankConfig(12, 0, 2_000_000_000 ether, 2000, true);

        // Verify configs stored correctly
        (,uint256 teamReq,,) = staking.rankConfigs(1);
        assertEq(teamReq, 40_000_000 ether);

        (,uint256 teamReq5,,) = staking.rankConfigs(5);
        assertEq(teamReq5, 300_000_000 ether);

        (,uint256 teamReq12,,) = staking.rankConfigs(12);
        assertEq(teamReq12, 2_000_000_000 ether);
    }

    function testUserCanBeAssignedRankWhenTeamStakeMet() public {
        staking.setRankConfig(1, 0, 40_000_000 ether, 100, true);

        // Bob needs teamStake >= 40M. Alice stakes 40M with Bob as referrer.
        vm.prank(alice);
        staking.stake(40_000_000 ether, 0, bob);

        // Admin assigns rank 1 to Bob
        staking.setUserRank(bob, 1);

        (uint32 rankId,,) = staking.userRanks(bob);
        assertEq(rankId, 1, "bob should be rank 1");
    }

    function testUserRejectedIfTeamStakeTooLow() public {
        staking.setRankConfig(1, 0, 40_000_000 ether, 100, true);

        // Bob has no team stake
        vm.expectRevert("team stake low");
        staking.setUserRank(bob, 1);
    }

    function testRankUpgradeOnHigherTeamStake() public {
        staking.setRankConfig(1, 0, 40_000_000 ether, 100, true);
        staking.setRankConfig(2, 0, 80_000_000 ether, 200, true);

        token.mint(carol, 100_000_000 ether);
        vm.prank(carol);
        token.approve(address(staking), type(uint256).max);

        // Alice and Carol both stake under Bob's referral
        vm.prank(alice);
        staking.stake(40_000_000 ether, 0, bob);
        staking.setUserRank(bob, 1);

        vm.prank(carol);
        staking.stake(40_000_000 ether, 0, bob);

        // Bob now has 80M teamStake — qualifies for rank 2
        assertEq(staking.teamStake(bob), 80_000_000 ether);
        staking.setUserRank(bob, 2);

        (uint32 rankId,,) = staking.userRanks(bob);
        assertEq(rankId, 2, "bob should be rank 2 with 80M teamStake");
    }

    // ───────── COMBINED: REFERRAL + RANK IN ONE FLOW ─────────

    function testFullFlowReferralAndRank() public {
        // Setup: single-level 2% affiliate + rank configs
        staking.setRankConfig(1, 0, 40_000_000 ether, 100, true);
        staking.setDailyRankBudget(21_000 ether);

        // Alice stakes 50M with Bob as referrer
        vm.prank(alice);
        staking.stake(50_000_000 ether, 0, bob);

        // Verify referrer chain
        assertEq(staking.referrerOf(alice), bob, "alice referrer = bob");
        assertEq(staking.teamStake(bob), 50_000_000 ether, "bob teamStake = 50M");

        // Bob qualifies for rank 1
        staking.setUserRank(bob, 1);

        // Advance 1 day
        vm.warp(block.timestamp + 1 days);

        // Alice claims staking rewards
        uint256 bobBalBefore = token.balanceOf(bob);
        vm.prank(alice);
        staking.claim(1);

        // Bob got 2% affiliate
        uint256 affiliateEarned = token.balanceOf(bob) - bobBalBefore;
        // 50M * 3bps = 15000 RWAAN/day staking reward
        // 2% of 15000 = 300 RWAAN affiliate
        assertEq(affiliateEarned, 300 ether, "bob affiliate = 300 RWAAN");

        // Bob claims rank reward
        uint256 bobBal2 = token.balanceOf(bob);
        vm.prank(bob);
        staking.claimRankReward();

        uint256 rankEarned = token.balanceOf(bob) - bobBal2;
        assertGt(rankEarned, 0, "bob should earn rank rewards");

        // Rank reward = dailyBudget * bobWeight / totalWeight
        // Bob is the only ranked user, so he gets the full 21000
        assertEq(rankEarned, 21_000 ether, "bob gets full daily rank budget");
    }
}
