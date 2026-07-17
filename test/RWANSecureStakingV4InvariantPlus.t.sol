// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/MockERC20.sol";
import "../contracts/RWANSecureStakingV4.sol";

/// @notice Deep stateful-fuzzing handler exercising the FULL surface:
/// staking, referrals/affiliate payouts, marketplace credits, ranks,
/// treasury withdrawals, emission caps and pause toggles — with ghost
/// accounting for solvency, marketplace and rank-weight conservation.
contract RWANV4PlusHandler is Test {
    MockERC20 public token;
    RWANSecureStakingV4 public staking;

    address[] public users;
    uint256[] public positionIds;
    mapping(uint256 => bool) public isActive;

    // ghost accounting
    uint256 public ghostPrincipal; // Σ active principal
    uint256 public ghostFunded; // Σ reward tokens ever funded into reserves
    uint256 public ghostTreasuryOut; // Σ reward tokens pulled by treasury
    uint256 public ghostPenaltyRefill; // Σ early penalty recycled into staking reserve

    uint256 internal constant N = 6;

    constructor(MockERC20 token_, RWANSecureStakingV4 staking_, uint256 initialFunded_) {
        token = token_;
        staking = staking_;
        ghostFunded = initialFunded_; // reserves seeded in setUp before this handler existed
        for (uint256 i = 0; i < N; i++) {
            address u = address(uint160(0x7000 + i));
            users.push(u);
            token.mint(u, 5_000_000 ether);
            vm.prank(u);
            token.approve(address(staking), type(uint256).max);
        }
    }

    function _user(uint256 s) internal view returns (address) {
        return users[s % users.length];
    }

    function _warp(uint256 s) internal {
        vm.warp(block.timestamp + bound(s, 0, 20 days));
    }

    // ---- money flows -------------------------------------------------
    function stake(uint256 who, uint256 amt, uint256 planS, uint256 refS, uint256 warpS) external {
        _warp(warpS);
        address u = _user(who);
        uint256 plan = planS % staking.stakePlansLength();
        uint256 amount = bound(amt, 100 ether, 200_000 ether);
        address ref = (refS % 3 == 0) ? _user(refS >> 8) : address(0);
        if (ref == u) ref = address(0);

        vm.prank(u);
        try staking.stake(amount, plan, ref) {
            uint256 id = staking.nextPositionId() - 1;
            positionIds.push(id);
            isActive[id] = true;
            ghostPrincipal += amount;
        } catch {}
    }

    function claim(uint256 idS, uint256 warpS) external {
        if (positionIds.length == 0) return;
        _warp(warpS);
        uint256 id = positionIds[idS % positionIds.length];
        if (!isActive[id]) return;
        (address owner,,,,,,, bool wd) = staking.positions(id);
        if (wd) return;
        vm.prank(owner);
        try staking.claim(id) {} catch {}
    }

    function claimMarketplace(uint256 idS) external {
        if (positionIds.length == 0) return;
        uint256 id = positionIds[idS % positionIds.length];
        if (!isActive[id]) return;
        (address owner,,,,,,, bool wd) = staking.positions(id);
        if (wd) return;
        vm.prank(owner);
        try staking.claimMarketplaceCredit(id) {} catch {}
    }

    function withdraw(uint256 idS, uint256 warpS) external {
        if (positionIds.length == 0) return;
        uint256 id = positionIds[idS % positionIds.length];
        if (!isActive[id]) return;
        (address owner, uint256 amount,, uint64 unlock,,,, bool wd) = staking.positions(id);
        if (wd) return;
        if (unlock > block.timestamp) vm.warp(uint256(unlock) + bound(warpS, 0, 5 days));
        else _warp(warpS);
        vm.prank(owner);
        try staking.withdraw(id) {
            isActive[id] = false;
            ghostPrincipal -= amount;
        } catch {}
    }

    function withdrawEarly(uint256 idS, uint256 warpS) external {
        if (positionIds.length == 0) return;
        _warp(warpS);
        uint256 id = positionIds[idS % positionIds.length];
        if (!isActive[id]) return;
        (address owner, uint256 amount,, uint64 unlock,, uint32 planId,, bool wd) = staking.positions(id);
        if (wd || unlock == 0 || block.timestamp >= unlock) return;
        (,, uint32 penaltyBps,) = staking.stakePlans(planId);
        vm.prank(owner);
        try staking.withdrawEarly(id) {
            isActive[id] = false;
            ghostPrincipal -= amount;
            ghostPenaltyRefill += (amount * penaltyBps) / 10_000; // same token => recycled
        } catch {}
    }

    // ---- reserves / treasury ----------------------------------------
    function fund(uint256 amtS) external {
        uint256 amount = bound(amtS, 1 ether, 500_000 ether);
        token.mint(address(this), amount * 4);
        token.approve(address(staking), type(uint256).max);
        staking.fundStakingRewards(amount);
        staking.fundAffiliateRewards(amount);
        staking.fundRankRewards(amount);
        staking.fundMarketplaceRewards(amount);
        ghostFunded += amount * 4;
    }

    function treasuryWithdraw(uint256 sel, uint256 amtS) external {
        uint256 amount = bound(amtS, 1 ether, 1_000 ether);
        uint256 which = sel % 4;
        if (which == 0 && staking.stakingRewardReserve() >= amount) {
            staking.withdrawStakingRewardReserve(address(0xDEAD), amount);
            ghostTreasuryOut += amount;
        } else if (which == 1 && staking.affiliateRewardReserve() >= amount) {
            staking.withdrawAffiliateRewardReserve(address(0xDEAD), amount);
            ghostTreasuryOut += amount;
        } else if (which == 2 && staking.rankRewardReserve() >= amount) {
            staking.withdrawRankRewardReserve(address(0xDEAD), amount);
            ghostTreasuryOut += amount;
        } else if (which == 3 && staking.marketplaceCreditReserve() >= amount) {
            staking.withdrawMarketplaceRewardReserve(address(0xDEAD), amount);
            ghostTreasuryOut += amount;
        }
    }

    // ---- ranks -------------------------------------------------------
    function assignRank(uint256 who, uint256 rankS) external {
        address u = _user(who);
        uint32 rankId = uint32(bound(rankS, 0, 3));
        try staking.setUserRank(u, rankId) {} catch {}
    }

    function claimRank(uint256 who, uint256 warpS) external {
        _warp(warpS);
        address u = _user(who);
        vm.prank(u);
        try staking.claimRankReward() {} catch {}
    }

    // ---- config churn ------------------------------------------------
    function setEmission(uint256 amtS) external {
        staking.setMaxDailyStakingEmission(bound(amtS, 0, 1_000_000 ether));
    }

    function togglePause(uint256 f) external {
        staking.setPauseFlags(f & 1 == 1, f & 2 == 2, f & 4 == 4, f & 8 == 8, f & 16 == 16);
    }

    // ---- views for invariants ---------------------------------------
    function usersLength() external view returns (uint256) {
        return users.length;
    }

    function positionCount() external view returns (uint256) {
        return positionIds.length;
    }

    function positionAt(uint256 i) external view returns (uint256) {
        return positionIds[i];
    }
}

