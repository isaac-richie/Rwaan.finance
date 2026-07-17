// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {RWANSecureStakingV4} from "../contracts/RWANSecureStakingV4.sol";

/// @notice BSC Mainnet — deploys RWANSecureStakingV4 against the live RWAAN token.
///         Deployer must hold enough RWAAN to fund reserves (65M minimum).
///
/// forge script script/DeployRWANSecureStakingV4Mainnet.s.sol \
///   --rpc-url bsc --broadcast --verify -vvvv
contract DeployRWANSecureStakingV4Mainnet is Script {

    // Live RWAAN token on BSC mainnet (Rawli Analytics)
    address constant RWAAN_TOKEN = 0xACB921bf2Dac2F7E8E101AAd9CA013d6Af5C648a;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // ── 1) Staking contract ─────────────────────────────────────────
        // minStakeAmount = $20 worth of RWAAN at current price.
        // Update post-deploy via setMinStakeAmount() when price changes.
        // At deploy time: RWAAN ≈ $0.000077 → $20 ≈ 259,538 RWAAN
        uint256 minStake = 259_538 ether;

        RWANSecureStakingV4 staking = new RWANSecureStakingV4(
            RWAAN_TOKEN,
            RWAAN_TOKEN,
            deployer,
            minStake,  // minStakeAmount: ~$20 at deploy-time price
            10         // maxPositionsPerUser
        );

        // ── 2) 7 Plans (lock, dailyRateBps, earlyPenaltyBps, enabled) ──
        //       All adjustable post-deploy via updateStakePlan() with PARAMETER_ROLE
        staking.addStakePlan(0,        10,  0,    true);  // Plan 0: Flex      0.10%/day  no lock
        staking.addStakePlan(30 days,  30,  3500, true);  // Plan 1: Sprint    0.30%/day  35% penalty
        staking.addStakePlan(90 days,  40,  3500, true);  // Plan 2: Quarter   0.40%/day  35% penalty
        staking.addStakePlan(120 days, 50,  3500, true);  // Plan 3: Growth    0.50%/day  35% penalty
        staking.addStakePlan(180 days, 70,  3500, true);  // Plan 4: Season    0.70%/day  35% penalty
        staking.addStakePlan(360 days, 80,  3500, true);  // Plan 5: Year      0.80%/day  35% penalty
        staking.addStakePlan(720 days, 100, 3500, true);  // Plan 6: Market    1.00%/day  35% penalty

        // ── 3) Marketplace benefit on 720-day plan (index 6) ────────────
        //       10% instant cashback credit, VIP, claimable after unlock.
        staking.setMarketplaceBenefit(6, 1_000 ether, 0, 1_000, true, true, true);

        // ── 4) Affiliate schedule — 20 levels ──────────────────────────
        uint32[] memory levels = new uint32[](20);
        levels[0]  = 2_000;  // L1  20%
        levels[1]  = 1_500;  // L2  15%
        levels[2]  = 1_400;  // L3  14%
        levels[3]  = 1_200;  // L4  12%
        levels[4]  = 1_000;  // L5  10%
        levels[5]  =   800;  // L6   8%
        levels[6]  =   500;  // L7   5%
        levels[7]  =   500;  // L8   5%
        levels[8]  =   500;  // L9   5%
        levels[9]  =   500;  // L10  5%
        levels[10] =   150;  // L11  1.5%
        levels[11] =   150;  // L12  1.5%
        levels[12] =   150;  // L13  1.5%
        levels[13] =   150;  // L14  1.5%
        levels[14] =   150;  // L15  1.5%
        levels[15] =   100;  // L16  1%
        levels[16] =   100;  // L17  1%
        levels[17] =   100;  // L18  1%
        levels[18] =   100;  // L19  1%
        levels[19] =   100;  // L20  1%
        staking.setAffiliateLevels(levels, 20);
        staking.setMinReferralStake(2 ether);

        // ── 5) Rank tiers — 12 ranks ───────────────────────────────────
        //       teamStake = big leg + small leg combined
        //       weight is proportional to dollar award (adjustable post-deploy)
        //       NOTE: binary leg split (big/small) not enforced on-chain in V4;
        //       member count thresholds also not enforced — tracked off-chain.
        staking.setRankConfig(1,  2 ether,   100_000_000 ether,   100, true); // $100  | 70M big + 30M small
        staking.setRankConfig(2,  2 ether,   150_000_000 ether,   150, true); // $150  | 100M big + 50M small
        staking.setRankConfig(3,  2 ether,   200_000_000 ether,   200, true); // $200  | 100M big + 100M small
        staking.setRankConfig(4,  2 ether,   250_000_000 ether,   300, true); // $300  | 150M big + 100M small
        staking.setRankConfig(5,  2 ether,   300_000_000 ether,   350, true); // $350  | 200M big + 100M small
        staking.setRankConfig(6,  2 ether,   400_000_000 ether,   400, true); // $400  | 250M big + 150M small
        staking.setRankConfig(7,  2 ether,   500_000_000 ether,   500, true); // $500  | 300M big + 200M small
        staking.setRankConfig(8,  2 ether,   700_000_000 ether,   700, true); // $700  | 500M big + 200M small
        staking.setRankConfig(9,  2 ether,   900_000_000 ether,  1500, true); // $1500 | 500M big + 400M small
        staking.setRankConfig(10, 2 ether, 1_000_000_000 ether,  2500, true); // $2500 | 600M big + 400M small
        staking.setRankConfig(11, 2 ether, 2_000_000_000 ether,  4000, true); // $4000 | tricycle or $4K
        staking.setRankConfig(12, 2 ether, 3_000_000_000 ether,  8000, true); // $8000 | Jeep or $8K
        staking.setDailyRankBudget(500 ether);

        vm.stopBroadcast();

        console.log("=====================================================");
        console.log("RWAN V4 Staking deployed (BSC Mainnet)");
        console.log("=====================================================");
        console.log("Token (RWAAN):      ", RWAAN_TOKEN);
        console.log("Staking (V4):       ", address(staking));
        console.log("Admin/deployer:     ", deployer);
        console.log("Plans:              ", staking.stakePlansLength());
        console.log("Reserves:           fund manually via fundStakingRewards/fundAffiliateRewards/fundRankRewards/fundMarketplaceRewards");
        console.log("-----------------------------------------------------");
        console.log("Next:");
        console.log(" 1. Update .env: RWAN_V4_STAKING_ADDRESS + NEXT_PUBLIC_RWAN_V4_STAKING_ADDRESS");
        console.log(" 2. Verify staking contract on BSCScan");
        console.log(" 3. Transfer roles to multisig");
    }
}
