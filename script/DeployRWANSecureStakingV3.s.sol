// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/RWANSecureStakingV3.sol";

contract DeployRWANSecureStakingV3 is Script {
    function run() external {
        // RWAN token address on BSC
        address stakingToken = 0xACB921bf2Dac2F7E8E101AAd9CA013d6Af5C648a;
        address rewardToken = stakingToken; // Same token for staking and rewards

        // Staking parameters
        uint256 minStakeAmount = 100 ether; // 100 RWAN minimum
        uint256 maxPositionsPerUser = 10; // Max 10 positions per user
        uint256 referralBps = 500; // 5% referral bonus

        // APR Tiers based on TVL
        uint256[] memory tierTVL = new uint256[](6);
        tierTVL[0] = 0;
        tierTVL[1] = 200_000_000 ether;   // 200M
        tierTVL[2] = 500_000_000 ether;   // 500M
        tierTVL[3] = 1_000_000_000 ether; // 1B
        tierTVL[4] = 2_200_000_000 ether; // 2.2B
        tierTVL[5] = 4_000_000_000 ether; // 4B

        uint32[] memory tierAprBps = new uint32[](6);
        tierAprBps[0] = 1600; // 16% APR at tier 0
        tierAprBps[1] = 1200; // 12% APR at tier 1
        tierAprBps[2] = 1000; // 10% APR at tier 2
        tierAprBps[3] = 800;  // 8% APR at tier 3
        tierAprBps[4] = 600;  // 6% APR at tier 4
        tierAprBps[5] = 400;  // 4% APR at tier 5

        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying RWANSecureStakingV3...");
        console.log("Staking Token:", stakingToken);
        console.log("Reward Token:", rewardToken);
        console.log("Min Stake Amount:", minStakeAmount);
        console.log("Max Positions Per User:", maxPositionsPerUser);
        console.log("Referral BPS:", referralBps);

        RWANSecureStakingV3 staking = new RWANSecureStakingV3(
            stakingToken,
            rewardToken,
            minStakeAmount,
            maxPositionsPerUser,
            tierTVL,
            tierAprBps,
            referralBps
        );

        console.log("Contract deployed at:", address(staking));

        // Add lock options
        console.log("Adding lock options...");

        // Lock Option 1: 30 days, 0.3125x multiplier => 5% APR at 16% base
        staking.addLockOption(30 days, 3125, true);
        console.log("Added Lock Option 1: 30 days, 0.3125x multiplier");

        // Lock Option 2: 90 days, 0.9375x multiplier => 15% APR at 16% base
        staking.addLockOption(90 days, 9375, true);
        console.log("Added Lock Option 2: 90 days, 0.9375x multiplier");

        // Lock Option 3: 180 days, 1.875x multiplier => 30% APR at 16% base
        staking.addLockOption(180 days, 18750, true);
        console.log("Added Lock Option 3: 180 days, 1.875x multiplier");

        // Lock Option 4: 365 days, 3.75x multiplier => 60% APR at 16% base
        staking.addLockOption(365 days, 37500, true);
        console.log("Added Lock Option 4: 365 days, 3.75x multiplier");

        vm.stopBroadcast();

        console.log("");
        console.log("==============================================");
        console.log("Deployment Summary");
        console.log("==============================================");
        console.log("Contract Address:", address(staking));
        console.log("Owner:", staking.owner());
        console.log("Staking Token:", address(staking.stakingToken()));
        console.log("Reward Token:", address(staking.rewardToken()));
        console.log("Min Stake:", staking.minStakeAmount());
        console.log("Max Positions:", staking.maxPositionsPerUser());
        console.log("Referral BPS:", staking.referralBps());
        console.log("Lock Options Count:", staking.lockOptionsLength());
        console.log("APR Tiers Count:", staking.aprTiersLength());
        console.log("==============================================");
        console.log("");
        console.log("Next Steps:");
        console.log("1. Verify contract on BSCScan");
        console.log("2. Fund rewards: call fundRewards()");
        console.log("3. Fund referral rewards: call fundReferralRewards()");
        console.log("4. Transfer ownership to multisig (optional)");
        console.log("5. Update frontend with new contract address");
    }
}
