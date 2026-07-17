// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {RWANSecureStakingV4} from "../contracts/RWANSecureStakingV4.sol";
import {MockERC20} from "../contracts/MockERC20.sol";

/// @notice One-shot BSC-testnet bring-up for RWANSecureStakingV4.
/// Deploys a faucet test token, the staking contract, all plans, the
/// marketplace benefit, funds every reserve, and applies affiliate + rank
/// config — so the frontend is immediately clickable end-to-end.
///
/// Run:
///   forge script script/DeployRWANSecureStakingV4Testnet.s.sol \
///     --rpc-url bsc_testnet --broadcast --verify -vvvv
///
/// Requires env: DEPLOYER_PRIVATE_KEY (a funded tBNB account), BSCSCAN_API_KEY.
contract DeployRWANSecureStakingV4Testnet is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // 1) Faucet test token (open mint) — stands in for RWAN on testnet.
        MockERC20 token = new MockERC20("RWAN Test", "tRWAN", 1_000_000_000 ether);

        // 2) Staking contract (same token for stake + reward, as in production).
        RWANSecureStakingV4 staking = new RWANSecureStakingV4(
            address(token),
            address(token),
            deployer, // admin (holds all roles; move to multisig later)
            100 ether, // minStakeAmount
            10 // maxPositionsPerUser
        );

        // 3) Plans — mirror the frontend's six lanes (lock, dailyRateBps, penaltyBps).
        staking.addStakePlan(0, 10, 0, true); //  Flex        0.10%/day
        staking.addStakePlan(30 days, 20, 3500, true); //  Sprint    0.20%/day
        staking.addStakePlan(90 days, 30, 3500, true); //  Quarter   0.30%/day
        staking.addStakePlan(180 days, 50, 4000, true); //  Season    0.50%/day
        staking.addStakePlan(360 days, 70, 4500, true); //  Year      0.70%/day
        staking.addStakePlan(720 days, 85, 5000, true); //  Market    0.85%/day
        staking.addStakePlan(5 minutes, 100, 3000, true); // Quick     1.00%/day (5-min lock for testing)

        // 4) Marketplace benefit on the 720-day plan: 10% credit, VIP, claim-after-unlock.
        staking.setMarketplaceBenefit(5, 1_000 ether, 0, 1_000, true, true, true);

        // 5) Affiliate schedule (3 levels) + a few rank tiers.
        uint32[] memory levels = new uint32[](3);
        levels[0] = 1_000; // L1 10%
        levels[1] = 500; //  L2  5%
        levels[2] = 250; //  L3  2.5%
        staking.setAffiliateLevels(levels, 3);
        staking.setMinReferralStake(100 ether);

        staking.setRankConfig(1, 1_000 ether, 5_000 ether, 3_000, true);
        staking.setRankConfig(2, 5_000 ether, 25_000 ether, 6_000, true);
        staking.setRankConfig(3, 20_000 ether, 100_000 ether, 10_000, true);
        staking.setDailyRankBudget(500 ether);

        // 6) Fund every reserve so rewards actually pay out on testnet.
        token.approve(address(staking), type(uint256).max);
        staking.fundStakingRewards(50_000_000 ether);
        staking.fundAffiliateRewards(5_000_000 ether);
        staking.fundRankRewards(5_000_000 ether);
        staking.fundMarketplaceRewards(5_000_000 ether);

        vm.stopBroadcast();

        console.log("=====================================================");
        console.log("RWAN V4 testnet deployment complete");
        console.log("=====================================================");
        console.log("Test token (tRWAN): ", address(token));
        console.log("Staking (V4):       ", address(staking));
        console.log("Admin/deployer:     ", deployer);
        console.log("Plans:              ", staking.stakePlansLength());
        console.log("Staking reserve:    ", staking.stakingRewardReserve());
        console.log("-----------------------------------------------------");
        console.log("Next:");
        console.log(" 1. Set NEXT_PUBLIC_RWAN_V4_STAKING_ADDRESS to the staking addr");
        console.log(" 2. Anyone can mint tRWAN: token.mint(you, amount) for testing");
        console.log(" 3. Point the leaderboard indexer at the staking addr + this block");
    }
}
