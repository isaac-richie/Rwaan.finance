// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/RWANSecureStakingV3.sol";

contract FundReferralReserve is Script {
    address constant STAKING_ADDRESS_V3 = 0x890Bc48a6463586c75a7C9db0Af7FC3e5cA15625;
    address constant RWAN_TOKEN = 0xACB921bf2Dac2F7E8E101AAd9CA013d6Af5C648a;
    uint256 constant AMOUNT = 50_000_000 ether; // 50 Million RWAN

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Approve staking contract to spend tokens
        console.log("Approving staking contract to spend 50M RWAN...");
        IERC20(RWAN_TOKEN).approve(STAKING_ADDRESS_V3, AMOUNT);
        
        // 2. Fund referral rewards
        console.log("Funding Referral Reserve with 50M RWAN...");
        RWANSecureStakingV3(STAKING_ADDRESS_V3).fundReferralRewards(AMOUNT);
        
        console.log("Success! Funded 50M RWAN to Referral Reserve at:", STAKING_ADDRESS_V3);

        vm.stopBroadcast();
    }
}
