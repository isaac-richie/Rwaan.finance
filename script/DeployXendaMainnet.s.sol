// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {MockERC20} from "../contracts/MockERC20.sol";
import {RWANSecureStakingV4} from "../contracts/RWANSecureStakingV4.sol";

/// @notice BSC Mainnet — deploys XERA token (1B supply) + V4 staking with
///         7 production plans, marketplace benefit, 20 affiliate levels,
///         9 rank tiers, and fully funded reserves.
///
/// forge script script/DeployXendaMainnet.s.sol \
///   --rpc-url bsc --broadcast --verify -vvvv
contract DeployXendaMainnet is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // ── 1) Token — 1 billion supply ─────────────────────────────────
        MockERC20 token = new MockERC20("Xera", "XERA", 1_000_000_000 ether);

        // ── 2) Staking contract ─────────────────────────────────────────
        RWANSecureStakingV4 staking = new RWANSecureStakingV4(
            address(token),
            address(token),
            deployer,
            2 ether,     // minStakeAmount: 2 XERA
            10           // maxPositionsPerUser
        );

        // ── 3) 7 Production plans (lock, dailyRateBps, penaltyBps) ─────
        staking.addStakePlan(0,         20,  0,    true);  // Plan 0: Flex       0.20%/day
        staking.addStakePlan(30 days,   40,  3500, true);  // Plan 1: Sprint     0.40%/day  35% penalty
        staking.addStakePlan(90 days,   60,  3500, true);  // Plan 2: Quarter    0.60%/day  35% penalty
        staking.addStakePlan(120 days,  80,  3500, true);  // Plan 3: Growth     0.80%/day  35% penalty
        staking.addStakePlan(180 days,  100, 3500, true);  // Plan 4: Season     1.00%/day  35% penalty
        staking.addStakePlan(360 days,  125, 3500, true);  // Plan 5: Year       1.25%/day  35% penalty
        staking.addStakePlan(720 days,  205, 3500, true);  // Plan 6: Market     2.05%/day  35% penalty

        // ── 4) Marketplace benefit on 720-day plan (index 6) ────────────
        //       10% cashback credit, VIP, claim after unlock.
        staking.setMarketplaceBenefit(6, 1_000 ether, 0, 1_000, true, true, true);

        // ── 5) Affiliate schedule — 20 levels ──────────────────────────
        uint32[] memory levels = new uint32[](20);
        levels[0]  = 2_000;  // L1  20%
        levels[1]  = 1_500;  // L2  15%
        levels[2]  = 1_500;  // L3  15%
        levels[3]  = 1_000;  // L4  10%
        levels[4]  = 1_000;  // L5  10%
        levels[5]  = 1_000;  // L6  10%
        levels[6]  =   500;  // L7   5%
        levels[7]  =   500;  // L8   5%
        levels[8]  =   500;  // L9   5%
        levels[9]  =   500;  // L10  5%
        levels[10] =   200;  // L11  2%
        levels[11] =   200;  // L12  2%
        levels[12] =   200;  // L13  2%
        levels[13] =   200;  // L14  2%
        levels[14] =   200;  // L15  2%
        levels[15] =   200;  // L16  2%
        levels[16] =   200;  // L17  2%
        levels[17] =   200;  // L18  2%
        levels[18] =   200;  // L19  2%
        levels[19] =   200;  // L20  2%
        staking.setAffiliateLevels(levels, 20);
        staking.setMinReferralStake(2 ether);

        // ── 6) Rank tiers — 9 ranks ────────────────────────────────────
        //       Weights: 10/15/20/25/30/35/40/45/50% of daily rank budget
        //       Thresholds: personalStake / teamStake (to be finalized)
        staking.setRankConfig(1,  20_000_000 ether,  1_000_000 ether,  1_000, true);
        staking.setRankConfig(2,  40_000_000 ether,  5_000_000 ether,  1_500, true);
        staking.setRankConfig(3,  60_000_000 ether, 10_000_000 ether,  2_000, true);
        staking.setRankConfig(4,  80_000_000 ether, 20_000_000 ether,  2_500, true);
        staking.setRankConfig(5, 100_000_000 ether, 30_000_000 ether,  3_000, true);
        staking.setRankConfig(6, 150_000_000 ether, 50_000_000 ether,  3_500, true);
        staking.setRankConfig(7, 200_000_000 ether, 75_000_000 ether,  4_000, true);
        staking.setRankConfig(8, 300_000_000 ether,100_000_000 ether,  4_500, true);
        staking.setRankConfig(9, 500_000_000 ether,200_000_000 ether,  5_000, true);
        staking.setDailyRankBudget(500 ether);

        // ── 7) Fund reserves ────────────────────────────────────────────
        token.approve(address(staking), type(uint256).max);
        staking.fundStakingRewards(50_000_000 ether);
        staking.fundAffiliateRewards(5_000_000 ether);
        staking.fundRankRewards(5_000_000 ether);
        staking.fundMarketplaceRewards(5_000_000 ether);

        vm.stopBroadcast();

        console.log("=====================================================");
        console.log("XERA deployment complete (BSC Mainnet)");
        console.log("=====================================================");
        console.log("Token (XERA):       ", address(token));
        console.log("Staking (V4):       ", address(staking));
        console.log("Admin/deployer:     ", deployer);
        console.log("Plans:              ", staking.stakePlansLength());
        console.log("Staking reserve:    ", staking.stakingRewardReserve());
        console.log("Affiliate reserve:  ", staking.affiliateRewardReserve());
        console.log("Rank reserve:       ", staking.rankRewardReserve());
        console.log("Deployer balance:   ", token.balanceOf(deployer));
        console.log("-----------------------------------------------------");
        console.log("Next:");
        console.log(" 1. Update .env with new token + staking addresses");
        console.log(" 2. Verify both contracts on BSCScan");
        console.log(" 3. Transfer roles to multisig");
    }
}
