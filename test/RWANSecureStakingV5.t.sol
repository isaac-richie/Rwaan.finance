// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/MockERC20.sol";
import "../contracts/RWANSecureStakingV5.sol";

contract RWANSecureStakingV5Test is Test {
    MockERC20 public token;
    RWANSecureStakingV5 public staking;

    address public admin = address(this);
    address public alice = address(0xA11CE);
    address public bob   = address(0xB0B);
    address public carol = address(0xCA401);
    address public dave  = address(0xDA7E);

    uint256 constant INITIAL_BALANCE = 500_000_000 ether;
    uint256 constant STAKING_RESERVE = 120_000_000 ether;
    uint256 constant AFFILIATE_RESERVE = 15_000_000 ether;
    uint256 constant RANK_RESERVE = 15_000_000 ether;

    function setUp() public {
        token = new MockERC20("RWAAN", "RWAAN", 5_000_000_000 ether);
        staking = new RWANSecureStakingV5(
            address(token), address(token), admin, 100 ether, 20
        );

        // Production plans
        staking.addStakePlan(0,        3,  0,    true);
        staking.addStakePlan(30 days,  7,  3500, true);
        staking.addStakePlan(90 days,  12, 3500, true);
        staking.addStakePlan(120 days, 14, 3500, true);
        staking.addStakePlan(180 days, 18, 3500, true);
        staking.addStakePlan(360 days, 23, 3500, true);
        staking.addStakePlan(720 days, 28, 3500, true);

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

        // Client's milestone table (RWAAN amounts — placeholder conversion from USD)
        // In production, admin sets exact RWAAN equivalents via setMilestone
        staking.setMilestone(1,  40_000_000 ether,   50_000 ether,  true);   // $50
        staking.setMilestone(2,  80_000_000 ether,   100_000 ether, true);   // $100
        staking.setMilestone(3,  120_000_000 ether,  150_000 ether, true);   // $150
        staking.setMilestone(4,  200_000_000 ether,  200_000 ether, true);   // $200
        staking.setMilestone(5,  300_000_000 ether,  400_000 ether, true);   // $400
        staking.setMilestone(6,  400_000_000 ether,  500_000 ether, true);   // $500
        staking.setMilestone(7,  500_000_000 ether,  650_000 ether, true);   // $650
        staking.setMilestone(8,  600_000_000 ether,  750_000 ether, true);   // $750
        staking.setMilestone(9,  700_000_000 ether,  800_000 ether, true);   // $800
        staking.setMilestone(10, 800_000_000 ether,  1_000_000 ether, true); // $1000
        staking.setMilestone(11, 1_000_000_000 ether, 2_000_000 ether, true); // $2000
        staking.setMilestone(12, 2_000_000_000 ether, 4_000_000 ether, true); // $4000

        // Distribute tokens to users
        address[4] memory users = [alice, bob, carol, dave];
        for (uint256 i = 0; i < users.length; i++) {
            token.transfer(users[i], INITIAL_BALANCE);
            vm.prank(users[i]);
            token.approve(address(staking), type(uint256).max);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //                      MILESTONE TESTS
    // ═══════════════════════════════════════════════════════════════

    function testMilestoneConfiguredCorrectly() public view {
        assertEq(staking.milestonesCount(), 12);
        (uint256 teamReq, uint256 reward, bool enabled) = staking.milestones(1);
        assertEq(teamReq, 40_000_000 ether);
        assertEq(reward, 50_000 ether);
        assertTrue(enabled);

        (uint256 teamReq12, uint256 reward12,) = staking.milestones(12);
        assertEq(teamReq12, 2_000_000_000 ether);
        assertEq(reward12, 4_000_000 ether);
    }

    function testClaimMilestoneSuccess() public {
        // Alice stakes 50M with Bob as referrer → Bob teamStake = 50M > 40M
        vm.prank(alice);
        staking.stake(50_000_000 ether, 0, bob);

        assertEq(staking.teamStake(bob), 50_000_000 ether);

        uint256 bobBefore = token.balanceOf(bob);
        vm.prank(bob);
        staking.claimMilestone(1);

        assertEq(token.balanceOf(bob) - bobBefore, 50_000 ether, "bob gets milestone 1 reward");
        assertTrue(staking.milestoneClaimed(bob, 1));
    }

    function testCannotClaimMilestoneTwice() public {
        vm.prank(alice);
        staking.stake(50_000_000 ether, 0, bob);

        vm.prank(bob);
        staking.claimMilestone(1);

        vm.prank(bob);
        vm.expectRevert("already claimed");
        staking.claimMilestone(1);
    }

    function testCannotClaimIfTeamStakeTooLow() public {
        vm.prank(alice);
        staking.stake(30_000_000 ether, 0, bob);

        vm.prank(bob);
        vm.expectRevert("team stake too low");
        staking.claimMilestone(1);
    }

    function testClaimMultipleMilestones() public {
        // Give Bob 80M teamStake to qualify for milestones 1 and 2
        vm.prank(alice);
        staking.stake(80_000_000 ether, 0, bob);

        uint256[] memory ids = new uint256[](2);
        ids[0] = 1;
        ids[1] = 2;

        uint256 bobBefore = token.balanceOf(bob);
        vm.prank(bob);
        staking.claimMultipleMilestones(ids);

        uint256 totalReward = 50_000 ether + 100_000 ether;
        assertEq(token.balanceOf(bob) - bobBefore, totalReward, "bob gets both milestones");
        assertTrue(staking.milestoneClaimed(bob, 1));
        assertTrue(staking.milestoneClaimed(bob, 2));
    }

    function testPendingMilestonesView() public {
        vm.prank(alice);
        staking.stake(130_000_000 ether, 0, bob);

        uint256[] memory pending = staking.pendingMilestones(bob);
        assertEq(pending.length, 3, "should have milestones 1, 2, 3 pending");
        assertEq(pending[0], 1);
        assertEq(pending[1], 2);
        assertEq(pending[2], 3);

        // Claim milestone 1, pending should now be 2 and 3
        vm.prank(bob);
        staking.claimMilestone(1);

        pending = staking.pendingMilestones(bob);
        assertEq(pending.length, 2);
        assertEq(pending[0], 2);
        assertEq(pending[1], 3);
    }

    function testMilestoneClipsByReserve() public {
        // Deploy with tiny rank reserve
        RWANSecureStakingV5 s2 = new RWANSecureStakingV5(
            address(token), address(token), admin, 100 ether, 20
        );
        s2.addStakePlan(0, 3, 0, true);

        token.approve(address(s2), type(uint256).max);
        s2.fundStakingRewards(1_000_000 ether);
        s2.fundRankRewards(10_000 ether); // Less than milestone reward

        s2.setMilestone(1, 40_000_000 ether, 50_000 ether, true);

        vm.prank(alice);
        token.approve(address(s2), type(uint256).max);
        vm.prank(alice);
        s2.stake(50_000_000 ether, 0, bob);

        vm.prank(bob);
        vm.expectRevert("rank reserve low");
        s2.claimMilestone(1);
    }

    function testDisabledMilestoneCannotBeClaimed() public {
        staking.setMilestone(1, 40_000_000 ether, 50_000 ether, false);

        vm.prank(alice);
        staking.stake(50_000_000 ether, 0, bob);

        vm.prank(bob);
        vm.expectRevert("milestone disabled");
        staking.claimMilestone(1);
    }

    function testMilestonesPausedBlocksClaims() public {
        vm.prank(alice);
        staking.stake(50_000_000 ether, 0, bob);

        staking.setPauseFlags(false, false, false, false, true);

        vm.prank(bob);
        vm.expectRevert("milestones paused");
        staking.claimMilestone(1);
    }

    function testMilestonesMustBeAddedSequentially() public {
        vm.expectRevert("must add sequentially");
        staking.setMilestone(15, 5_000_000_000 ether, 10_000_000 ether, true);
    }

    function testAdminCanUpdateExistingMilestone() public {
        staking.setMilestone(1, 50_000_000 ether, 75_000 ether, true);

        (uint256 teamReq, uint256 reward, bool enabled) = staking.milestones(1);
        assertEq(teamReq, 50_000_000 ether);
        assertEq(reward, 75_000 ether);
        assertTrue(enabled);
    }

    function testTeamStakeDecreasesOnWithdrawAffectsMilestones() public {
        vm.prank(alice);
        staking.stake(50_000_000 ether, 0, bob);

        // Bob qualifies for milestone 1
        uint256[] memory pending = staking.pendingMilestones(bob);
        assertEq(pending.length, 1);

        // Alice withdraws
        vm.prank(alice);
        staking.withdraw(1);

        // Bob no longer qualifies
        pending = staking.pendingMilestones(bob);
        assertEq(pending.length, 0);

        vm.prank(bob);
        vm.expectRevert("team stake too low");
        staking.claimMilestone(1);
    }

    function testClaimedMilestoneNotAffectedByTeamStakeDrop() public {
        vm.prank(alice);
        staking.stake(50_000_000 ether, 0, bob);

        // Claim while qualified
        vm.prank(bob);
        staking.claimMilestone(1);
        assertTrue(staking.milestoneClaimed(bob, 1));

        // Alice withdraws, teamStake drops
        vm.prank(alice);
        staking.withdraw(1);
        assertEq(staking.teamStake(bob), 0);

        // Milestone stays claimed (one-time, irreversible)
        assertTrue(staking.milestoneClaimed(bob, 1));
    }

    // ═══════════════════════════════════════════════════════════════
    //                    2% REFERRAL TESTS
    // ═══════════════════════════════════════════════════════════════

    function testDirectReferrerGets2Percent() public {
        vm.prank(alice);
        staking.stake(100_000 ether, 0, bob);

        vm.warp(block.timestamp + 1 days);

        uint256 bobBefore = token.balanceOf(bob);
        vm.prank(alice);
        staking.claim(1);

        // Alice reward: 100k * 3/10000 = 30 RWAAN. Bob: 2% of 30 = 0.6
        assertEq(token.balanceOf(bob) - bobBefore, 0.6 ether);
    }

    function testNoL2Payout() public {
        vm.prank(bob);
        staking.stake(1_000 ether, 0, carol);

        vm.prank(alice);
        staking.stake(100_000 ether, 0, bob);

        vm.warp(block.timestamp + 1 days);

        uint256 carolBefore = token.balanceOf(carol);
        vm.prank(alice);
        staking.claim(2);

        assertEq(token.balanceOf(carol) - carolBefore, 0, "no L2 payout");
    }

    // ═══════════════════════════════════════════════════════════════
    //                    STAKING CORE TESTS
    // ═══════════════════════════════════════════════════════════════

    function testStakeAndClaimRewards() public {
        vm.prank(alice);
        staking.stake(1_000_000 ether, 0, address(0));

        vm.warp(block.timestamp + 1 days);

        uint256 before = token.balanceOf(alice);
        vm.prank(alice);
        staking.claim(1);

        // 1M * 3 bps = 300 RWAAN/day
        assertEq(token.balanceOf(alice) - before, 300 ether);
    }

    function testEarlyWithdrawPenalty() public {
        vm.prank(alice);
        staking.stake(100_000 ether, 1, address(0)); // 30-day plan, 35% penalty

        vm.warp(block.timestamp + 10 days);

        uint256 before = token.balanceOf(alice);
        vm.prank(alice);
        staking.withdrawEarly(1);

        uint256 returned = token.balanceOf(alice) - before;
        uint256 expectedPrincipal = 65_000 ether; // 100k - 35%
        uint256 expectedReward = 100_000 ether * 7 * 10 / 10_000; // 10 days * 7 bps
        assertEq(returned, expectedPrincipal + expectedReward);
    }

    function testEmissionCapThrottlesRewards() public {
        // Set very low emission cap
        staking.setMaxDailyStakingEmission(100 ether);

        vm.prank(alice);
        staking.stake(100_000_000 ether, 0, address(0));

        vm.warp(block.timestamp + 1 days);

        uint256 before = token.balanceOf(alice);
        vm.prank(alice);
        staking.claim(1);

        // Uncapped reward: 100M * 3/10000 = 30000. But cap = 100.
        assertEq(token.balanceOf(alice) - before, 100 ether);
    }

    function testPenaltyRecyclesToStakingReserve() public {
        uint256 reserveBefore = staking.stakingRewardReserve();

        vm.prank(alice);
        staking.stake(100_000 ether, 1, address(0));

        vm.prank(alice);
        staking.withdrawEarly(1);

        uint256 penalty = 35_000 ether; // 35% of 100k
        // Reserve should increase by penalty (minus any claimed rewards)
        assertGt(staking.stakingRewardReserve(), reserveBefore);
    }

    // ═══════════════════════════════════════════════════════════════
    //                COMBINED FLOW: REFERRAL + MILESTONES
    // ═══════════════════════════════════════════════════════════════

    function testFullFlow() public {
        // Bob builds a team: Alice stakes 50M, Carol stakes 40M
        vm.prank(alice);
        staking.stake(50_000_000 ether, 0, bob);
        vm.prank(carol);
        staking.stake(40_000_000 ether, 0, bob);

        // Bob's teamStake = 90M → qualifies for milestones 1 (40M) and 2 (80M)
        assertEq(staking.teamStake(bob), 90_000_000 ether);

        uint256[] memory pending = staking.pendingMilestones(bob);
        assertEq(pending.length, 2);

        // Bob claims both milestones
        uint256[] memory ids = new uint256[](2);
        ids[0] = 1;
        ids[1] = 2;
        uint256 bobBefore = token.balanceOf(bob);
        vm.prank(bob);
        staking.claimMultipleMilestones(ids);
        assertEq(token.balanceOf(bob) - bobBefore, 150_000 ether); // 50k + 100k

        // 1 day passes, Alice claims staking rewards
        vm.warp(block.timestamp + 1 days);
        bobBefore = token.balanceOf(bob);
        vm.prank(alice);
        staking.claim(1);

        // Bob gets 2% of Alice's reward (50M * 3bps = 15000; 2% = 300)
        assertEq(token.balanceOf(bob) - bobBefore, 300 ether);
    }
}
