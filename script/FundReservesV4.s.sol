// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {RWANSecureStakingV4} from "../contracts/RWANSecureStakingV4.sol";

/// @notice Deposits RWAAN into the four V4 reserves with exact per-reserve
///         control via env vars (all in whole tokens, no decimals).
///
/// Defaults (whole RWAAN tokens):
///   FUND_STAKING_RWAAN      = 120000000   (120 M)
///   FUND_AFFILIATE_RWAAN    =  15400000   ( 15.4 M — 7.7% of 200 M)
///   FUND_RANK_RWAAN         =  15400000   ( 15.4 M — 7.7% of 200 M)
///   FUND_MARKETPLACE_RWAAN  =  15400000   ( 15.4 M — 7.7% of 200 M)
///   Total default deposit   = 166200000   (166.2 M)
///
/// Override any single reserve by exporting the matching env var before
/// running — unset vars fall back to the defaults above.
///
/// Usage (defaults):
///   forge script script/FundReservesV4.s.sol \
///     --rpc-url bsc --broadcast -vvvv
///
/// Usage (custom amounts):
///   FUND_STAKING_RWAAN=100000000 FUND_AFFILIATE_RWAAN=20000000 \
///   forge script script/FundReservesV4.s.sol \
///     --rpc-url bsc --broadcast -vvvv
contract FundReservesV4 is Script {

    uint256 constant DEFAULT_STAKING     = 120_000_000;
    uint256 constant DEFAULT_AFFILIATE   =  15_400_000;
    uint256 constant DEFAULT_RANK        =  15_400_000;
    uint256 constant DEFAULT_MARKETPLACE =  15_400_000;

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

        // Read whole-token amounts, then convert to wei (×1e18)
        uint256 stakingAmt     = _envOrDefault("FUND_STAKING_RWAAN",     DEFAULT_STAKING)     * 1 ether;
        uint256 affiliateAmt   = _envOrDefault("FUND_AFFILIATE_RWAAN",   DEFAULT_AFFILIATE)   * 1 ether;
        uint256 rankAmt        = _envOrDefault("FUND_RANK_RWAAN",         DEFAULT_RANK)        * 1 ether;
        uint256 marketplaceAmt = _envOrDefault("FUND_MARKETPLACE_RWAAN", DEFAULT_MARKETPLACE) * 1 ether;
        uint256 total          = stakingAmt + affiliateAmt + rankAmt + marketplaceAmt;

        uint256 balance = token.balanceOf(deployer);

        console.log("=====================================================");
        console.log("FundReservesV4 - pre-flight check");
        console.log("=====================================================");
        console.log("Deployer RWAAN balance:    ", balance / 1 ether, "RWAAN");
        console.log("Total to deposit:          ", total / 1 ether, "RWAAN");
        console.log("  Staking reserve:         ", stakingAmt / 1 ether);
        console.log("  Affiliate reserve:       ", affiliateAmt / 1 ether);
        console.log("  Rank reserve:            ", rankAmt / 1 ether);
        console.log("  Marketplace reserve:     ", marketplaceAmt / 1 ether);
        console.log("Remaining after deposit:   ", (balance - total) / 1 ether, "RWAAN");

        require(balance >= total, "FundReservesV4: deployer balance too low");

        vm.startBroadcast(deployerKey);

        token.approve(address(staking), total);
        staking.fundStakingRewards(stakingAmt);
        staking.fundAffiliateRewards(affiliateAmt);
        staking.fundRankRewards(rankAmt);
        staking.fundMarketplaceRewards(marketplaceAmt);

        vm.stopBroadcast();

        console.log("=====================================================");
        console.log("Reserves funded successfully");
        console.log("=====================================================");
        console.log("Staking reserve total:     ", staking.stakingRewardReserve() / 1 ether, "RWAAN");
        console.log("Affiliate reserve total:   ", staking.affiliateRewardReserve() / 1 ether, "RWAAN");
        console.log("Rank reserve total:        ", staking.rankRewardReserve() / 1 ether, "RWAAN");
        console.log("Marketplace reserve total: ", staking.marketplaceCreditReserve() / 1 ether, "RWAAN");
        console.log("Deployer RWAAN remaining:  ", token.balanceOf(deployer) / 1 ether, "RWAAN");
    }
}
