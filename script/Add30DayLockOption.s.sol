// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/RWANSecureStakingV3.sol";

contract Add30DayLockOption is Script {
    function run() external {
        // Existing deployed contract address
        address payable stakingAddress = payable(0x890Bc48a6463586c75a7C9db0Af7FC3e5cA15625);
        RWANSecureStakingV3 staking = RWANSecureStakingV3(stakingAddress);

        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        console.log("Adding 30-day lock option to contract:", stakingAddress);

        // Lock Option: 1 month (30 days), 1.1x multiplier (11000 bps)
        // param 1: duration = 30 days
        // param 2: multiplier = 11000 (1.1x)
        // param 3: enabled = true
        staking.addLockOption(30 days, 11000, true);
        
        console.log("Successfully added 30-day lock option with 1.1x multiplier");

        vm.stopBroadcast();
    }
}
