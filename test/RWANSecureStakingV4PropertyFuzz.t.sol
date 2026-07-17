// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/MockERC20.sol";
import "../contracts/RWANSecureStakingV4.sol";

/// @notice Stateless property fuzzing over the core reward/penalty math.
contract RWANSecureStakingV4PropertyFuzz is Test {
    MockERC20 public token;
    RWANSecureStakingV4 public staking;
    address public user = address(0xBEEF);

    function setUp() public {
        token = new MockERC20("RWAN", "RWAN", 5_000_000_000 ether);
        staking = new RWANSecureStakingV4(address(token), address(token), address(this), 1 ether, 0);
        staking.addStakePlan(30 days, 20, 3500, true); // 0.2%/day, 35% penalty
        token.transfer(user, 1_000_000_000 ether);
        vm.prank(user);
        token.approve(address(staking), type(uint256).max);
        token.approve(address(staking), type(uint256).max);
        staking.fundStakingRewards(1_000_000_000 ether);
    }

    /// pendingRewards is monotonically non-decreasing in elapsed time.
    function testFuzz_PendingMonotonicInTime(uint256 amount, uint256 t1, uint256 t2) public {
        amount = bound(amount, 1 ether, 100_000_000 ether);
        t1 = bound(t1, 0, 300 days);
        t2 = bound(t2, t1, 600 days);

        vm.prank(user);
        staking.stake(amount, 0, address(0));

        uint256 start = block.timestamp;
        vm.warp(start + t1);
        uint256 r1 = staking.pendingRewards(1);
        vm.warp(start + t2);
        uint256 r2 = staking.pendingRewards(1);
        assertGe(r2, r1, "reward decreased over time");
    }

    /// pendingRewards never exceeds the theoretical cap (amount * rate * days).
    function testFuzz_PendingWithinTheoreticalCap(uint256 amount, uint256 elapsed) public {
        amount = bound(amount, 1 ether, 100_000_000 ether);
        elapsed = bound(elapsed, 0, 720 days);

        vm.prank(user);
        staking.stake(amount, 0, address(0));
        vm.warp(block.timestamp + elapsed);

        uint256 pending = staking.pendingRewards(1);
        // rate is 20 bps/day; cap = amount * 20 * elapsed / (10000 * 1day) + 1 wei rounding
        uint256 cap = (amount * 20 * elapsed) / (10_000 * 1 days) + 1;
        assertLe(pending, cap, "reward exceeds theoretical cap");
    }

    /// Early-withdraw penalty never exceeds principal; user always gets the remainder.
    function testFuzz_EarlyPenaltyNeverExceedsPrincipal(uint256 amount, uint256 wait) public {
        amount = bound(amount, 1 ether, 100_000_000 ether);
        wait = bound(wait, 0, 29 days); // still locked

        vm.prank(user);
        staking.stake(amount, 0, address(0));
        vm.warp(block.timestamp + wait);

        uint256 before = token.balanceOf(user);
        vm.prank(user);
        staking.withdrawEarly(1);
        uint256 returned = token.balanceOf(user) - before;

        // 35% penalty => user receives exactly 65% of principal while still locked
        // (no reward accrues to pay because withdrawEarly claims first, but the plan
        // pays from reserve; assert the principal side precisely).
        uint256 principalBack = (amount * 6500) / 10_000;
        assertGe(returned, principalBack, "returned less than principal-after-penalty");
    }
}
