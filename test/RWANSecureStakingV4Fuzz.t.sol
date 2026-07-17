// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/MockERC20.sol";
import "../contracts/RWANSecureStakingV4.sol";

contract RWANSecureStakingV4FuzzTest is Test {
    MockERC20 public token;
    RWANSecureStakingV4 public staking;

    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);

    function setUp() public {
        token = new MockERC20("RWAN", "RWAN", 1_000_000_000 ether);
        staking = new RWANSecureStakingV4(
            address(token),
            address(token),
            address(this),
            1 ether,
            0
        );

        staking.addStakePlan(0, 10, 0, true);
        staking.addStakePlan(30 days, 20, 3500, true);

        assertTrue(token.transfer(alice, 100_000_000 ether));
        assertTrue(token.transfer(bob, 100_000_000 ether));

        vm.prank(alice);
        token.approve(address(staking), type(uint256).max);
        vm.prank(bob);
        token.approve(address(staking), type(uint256).max);

        token.approve(address(staking), type(uint256).max);
    }

    function testFuzz_RewardMatchesDailyRate(
        uint256 amount,
        uint32 dailyRateBps,
        uint256 elapsed
    ) public {
        amount = bound(amount, 1 ether, 1_000_000 ether);
        dailyRateBps = uint32(bound(dailyRateBps, 0, staking.MAX_DAILY_RATE_BPS()));
        elapsed = bound(elapsed, 1, 365 days);

        staking.addStakePlan(0, dailyRateBps, 0, true);
        staking.fundStakingRewards(10_000_000 ether);

        vm.prank(alice);
        staking.stake(amount, 2, address(0));

        vm.warp(block.timestamp + elapsed);

        uint256 expected = (amount * dailyRateBps * elapsed) / (1 days * staking.BPS_DENOMINATOR());
        assertEq(staking.pendingRewards(1), expected);

        uint256 beforeBalance = token.balanceOf(alice);
        vm.prank(alice);
        staking.claim(1);
        assertEq(token.balanceOf(alice) - beforeBalance, expected);
    }

    function testFuzz_RewardClipsToReserve(
        uint256 amount,
        uint256 reserve,
        uint256 elapsed
    ) public {
        amount = bound(amount, 1 ether, 1_000_000 ether);
        reserve = bound(reserve, 1, 100 ether);
        elapsed = bound(elapsed, 1 days, 365 days);

        staking.fundStakingRewards(reserve);

        vm.prank(alice);
        staking.stake(amount, 1, address(0)); // 0.2% daily

        vm.warp(block.timestamp + elapsed);
        uint256 rawReward = (amount * 20 * elapsed) / (1 days * staking.BPS_DENOMINATOR());
        uint256 expected = rawReward > reserve ? reserve : rawReward;

        uint256 beforeBalance = token.balanceOf(alice);
        vm.prank(alice);
        staking.claim(1);

        assertEq(token.balanceOf(alice) - beforeBalance, expected);
        assertEq(staking.stakingRewardReserve(), reserve - expected);
    }

    function testFuzz_EmissionCapNeverPaysMoreThanAvailable(
        uint256 amount,
        uint256 dailyCap,
        uint256 elapsed
    ) public {
        amount = bound(amount, 1_000 ether, 1_000_000 ether);
        dailyCap = bound(dailyCap, 1, 1_000 ether);
        elapsed = bound(elapsed, 1, 2 days);

        staking.fundStakingRewards(1_000_000 ether);
        staking.setMaxDailyStakingEmission(dailyCap);

        vm.prank(alice);
        staking.stake(amount, 1, address(0));

        vm.warp(block.timestamp + elapsed);

        uint256 rawReward = (amount * 20 * elapsed) / (1 days * staking.BPS_DENOMINATOR());
        uint256 available = (dailyCap * elapsed) / 1 days;
        if (available > dailyCap) available = dailyCap;
        uint256 expected = rawReward > available ? available : rawReward;

        uint256 beforeBalance = token.balanceOf(alice);
        vm.prank(alice);
        staking.claim(1);

        assertEq(token.balanceOf(alice) - beforeBalance, expected);
        assertLe(staking.stakingEmissionAvailable(), dailyCap);
    }

    function testFuzz_EarlyWithdrawPenalty(
        uint256 amount,
        uint32 penaltyBps,
        uint256 elapsed
    ) public {
        amount = bound(amount, 1 ether, 1_000_000 ether);
        penaltyBps = uint32(bound(penaltyBps, 0, staking.BPS_DENOMINATOR()));
        elapsed = bound(elapsed, 0, 29 days);

        staking.addStakePlan(30 days, 0, penaltyBps, true);

        vm.prank(alice);
        staking.stake(amount, 2, address(0));

        vm.warp(block.timestamp + elapsed);

        uint256 penalty = (amount * penaltyBps) / staking.BPS_DENOMINATOR();
        uint256 expectedReturned = amount - penalty;
        uint256 beforeBalance = token.balanceOf(alice);

        vm.prank(alice);
        staking.withdrawEarly(1);

        assertEq(token.balanceOf(alice) - beforeBalance, expectedReturned);
        assertEq(staking.stakingRewardReserve(), penalty);
        assertEq(staking.totalStaked(), 0);
    }

    function testFuzz_AffiliatePayoutClipsToReserve(
        uint256 amount,
        uint32 levelBps,
        uint256 affiliateReserve
    ) public {
        amount = bound(amount, 1 ether, 1_000_000 ether);
        levelBps = uint32(bound(levelBps, 0, staking.BPS_DENOMINATOR()));
        affiliateReserve = bound(affiliateReserve, 0, 1_000 ether);

        uint32[] memory levels = new uint32[](1);
        levels[0] = levelBps;
        staking.setAffiliateLevels(levels, 1);
        staking.fundStakingRewards(1_000_000 ether);
        if (affiliateReserve > 0) {
            staking.fundAffiliateRewards(affiliateReserve);
        }

        vm.prank(bob);
        staking.stake(1 ether, 0, address(0));

        vm.prank(alice);
        staking.stake(amount, 0, bob);

        vm.warp(block.timestamp + 1 days);

        uint256 baseReward = (amount * 10) / staking.BPS_DENOMINATOR();
        uint256 rawAffiliate = (baseReward * levelBps) / staking.BPS_DENOMINATOR();
        uint256 expected = rawAffiliate > affiliateReserve ? affiliateReserve : rawAffiliate;

        uint256 bobBefore = token.balanceOf(bob);
        vm.prank(alice);
        staking.claim(2);

        assertEq(token.balanceOf(bob) - bobBefore, expected);
    }
}
