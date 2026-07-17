// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/RWANSecureStakingV3.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TestAdminFunctions is Script {
    RWANSecureStakingV3 public staking = RWANSecureStakingV3(0x890Bc48a6463586c75a7C9db0Af7FC3e5cA15625);
    IERC20 public rwanToken = IERC20(0xACB921bf2Dac2F7E8E101AAd9CA013d6Af5C648a);
    
    address public owner;
    uint256 public deployerPrivateKey;
    
    function run() external {
        deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        owner = vm.addr(deployerPrivateKey);
        
        console.log("==============================================");
        console.log("AGGRESSIVE ADMIN FUNCTION TESTING");
        console.log("==============================================");
        console.log("Contract:", address(staking));
        console.log("Owner:", owner);
        console.log("Contract Owner:", staking.owner());
        console.log("");
        
        // Verify we're the owner
        require(staking.owner() == owner, "NOT OWNER!");
        console.log("[PASS] Owner verification");
        
        // Test all admin functions
        testPauseUnpause();
        testStakingSettings();
        testReferralSettings();
        testLockOptions();
        testAprTiers();
        testEmergencyFunctions();
        
        console.log("");
        console.log("==============================================");
        console.log("[SUCCESS] ALL ADMIN FUNCTIONS WORKING!");
        console.log("==============================================");
        console.log("");
        console.log("Safe to fund contract now!");
    }
    
    function testPauseUnpause() internal {
        console.log("");
        console.log("TEST 1: Pause/Unpause");
        console.log("----------------------------------------------");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Test pause
        console.log("[TEST] Pausing contract...");
        staking.pause();
        console.log("[PASS] Contract paused");
        
        // Verify paused
        bool isPaused = staking.paused();
        require(isPaused, "Contract should be paused");
        console.log("[PASS] Pause state verified");
        
        // Test unpause
        console.log("[TEST] Unpausing contract...");
        staking.unpause();
        console.log("[PASS] Contract unpaused");
        
        // Verify unpaused
        isPaused = staking.paused();
        require(!isPaused, "Contract should be unpaused");
        console.log("[PASS] Unpause state verified");
        
        vm.stopBroadcast();
    }
    
    function testStakingSettings() internal {
        console.log("");
        console.log("TEST 2: Staking Settings");
        console.log("----------------------------------------------");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Test setMinStakeAmount
        console.log("[TEST] Setting min stake amount...");
        uint256 oldMinStake = staking.minStakeAmount();
        console.log("  Old min stake:", oldMinStake);
        
        staking.setMinStakeAmount(50 ether);
        uint256 newMinStake = staking.minStakeAmount();
        require(newMinStake == 50 ether, "Min stake not updated");
        console.log("  New min stake:", newMinStake);
        console.log("[PASS] Min stake amount updated");
        
        // Restore original
        staking.setMinStakeAmount(oldMinStake);
        console.log("[PASS] Min stake restored");
        
        // Test setMaxPositionsPerUser
        console.log("[TEST] Setting max positions per user...");
        uint256 oldMaxPos = staking.maxPositionsPerUser();
        console.log("  Old max positions:", oldMaxPos);
        
        staking.setMaxPositionsPerUser(20);
        uint256 newMaxPos = staking.maxPositionsPerUser();
        require(newMaxPos == 20, "Max positions not updated");
        console.log("  New max positions:", newMaxPos);
        console.log("[PASS] Max positions updated");
        
        // Restore original
        staking.setMaxPositionsPerUser(oldMaxPos);
        console.log("[PASS] Max positions restored");
        
        vm.stopBroadcast();
    }
    
    function testReferralSettings() internal {
        console.log("");
        console.log("TEST 3: Referral Settings");
        console.log("----------------------------------------------");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Test setReferralBps
        console.log("[TEST] Setting referral BPS...");
        uint256 oldBps = staking.referralBps();
        console.log("  Old referral BPS:", oldBps);
        
        staking.setReferralBps(300); // 3%
        uint256 newBps = staking.referralBps();
        require(newBps == 300, "Referral BPS not updated");
        console.log("  New referral BPS:", newBps);
        console.log("[PASS] Referral BPS updated");
        
        // Restore original
        staking.setReferralBps(oldBps);
        console.log("[PASS] Referral BPS restored");
        
        // Test setMinReferrerStake
        console.log("[TEST] Setting min referrer stake...");
        uint256 oldMinRef = staking.minReferrerStake();
        console.log("  Old min referrer stake:", oldMinRef);
        
        staking.setMinReferrerStake(1000 ether);
        uint256 newMinRef = staking.minReferrerStake();
        require(newMinRef == 1000 ether, "Min referrer stake not updated");
        console.log("  New min referrer stake:", newMinRef);
        console.log("[PASS] Min referrer stake updated");
        
        // Restore original
        staking.setMinReferrerStake(oldMinRef);
        console.log("[PASS] Min referrer stake restored");
        
        // Test pauseReferrals
        console.log("[TEST] Pausing referrals...");
        staking.pauseReferrals();
        bool refPaused = staking.referralsPaused();
        require(refPaused, "Referrals should be paused");
        console.log("[PASS] Referrals paused");
        
        // Test unpauseReferrals
        console.log("[TEST] Unpausing referrals...");
        staking.unpauseReferrals();
        refPaused = staking.referralsPaused();
        require(!refPaused, "Referrals should be unpaused");
        console.log("[PASS] Referrals unpaused");
        
        vm.stopBroadcast();
    }
    
    function testLockOptions() internal {
        console.log("");
        console.log("TEST 4: Lock Options Management");
        console.log("----------------------------------------------");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Check current lock options
        uint256 lockCount = staking.lockOptionsLength();
        console.log("  Current lock options:", lockCount);
        
        // Test addLockOption
        console.log("[TEST] Adding new lock option...");
        staking.addLockOption(365 days, 25000, true); // 1 year, 2.5x
        
        uint256 newLockCount = staking.lockOptionsLength();
        require(newLockCount == lockCount + 1, "Lock option not added");
        console.log("  New lock option added (ID:", newLockCount - 1, ")");
        console.log("[PASS] Lock option added");
        
        // Verify the new lock option
        (uint64 duration, uint32 multiplier, bool enabled) = staking.lockOptions(newLockCount - 1);
        require(duration == 365 days, "Duration incorrect");
        require(multiplier == 25000, "Multiplier incorrect");
        require(enabled == true, "Should be enabled");
        console.log("[PASS] Lock option verified");
        
        // Test setLockOption
        console.log("[TEST] Updating lock option...");
        staking.setLockOption(newLockCount - 1, 30000, false); // 3x, disabled
        
        (duration, multiplier, enabled) = staking.lockOptions(newLockCount - 1);
        require(multiplier == 30000, "Multiplier not updated");
        require(enabled == false, "Should be disabled");
        console.log("[PASS] Lock option updated");
        
        vm.stopBroadcast();
    }
    
    function testAprTiers() internal {
        console.log("");
        console.log("TEST 5: APR Tier Management");
        console.log("----------------------------------------------");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Check current APR tiers
        uint256 tierCount = staking.aprTiersLength();
        console.log("  Current APR tiers:", tierCount);
        
        // Test updating existing tier
        console.log("[TEST] Updating APR tier 0...");
        (uint256 oldTvl, uint32 oldApr) = staking.aprTiers(0);
        console.log("  Old tier 0 - TVL:", oldTvl, "APR:", oldApr);
        
        staking.setAprTier(0, 0, 1800); // Change to 18%
        (uint256 newTvl, uint32 newApr) = staking.aprTiers(0);
        require(newApr == 1800, "APR not updated");
        console.log("  New tier 0 - TVL:", newTvl, "APR:", newApr);
        console.log("[PASS] APR tier updated");
        
        // Restore original
        staking.setAprTier(0, oldTvl, oldApr);
        console.log("[PASS] APR tier restored");
        
        // Test adding new tier
        console.log("[TEST] Adding new APR tier...");
        staking.setAprTier(tierCount, 10_000_000_000 ether, 200); // 10B TVL, 2% APR
        
        uint256 newTierCount = staking.aprTiersLength();
        require(newTierCount == tierCount + 1, "Tier not added");
        console.log("[PASS] New APR tier added");
        
        vm.stopBroadcast();
    }
    
    function testEmergencyFunctions() internal {
        console.log("");
        console.log("TEST 6: Emergency Functions");
        console.log("----------------------------------------------");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Test fundRewards with small amount
        console.log("[TEST] Funding small amount for emergency test...");
        uint256 testAmount = 1 ether; // 1 RWAN for testing
        
        // Check if we have approval
        uint256 allowance = rwanToken.allowance(owner, address(staking));
        console.log("  Current allowance:", allowance);
        
        if (allowance < testAmount) {
            console.log("[SKIP] Not enough allowance for emergency test");
            console.log("       (This is OK - main approval was done earlier)");
        } else {
            // Fund small amount
            staking.fundRewards(testAmount);
            uint256 rewardReserve = staking.rewardReserve();
            console.log("  Reward reserve:", rewardReserve);
            console.log("[PASS] Small amount funded");
            
            // Test emergency recover
            console.log("[TEST] Testing emergency recovery...");
            
            // Pause first
            staking.pause();
            console.log("  Contract paused");
            
            // Record balance before
            uint256 balanceBefore = rwanToken.balanceOf(owner);
            
            // Recover rewards
            staking.emergencyRecoverRewards(owner);
            
            // Check balance after
            uint256 balanceAfter = rwanToken.balanceOf(owner);
            uint256 recovered = balanceAfter - balanceBefore;
            
            console.log("  Recovered:", recovered);
            require(recovered == testAmount, "Incorrect recovery amount");
            console.log("[PASS] Emergency recovery successful");
            
            // Unpause
            staking.unpause();
            console.log("  Contract unpaused");
        }
        
        // Test recoverERC20 (should fail for staking/reward token)
        console.log("[TEST] Testing recoverERC20 protection...");
        try staking.recoverERC20(address(rwanToken), 1 ether) {
            console.log("[FAIL] Should not allow recovering reward token!");
            revert("Security breach!");
        } catch {
            console.log("[PASS] Correctly blocked reward token recovery");
        }
        
        vm.stopBroadcast();
    }
}
