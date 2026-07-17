// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/RWANSecureStakingV3.sol";

contract UpdateLockOptions is Script {
    function run() external {
        address payable stakingAddress = payable(0x890Bc48a6463586c75a7C9db0Af7FC3e5cA15625);
        RWANSecureStakingV3 staking = RWANSecureStakingV3(stakingAddress);

        uint256 ownerPrivateKey = vm.envUint("OWNER_PRIVATE_KEY");

        vm.startBroadcast(ownerPrivateKey);

        console.log("Updating lock options on contract:", stakingAddress);
        console.log("Keeping base APR tiers unchanged. Current base APR should remain 16%.");

        // Target effective APRs at the current 16% base APR:
        // 30 days  = 5%  APR -> 0.3125x = 3125 bps
        // 90 days  = 15% APR -> 0.9375x = 9375 bps
        // 180 days = 30% APR -> 1.875x  = 18750 bps
        // 365 days = 60% APR -> 3.75x   = 37500 bps

        staking.setLockOption(4, 3125, true);
        console.log("Updated Lock ID 4 (30 days) to 0.3125x => 5% APR at 16% base");

        staking.setLockOption(1, 9375, true);
        console.log("Updated Lock ID 1 (90 days) to 0.9375x => 15% APR at 16% base");

        staking.setLockOption(2, 18750, true);
        console.log("Updated Lock ID 2 (180 days) to 1.875x => 30% APR at 16% base");

        uint256 optionCount = staking.lockOptionsLength();
        bool foundOneYear;
        uint256 oneYearLockId;

        for (uint256 i = 0; i < optionCount; i++) {
            (uint64 duration,,) = staking.lockOptions(i);
            if (duration == 365 days) {
                foundOneYear = true;
                oneYearLockId = i;
                break;
            }
        }

        if (foundOneYear) {
            staking.setLockOption(oneYearLockId, 37500, true);
            console.log("Updated existing 365-day lock option to 3.75x => 60% APR at 16% base");
        } else {
            staking.addLockOption(365 days, 37500, true);
            console.log("Added 365-day lock option with 3.75x => 60% APR at 16% base");
        }

        vm.stopBroadcast();
    }
}
