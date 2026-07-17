// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/MockERC20.sol";
import "../contracts/RWANSecureStakingV4.sol";

contract RWANSecureStakingV4AggressiveTest is Test {
    MockERC20 public stakeToken;
    MockERC20 public rewardToken;
    RWANSecureStakingV4 public staking;

    address public admin = address(this);
    address public treasury = address(0x777);
    address public attacker = address(0xBAD);
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    address public carol = address(0xCA001);
    address public dave = address(0xDA4E);
    address public erin = address(0xE1E);

    uint256 public constant USER_BALANCE = 1_000_000 ether;

    function setUp() public {
        stakeToken = new MockERC20("RWAN Stake", "sRWAN", 1_000_000_000 ether);
        rewardToken = new MockERC20("RWAN Reward", "rRWAN", 1_000_000_000 ether);
        staking = new RWANSecureStakingV4(
            address(stakeToken),
            address(rewardToken),
            admin,
            100 ether,
            3
        );

        staking.addStakePlan(0, 10, 0, true);
        staking.addStakePlan(30 days, 20, 3500, true);
        staking.addStakePlan(90 days, 30, 3500, true);

        address[5] memory users = [alice, bob, carol, dave, erin];
        for (uint256 i = 0; i < users.length; i++) {
            assertTrue(stakeToken.transfer(users[i], USER_BALANCE));
            vm.prank(users[i]);
            stakeToken.approve(address(staking), type(uint256).max);
        }

        rewardToken.approve(address(staking), type(uint256).max);
        staking.fundStakingRewards(1_000_000 ether);
        staking.fundAffiliateRewards(1_000_000 ether);
        staking.fundRankRewards(1_000_000 ether);
    }

    function testOnlyRolesCanChangeCriticalConfig() public {
        vm.startPrank(attacker);
        vm.expectRevert();
        staking.addStakePlan(120 days, 40, 3500, true);
        vm.expectRevert();
        staking.setDailyRankBudget(1 ether);
        vm.expectRevert();
        staking.setPauseFlags(true, false, false, false, false);
        vm.expectRevert();
        staking.withdrawStakingRewardReserve(attacker, 1 ether);
        vm.stopPrank();

        staking.grantRole(staking.TREASURY_ROLE(), treasury);
        vm.prank(treasury);
        staking.withdrawAffiliateRewardReserve(treasury, 1 ether);
        assertEq(rewardToken.balanceOf(treasury), 1 ether);
    }

    function testPlanConfigBoundsAndDisable() public {
        vm.expectRevert("daily rate too high");
        staking.addStakePlan(120 days, 101, 0, true);

        vm.expectRevert("penalty too high");
        staking.addStakePlan(120 days, 40, 10_001, true);

        staking.updateStakePlan(1, 20, 3500, false);
        vm.prank(alice);
        vm.expectRevert("plan disabled");
        staking.stake(1_000 ether, 1, address(0));

        staking.updateStakePlan(1, 25, 2500, true);
        vm.prank(alice);
        staking.stake(1_000 ether, 1, address(0));

        (,,,,, uint32 planId,,) = staking.positions(1);
        assertEq(planId, 1);
    }

    function testOwnerCanUpdateFuturePlanDurationWithoutRewritingExistingPosition() public {
        vm.prank(alice);
        staking.stake(1_000 ether, 1, address(0));

        (, , , uint64 originalUnlockTime, , , , ) = staking.positions(1);

        staking.setStakePlanDuration(1, 120 days);

        (, , , uint64 unchangedUnlockTime, , , , ) = staking.positions(1);
        assertEq(unchangedUnlockTime, originalUnlockTime);

        vm.prank(alice);
        staking.stake(1_000 ether, 1, address(0));
        (, , , uint64 newUnlockTime, , , , ) = staking.positions(2);
        assertEq(newUnlockTime, uint64(block.timestamp + 120 days));
    }

    function testOnlyParameterRoleCanChangeAffiliateAggregateCap() public {
        vm.prank(attacker);
        vm.expectRevert();
        staking.setMaxAffiliateTotalBps(5_000);

        staking.setMaxAffiliateTotalBps(5_000);
        assertEq(staking.maxAffiliateTotalBps(), 5_000);

        uint32[] memory levels = new uint32[](2);
        levels[0] = 3_000;
        levels[1] = 2_000;
        staking.setAffiliateLevels(levels, 2);

        vm.expectRevert("affiliate bps too high");
        levels[1] = 2_001;
        staking.setAffiliateLevels(levels, 2);
    }

    function test720DayMarketplaceBenefitIsReservedAndClaimedOnce() public {
        uint256 planId = staking.addStakePlan(720 days, 80, 3500, true);
        staking.setMarketplaceBenefit(planId, 1_000 ether, 5, 1_000, true, true, true);

        vm.prank(attacker);
        vm.expectRevert();
        staking.setMarketplaceBenefit(planId, 0, 0, 0, false, false, false);

        vm.prank(alice);
        vm.expectRevert("marketplace reserve low");
        staking.stake(1_000 ether, planId, address(0));

        rewardToken.approve(address(staking), type(uint256).max);
        staking.fundMarketplaceRewards(100 ether);

        vm.prank(alice);
        staking.stake(1_000 ether, planId, address(0));

        assertEq(staking.marketplaceCreditForPosition(1), 100 ether);
        assertEq(staking.marketplaceCreditAllocated(), 100 ether);
        assertTrue(staking.marketplaceVipEligible(1));
        assertFalse(staking.marketplaceCreditClaimable(1));

        vm.prank(alice);
        vm.expectRevert("credit locked");
        staking.claimMarketplaceCredit(1);

        vm.warp(block.timestamp + 720 days);
        assertTrue(staking.marketplaceCreditClaimable(1));

        uint256 beforeBalance = rewardToken.balanceOf(alice);
        vm.prank(alice);
        staking.claimMarketplaceCredit(1);
        assertEq(rewardToken.balanceOf(alice) - beforeBalance, 100 ether);
        assertEq(staking.marketplaceCreditAllocated(), 0);

        uint256 afterFirstClaim = rewardToken.balanceOf(alice);
        vm.prank(alice);
        staking.claimMarketplaceCredit(1);
        assertEq(rewardToken.balanceOf(alice), afterFirstClaim);
    }

    function test720DayBonusRateIsSnapshottedForExistingPositions() public {
        uint256 planId = staking.addStakePlan(720 days, 80, 3500, true);
        staking.setMarketplaceBenefit(planId, 1_000 ether, 5, 0, true, true, true);
        staking.fundMarketplaceRewards(1 ether);
        staking.fundStakingRewards(100 ether);

        vm.prank(alice);
        staking.stake(1_000 ether, planId, address(0));

        staking.setMarketplaceBenefit(planId, 1_000 ether, 0, 0, true, false, true);
        vm.warp(block.timestamp + 1 days);

        vm.prank(alice);
        staking.claim(1);
        (,,,,,, uint256 rewardClaimed, ) = staking.positions(1);
        assertEq(rewardClaimed, 8.5 ether);
    }

    function testEarlyExitReleasesUnclaimedMarketplaceCredit() public {
        uint256 planId = staking.addStakePlan(720 days, 80, 3500, true);
        staking.setMarketplaceBenefit(planId, 1_000 ether, 5, 1_000, true, true, true);
        staking.fundMarketplaceRewards(100 ether);

        vm.prank(alice);
        staking.stake(1_000 ether, planId, address(0));
        assertEq(staking.marketplaceCreditAllocated(), 100 ether);

        vm.prank(alice);
        staking.withdrawEarly(1);
        assertEq(staking.marketplaceCreditAllocated(), 0);
        assertEq(staking.marketplaceCreditReserve(), 100 ether);
        assertFalse(staking.marketplaceCreditClaimable(1));
    }

    function testMinStakeAndMaxPositionsAreEnforcedAfterUpdate() public {
        staking.setMinStakeAmount(500 ether);

        vm.prank(alice);
        vm.expectRevert("amount too low");
        staking.stake(499 ether, 0, address(0));

        staking.setMaxPositionsPerUser(1);

        vm.prank(alice);
        staking.stake(500 ether, 0, address(0));

        vm.prank(alice);
        vm.expectRevert("positions limit");
        staking.stake(500 ether, 0, address(0));
    }

    function testPauseFlagsIndependentlyGateFlows() public {
        staking.setPauseFlags(true, false, false, false, false);
        vm.prank(alice);
        vm.expectRevert("staking paused");
        staking.stake(1_000 ether, 0, address(0));

        staking.setPauseFlags(false, true, false, false, false);
        vm.prank(alice);
        staking.stake(1_000 ether, 0, address(0));

        vm.warp(block.timestamp + 1 days);
        vm.prank(alice);
        vm.expectRevert("claims paused");
        staking.claim(1);

        uint256 beforeBalance = stakeToken.balanceOf(alice);
        vm.prank(alice);
        staking.withdraw(1);
        assertEq(stakeToken.balanceOf(alice) - beforeBalance, 1_000 ether);

        staking.setPauseFlags(false, false, true, false, false);
        vm.prank(bob);
        staking.stake(1_000 ether, 0, address(0));

        vm.prank(bob);
        vm.expectRevert("withdrawals paused");
        staking.withdraw(2);

        vm.prank(bob);
        staking.emergencyWithdraw(2);
    }

    function testGlobalPauseBlocksNormalFlowsButAllowsEmergencyWithdraw() public {
        vm.prank(alice);
        staking.stake(1_000 ether, 0, address(0));

        staking.pause();

        vm.prank(alice);
        vm.expectRevert();
        staking.claim(1);

        uint256 beforeBalance = stakeToken.balanceOf(alice);
        vm.prank(alice);
        staking.emergencyWithdraw(1);
        assertEq(stakeToken.balanceOf(alice) - beforeBalance, 1_000 ether);
    }

    function testDailyEmissionCapClipsAndRefills() public {
        staking.setMaxDailyStakingEmission(1 ether);

        vm.prank(alice);
        staking.stake(10_000 ether, 0, address(0)); // 10 RWAN/day at 0.1%

        vm.warp(block.timestamp + 1 days);
        uint256 beforeBalance = rewardToken.balanceOf(alice);

        vm.prank(alice);
        staking.claim(1);

        assertEq(rewardToken.balanceOf(alice) - beforeBalance, 1 ether);
        assertEq(staking.stakingEmissionAvailable(), 0);

        vm.warp(block.timestamp + 12 hours);
        beforeBalance = rewardToken.balanceOf(alice);

        vm.prank(alice);
        staking.claim(1);

        assertEq(rewardToken.balanceOf(alice) - beforeBalance, 0.5 ether);
    }

    function testAffiliateMultiLevelPayoutsAndTeamStakeAccounting() public {
        uint32[] memory levels = new uint32[](3);
        levels[0] = 2000;
        levels[1] = 1500;
        levels[2] = 500;
        staking.setAffiliateLevels(levels, 3);
        staking.setMinReferralStake(100 ether);

        vm.prank(dave);
        staking.stake(1_000 ether, 0, address(0));
        vm.prank(bob);
        staking.stake(1_000 ether, 0, carol);
        vm.prank(carol);
        staking.stake(1_000 ether, 0, dave);
        vm.prank(alice);
        staking.stake(10_000 ether, 0, bob);

        assertEq(staking.teamStake(bob), 10_000 ether);
        assertEq(staking.teamStake(carol), 11_000 ether);
        assertEq(staking.teamStake(dave), 11_000 ether);

        vm.warp(block.timestamp + 1 days);

        uint256 bobBefore = rewardToken.balanceOf(bob);
        uint256 carolBefore = rewardToken.balanceOf(carol);
        uint256 daveBefore = rewardToken.balanceOf(dave);

        vm.prank(alice);
        staking.claim(4); // 10 RWAN base reward

        assertEq(rewardToken.balanceOf(bob) - bobBefore, 2 ether);
        assertEq(rewardToken.balanceOf(carol) - carolBefore, 1.5 ether);
        assertEq(rewardToken.balanceOf(dave) - daveBefore, 0.5 ether);

        vm.prank(alice);
        staking.withdraw(4);

        assertEq(staking.teamStake(bob), 0);
        assertEq(staking.teamStake(carol), 1_000 ether);
        assertEq(staking.teamStake(dave), 1_000 ether);
    }

    function testAffiliateConfigBoundsAndReferralCycleProtection() public {
        uint32[] memory tooManyLevels = new uint32[](21);
        vm.expectRevert("too many levels");
        staking.setAffiliateLevels(tooManyLevels, 20);

        uint32[] memory tooMuchBps = new uint32[](20);
        for (uint256 i = 0; i < tooMuchBps.length; i++) {
            tooMuchBps[i] = 1001;
        }
        vm.expectRevert("affiliate bps too high");
        staking.setAffiliateLevels(tooMuchBps, 20);

        vm.prank(alice);
        staking.stake(1_000 ether, 0, bob);

        vm.prank(bob);
        vm.expectRevert("referral cycle");
        staking.stake(1_000 ether, 0, alice);

        vm.prank(alice);
        vm.expectRevert("referrer set");
        staking.stake(1_000 ether, 0, carol);
    }

    function testRankRewardsSplitByWeightAndReserveClipped() public {
        staking.setRankConfig(1, 0, 0, 10_000, true);
        staking.setRankConfig(2, 0, 0, 30_000, true);
        staking.setDailyRankBudget(4 ether);

        vm.prank(alice);
        staking.stake(1_000 ether, 0, address(0));
        vm.prank(bob);
        staking.stake(1_000 ether, 0, address(0));

        staking.setUserRank(alice, 1);
        staking.setUserRank(bob, 2);

        vm.warp(block.timestamp + 1 days);

        uint256 aliceBefore = rewardToken.balanceOf(alice);
        uint256 bobBefore = rewardToken.balanceOf(bob);

        vm.prank(alice);
        staking.claimRankReward();
        vm.prank(bob);
        staking.claimRankReward();

        assertEq(rewardToken.balanceOf(alice) - aliceBefore, 1 ether);
        assertEq(rewardToken.balanceOf(bob) - bobBefore, 3 ether);

        staking.withdrawRankRewardReserve(admin, staking.rankRewardReserve());
        staking.fundRankRewards(1 ether);

        vm.warp(block.timestamp + 1 days);
        aliceBefore = rewardToken.balanceOf(alice);
        bobBefore = rewardToken.balanceOf(bob);

        vm.prank(alice);
        staking.claimRankReward();
        vm.prank(bob);
        staking.claimRankReward();

        assertEq(rewardToken.balanceOf(alice) - aliceBefore, 0.25 ether);
        assertEq(rewardToken.balanceOf(bob) - bobBefore, 0.75 ether);
    }

    function testRankEligibilityAndRankCap() public {
        vm.expectRevert("rank too high");
        staking.setRankConfig(33, 0, 0, 1, true);

        staking.setRankConfig(1, 2_000 ether, 0, 10_000, true);
        vm.prank(alice);
        staking.stake(1_000 ether, 0, address(0));

        vm.expectRevert("personal stake low");
        staking.setUserRank(alice, 1);

        staking.setRankConfig(2, 0, 2_000 ether, 10_000, true);
        vm.expectRevert("team stake low");
        staking.setUserRank(alice, 2);
    }

    function testReserveWithdrawalsAndSurplusProtectionWithDifferentTokens() public {
        uint256 adminRewardBefore = rewardToken.balanceOf(admin);
        staking.withdrawStakingRewardReserve(admin, 10 ether);
        staking.withdrawAffiliateRewardReserve(admin, 20 ether);
        staking.withdrawRankRewardReserve(admin, 30 ether);
        assertEq(rewardToken.balanceOf(admin) - adminRewardBefore, 60 ether);

        vm.expectRevert("staking reserve low");
        staking.withdrawStakingRewardReserve(admin, type(uint256).max);

        vm.prank(alice);
        staking.stake(1_000 ether, 1, address(0));

        assertEq(staking.surplusTokenBalance(address(stakeToken)), 0);
        vm.expectRevert("exceeds surplus");
        staking.recoverSurplusERC20(address(stakeToken), admin, 1);

        uint256 aliceBefore = stakeToken.balanceOf(alice);
        vm.prank(alice);
        staking.withdrawEarly(1);
        assertEq(stakeToken.balanceOf(alice) - aliceBefore, 650 ether);

        assertEq(staking.stakingRewardReserve(), 999_990 ether);
        assertEq(staking.surplusTokenBalance(address(stakeToken)), 350 ether);

        uint256 adminStakeBefore = stakeToken.balanceOf(admin);
        staking.recoverSurplusERC20(address(stakeToken), admin, 350 ether);
        assertEq(stakeToken.balanceOf(admin) - adminStakeBefore, 350 ether);
    }

    function testFundingRejectsZeroAmounts() public {
        vm.expectRevert("amount zero");
        staking.fundStakingRewards(0);
        vm.expectRevert("amount zero");
        staking.fundAffiliateRewards(0);
        vm.expectRevert("amount zero");
        staking.fundRankRewards(0);
    }
}
