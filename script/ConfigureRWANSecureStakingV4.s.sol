// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {RWANSecureStakingV4} from "../contracts/RWANSecureStakingV4.sol";

/// @notice Applies the agreed reference affiliate and rank schedules to an existing V4 deployment.
/// @dev The broadcaster must hold PARAMETER_ROLE. Every value remains adjustable after setup.
contract ConfigureRWANSecureStakingV4 is Script {
    function run() external {
        uint256 parameterAdminKey = vm.envUint("PARAMETER_ADMIN_PRIVATE_KEY");
        RWANSecureStakingV4 staking = RWANSecureStakingV4(vm.envAddress("RWAN_V4_STAKING_ADDRESS"));

        vm.startBroadcast(parameterAdminKey);

        uint32[] memory affiliateBps = referenceAffiliateBps();
        staking.setMaxAffiliateTotalBps(18_500); // 185% aggregate reference cap
        staking.setAffiliateLevels(affiliateBps, 20);

        uint32[9] memory rankWeights = referenceRankWeights();
        for (uint256 i = 0; i < rankWeights.length; i++) {
            // Rank assignment remains admin-controlled until qualification thresholds are finalized.
            staking.setRankConfig(i + 1, 0, 0, rankWeights[i], true);
        }

        vm.stopBroadcast();
    }

    function referenceAffiliateBps() public pure returns (uint32[] memory levels) {
        levels = new uint32[](20);
        levels[0] = 2_500;
        levels[1] = 2_000;
        levels[2] = 2_000;
        levels[3] = 1_500;
        levels[4] = 1_500;
        levels[5] = 1_500;
        levels[6] = 1_000;
        levels[7] = 1_000;
        levels[8] = 1_000;
        levels[9] = 1_000;
        for (uint256 i = 10; i < 15; i++) {
            levels[i] = 500;
        }
        for (uint256 i = 15; i < 20; i++) {
            levels[i] = 200;
        }
    }

    function referenceRankWeights() public pure returns (uint32[9] memory weights) {
        weights = [uint32(1_000), 1_500, 2_000, 2_500, 3_000, 3_500, 4_000, 4_500, 5_000];
    }
}