contract RWANSecureStakingV4InvariantPlus is Test {
    MockERC20 public token;
    RWANSecureStakingV4 public staking;
    RWANV4PlusHandler public handler;

    uint256 internal constant MAX_RATE = 100; // MAX_DAILY_RATE_BPS

    function setUp() public {
        token = new MockERC20("RWAN", "RWAN", 5_000_000_000 ether);
        staking = new RWANSecureStakingV4(address(token), address(token), address(this), 100 ether, 0);

        // plans: flexible, 30d locked+penalty, 720d marketplace tier
        staking.addStakePlan(0, 10, 0, true);
        staking.addStakePlan(30 days, 20, 3500, true);
        staking.addStakePlan(720 days, 85, 5000, true);

        // marketplace benefit on the 720d plan
        staking.setMarketplaceBenefit(2, 1_000 ether, 5, 1000, true, true, true);

        // rank tiers
        staking.setRankConfig(1, 0, 0, 3_000, true);
        staking.setRankConfig(2, 0, 0, 6_000, true);
        staking.setRankConfig(3, 0, 0, 10_000, true);
        staking.setDailyRankBudget(50 ether);

        // affiliate: 3 levels
        uint32[] memory levels = new uint32[](3);
        levels[0] = 1000;
        levels[1] = 500;
        levels[2] = 250;
        staking.setAffiliateLevels(levels, 3);

        token.approve(address(staking), type(uint256).max);
        staking.fundStakingRewards(2_000_000 ether);
        staking.fundAffiliateRewards(500_000 ether);
        staking.fundRankRewards(500_000 ether);
        staking.fundMarketplaceRewards(500_000 ether);

        handler = new RWANV4PlusHandler(token, staking, 3_500_000 ether);
        // let the handler drive admin-gated flows (ranks, treasury, config)
        staking.grantRole(staking.PARAMETER_ROLE(), address(handler));
        staking.grantRole(staking.TREASURY_ROLE(), address(handler));
        staking.grantRole(staking.PAUSER_ROLE(), address(handler));

        targetContract(address(handler));
    }

    function _liabilities() internal view returns (uint256) {
        return
            staking.stakingRewardReserve() +
            staking.affiliateRewardReserve() +
            staking.rankRewardReserve() +
            staking.rankRewardAllocated() +
            staking.marketplaceCreditReserve() +
            staking.marketplaceCreditAllocated();
    }

    /// The contract must always hold enough token to cover principal + every
    /// reward liability bucket (same-token deployment => both apply).
    function invariant_Solvency() public view {
        uint256 need = staking.totalStaked() + _liabilities();
        assertGe(token.balanceOf(address(staking)), need, "insolvent");
    }

    /// totalStaked equals the sum of every user's tracked stake.
    function invariant_TotalStakedEqualsSumOfUsers() public view {
        uint256 sum;
        uint256 n = handler.usersLength();
        for (uint256 i = 0; i < n; i++) {
            sum += staking.totalUserStaked(handler.users(i));
        }
        assertEq(sum, staking.totalStaked(), "user stake sum mismatch");
        assertEq(staking.totalStaked(), handler.ghostPrincipal(), "ghost principal mismatch");
    }

    /// marketplaceCreditAllocated equals the sum of still-locked, unclaimed credits.
    function invariant_MarketplaceAllocationMatchesLockedCredits() public view {
        uint256 sum;
        uint256 count = handler.positionCount();
        for (uint256 i = 0; i < count; i++) {
            uint256 id = handler.positionAt(i);
            (,,,,,,, bool withdrawn) = staking.positions(id);
            if (withdrawn) continue;
            if (staking.marketplaceCreditClaimed(id)) continue;
            sum += staking.marketplaceCreditForPosition(id);
        }
        assertEq(sum, staking.marketplaceCreditAllocated(), "marketplace allocation drift");
    }

    /// totalRankWeight equals the sum of every user's *effective* rank weight.
    function invariant_RankWeightMatchesUsers() public view {
        uint256 sum;
        uint256 n = handler.usersLength();
        for (uint256 i = 0; i < n; i++) {
            (uint32 rankId,,) = staking.userRanks(handler.users(i));
            if (rankId == 0) continue;
            (,, uint32 weightBps, bool enabled) = staking.rankConfigs(rankId);
            if (enabled) sum += weightBps;
        }
        assertEq(sum, staking.totalRankWeight(), "rank weight drift");
    }

    /// No live position ever carries a snapshot rate above the hard cap.
    function invariant_PositionRateWithinCap() public view {
        uint256 count = handler.positionCount();
        for (uint256 i = 0; i < count; i++) {
            uint256 id = handler.positionAt(i);
            if (staking.positionRewardRateSet(id)) {
                assertLe(staking.positionRewardRateBps(id), MAX_RATE, "rate over cap");
            }
        }
    }

    /// Reward-liability conservation: current buckets == funded + recycled
    /// penalties - treasury withdrawals - everything paid out to users.
    /// (payouts derived as the residual; asserts it can never exceed inflows.)
    function invariant_LiabilitiesNeverExceedInflows() public view {
        uint256 inflow = handler.ghostFunded() + handler.ghostPenaltyRefill();
        uint256 outflow = handler.ghostTreasuryOut();
        // reserves can only shrink from their funded level via payouts/withdrawals
        assertLe(_liabilities() + outflow, inflow + 1, "liabilities exceed inflows");
    }
}
