// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/RWANSecureStakingV3.sol";

contract DisableLockOptions is Script {
    address constant STAKING_ADDRESS_V3 = 0x890Bc48a6463586c75a7C9db0Af7FC3e5cA15625;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        RWANSecureStakingV3 staking = RWANSecureStakingV3(STAKING_ADDRESS_V3);

        // Disable Flexible (ID 0)
        console.log("Disabling Flexible Staking (ID 0)...");
        // Keep original multiplier (10000 = 1x), set enabled = false
        staking.setLockOption(0, 10000, false);

        // Disable Duplicate 30 Days (ID 5)
        console.log("Disabling Duplicate 30 Days (ID 5)...");
        // Keep original multiplier (13000 = 1.3x), set enabled = false
        staking.setLockOption(5, 13000, false);

        console.log("Success! Lock options 0 and 5 disabled.");

        vm.stopBroadcast();
    }
}
