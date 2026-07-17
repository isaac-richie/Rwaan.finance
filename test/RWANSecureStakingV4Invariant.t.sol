// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/MockERC20.sol";
import "../contracts/RWANSecureStakingV4.sol";

contract RWANV4Handler is Test {
    MockERC20 public token;
    RWANSecureStakingV4 public staking;

    address[] public users;
    uint256[] public knownPositions;
    mapping(uint256 => bool) public activePosition;
    uint256 public expectedActivePrincipal;

    constructor(MockERC20 token_, RWANSecureStakingV4 staking_) {
        token = token_;
        staking = staking_;

        for (uint256 i = 0; i < 8; i++) {
            // forge-lint: disable-next-line(unsafe-typecast)
            address user = address(uint160(0x5000 + i));
            users.push(user);
            token.mint(user, 1_000_000 ether);
            vm.prank(user);
            token.approve(address(staking), type(uint256).max);
        }
    }

    function stake(uint256 seed, uint256 amountSeed, uint256 warpSeed) external {
        address user = users[seed % users.length];
        uint256 amount = bound(amountSeed, 100 ether, 10_000 ether);
        uint256 planId = seed % staking.stakePlansLength();

        vm.warp(block.timestamp + bound(warpSeed, 0, 3 days));

        vm.prank(user);
        staking.stake(amount, planId, address(0));

        uint256 positionId = staking.nextPositionId() - 1;
        knownPositions.push(positionId);
        activePosition[positionId] = true;
        expectedActivePrincipal += amount;
    }

    function claim(uint256 seed, uint256 warpSeed) external {
        if (knownPositions.length == 0) return;
        uint256 positionId = knownPositions[seed % knownPositions.length];
        if (!activePosition[positionId]) return;

        (address owner,,,,,,, bool withdrawn) = staking.positions(positionId);
        if (withdrawn) return;

        vm.warp(block.timestamp + bound(warpSeed, 0, 3 days));
        vm.prank(owner);
        staking.claim(positionId);
    }

    function withdraw(uint256 seed, uint256 warpSeed) external {
        if (knownPositions.length == 0) return;
        uint256 positionId = knownPositions[seed % knownPositions.length];
        if (!activePosition[positionId]) return;

        (address owner, uint256 amount,, uint64 unlockTime,,,, bool withdrawn) = staking.positions(positionId);
        if (withdrawn) return;

        if (unlockTime > block.timestamp) {
            vm.warp(uint256(unlockTime) + bound(warpSeed, 0, 3 days));
        } else {
            vm.warp(block.timestamp + bound(warpSeed, 0, 3 days));
        }

        vm.prank(owner);
        staking.withdraw(positionId);

        activePosition[positionId] = false;
        expectedActivePrincipal -= amount;
    }

    function withdrawEarly(uint256 seed, uint256 warpSeed) external {
        if (knownPositions.length == 0) return;
        uint256 positionId = knownPositions[seed % knownPositions.length];
        if (!activePosition[positionId]) return;

        (address owner, uint256 amount,, uint64 unlockTime,,,, bool withdrawn) = staking.positions(positionId);
        if (withdrawn || unlockTime == 0 || block.timestamp >= unlockTime) return;

        vm.warp(block.timestamp + bound(warpSeed, 0, 1 days));
        if (block.timestamp >= unlockTime) return;

        vm.prank(owner);
        staking.withdrawEarly(positionId);

        activePosition[positionId] = false;
        expectedActivePrincipal -= amount;
    }

    function fund(uint256 amountSeed) external {
        uint256 amount = bound(amountSeed, 1 ether, 100_000 ether);
        token.mint(address(this), amount * 3);
        token.approve(address(staking), amount * 3);
        staking.fundStakingRewards(amount);
        staking.fundAffiliateRewards(amount);
        staking.fundRankRewards(amount);
    }
}

contract RWANSecureStakingV4Invariant is Test {
    MockERC20 public token;
    RWANSecureStakingV4 public staking;
    RWANV4Handler public handler;

    function setUp() public {
        token = new MockERC20("RWAN", "RWAN", 1_000_000_000 ether);
        staking = new RWANSecureStakingV4(
            address(token),
            address(token),
            address(this),
            100 ether,
            0
        );

        staking.addStakePlan(0, 10, 0, true);
        staking.addStakePlan(30 days, 20, 3500, true);
        staking.addStakePlan(90 days, 30, 3500, true);

        token.approve(address(staking), type(uint256).max);
        staking.fundStakingRewards(1_000_000 ether);
        staking.fundAffiliateRewards(100_000 ether);
        staking.fundRankRewards(100_000 ether);

        handler = new RWANV4Handler(token, staking);
        targetContract(address(handler));
    }

    function invariant_TotalStakedMatchesActivePrincipal() public view {
        assertEq(staking.totalStaked(), handler.expectedActivePrincipal());
    }

    function invariant_ProtectedBalanceIsCovered() public view {
        assertGe(token.balanceOf(address(staking)), staking.protectedTokenBalance(address(token)));
    }

    function invariant_SurplusCalculationDoesNotUnderflow() public view {
        uint256 balance = token.balanceOf(address(staking));
        uint256 protectedAmount = staking.protectedTokenBalance(address(token));
        uint256 surplus = staking.surplusTokenBalance(address(token));

        if (balance > protectedAmount) {
            assertEq(surplus, balance - protectedAmount);
        } else {
            assertEq(surplus, 0);
        }
    }
}
