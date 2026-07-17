// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/RWANSecureStakingV2.sol";

/**
 * @title DeployRWANSecureStakingV2
 * @notice Foundry deploy script for RWAN staking contract on BSC
 * 
 * To deploy:
 * forge script script/DeployRWANSecureStakingV2.s.sol:DeployRWANSecureStakingV2 \
 *   --rpc-url $BSC_RPC_URL \
 *   --private-key $DEPLOYER_PRIVATE_KEY \
 *   --broadcast \
 *   --verify \
 *   --etherscan-api-key $BSCSCAN_API_KEY
 */
contract DeployRWANSecureStakingV2 is Script {
    function run() external returns (RWANSecureStakingV2) {
        // ====================================
        // TOKEN ADDRESSES
        // ====================================
        // RWAN token on BSC
        address stakingToken = 0xACB921bf2Dac2F7E8E101AAd9CA013d6Af5C648a;
        // Use same token for rewards (single-token model)
        address rewardToken = stakingToken;

        // ====================================
        // STAKING RULES
        // ====================================
        // 🔒 SECURITY FIX: Prevent dust attacks (min 10 RWAN)
        uint256 minStakeAmount = 10e18;
        
        // 🔒 SECURITY FIX: Prevent position spam (max 50 positions per user)
        uint256 maxPositionsPerUser = 50;
        
        // Referral bonus: 500 bps = 5% of rewards
        // Referrer gets 5% extra from referral reserve when referee claims
        uint256 referralBps = 500;

        // ====================================
        // APR TIERS (based on Total Value Locked)
        // ====================================
        // As TVL grows, APR decreases (rewards dilution)
        // All values in token wei (18 decimals)
        
        uint256[] memory tierTVL = new uint256[](6);
        tierTVL[0] = 0;                    // From 0 TVL
        tierTVL[1] = 200_000_000e18;       // 200M tokens
        tierTVL[2] = 500_000_000e18;       // 500M tokens
        tierTVL[3] = 1_000_000_000e18;     // 1B tokens
        tierTVL[4] = 2_200_000_000e18;     // 2.2B tokens
        tierTVL[5] = 4_000_000_000e18;     // 4B tokens

        // APR rates in basis points (10000 = 100%)
        // These apply to 1.0x multiplier positions
        // Locked positions get these multiplied by their multiplier
        uint32[] memory tierAprBps = new uint32[](6);
        tierAprBps[0] = 1600;  // 16% APR at 0-200M TVL
        tierAprBps[1] = 1200;  // 12% APR at 200M-500M TVL
        tierAprBps[2] = 1000;  // 10% APR at 500M-1B TVL
        tierAprBps[3] = 800;   // 8% APR at 1B-2.2B TVL
        tierAprBps[4] = 600;   // 6% APR at 2.2B-4B TVL
        tierAprBps[5] = 400;   // 4% APR at 4B+ TVL

        // ====================================
        // DEPLOY
        // ====================================
        vm.startBroadcast();
        
        RWANSecureStakingV2 staking = new RWANSecureStakingV2(
            stakingToken,
            rewardToken,
            minStakeAmount,
            maxPositionsPerUser,
            tierTVL,
            tierAprBps,
            referralBps
        );

        vm.stopBroadcast();

        // ====================================
        // POST-DEPLOY INFO
        // ====================================
        console.log("========================================");
        console.log("RWAN Staking Contract Deployed");
        console.log("========================================");
        console.log("Contract address:", address(staking));
        console.log("Staking token:", stakingToken);
        console.log("Owner:", staking.owner());
        console.log("========================================");
        console.log("Default Lock Options:");
        console.log("  [0] Fixed (0 days, 1.0x multiplier)");
        console.log("  [1] 3 months (90 days, 2.0x multiplier)");
        console.log("  [2] 6 months (180 days, 4.0x multiplier)");
        console.log("========================================");
        console.log("Next steps:");
        console.log("1. Fund rewards: call fundRewards(amount)");
        console.log("2. Fund referral reserve: call fundReferralRewards(amount)");
        console.log("3. Update frontend .env with contract address");
        console.log("========================================");

        return staking;
    }
}
