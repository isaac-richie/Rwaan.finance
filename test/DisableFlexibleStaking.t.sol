// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/RWANSecureStakingV3.sol";
import "../contracts/MockERC20.sol";

contract DisableFlexibleStakingTest is Test {
    RWANSecureStakingV3 public staking;
    MockERC20 public token;

    address public owner = address(1);
    address public userA = address(2); // Existing flex staker
    address public userB = address(3); // New user trying to stake flex
    address public userC = address(4); // User staking in 90-day plan

    uint256 public constant INITIAL_BALANCE = 100_000 ether;
    uint256 public constant STAKE_AMOUNT = 1_000 ether;

    function setUp() public {
        vm.startPrank(owner);

        // Deploy tokens
        token = new MockERC20("RWAN", "RWAN", 1_000_000_000 ether);
        
        // Setup APR tiers
        uint256[] memory tierTVL = new uint256[](1);
        tierTVL[0] = 0;
        uint32[] memory tierAprBps = new uint32[](1);
        tierAprBps[0] = 1600; // 16%

        // Deploy staking contract
        staking = new RWANSecureStakingV3(
            address(token),
            address(token),
            100 ether, // min stake
            10, // max positions
            tierTVL,
            tierAprBps,
            500 // referral bps
        );

        // Add 90-day lock option (ID 1)
        staking.addLockOption(90 days, 21000, true);

        // Fund rewards
        // Fund rewards
        token.mint(owner, 1_000_000 ether);
        token.approve(address(staking), 1_000_000 ether);
        staking.fundRewards(1_000_000 ether);

        vm.stopPrank();

        // Setup users
        token.mint(userA, INITIAL_BALANCE);
        token.mint(userB, INITIAL_BALANCE);
        token.mint(userC, INITIAL_BALANCE);

        vm.prank(userA);
        token.approve(address(staking), type(uint256).max);
        
        vm.prank(userB);
        token.approve(address(staking), type(uint256).max);

        vm.prank(userC);
        token.approve(address(staking), type(uint256).max);
    }

    function test_DisableFlexibleStakingWorkflow() public {
        // 1. User A stakes in Flexible (ID 0) while enabled
        vm.prank(userA);
        staking.stake(STAKE_AMOUNT, 0, address(0));
        
        uint256[] memory positionsA = staking.userPositions(userA);
        assertEq(positionsA.length, 1, "User A should have 1 position");

        // 2. Owner disables Flexible (ID 0)
        vm.prank(owner);
        staking.setLockOption(0, 10000, false); 

        // 3. User B tries to stake in Flexible -> Should Fail
        vm.startPrank(userB);
        vm.expectRevert("lock disabled");
        staking.stake(STAKE_AMOUNT, 0, address(0));
        vm.stopPrank();

        // 4. Time passes to accumulate rewards
        vm.warp(block.timestamp + 30 days);

        // 5. User A (existing) claims rewards -> Should Success
        uint256 initialRewardBalance = token.balanceOf(userA);
        vm.prank(userA);
        staking.claim(positionsA[0]);
        uint256 finalRewardBalance = token.balanceOf(userA);
        
        assertTrue(finalRewardBalance > initialRewardBalance, "User A should be able to claim rewards");

        // 6. User A withdraws -> Should Success
        uint256 initialStakedBalance = token.balanceOf(userA);
        vm.prank(userA);
        staking.withdraw(positionsA[0]);
        uint256 finalStakedBalance = token.balanceOf(userA);

        assertEq(finalStakedBalance, initialStakedBalance + STAKE_AMOUNT, "User A should be able to withdraw principal");

        // 7. User C checks 90-day plan (ID 1) -> Should still work
        vm.prank(userC);
        staking.stake(STAKE_AMOUNT, 1, address(0)); // ID 1 is 90 days
        
        uint256[] memory positionsC = staking.userPositions(userC);
        assertEq(positionsC.length, 1, "User C should have 1 position in 90-day plan");
    }
}
