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

contract ReferralStressTest is Test {
    RWANSecureStakingV3 public staking;
    MockERC20 public token;

    address public owner;
    address public referrerA = address(0xA);
    address public referrerB = address(0xB);
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public user3 = address(0x3);

    event ReferralEarned(
        address indexed referrer,
        address indexed referee,
        uint256 amount
    );

    function setUp() public {
        owner = address(this);
        token = new MockERC20();

        uint256[] memory tierTVL = new uint256[](1);
        tierTVL[0] = 0;
        uint32[] memory tierAprBps = new uint32[](1);
        tierAprBps[0] = 1000;

        staking = new RWANSecureStakingV3(
            address(token),
            address(token),
            100 ether,
            10,
            tierTVL,
            tierAprBps,
            500 // 5% Referral BPS
        );

        // Enable flexible staking (lockId 0)
        // Default constructor might not add it depending on script vs contract logic
        // But usually tests add options. Let's add one to be safe.
        staking.addLockOption(0, 10000, true); 

        // Fund contract for rewards
        token.approve(address(staking), 1_000_000 ether);
        staking.fundRewards(500_000 ether);
        staking.fundReferralRewards(500_000 ether);

        // Distribute tokens to users
        address[5] memory users = [referrerA, referrerB, user1, user2, user3];
        for(uint i=0; i<users.length; i++) {
            token.transfer(users[i], 10_000 ether);
            vm.startPrank(users[i]);
            token.approve(address(staking), 1_000_000 ether);
            vm.stopPrank();
        }
    }

    // Scenario 1: Basic Referral
    function testBasicReferral() public {
        // Referrer A stakes to be eligible (assuming minReferrerStake is 0 by default, but let's stake anyway to be realistic)
        vm.prank(referrerA);
        staking.stake(1000 ether, 0, address(0));

        uint256 referrerBalanceBefore = token.balanceOf(referrerA);

        // User 1 stakes with Referrer A
        vm.prank(user1);
        staking.stake(2000 ether, 0, referrerA);

        uint256 expectedBonus = (2000 ether * 500) / 10000; // 5% = 100
        
        assertEq(token.balanceOf(referrerA), referrerBalanceBefore + expectedBonus, "Referrer A did not receive correct bonus");
    }

    // Scenario 2: Multiple Referrals (The "Influencer" check)
    function testMultipleReferrals() public {
        vm.prank(referrerA);
        staking.stake(1000 ether, 0, address(0));

        uint256 startBalance = token.balanceOf(referrerA);

        // User 1 stakes 1000 -> 50 bonus
        vm.prank(user1);
        staking.stake(1000 ether, 0, referrerA);

        // User 2 stakes 5000 -> 250 bonus
        vm.prank(user2);
        staking.stake(5000 ether, 0, referrerA);

        // User 3 stakes 10,000 -> 500 bonus
        vm.prank(user3);
        staking.stake(10000 ether, 0, referrerA);

        uint256 totalExpected = 50 ether + 250 ether + 500 ether;
        assertEq(token.balanceOf(referrerA), startBalance + totalExpected, "Influencer did not get all rewards");
    }

    // Scenario 3: Daisy Chain (A -> B -> C)
    // A refers B. B refers C. 
    // A should get bonus from B.
    // B should get bonus from C.
    // A should NOT get bonus from C (single level).
    function testDaisyChain() public {
        uint256 aStart = token.balanceOf(referrerA);
        uint256 bStart = token.balanceOf(referrerB);

        // 1. B stakes using A's code
        vm.prank(referrerB);
        staking.stake(1000 ether, 0, referrerA);
        
        // A gets 50
        assertEq(token.balanceOf(referrerA), aStart + 50 ether);

        // 2. C (User1) stakes using B's code
        vm.prank(user1);
        staking.stake(2000 ether, 0, referrerB);

        // B gets 100 (5% of 2000)
        assertEq(token.balanceOf(referrerB), bStart - 1000 ether + 100 ether); // B staked 1000, got 100 back

        // A should NOT have received anything more
        assertEq(token.balanceOf(referrerA), aStart + 50 ether, "A should not earn from C");
    }

    // Scenario 4: Self Referral
    function testSelfReferralBlocked() public {
        uint256 start = token.balanceOf(user1);
        
        vm.prank(user1);
        staking.stake(1000 ether, 0, user1); // Attempts to refer self

        // Should successfully stake, but NO referral bonus logic usually triggers (or silently fails condition)
        // Code check: `referrer != msg.sender`
        
        // User balance should just be start - stake
        assertEq(token.balanceOf(user1), start - 1000 ether, "Should not receive bonus for self referral");
    }

    // Scenario 5: Minimum Stake Requirement
    function testMinStakeEnforcement() public {
        // Set min stake to 500
        staking.setMinReferrerStake(500 ether);

        // Referrer A has 0 stake.
        // User 1 uses Referrer A.
        uint256 aStart = token.balanceOf(referrerA);
        
        vm.prank(user1);
        staking.stake(1000 ether, 0, referrerA);
        
        // A should get NOTHING because they have 0 stake
        assertEq(token.balanceOf(referrerA), aStart);

        // Now Referrer A stakes 600 (Satisfies > 500)
        vm.prank(referrerA);
        staking.stake(600 ether, 0, address(0));

        // User 2 uses Referrer A
        vm.prank(user2);
        staking.stake(1000 ether, 0, referrerA);

        // A should get 50 now
        assertEq(token.balanceOf(referrerA), aStart - 600 ether + 50 ether);
    }

    // Scenario 6: Reserve Depletion
    function testReserveDepletion() public {
        // 1. Drain referral reserve
        staking.pause();
        staking.emergencyRecoverRewards(address(this)); 
        staking.unpause();

        // 2. Fund with just 10 wei (insufficient for bonus)
        token.approve(address(staking), 10);
        staking.fundReferralRewards(10);

        // User stakes 1000 ether -> needs 50 ether reward
        // Reserve only has 10 wei. 
        // Code: `if (referralReward > 0 && referralReward <= referralReserve)`
        // It should SKIP the payment entirely if reserve is insufficient.
        
        uint256 aStart = token.balanceOf(referrerA);
        
        // Referrer A must be valid
        vm.prank(referrerA);
        staking.stake(1000 ether, 0, address(0));
        aStart = token.balanceOf(referrerA); // Update after stake cost

        vm.prank(user1);
        staking.stake(1000 ether, 0, referrerA);

        // A should get NOTHING because reserve was too low
        assertEq(token.balanceOf(referrerA), aStart, "Should not pay if reserve insufficient");
    }

    // Scenario 7: Paused Referrals
    function testPausedReferrals() public {
        staking.pauseReferrals();

        vm.prank(referrerA);
        staking.stake(1000 ether, 0, address(0));
        uint256 aStart = token.balanceOf(referrerA);

        vm.prank(user1);
        staking.stake(1000 ether, 0, referrerA);

        assertEq(token.balanceOf(referrerA), aStart, "Should not pay when paused");
    }
}
