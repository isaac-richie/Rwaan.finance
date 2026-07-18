// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {RWANSecureStakingV4} from "../contracts/RWANSecureStakingV4.sol";

/// @notice Tops up V4 reserves. Zero amounts are skipped, so any split works.
///
/// Defaults (whole RWAAN tokens):
///   TOPUP_STAKING_RWAAN     = 20000000  (20 M -> staking reward reserve)
///   TOPUP_AFFILIATE_RWAAN   = 0
///   TOPUP_RANK_RWAAN        = 0
///   TOPUP_MARKETPLACE_RWAAN = 0
///
/// Usage (defaults):
///   forge script script/TopUpReservesV4.s.sol --rpc-url bsc --broadcast -vvvv
///
/// Usage (custom split):
///   TOPUP_STAKING_RWAAN=15000000 TOPUP_MARKETPLACE_RWAAN=5000000 \
///   forge script script/TopUpReservesV4.s.sol --rpc-url bsc --broadcast -vvvv
contract TopUpReservesV4 is Script {

    function _envOrDefault(string memory key, uint256 def) internal view returns (uint256) {
        try vm.envUint(key) returns (uint256 v) { return v; } catch { return def; }
    }

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        RWANSecureStakingV4 staking = RWANSecureStakingV4(
            vm.envAddress("RWAN_V4_STAKING_ADDRESS")
        );
        IERC20 token = IERC20(address(staking.stakingToken()));

        uint256 stakingAmt     = _envOrDefault("TOPUP_STAKING_RWAAN",     20_000_000) * 1 ether;
        uint256 affiliateAmt   = _envOrDefault("TOPUP_AFFILIATE_RWAAN",   0)          * 1 ether;
        uint256 rankAmt        = _envOrDefault("TOPUP_RANK_RWAAN",        0)          * 1 ether;
        uint256 marketplaceAmt = _envOrDefault("TOPUP_MARKETPLACE_RWAAN", 0)          * 1 ether;
        uint256 total          = stakingAmt + affiliateAmt + rankAmt + marketplaceAmt;

        uint256 balance = token.balanceOf(deployer);

        console.log("=====================================================");
        console.log("TopUpReservesV4 - pre-flight check");
        console.log("=====================================================");
        console.log("Deployer RWAAN balance:    ", balance / 1 ether);
        console.log("Total to deposit:          ", total / 1 ether);
        console.log("  -> Staking reserve:      ", stakingAmt / 1 ether);
        console.log("  -> Affiliate reserve:    ", affiliateAmt / 1 ether);
        console.log("  -> Rank reserve:         ", rankAmt / 1 ether);
        console.log("  -> Marketplace reserve:  ", marketplaceAmt / 1 ether);
        console.log("Remaining after deposit:   ", (balance - total) / 1 ether);

        require(total > 0, "TopUpReservesV4: nothing to deposit");
        require(balance >= total, "TopUpReservesV4: deployer balance too low");

        vm.startBroadcast(deployerKey);

        token.approve(address(staking), total);
        if (stakingAmt > 0)     staking.fundStakingRewards(stakingAmt);
        if (affiliateAmt > 0)   staking.fundAffiliateRewards(affiliateAmt);
        if (rankAmt > 0)        staking.fundRankRewards(rankAmt);
        if (marketplaceAmt > 0) staking.fundMarketplaceRewards(marketplaceAmt);

        vm.stopBroadcast();

        console.log("=====================================================");
        console.log("Reserves after top-up");
        console.log("=====================================================");
        console.log("Staking reserve:     ", staking.stakingRewardReserve() / 1 ether);
        console.log("Affiliate reserve:   ", staking.affiliateRewardReserve() / 1 ether);
        console.log("Rank reserve:        ", staking.rankRewardReserve() / 1 ether);
        console.log("Marketplace reserve: ", staking.marketplaceCreditReserve() / 1 ether);
        console.log("Deployer remaining:  ", token.balanceOf(deployer) / 1 ether);
        console.log("");
        console.log("REMINDER: raise the emission cap to match the bigger");
        console.log("reserve: cap = stakingRewardReserve / 730 days.");
    }
}
