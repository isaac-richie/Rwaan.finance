// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {MockERC20} from "../contracts/MockERC20.sol";
import {RWANSecureStakingV4} from "../contracts/RWANSecureStakingV4.sol";

contract FeeOnTransferToken is ERC20 {
    constructor() ERC20("Fee RWAN", "fRWAN") {
        _mint(msg.sender, 1_000_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 amount) internal override {
        if (from != address(0) && to != address(0)) {
            uint256 fee = amount / 100;
            super._update(from, address(0xdead), fee);
            super._update(from, to, amount - fee);
        } else {
            super._update(from, to, amount);
        }
    }
}

contract ForceBNB {
    constructor() payable {}

    function force(address payable target) external {
        selfdestruct(target);
    }
}

/// @notice Characterizes incident behavior before production security patches are applied.
/// @dev Some tests intentionally prove known gaps; passing means the behavior was reproduced.
contract RWANSecureStakingV4RiskScenariosTest is Test {
    MockERC20 internal token;
    MockERC20 internal wrongToken;
    RWANSecureStakingV4 internal staking;

    address internal alice = address(0xA11CE);
    address internal guardian = address(0xBEEF);
    address internal treasury = address(0xCAFE);
    address internal attacker = address(0xBAD);

    function setUp() public {
        token = new MockERC20("RWAN", "RWAN", 1_000_000_000 ether);
        wrongToken = new MockERC20("Wrong Token", "WRONG", 1_000_000 ether);
        staking = new RWANSecureStakingV4(address(token), address(token), address(this), 100 ether, 20);

        staking.addStakePlan(0, 10, 0, true);
        staking.addStakePlan(30 days, 20, 3_500, true);

        uint32[] memory levels = new uint32[](1);
        levels[0] = 2_500;
        staking.setAffiliateLevels(levels, 1);

        staking.grantRole(staking.PAUSER_ROLE(), guardian);
        staking.grantRole(staking.TREASURY_ROLE(), treasury);

        token.transfer(alice, 100_000 ether);
        vm.prank(alice);
        token.approve(address(staking), type(uint256).max);
        token.approve(address(staking), type(uint256).max);
    }

    function testIncident_GlobalPauseStopsNormalFlowsAndPreservesEmergencyPrincipalExit() public {
        staking.fundStakingRewards(1_000 ether);
        vm.prank(alice);
        staking.stake(1_000 ether, 1, address(0));
        vm.warp(block.timestamp + 1 days);

        vm.prank(guardian);
        staking.pause();

        vm.prank(alice);
        vm.expectRevert();
        staking.claim(1);

        uint256 beforeBalance = token.balanceOf(alice);
        vm.prank(alice);
        staking.emergencyWithdraw(1);

        assertEq(token.balanceOf(alice) - beforeBalance, 1_000 ether);
        assertEq(staking.totalStaked(), 0);
        assertEq(staking.pendingRewards(1), 2 ether);

        vm.prank(guardian);
        staking.unpause();
        beforeBalance = token.balanceOf(alice);
        vm.prank(alice);
        staking.claim(1);
        assertEq(token.balanceOf(alice) - beforeBalance, 2 ether);
    }

    function testIncident_WithdrawalPauseEnablesVoluntaryPenaltyFreeEmergencyExit() public {
        vm.prank(alice);
        staking.stake(1_000 ether, 1, address(0));

        vm.prank(guardian);
        staking.setPauseFlags(false, false, true, false, false);

        uint256 beforeBalance = token.balanceOf(alice);
        vm.prank(alice);
        staking.emergencyWithdraw(1);
        assertEq(token.balanceOf(alice) - beforeBalance, 1_000 ether);
    }

    function testIncident_ClaimsPausePreservesRewardDebtAfterPrincipalExit() public {
        staking.fundStakingRewards(1_000 ether);
        vm.prank(alice);
        staking.stake(1_000 ether, 0, address(0));
        vm.warp(block.timestamp + 10 days);
        assertGt(staking.pendingRewards(1), 0);

        vm.prank(guardian);
        staking.setPauseFlags(false, true, false, false, false);

        uint256 reserveBefore = staking.stakingRewardReserve();
        vm.prank(alice);
        staking.withdraw(1);

        assertEq(staking.stakingRewardReserve(), reserveBefore);
        assertEq(staking.pendingRewards(1), 10 ether);

        vm.prank(guardian);
        staking.setPauseFlags(false, false, false, false, false);
        uint256 beforeBalance = token.balanceOf(alice);
        vm.prank(alice);
        staking.claim(1);
        assertEq(token.balanceOf(alice) - beforeBalance, 10 ether);
    }

    function testRescue_WrongERC20DepositCanBeFullyRecoveredByTreasury() public {
        wrongToken.transfer(address(staking), 777 ether);
        assertEq(staking.surplusTokenBalance(address(wrongToken)), 777 ether);

        vm.prank(treasury);
        staking.recoverSurplusERC20(address(wrongToken), treasury, 777 ether);
        assertEq(wrongToken.balanceOf(treasury), 777 ether);
    }

    function testRescue_AccidentalRWANCanBeRecoveredButPrincipalCannot() public {
        vm.prank(alice);
        staking.stake(1_000 ether, 0, address(0));

        token.transfer(address(staking), 50 ether);
        assertEq(staking.surplusTokenBalance(address(token)), 50 ether);

        vm.prank(treasury);
        vm.expectRevert("exceeds surplus");
        staking.recoverSurplusERC20(address(token), treasury, 51 ether);

        vm.prank(treasury);
        staking.recoverSurplusERC20(address(token), treasury, 50 ether);
        assertEq(staking.protectedTokenBalance(address(token)), 1_000 ether);
    }

    function testRescue_AllocatedMarketplaceCreditCannotBeRecoveredAsSurplus() public {
        staking.setMarketplaceBenefit(1, 1_000 ether, 5, 1_000, true, true, true);
        staking.fundMarketplaceRewards(100 ether);

        vm.prank(alice);
        staking.stake(1_000 ether, 1, address(0));

        assertEq(staking.marketplaceCreditAllocated(), 100 ether);
        assertEq(staking.marketplaceCreditReserve(), 0);
        assertEq(staking.surplusTokenBalance(address(token)), 0);

        vm.prank(treasury);
        vm.expectRevert("marketplace reserve low");
        staking.withdrawMarketplaceRewardReserve(treasury, 1);
    }

    function testIncident_EmergencyExitReleasesAllocatedMarketplaceCredit() public {
        staking.setMarketplaceBenefit(1, 1_000 ether, 5, 1_000, true, true, true);
        staking.fundMarketplaceRewards(100 ether);
        vm.prank(alice);
        staking.stake(1_000 ether, 1, address(0));

        vm.prank(guardian);
        staking.pause();
        vm.prank(alice);
        staking.emergencyWithdraw(1);

        assertEq(staking.marketplaceCreditAllocated(), 0);
        assertEq(staking.marketplaceCreditReserve(), 100 ether);
    }

    function testRoles_PauserCannotRescueOrReconfigureFunds() public {
        wrongToken.transfer(address(staking), 10 ether);

        vm.startPrank(guardian);
        vm.expectRevert();
        staking.recoverSurplusERC20(address(wrongToken), guardian, 10 ether);
        vm.expectRevert();
        staking.setMinStakeAmount(1);
        vm.stopPrank();
    }

    function testRoles_UnauthorizedAccountCannotPauseRescueOrConfigure() public {
        vm.startPrank(attacker);
        vm.expectRevert();
        staking.pause();
        vm.expectRevert();
        staking.recoverSurplusERC20(address(wrongToken), attacker, 1);
        vm.expectRevert();
        staking.setPauseFlags(true, true, true, true, true);
        vm.stopPrank();
    }

    function testGovernance_GlobalPauseBlocksTreasuryUntilIncidentIsCleared() public {
        staking.fundStakingRewards(100 ether);
        vm.prank(guardian);
        staking.pause();

        vm.prank(treasury);
        vm.expectRevert();
        staking.withdrawStakingRewardReserve(treasury, 100 ether);

        vm.expectRevert();
        staking.setMinStakeAmount(1 ether);

        vm.prank(guardian);
        staking.unpause();
        vm.prank(treasury);
        staking.withdrawStakingRewardReserve(treasury, 100 ether);
        assertEq(staking.stakingRewardReserve(), 0);
    }

    function testRegression_FeeOnTransferTokenIsRejectedBeforeAccounting() public {
        FeeOnTransferToken feeToken = new FeeOnTransferToken();
        RWANSecureStakingV4 feeStaking =
            new RWANSecureStakingV4(address(feeToken), address(feeToken), address(this), 100 ether, 10);
        feeStaking.addStakePlan(0, 10, 0, true);
        feeToken.mint(alice, 1_000 ether);

        vm.startPrank(alice);
        feeToken.approve(address(feeStaking), type(uint256).max);
        vm.expectRevert("unsupported token transfer");
        feeStaking.stake(1_000 ether, 0, address(0));
        vm.stopPrank();

        assertEq(feeStaking.totalStaked(), 0);
        assertEq(feeToken.balanceOf(address(feeStaking)), 0);

        feeToken.approve(address(feeStaking), type(uint256).max);
        vm.expectRevert("unsupported token transfer");
        feeStaking.fundStakingRewards(1_000 ether);
        assertEq(feeStaking.stakingRewardReserve(), 0);
    }

    function testRescue_ForcedBNBCanBeRecoveredByTreasury() public {
        ForceBNB force = new ForceBNB{value: 1 ether}();
        force.force(payable(address(staking)));
        assertEq(address(staking).balance, 1 ether);

        uint256 beforeBalance = treasury.balance;
        vm.prank(treasury);
        staking.recoverNative(payable(treasury), 1 ether);
        assertEq(treasury.balance - beforeBalance, 1 ether);
        assertEq(address(staking).balance, 0);
    }

    function testRegression_LiveRankConfigUsesPerUserSnapshotsUntilRefresh() public {
        staking.setRankConfig(1, 0, 0, 1_000, true);
        vm.prank(alice);
        staking.stake(1_000 ether, 0, address(0));
        staking.setUserRank(alice, 1);
        assertEq(staking.totalRankWeight(), 1_000);

        staking.setRankConfig(1, 0, 0, 5_000, true);
        assertEq(staking.totalRankWeight(), 1_000);
        assertEq(staking.userRankWeight(alice), 1_000);

        staking.setUserRank(alice, 1);
        assertEq(staking.totalRankWeight(), 5_000);
        assertEq(staking.userRankWeight(alice), 5_000);
    }
}
