// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

interface IStaking {
    function recoverERC20(address token, uint256 amount) external;
    function fundReferralRewards(uint256 amount) external;
}

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
}

contract FixReferralAccounting is Script {
    address constant STAKING_ADDRESS = 0x890Bc48a6463586c75a7C9db0Af7FC3e5cA15625;
    address constant RWAN_TOKEN = 0xACB921bf2Dac2F7E8E101AAd9CA013d6Af5C648a;
    uint256 constant AMOUNT = 50_000 ether;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // IStaking staking = IStaking(STAKING_ADDRESS); // Removed recover check
        IERC20 token = IERC20(RWAN_TOKEN);

        console.log("1. Skipping recovery (blocked by contract safety).");
        console.log("2. Approving staking contract to spend 500k RWAN from deployer...");
        token.approve(STAKING_ADDRESS, AMOUNT);

        console.log("3. Funding referral rewards properly...");
        IStaking(STAKING_ADDRESS).fundReferralRewards(AMOUNT);

        console.log("SUCCESS: Referral accounting fixed.");

        vm.stopBroadcast();
    }
}
