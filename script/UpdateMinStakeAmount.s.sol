// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {RWANSecureStakingV4} from "../contracts/RWANSecureStakingV4.sol";

/// @notice Updates minStakeAmount to maintain the $20 USD floor.
///
/// Usage:
///   RWAAN_PRICE_USD=0.000077 forge script script/UpdateMinStakeAmount.s.sol \
///     --rpc-url bsc --broadcast -vvvv
///
/// Or pass the token amount directly:
///   MIN_STAKE_RWAAN=259538 forge script script/UpdateMinStakeAmount.s.sol \
///     --rpc-url bsc --broadcast -vvvv
contract UpdateMinStakeAmount is Script {
    uint256 constant TARGET_USD = 20;

    function run() external {
        uint256 paramKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        RWANSecureStakingV4 staking = RWANSecureStakingV4(
            vm.envAddress("RWAN_V4_STAKING_ADDRESS")
        );

        // Prefer explicit token amount, fall back to price-based calculation.
        uint256 newMin;
        try vm.envUint("MIN_STAKE_RWAAN") returns (uint256 explicit) {
            newMin = explicit * 1 ether;
            console.log("Using explicit amount:", explicit, "RWAAN");
        } catch {
            uint256 priceScaled = vm.envUint("RWAAN_PRICE_USD_1E9"); // price * 1e9
            require(priceScaled > 0, "Set RWAAN_PRICE_USD_1E9 or MIN_STAKE_RWAAN");
            // newMin = (TARGET_USD * 1e9 / priceScaled) tokens
            newMin = (TARGET_USD * 1e9 * 1 ether) / priceScaled;
            console.log("Calculated from price: ~", newMin / 1 ether, "RWAAN = $20");
        }

        vm.startBroadcast(paramKey);
        staking.setMinStakeAmount(newMin);
        vm.stopBroadcast();

        console.log("minStakeAmount updated to:", newMin / 1 ether, "RWAAN");
        console.log("Current on-chain value:   ", staking.minStakeAmount() / 1 ether, "RWAAN");
    }
}
