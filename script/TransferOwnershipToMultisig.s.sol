// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/RWANSecureStakingV3.sol";

contract TransferOwnershipToMultisig is Script {
    function run() external {
        address stakingAddress = vm.envAddress("STAKING_ADDRESS");
        address multisigAddress = vm.envAddress("MULTISIG_ADDRESS");
        uint256 ownerPrivateKey = vm.envUint("OWNER_PRIVATE_KEY");

        require(stakingAddress != address(0), "STAKING_ADDRESS is zero");
        require(multisigAddress != address(0), "MULTISIG_ADDRESS is zero");

        RWANSecureStakingV3 staking = RWANSecureStakingV3(stakingAddress);
        address currentOwner = staking.owner();
        address signer = vm.addr(ownerPrivateKey);

        console.log("Staking contract:", stakingAddress);
        console.log("Current owner:", currentOwner);
        console.log("Broadcast signer:", signer);
        console.log("New multisig owner:", multisigAddress);

        require(currentOwner == signer, "OWNER_PRIVATE_KEY is not current owner");
        require(currentOwner != multisigAddress, "Already owned by multisig");

        vm.startBroadcast(ownerPrivateKey);
        staking.transferOwnership(multisigAddress);
        vm.stopBroadcast();

        console.log("Ownership transferred to multisig.");
    }
}
