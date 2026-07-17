// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/RWANSecureStakingV3.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1_000_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract RWANStakingFuzz is Test {
    RWANSecureStakingV3 public staking;
    MockERC20 public token;

    uint256 constant INITIAL_BALANCE = 1_000_000 ether;
    uint256 constant REWARD_POOL = 50_000 ether;

    function setUp() public {
        token = new MockERC20();

        // Setup APR tiers
        uint256[] memory tierTVL = new uint256[](6);
        tierTVL[0] = 0;
        tierTVL[1] = 200_000_000 ether;
        tierTVL[2] = 500_000_000 ether;
        tierTVL[3] = 1_000_000_000 ether;
        tierTVL[4] = 2_200_000_000 ether;
        tierTVL[5] = 4_000_000_000 ether;

        uint32[] memory tierAprBps = new uint32[](6);
        tierAprBps[0] = 1600; // 16%
        tierAprBps[1] = 1200; // 12%
        tierAprBps[2] = 1000; // 10%
        tierAprBps[3] = 800;  // 8%
        tierAprBps[4] = 600;  // 6%
        tierAprBps[5] = 400;  // 4%

        staking = new RWANSecureStakingV3(
            address(token),
            address(token),
            100 ether,  // minStakeAmount
            10,         // maxPositionsPerUser
            tierTVL,
            tierAprBps,
            500         // 5% referral
        );

        // Add lock options (Note: Flexible added by constructor logic typically, verify if needed)
        // Check V3 constructor: lockOptions.push(LockOption({duration: 0, multiplierBps: 10000, enabled: true}));
        // So index 0 is Flexible.
        
        staking.addLockOption(90 days, 12500, true);  // Index 1
        staking.addLockOption(180 days, 20000, true); // Index 2

        // Fund reward pool
        token.approve(address(staking), REWARD_POOL);
        staking.fundRewards(REWARD_POOL);
    }

    // Fuzz Test 1: Staking with random amounts and lock options
    function testFuzz_Stake(uint256 amount, uint8 lockIdParam, address user) public {
        // Constraints
        amount = bound(amount, 100 ether, 100_000 ether); // Min stake to realistic max
        uint256 lockId = bound(lockIdParam, 0, 2); 
        
        vm.assume(user != address(0));
        vm.assume(user != address(staking));
        vm.assume(user != address(token));
        
        // Setup User
        token.mint(user, amount);
        
        vm.startPrank(user);
        token.approve(address(staking), amount);
        
        // Action
        staking.stake(amount, lockId, address(0));
        
        // Assertions
        (uint256 posAmount, , , uint256 unlockTime, uint256 storedLockId, , bool withdrawn) = staking.positions(1); 
        
        assertEq(posAmount, amount, "Staked amount mismatch");
        assertEq(storedLockId, lockId, "LockId mismatch");
        assertEq(withdrawn, false, "Should not be withdrawn");

        if (lockId == 0) {
            assertEq(unlockTime, 0, "Flexible should have 0 unlock time");
        } else {
             (uint64 duration, , ) = staking.lockOptions(lockId);
             assertEq(unlockTime, block.timestamp + duration, "Unlock time mismatch");
        }
        
        vm.stopPrank();
    }

    // Fuzz Test 2: Withdraw Early calculation integrity
    function testFuzz_WithdrawEarlyCalculation(uint256 amount, uint256 timeElapsed) public {
        address user = address(0x123);
        amount = bound(amount, 100 ether, 1_000_000 ether);
        
        // Lock ID 1 = 90 days
        uint256 lockDuration = 90 days;
        timeElapsed = bound(timeElapsed, 1, lockDuration - 1); // Strictly before unlock

        // Setup
        token.mint(user, amount);
        vm.startPrank(user);
        token.approve(address(staking), amount);
        staking.stake(amount, 1, address(0));

        vm.warp(block.timestamp + timeElapsed);

        uint256 balanceBefore = token.balanceOf(user);
        
        // Act
        staking.withdrawEarly(1);
        
        uint256 balanceAfter = token.balanceOf(user);
        uint256 received = balanceAfter - balanceBefore;

        // Verify Penalty Logic
        // Penalty = 35%
        uint256 expectedPenalty = (amount * 3500) / 10_000;
        uint256 principalAfterPenalty = amount - expectedPenalty;
        
        // User receives: principalAfterPenalty + rewards
        assertGe(received, principalAfterPenalty, "Received less than principal after penalty");
        assertLt(received, amount, "Should contain penalty"); 
        
        // Verify total staked decreased
        assertEq(staking.totalStaked(), 0, "Total staked should be 0");
    }
}
