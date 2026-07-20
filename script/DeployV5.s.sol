// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {RWANSecureStakingV5} from "../contracts/RWANSecureStakingV5.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Deploys RWANSecureStakingV5 with full production config:
///         - 7 stake plans (Flex → 720d)
///         - 2% single-level affiliate
///         - 12 rank milestones
///         - 165k/day emission cap
///         - Funds reserves from deployer balance
///
/// Usage:
///   Dry-run:   forge script script/DeployV5.s.sol --rpc-url bsc -vvvv
///   Broadcast: forge script script/DeployV5.s.sol --rpc-url bsc --broadcast --verify -vvvv
contract DeployV5 is Script {
    address constant RWAAN_TOKEN = 0xACB921bf2Dac2F7E8E101AAd9CA013d6Af5C648a;

    uint256 constant MIN_STAKE = 100 ether;
    uint256 constant MAX_POSITIONS = 10;
    uint256 constant EMISSION_CAP = 165_000 ether;

    // Reserve funding (adjust before running)
    uint256 constant FUND_STAKING     = 140_000_000 ether;
    uint256 constant FUND_AFFILIATE   = 15_000_000 ether;
    uint256 constant FUND_RANK        = 15_000_000 ether;
    uint256 constant FUND_MARKETPLACE = 15_000_000 ether;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        IERC20 token = IERC20(RWAAN_TOKEN);
        uint256 totalFunding = FUND_STAKING + FUND_AFFILIATE + FUND_RANK + FUND_MARKETPLACE;

        console.log("=====================================================");
        console.log("DeployV5 - pre-flight");
        console.log("=====================================================");
        console.log("Deployer:          ", deployer);
        console.log("RWAAN token:       ", RWAAN_TOKEN);
        console.log("Deployer balance:  ", token.balanceOf(deployer) / 1 ether);
        console.log("Total to fund:     ", totalFunding / 1 ether);
        require(token.balanceOf(deployer) >= totalFunding, "insufficient RWAAN balance");

        vm.startBroadcast(deployerKey);

        // ── Deploy ──
        RWANSecureStakingV5 staking = new RWANSecureStakingV5(
            RWAAN_TOKEN, RWAAN_TOKEN, deployer, MIN_STAKE, MAX_POSITIONS
        );
        console.log("V5 deployed at:    ", address(staking));

        // ── Stake Plans ──
        staking.addStakePlan(0,        3,  0,    true);  // 0: Flex
        staking.addStakePlan(30 days,  7,  3500, true);  // 1: 30d
        staking.addStakePlan(90 days,  12, 3500, true);  // 2: 90d
        staking.addStakePlan(120 days, 14, 3500, true);  // 3: 120d
        staking.addStakePlan(180 days, 18, 3500, true);  // 4: 180d
        staking.addStakePlan(360 days, 23, 3500, true);  // 5: 360d
        staking.addStakePlan(720 days, 28, 3500, true);  // 6: 720d

        // ── Affiliate: 2% single-level ──
        uint32[] memory levels = new uint32[](1);
        levels[0] = 200;
        staking.setMaxAffiliateTotalBps(200);
        staking.setAffiliateLevels(levels, 1);

        // ── Emission Cap ──
        staking.setMaxDailyStakingEmission(EMISSION_CAP);

        // ── Milestones (RWAAN amounts — USD equivalent at deployment price) ──
        staking.setMilestone(1,  40_000_000 ether,    50_000 ether,    true);  // $50
        staking.setMilestone(2,  80_000_000 ether,    100_000 ether,   true);  // $100
        staking.setMilestone(3,  120_000_000 ether,   150_000 ether,   true);  // $150
        staking.setMilestone(4,  200_000_000 ether,   200_000 ether,   true);  // $200
        staking.setMilestone(5,  300_000_000 ether,   400_000 ether,   true);  // $400
        staking.setMilestone(6,  400_000_000 ether,   500_000 ether,   true);  // $500
        staking.setMilestone(7,  500_000_000 ether,   650_000 ether,   true);  // $650
        staking.setMilestone(8,  600_000_000 ether,   750_000 ether,   true);  // $750
        staking.setMilestone(9,  700_000_000 ether,   800_000 ether,   true);  // $800
        staking.setMilestone(10, 800_000_000 ether,   1_000_000 ether, true);  // $1000
        staking.setMilestone(11, 1_000_000_000 ether, 2_000_000 ether, true);  // $2000
        staking.setMilestone(12, 2_000_000_000 ether, 4_000_000 ether, true);  // $4000

        // ── Fund Reserves ──
        token.approve(address(staking), totalFunding);
        staking.fundStakingRewards(FUND_STAKING);
        staking.fundAffiliateRewards(FUND_AFFILIATE);
        staking.fundRankRewards(FUND_RANK);
        staking.fundMarketplaceRewards(FUND_MARKETPLACE);

        vm.stopBroadcast();

        // ── Verify ──
        console.log("=====================================================");
        console.log("DeployV5 - post-deploy verification");
        console.log("=====================================================");
        console.log("Contract address:       ", address(staking));
        console.log("stakePlansLength:       ", staking.stakePlansLength());
        console.log("milestonesCount:        ", staking.milestonesCount());
        console.log("affiliateLevelBps[0]:   ", staking.affiliateLevelBps(0));
        console.log("maxAffiliateDepth:      ", staking.maxAffiliateDepth());
        console.log("maxDailyStakingEmission:", staking.maxDailyStakingEmission() / 1 ether);
        console.log("stakingRewardReserve:   ", staking.stakingRewardReserve() / 1 ether);
        console.log("affiliateRewardReserve: ", staking.affiliateRewardReserve() / 1 ether);
        console.log("rankRewardReserve:      ", staking.rankRewardReserve() / 1 ether);
        console.log("marketplaceCreditRes:   ", staking.marketplaceCreditReserve() / 1 ether);
        console.log("Deployer remaining:     ", token.balanceOf(deployer) / 1 ether);
        console.log("");
        console.log("UPDATE .env with:");
        console.log("  NEXT_PUBLIC_RWAN_V5_STAKING_ADDRESS=", address(staking));
    }
}
