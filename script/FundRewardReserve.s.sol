// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";

interface IStaking {
    function fundRewards(uint256 amount) external;
}

contract FundRewardReserve is Script {
    address constant STAKING_ADDRESS = 0x890Bc48a6463586c75a7C9db0Af7FC3e5cA15625;
    uint256 constant AMOUNT = 500_000 ether;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("Funding Reward Reserve with 500k RWAN...");
        IStaking(STAKING_ADDRESS).fundRewards(AMOUNT);
        console.log("Success!");

        vm.stopBroadcast();
    }
}
