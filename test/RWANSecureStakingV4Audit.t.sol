// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/MockERC20.sol";
import "../contracts/RWANSecureStakingV4.sol";

/// @notice Proof-of-concept tests backing the flexibility/security audit.
contract RWANSecureStakingV4AuditTest is Test {
    MockERC20 public token;
    RWANSecureStakingV4 public staking;

    address public admin = address(this);
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);

    function _fresh() internal {
        token = new MockERC20("RWAN", "RWAN", 1_000_000_000 ether);
        staking = new RWANSecureStakingV4(address(token), address(token), admin, 100 ether, 10);
        staking.addStakePlan(0, 10, 0, true); // 0.1%/day flexible

        token.transfer(alice, 1_000_000 ether);
        token.transfer(bob, 1_000_000 ether);
        vm.prank(alice);
        token.approve(address(staking), type(uint256).max);
        vm.prank(bob);
        token.approve(address(staking), type(uint256).max);
        token.approve(address(staking), type(uint256).max);
    }

    function testRewardDebtIsPreservedWhenReserveIsEmpty() public {
        _fresh();
        // Reserve intentionally NOT funded yet.
        vm.prank(alice);
        staking.stake(10_000 ether, 0, address(0));

        // 10 days accrue while reserve is empty.
        vm.warp(block.timestamp + 10 days);
        uint256 owed = staking.pendingRewards(1);
        assertGt(owed, 0, "should have accrued");

        // User receives nothing yet, but the accrued amount remains debt.
        vm.prank(alice);
        staking.claim(1);
        assertEq(staking.pendingRewards(1), owed);

        staking.fundStakingRewards(1_000 ether);
        uint256 balanceBefore = token.balanceOf(alice);
        vm.prank(alice);
        staking.claim(1);

        assertEq(token.balanceOf(alice) - balanceBefore, owed);
        assertEq(staking.pendingRewards(1), 0);
    }

    function testRewardDebtIsPreservedWhenEmissionThrottles() public {
        _fresh();
        staking.fundStakingRewards(1_000_000 ether);
        // Cap emissions to a tiny 1 token/day.
        staking.setMaxDailyStakingEmission(1 ether);

        vm.prank(alice);
        staking.stake(1_000_000 ether, 0, address(0)); // 0.1%/day => 1000 t/day owed

        vm.warp(block.timestamp + 1 days);
        uint256 owed = staking.pendingRewards(1); // ~1000 ether
        uint256 balBefore = token.balanceOf(alice);

        vm.prank(alice);
        staking.claim(1); // capped to ~1 ether by emission limiter

        uint256 paid = token.balanceOf(alice) - balBefore;
        assertLt(paid, owed / 100, "payment was throttled");
        assertEq(staking.pendingRewards(1), owed - paid, "throttled remainder must remain claimable");
    }

    function testEmptyAffiliateConfigurationCannotBreakClaims() public {
        _fresh();
        staking.fundStakingRewards(1_000 ether);
        staking.fundAffiliateRewards(100 ether); // reserve > 0
        assertEq(staking.maxAffiliateDepth(), 0, "affiliate payouts disabled until configured");
        assertEq(staking.affiliateLevelsLength(), 0, "no levels configured");

        vm.prank(alice);
        staking.stake(10_000 ether, 0, bob); // alice referred by bob

        vm.warp(block.timestamp + 1 days);

        uint256 beforeBalance = token.balanceOf(alice);
        vm.prank(alice);
        staking.claim(1);
        assertEq(token.balanceOf(alice) - beforeBalance, 10 ether);
    }
}
