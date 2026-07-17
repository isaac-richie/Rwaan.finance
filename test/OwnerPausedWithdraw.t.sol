// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/RWANSecureStakingV3.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1_000_000_000 ether);
    }
}

contract OwnerPausedWithdrawTest is Test {
    RWANSecureStakingV3 public staking;
    MockERC20 public token;

    address public owner;
    address public user = address(0x123);

    uint256 constant INITIAL_BALANCE = 10_000_000 ether;
    uint256 constant REWARD_POOL = 1_000_000 ether;

    function setUp() public {
        owner = address(this);
        token = new MockERC20();

        // Setup APR tiers (simplified)
        uint256[] memory tierTVL = new uint256[](1);
        tierTVL[0] = 0;
        uint32[] memory tierAprBps = new uint32[](1);
        tierAprBps[0] = 1000; // 10%

        staking = new RWANSecureStakingV3(
            address(token),
            address(token),
            100 ether,
            10,
            tierTVL,
            tierAprBps,
            500
        );

        // Enable a lock option
        staking.addLockOption(90 days, 12500, true);

        // Fund rewards
        token.approve(address(staking), REWARD_POOL);
        staking.fundRewards(REWARD_POOL);

        // Fund owner (this contract) and user
        // Note: MockERC20 mints to msg.sender (this contract) in constructor
        token.transfer(user, INITIAL_BALANCE);
    }

    function testOwnerEmergencyWithdraw() public {
        uint256 stakeAmount = 5000 ether;
        
        // 1. Owner stakes tokens
        token.approve(address(staking), stakeAmount);
        staking.stake(stakeAmount, 1, address(0)); // 90 days lock

        // Verify stake exists
        (uint256 amount,,,,,,) = staking.positions(1);
        assertEq(amount, stakeAmount);

        // 2. Fast forward time (accrue potential rewards)
        vm.warp(block.timestamp + 30 days);

        // 3. Pause contract
        staking.pause();

        // 4. Owner performs emergency withdraw
        uint256 balanceBefore = token.balanceOf(address(this));
        staking.emergencyWithdraw(1);
        uint256 balanceAfter = token.balanceOf(address(this));

        // 5. Validation
        // Should receive exactly principal back
        assertEq(balanceAfter - balanceBefore, stakeAmount, "Owner should get exact principal back");
        
        // Position should be marked withdrawn
        (,,,,,, bool withdrawn) = staking.positions(1);
        assertTrue(withdrawn, "Position should be withdrawn");
    }

    function testOwnerRecoverRewards() public {
        // 1. Pause contract
        staking.pause();

        uint256 reserveBefore = staking.rewardReserve();
        uint256 balanceBefore = token.balanceOf(address(this));

        // 2. Owner recovers rewards
        staking.emergencyRecoverRewards(address(this));

        uint256 balanceAfter = token.balanceOf(address(this));
        uint256 reserveAfter = staking.rewardReserve();

        // 3. Validation
        assertEq(balanceAfter - balanceBefore, reserveBefore, "Should recover all rewards");
        assertEq(reserveAfter, 0, "Reward reserve should be empty");
    }

    function testOwnerMultiPositionEmergencyWithdraw() public {
        uint256 amount1 = 1000 ether;
        uint256 amount2 = 2000 ether;

        // 1. Owner stakes multiple times
        token.approve(address(staking), amount1 + amount2);
        staking.stake(amount1, 1, address(0)); // Pos 1
        staking.stake(amount2, 1, address(0)); // Pos 2

        // 2. Pause
        staking.pause();

        // 3. Withdraw both
        staking.emergencyWithdraw(1);
        staking.emergencyWithdraw(2);

        // 4. Verify positions closed
        (,,,,,, bool withdrawn1) = staking.positions(1);
        (,,,,,, bool withdrawn2) = staking.positions(2);
        assertTrue(withdrawn1);
        assertTrue(withdrawn2);
    }

    function testPauseUnpauseGlitchCheck() public {
        uint256 amount = 1000 ether;
        token.approve(address(staking), amount);
        staking.stake(amount, 1, address(0));

        // Toggle pause multiple times
        staking.pause();
        staking.unpause();
        staking.pause();
        staking.unpause();
        staking.pause();

        // Should still be able to emergency withdraw
        staking.emergencyWithdraw(1);
        (,,,,,, bool withdrawn) = staking.positions(1);
        assertTrue(withdrawn);
    }
}
