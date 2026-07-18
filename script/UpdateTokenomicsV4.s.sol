// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {RWANSecureStakingV4} from "../contracts/RWANSecureStakingV4.sol";

/// @notice Applies the client-approved sustainable tokenomics
///         (docs/TOKENOMICS-SAFETY-PROPOSAL.md).
///
/// Existing positions are unaffected: stake() snapshots the rate per
/// position (positionRewardRateBps), so updateStakePlan only changes the
/// rate for NEW positions.
///
/// Changes:
///   Plan rates (dailyRateBps, 1 bps = 0.01%/day) — penalties/enabled preserved:
///     plan 0  Flex   10 -> 3
///     plan 1  30d    30 -> 7
///     plan 2  90d    40 -> 12
///     plan 3  120d   50 -> 14
///     plan 4  180d   70 -> 18
///     plan 5  360d   80 -> 23
///     plan 6  720d  100 -> 28
///   Affiliate levels: 2000/1500/1400 (49%) -> 500/300/200 (10%), depth 3
///   maxAffiliateTotalBps: -> 1000 (after levels, order matters)
///   maxDailyStakingEmission: 0 (unlimited!) -> 165,000 RWAAN/day
///     (= 120M tranche / ~730 days; raise when reserve is topped up)
///
/// Usage:
///   Dry-run:   forge script script/UpdateTokenomicsV4.s.sol --rpc-url bsc -vvvv
///   Broadcast: forge script script/UpdateTokenomicsV4.s.sol --rpc-url bsc --broadcast -vvvv
contract UpdateTokenomicsV4 is Script {

    uint256 constant EMISSION_CAP = 165_000 ether; // per day

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        RWANSecureStakingV4 staking = RWANSecureStakingV4(
            vm.envAddress("RWAN_V4_STAKING_ADDRESS")
        );

        uint32[7] memory newRates = [uint32(3), 7, 12, 14, 18, 23, 28];

        console.log("=====================================================");
        console.log("UpdateTokenomicsV4 - pre-flight (current -> new)");
        console.log("=====================================================");
        require(staking.stakePlansLength() == 7, "expected 7 plans");
        for (uint256 i = 0; i < 7; i++) {
            (, uint32 rate,,) = staking.stakePlans(i);
            console.log("plan", i, rate, newRates[i]);
        }

        vm.startBroadcast(deployerKey);

        for (uint256 i = 0; i < 7; i++) {
            (, , uint32 penalty, bool enabled) = staking.stakePlans(i);
            staking.updateStakePlan(i, newRates[i], penalty, enabled);
        }

        // Levels first (10% <= current 49% cap), then tighten the cap.
        uint32[] memory levels = new uint32[](3);
        levels[0] = 500; // L1 5%
        levels[1] = 300; // L2 3%
        levels[2] = 200; // L3 2%
        staking.setAffiliateLevels(levels, 3);
        staking.setMaxAffiliateTotalBps(1000);

        staking.setMaxDailyStakingEmission(EMISSION_CAP);

        vm.stopBroadcast();

        console.log("=====================================================");
        console.log("Applied - verify new state");
        console.log("=====================================================");
        for (uint256 i = 0; i < 7; i++) {
            (, uint32 rate,,) = staking.stakePlans(i);
            console.log("plan", i, "rate now", rate);
        }
        console.log("affiliate L1 bps:", staking.affiliateLevelBps(0));
        console.log("affiliate L2 bps:", staking.affiliateLevelBps(1));
        console.log("affiliate L3 bps:", staking.affiliateLevelBps(2));
        console.log("emission cap/day:", staking.maxDailyStakingEmission() / 1 ether);
    }
}
