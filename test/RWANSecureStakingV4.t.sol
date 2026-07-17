// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/MockERC20.sol";
import "../contracts/RWANSecureStakingV4.sol";

contract RWANSecureStakingV4Test is Test {
    MockERC20 public token;
    RWANSecureStakingV4 public staking;

    address public admin = address(this);
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);

    uint256 public constant USER_BALANCE = 100_000 ether;

    function setUp() public {
        token = new MockERC20("RWAN", "RWAN", 1_000_000_000 ether);
        staking = new RWANSecureStakingV4(address(token), address(token), admin, 100 ether, 10);

        staking.addStakePlan(0, 10, 0, true); // 0.1% daily flexible
        staking.addStakePlan(30 days, 20, 3500, true); // 0.2% daily locked, 35% early penalty

        assertTrue(token.transfer(alice, USER_BALANCE));
        assertTrue(token.transfer(bob, USER_BALANCE));

        vm.prank(alice);
        token.approve(address(staking), type(uint256).max);

        vm.prank(bob);
        token.approve(address(staking), type(uint256).max);

        token.approve(address(staking), type(uint256).max);
    }

    function testClaimPaysReserveBackedDailyReward() public {
        staking.fundStakingRewards(100 ether);

        vm.prank(alice);
        staking.stake(1_000 ether, 0, address(0));

        vm.warp(block.timestamp + 1 days);

        uint256 beforeBalance = token.balanceOf(alice);

        vm.prank(alice);
        staking.claim(1);

        assertEq(token.balanceOf(alice) - beforeBalance, 1 ether);
        assertEq(staking.stakingRewardReserve(), 99 ether);
    }

    function testAffiliateRewardIsPaidFromAffiliateReserveAndClipped() public {
        uint32[] memory levels = new uint32[](1);
        levels[0] = 2000; // 20% of claimed staking reward
        staking.setAffiliateLevels(levels, 1);
        staking.fundStakingRewards(100 ether);
        staking.fundAffiliateRewards(0.1 ether);

        vm.prank(alice);
        staking.stake(1_000 ether, 0, bob);

        vm.warp(block.timestamp + 1 days);

        uint256 bobBefore = token.balanceOf(bob);

        vm.prank(alice);
        staking.claim(1);

        assertEq(token.balanceOf(bob) - bobBefore, 0.1 ether);
        assertEq(staking.affiliateRewardReserve(), 0);
    }

    function testReferenceAffiliateScheduleUsesRwanRatesAndRemainsFlexible() public {
        uint32[] memory levels = new uint32[](20);
        levels[0] = 2_500;
        levels[1] = 2_000;
        levels[2] = 2_000;
        levels[3] = 1_500;
        levels[4] = 1_500;
        levels[5] = 1_500;
        for (uint256 i = 6; i < 10; i++) {
            levels[i] = 1_000;
        }
        for (uint256 i = 10; i < 15; i++) {
            levels[i] = 500;
        }
        for (uint256 i = 15; i < 20; i++) {
            levels[i] = 200;
        }

        staking.setMaxAffiliateTotalBps(18_500);
        staking.setAffiliateLevels(levels, 20);

        assertEq(staking.affiliateLevelBps(0), 2_500);
        assertEq(staking.affiliateLevelBps(1), 2_000);
        assertEq(staking.affiliateLevelBps(9), 1_000);
        assertEq(staking.affiliateLevelBps(14), 500);
        assertEq(staking.affiliateLevelBps(19), 200);
        assertEq(staking.maxAffiliateDepth(), 20);
        assertEq(staking.maxAffiliateTotalBps(), 18_500);

        levels[0] = 2_000;
        staking.setAffiliateLevels(levels, 20);
        assertEq(staking.affiliateLevelBps(0), 2_000);
    }

    function testSameTokenSurplusRecoveryCannotTouchProtectedBalance() public {
        staking.fundStakingRewards(100 ether);

        vm.prank(alice);
        staking.stake(1_000 ether, 0, address(0));

        assertEq(staking.surplusTokenBalance(address(token)), 0);
        vm.expectRevert("exceeds surplus");
        staking.recoverSurplusERC20(address(token), admin, 1);

        token.mint(address(staking), 5 ether);
        assertEq(staking.surplusTokenBalance(address(token)), 5 ether);

        uint256 beforeBalance = token.balanceOf(admin);
        staking.recoverSurplusERC20(address(token), admin, 5 ether);
        assertEq(token.balanceOf(admin) - beforeBalance, 5 ether);
    }

    function testEarlyPenaltyRefillsStakingReserveWhenTokenIsShared() public {
        vm.prank(alice);
        staking.stake(1_000 ether, 1, address(0));

        uint256 beforeBalance = token.balanceOf(alice);

        vm.prank(alice);
        staking.withdrawEarly(1);

        assertEq(token.balanceOf(alice) - beforeBalance, 650 ether);
        assertEq(staking.stakingRewardReserve(), 350 ether);
        assertEq(staking.totalStaked(), 0);
    }

    function testRankRewardsShareDailyBudgetByWeight() public {
        staking.fundRankRewards(10 ether);
        staking.setRankConfig(1, 0, 0, 10_000, true);
        staking.setDailyRankBudget(1 ether);

        vm.prank(alice);
        staking.stake(1_000 ether, 0, address(0));

        staking.setUserRank(alice, 1);
        vm.warp(block.timestamp + 1 days);

        uint256 beforeBalance = token.balanceOf(alice);

        vm.prank(alice);
        staking.claimRankReward();

        assertEq(token.balanceOf(alice) - beforeBalance, 1 ether);
        assertEq(staking.rankRewardReserve(), 9 ether);
    }
}
