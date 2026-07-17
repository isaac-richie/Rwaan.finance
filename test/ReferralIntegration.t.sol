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

contract ReferralIntegrationTest is Test {
    RWANSecureStakingV3 public staking;
    MockERC20 public token;

    address public owner;
    address public referrer = address(0x111);
    address public referee = address(0x222);

    // Event definition to capture
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
        
        // Grant lock option 0 (Flexible) is default, added in constructor
        
        // Fund referral rewards
        token.approve(address(staking), 100_000 ether);
        staking.fundReferralRewards(100_000 ether);

        // Fund users
        token.transfer(referrer, 10_000 ether);
        token.transfer(referee, 10_000 ether);
    }

    function testReferralEventEmission() public {
        // 1. Referrer must stake first to be eligible
        vm.startPrank(referrer);
        token.approve(address(staking), 5000 ether);
        staking.stake(5000 ether, 0, address(0)); 
        vm.stopPrank();

        // 2. Referee stakes with referrer
        vm.startPrank(referee);
        token.approve(address(staking), 1000 ether);

        // Expect the event
        vm.expectEmit(true, true, false, true);
        emit ReferralEarned(referrer, referee, 50 ether); // 5% of 1000
        
        staking.stake(1000 ether, 0, referrer);
        vm.stopPrank();

        // 3. Verify balances
        // Referrer should have gained 50 tokens
        assertEq(token.balanceOf(referrer), 5000 ether + 50 ether);
    }
}
