// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/StdInvariant.sol";
import "../contracts/RWANSecureStakingV3.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1_000_000_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// Handler to restrict calls to valid inputs and track expectations
contract Handler is Test {
    RWANSecureStakingV3 public staking;
    MockERC20 public token;
    
    address[] public users;
    uint256 public constant MAX_STAKE = 100_000 ether;

    constructor(RWANSecureStakingV3 _staking, MockERC20 _token) {
        staking = _staking;
        token = _token;
    }

    // Fuzzed Action: Stake
    function stake(uint256 amount, uint256 lockIdIndex) public {
        amount = bound(amount, 100 ether, MAX_STAKE);
        
        // Pick a random user
        address user = _getRandomUser(amount); // Use amount as seed for user selection? No, create new or reuse.
        // Better: msg.sender is fuzzed by foundry in invariant tests? No, handler functions are called by fuzzer.
        // We simulate a user.
        
        // Get lock option count to bound lockId
        uint256 lockCount = staking.lockOptionsLength();
        uint256 lockId = lockIdIndex % lockCount;

        // Setup user
        token.mint(user, amount);
        
        vm.startPrank(user);
        token.approve(address(staking), amount);
        try staking.stake(amount, lockId, address(0)) {
            // Success
        } catch {
            // Expected fails (limit reached, etc) ignored
        }
        vm.stopPrank();
    }

    // Fuzzed Action: Withdraw
    function withdraw(uint256 positionIdIndex) public {
        // Need to find a valid position? 
        // This is hard without tracking. 
        // For simplicity, we just try to withdraw random IDs. 
        // But for better testing, we should track created positions.
        // Getting total positions is tricky as nextPositionId is public.
        
        uint256 nextId = staking.nextPositionId();
        if (nextId == 1) return; // No positions
        
        uint256 positionId = bound(positionIdIndex, 1, nextId - 1);
        
        address owner = staking.positionOwner(positionId);
        if (owner == address(0)) return;

        vm.startPrank(owner);
        // Try regular withdraw (might fail if locked)
        try staking.withdraw(positionId) {} catch {}
        vm.stopPrank();
    }

    // Fuzzed Action: Withdraw Early
    function withdrawEarly(uint256 positionIdIndex) public {
        uint256 nextId = staking.nextPositionId();
        if (nextId == 1) return; 
        
        uint256 positionId = bound(positionIdIndex, 1, nextId - 1);
        address owner = staking.positionOwner(positionId);
        if (owner == address(0)) return;

        vm.startPrank(owner);
        try staking.withdrawEarly(positionId) {} catch {}
        vm.stopPrank();
    }
    
    // Fuzzed Action: Advance Time
    function warp(uint256 seconds_) public {
        seconds_ = bound(seconds_, 1 days, 365 days);
        vm.warp(block.timestamp + seconds_);
    }

    function _getRandomUser(uint256 seed) internal returns (address) {
        if (users.length < 5) {
            address newUser = address(uint160(seed + 1)); // Simple address gen
            users.push(newUser);
            return newUser;
        }
        return users[seed % users.length];
    }
}

contract RWANStakingInvariant is Test {
    RWANSecureStakingV3 public staking;
    MockERC20 public token;
    Handler public handler;

    function setUp() public {
        token = new MockERC20();

        // Standard Setup
        uint256[] memory tierTVL = new uint256[](1);
        tierTVL[0] = 0;
        uint32[] memory tierAprBps = new uint32[](1);
        tierAprBps[0] = 1000;

        staking = new RWANSecureStakingV3(
            address(token),
            address(token),
            100 ether,
            100, // Higher max pos for fuzzing
            tierTVL,
            tierAprBps,
            500
        );
        
        // Add options
        // Index 0 Flexible added by default? 
        // Check contract: "lockOptions.push" in constructor. Yes.
        staking.addLockOption(90 days, 12500, true);
        staking.addLockOption(180 days, 20000, true);

        // Fund Rewards
        uint256 rewardAmount = 1_000_000 ether;
        token.approve(address(staking), rewardAmount);
        staking.fundRewards(rewardAmount);

        // Handler
        handler = new Handler(staking, token);
        targetContract(address(handler));
    }

    // Invariant: Contract must always have enough tokens to cover total staked + reserves
    // Note: totalStaked tracks PRINCIPAL. rewardReserve tracks RESERVED REWARDS. 
    // Actual balance should be >= totalStaked + rewardReserve + referralReserve
    function invariant_Solvency() public {
        uint256 contractBalance = token.balanceOf(address(staking));
        uint256 liabilities = staking.totalStaked() + staking.rewardReserve() + staking.referralReserve();
        
        assertGe(contractBalance, liabilities, "Solvency invariant violated");
    }
}
