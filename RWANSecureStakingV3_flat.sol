// SPDX-License-Identifier: MIT
pragma solidity >=0.4.16 >=0.6.2 ^0.8.20;

// lib/openzeppelin-contracts/contracts/utils/Context.sol

// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol

// OpenZeppelin Contracts (last updated v5.4.0) (utils/introspection/IERC165.sol)

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol

// OpenZeppelin Contracts (last updated v5.4.0) (token/ERC20/IERC20.sol)

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// lib/openzeppelin-contracts/contracts/utils/StorageSlot.sol

// OpenZeppelin Contracts (last updated v5.1.0) (utils/StorageSlot.sol)
// This file was procedurally generated from scripts/generate/templates/StorageSlot.js.

/**
 * @dev Library for reading and writing primitive types to specific storage slots.
 *
 * Storage slots are often used to avoid storage conflict when dealing with upgradeable contracts.
 * This library helps with reading and writing to such slots without the need for inline assembly.
 *
 * The functions in this library return Slot structs that contain a `value` member that can be used to read or write.
 *
 * Example usage to set ERC-1967 implementation slot:
 * ```solidity
 * contract ERC1967 {
 *     // Define the slot. Alternatively, use the SlotDerivation library to derive the slot.
 *     bytes32 internal constant _IMPLEMENTATION_SLOT = 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
 *
 *     function _getImplementation() internal view returns (address) {
 *         return StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value;
 *     }
 *
 *     function _setImplementation(address newImplementation) internal {
 *         require(newImplementation.code.length > 0);
 *         StorageSlot.getAddressSlot(_IMPLEMENTATION_SLOT).value = newImplementation;
 *     }
 * }
 * ```
 *
 * TIP: Consider using this library along with {SlotDerivation}.
 */
library StorageSlot {
    struct AddressSlot {
        address value;
    }

    struct BooleanSlot {
        bool value;
    }

    struct Bytes32Slot {
        bytes32 value;
    }

    struct Uint256Slot {
        uint256 value;
    }

    struct Int256Slot {
        int256 value;
    }

    struct StringSlot {
        string value;
    }

    struct BytesSlot {
        bytes value;
    }

    /**
     * @dev Returns an `AddressSlot` with member `value` located at `slot`.
     */
    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `BooleanSlot` with member `value` located at `slot`.
     */
    function getBooleanSlot(bytes32 slot) internal pure returns (BooleanSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Bytes32Slot` with member `value` located at `slot`.
     */
    function getBytes32Slot(bytes32 slot) internal pure returns (Bytes32Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Uint256Slot` with member `value` located at `slot`.
     */
    function getUint256Slot(bytes32 slot) internal pure returns (Uint256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `Int256Slot` with member `value` located at `slot`.
     */
    function getInt256Slot(bytes32 slot) internal pure returns (Int256Slot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns a `StringSlot` with member `value` located at `slot`.
     */
    function getStringSlot(bytes32 slot) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `StringSlot` representation of the string storage pointer `store`.
     */
    function getStringSlot(string storage store) internal pure returns (StringSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }

    /**
     * @dev Returns a `BytesSlot` with member `value` located at `slot`.
     */
    function getBytesSlot(bytes32 slot) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := slot
        }
    }

    /**
     * @dev Returns an `BytesSlot` representation of the bytes storage pointer `store`.
     */
    function getBytesSlot(bytes storage store) internal pure returns (BytesSlot storage r) {
        assembly ("memory-safe") {
            r.slot := store.slot
        }
    }
}

// lib/openzeppelin-contracts/contracts/interfaces/IERC165.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC165.sol)

// lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC20.sol)

// lib/openzeppelin-contracts/contracts/access/Ownable.sol

// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// lib/openzeppelin-contracts/contracts/utils/Pausable.sol

// OpenZeppelin Contracts (last updated v5.3.0) (utils/Pausable.sol)

/**
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by an authorized account.
 *
 * This module is used through inheritance. It will make available the
 * modifiers `whenNotPaused` and `whenPaused`, which can be applied to
 * the functions of your contract. Note that they will not be pausable by
 * simply including this module, only once the modifiers are put in place.
 */
abstract contract Pausable is Context {
    bool private _paused;

    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    /**
     * @dev The operation failed because the contract is paused.
     */
    error EnforcedPause();

    /**
     * @dev The operation failed because the contract is not paused.
     */
    error ExpectedPause();

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    modifier whenNotPaused() {
        _requireNotPaused();
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    modifier whenPaused() {
        _requirePaused();
        _;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view virtual returns (bool) {
        return _paused;
    }

    /**
     * @dev Throws if the contract is paused.
     */
    function _requireNotPaused() internal view virtual {
        if (paused()) {
            revert EnforcedPause();
        }
    }

    /**
     * @dev Throws if the contract is not paused.
     */
    function _requirePaused() internal view virtual {
        if (!paused()) {
            revert ExpectedPause();
        }
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}

// lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol

// OpenZeppelin Contracts (last updated v5.5.0) (utils/ReentrancyGuard.sol)

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If EIP-1153 (transient storage) is available on the chain you're deploying at,
 * consider using {ReentrancyGuardTransient} instead.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 *
 * IMPORTANT: Deprecated. This storage-based reentrancy guard will be removed and replaced
 * by the {ReentrancyGuardTransient} variant in v6.0.
 *
 * @custom:stateless
 */
abstract contract ReentrancyGuard {
    using StorageSlot for bytes32;

    // keccak256(abi.encode(uint256(keccak256("openzeppelin.storage.ReentrancyGuard")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant REENTRANCY_GUARD_STORAGE =
        0x9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00;

    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    /**
     * @dev A `view` only version of {nonReentrant}. Use to block view functions
     * from being called, preventing reading from inconsistent contract state.
     *
     * CAUTION: This is a "view" modifier and does not change the reentrancy
     * status. Use it only on view functions. For payable or non-payable functions,
     * use the standard {nonReentrant} modifier instead.
     */
    modifier nonReentrantView() {
        _nonReentrantBeforeView();
        _;
    }

    function _nonReentrantBeforeView() private view {
        if (_reentrancyGuardEntered()) {
            revert ReentrancyGuardReentrantCall();
        }
    }

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        _nonReentrantBeforeView();

        // Any calls to nonReentrant after this point will fail
        _reentrancyGuardStorageSlot().getUint256Slot().value = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _reentrancyGuardStorageSlot().getUint256Slot().value = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _reentrancyGuardStorageSlot().getUint256Slot().value == ENTERED;
    }

    function _reentrancyGuardStorageSlot() internal pure virtual returns (bytes32) {
        return REENTRANCY_GUARD_STORAGE;
    }
}

// lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol

// OpenZeppelin Contracts (last updated v5.4.0) (interfaces/IERC1363.sol)

/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}

// lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol

// OpenZeppelin Contracts (last updated v5.5.0) (token/ERC20/utils/SafeERC20.sol)

/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        if (!_safeTransfer(token, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        if (!_safeTransferFrom(token, from, to, value, true)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _safeTransfer(token, to, value, false);
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _safeTransferFrom(token, from, to, value, false);
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        if (!_safeApprove(token, spender, value, false)) {
            if (!_safeApprove(token, spender, 0, true)) revert SafeERC20FailedOperation(address(token));
            if (!_safeApprove(token, spender, value, true)) revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that relies on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that relies on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Oppositely, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity `token.transfer(to, value)` call, relaxing the requirement on the return value: the
     * return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransfer(IERC20 token, address to, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.transfer.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(to, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }

    /**
     * @dev Imitates a Solidity `token.transferFrom(from, to, value)` call, relaxing the requirement on the return
     * value: the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param from The sender of the tokens
     * @param to The recipient of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeTransferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 value,
        bool bubble
    ) private returns (bool success) {
        bytes4 selector = IERC20.transferFrom.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(from, shr(96, not(0))))
            mstore(0x24, and(to, shr(96, not(0))))
            mstore(0x44, value)
            success := call(gas(), token, 0, 0x00, 0x64, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
            mstore(0x60, 0)
        }
    }

    /**
     * @dev Imitates a Solidity `token.approve(spender, value)` call, relaxing the requirement on the return value:
     * the return value is optional (but if data is returned, it must not be false).
     *
     * @param token The token targeted by the call.
     * @param spender The spender of the tokens
     * @param value The amount of token to transfer
     * @param bubble Behavior switch if the transfer call reverts: bubble the revert reason or return a false boolean.
     */
    function _safeApprove(IERC20 token, address spender, uint256 value, bool bubble) private returns (bool success) {
        bytes4 selector = IERC20.approve.selector;

        assembly ("memory-safe") {
            let fmp := mload(0x40)
            mstore(0x00, selector)
            mstore(0x04, and(spender, shr(96, not(0))))
            mstore(0x24, value)
            success := call(gas(), token, 0, 0x00, 0x44, 0x00, 0x20)
            // if call success and return is true, all is good.
            // otherwise (not success or return is not true), we need to perform further checks
            if iszero(and(success, eq(mload(0x00), 1))) {
                // if the call was a failure and bubble is enabled, bubble the error
                if and(iszero(success), bubble) {
                    returndatacopy(fmp, 0x00, returndatasize())
                    revert(fmp, returndatasize())
                }
                // if the return value is not true, then the call is only successful if:
                // - the token address has code
                // - the returndata is empty
                success := and(success, and(iszero(returndatasize()), gt(extcodesize(token), 0)))
            }
            mstore(0x40, fmp)
        }
    }
}

// contracts/RWANSecureStakingV3.sol

/**
 * @title RWANSecureStakingV3
 * @notice Enhanced staking with 35% early withdrawal penalty
 * @dev V3 Features:
 *   - Flexible staking (no lock, standard rewards)
 *   - Locked staking (3mo/6mo with multiplier)
 *   - 35% early withdrawal penalty on principal
 *   - Penalty goes back to reward pool
 *   - Dynamic APR tiers based on TVL
 *   - Referral system (5% bonus)
 *   - Emergency withdraw (no rewards, no penalty when paused)
 */
contract RWANSecureStakingV3 is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // -----------------------------
    // State Variables
    // -----------------------------

    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;

    uint256 public minStakeAmount;
    uint256 public maxPositionsPerUser;

    // Early withdrawal penalty (basis points: 3500 = 35%)
    uint256 public constant EARLY_WITHDRAWAL_PENALTY_BPS = 3500;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    // Position tracking
    struct Position {
        uint256 amount; // Original staked amount
        uint256 weightedAmount; // Amount * multiplier for rewards
        uint256 startTime; // When staked
        uint256 unlockTime; // 0 for flexible, timestamp for locked
        uint256 lockId; // Which lock option (0 = flexible)
        uint256 rewardDebt; // For reward calculation
        bool withdrawn; // Has been withdrawn
    }

    mapping(uint256 => Position) public positions;
    mapping(uint256 => address) public positionOwner;
    mapping(address => uint256[]) private _userPositions;
    uint256 public nextPositionId = 1;

    // Lock options (duration → multiplier)
    struct LockOption {
        uint64 duration; // Lock duration in seconds
        uint32 multiplierBps; // Reward multiplier (10000 = 1x, 20000 = 2x)
        bool enabled;
    }
    LockOption[] public lockOptions;

    // APR tiers based on TVL
    struct AprTier {
        uint256 minTVL; // Minimum TVL for this tier
        uint32 aprBps; // APR in basis points (1600 = 16%)
    }
    AprTier[] public aprTiers;

    // Global staking state
    uint256 public totalStaked;
    uint256 public totalWeightedStaked;
    mapping(address => uint256) public totalUserStaked;

    // Reward distribution
    uint256 public rewardReserve;
    uint256 public accRewardPerWeightedToken;
    uint256 public lastRewardUpdate;
    uint256 public currentAprBps;

    // Referral system
    uint256 public referralBps;
    uint256 public referralReserve;
    uint256 public minReferrerStake;
    bool public referralsPaused;
    mapping(address => uint256) public referralEarnings;

    // -----------------------------
    // Events
    // -----------------------------

    event Staked(
        address indexed user,
        uint256 indexed positionId,
        uint256 amount,
        uint256 lockId,
        uint256 unlockTime
    );
    event Claimed(
        address indexed user,
        uint256 indexed positionId,
        uint256 reward
    );
    event Withdrawn(
        address indexed user,
        uint256 indexed positionId,
        uint256 amount
    );
    event WithdrawnEarly(
        address indexed user,
        uint256 indexed positionId,
        uint256 amountAfterPenalty,
        uint256 penaltyAmount
    );
    event EmergencyWithdrawn(
        address indexed user,
        uint256 indexed positionId,
        uint256 amount
    );
    event RewardFunded(uint256 amount);
    event ReferralEarned(
        address indexed referrer,
        address indexed referee,
        uint256 amount
    );
    event LockOptionAdded(
        uint256 indexed lockId,
        uint64 duration,
        uint32 multiplierBps
    );
    event LockOptionUpdated(
        uint256 indexed lockId,
        uint32 multiplierBps,
        bool enabled
    );
    event AprTierSet(uint256 indexed tierId, uint256 minTVL, uint32 aprBps);
    event EmergencyRewardRecovered(
        address indexed to,
        uint256 rewardAmount,
        uint256 referralAmount
    );

    // -----------------------------
    // Constructor
    // -----------------------------

    constructor(
        address _stakingToken,
        address _rewardToken,
        uint256 _minStakeAmount,
        uint256 _maxPositionsPerUser,
        uint256[] memory tierTVL,
        uint32[] memory tierAprBps,
        uint256 _referralBps
    ) Ownable(msg.sender) {
        require(_stakingToken != address(0), "invalid staking token");
        require(_rewardToken != address(0), "invalid reward token");
        require(tierTVL.length == tierAprBps.length, "tier length mismatch");
        require(_referralBps <= 1000, "referral too high");

        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
        minStakeAmount = _minStakeAmount;
        maxPositionsPerUser = _maxPositionsPerUser;
        referralBps = _referralBps;

        // Initialize lock options
        // Lock ID 0: Flexible (no lock, 1x multiplier)
        lockOptions.push(
            LockOption({duration: 0, multiplierBps: 10000, enabled: true})
        );

        // Initialize APR tiers
        for (uint256 i = 0; i < tierTVL.length; i++) {
            aprTiers.push(AprTier({minTVL: tierTVL[i], aprBps: tierAprBps[i]}));
        }

        lastRewardUpdate = block.timestamp;
        _updateCurrentApr();
    }

    // -----------------------------
    // View Functions
    // -----------------------------

    function userPositions(
        address user
    ) external view returns (uint256[] memory) {
        return _userPositions[user];
    }

    function lockOptionsLength() external view returns (uint256) {
        return lockOptions.length;
    }

    function aprTiersLength() external view returns (uint256) {
        return aprTiers.length;
    }

    /**
     * @notice Calculate pending rewards for a position
     * @dev Does NOT account for lock status - returns accrued rewards regardless
     */
    function pendingRewards(
        uint256 positionId
    ) external view returns (uint256) {
        Position memory p = positions[positionId];
        if (p.withdrawn || p.weightedAmount == 0) return 0;

        uint256 _accRewardPerWeightedToken = accRewardPerWeightedToken;
        if (totalWeightedStaked > 0 && block.timestamp > lastRewardUpdate) {
            uint256 timeElapsed = block.timestamp - lastRewardUpdate;
            uint256 reward = (currentAprBps *
                totalWeightedStaked *
                timeElapsed) / (365 days * BPS_DENOMINATOR);
            if (reward > rewardReserve) reward = rewardReserve;
            _accRewardPerWeightedToken += (reward * 1e18) / totalWeightedStaked;
        }

        uint256 accumulatedReward = (p.weightedAmount *
            _accRewardPerWeightedToken) / 1e18;
        return
            accumulatedReward > p.rewardDebt
                ? accumulatedReward - p.rewardDebt
                : 0;
    }

    /**
     * @notice Check if a position can be withdrawn without penalty
     */
    function canWithdrawWithoutPenalty(
        uint256 positionId
    ) external view returns (bool) {
        Position memory p = positions[positionId];
        if (p.withdrawn) return false;
        if (p.unlockTime == 0) return true; // Flexible
        return block.timestamp >= p.unlockTime; // Locked but unlocked
    }

    /**
     * @notice Calculate early withdrawal penalty for a position
     * @return amountAfterPenalty Amount user will receive
     * @return penaltyAmount Penalty that goes to reward pool
     */
    function calculateEarlyWithdrawalPenalty(
        uint256 positionId
    )
        external
        view
        returns (uint256 amountAfterPenalty, uint256 penaltyAmount)
    {
        Position memory p = positions[positionId];
        require(!p.withdrawn, "already withdrawn");

        // If flexible or already unlocked, no penalty
        if (p.unlockTime == 0 || block.timestamp >= p.unlockTime) {
            return (p.amount, 0);
        }

        // Calculate penalty: 35% of principal
        penaltyAmount =
            (p.amount * EARLY_WITHDRAWAL_PENALTY_BPS) /
            BPS_DENOMINATOR;
        amountAfterPenalty = p.amount - penaltyAmount;
    }

    // -----------------------------
    // User Functions
    // -----------------------------

    /**
     * @notice Stake tokens with a specific lock option
     * @param amount Amount to stake
     * @param lockId Lock option ID (0 = flexible, 1+ = locked)
     * @param referrer Optional referrer address
     */
    function stake(
        uint256 amount,
        uint256 lockId,
        address referrer
    ) external nonReentrant whenNotPaused {
        require(lockId < lockOptions.length, "invalid lockId");
        LockOption memory opt = lockOptions[lockId];
        require(opt.enabled, "lock disabled");
        require(amount >= minStakeAmount, "amount too low");

        if (maxPositionsPerUser > 0) {
            require(
                _userPositions[msg.sender].length < maxPositionsPerUser,
                "positions limit"
            );
        }

        _updateRewards();

        // Calculate unlock time
        uint256 unlockTime = opt.duration > 0
            ? block.timestamp + opt.duration
            : 0;

        // Calculate weighted amount (for reward multiplier)
        uint256 weightedAmount = (amount * opt.multiplierBps) / BPS_DENOMINATOR;

        // Create position
        uint256 positionId = nextPositionId++;
        positions[positionId] = Position({
            amount: amount,
            weightedAmount: weightedAmount,
            startTime: block.timestamp,
            unlockTime: unlockTime,
            lockId: lockId,
            rewardDebt: (weightedAmount * accRewardPerWeightedToken) / 1e18,
            withdrawn: false
        });

        positionOwner[positionId] = msg.sender;
        _userPositions[msg.sender].push(positionId);

        // Update global state
        totalStaked += amount;
        totalWeightedStaked += weightedAmount;
        totalUserStaked[msg.sender] += amount;
        _updateCurrentApr();

        // Handle referral
        if (
            !referralsPaused &&
            referrer != address(0) &&
            referrer != msg.sender &&
            totalUserStaked[referrer] >= minReferrerStake
        ) {
            uint256 referralReward = (amount * referralBps) / BPS_DENOMINATOR;
            if (referralReward > 0 && referralReward <= referralReserve) {
                referralReserve -= referralReward;
                referralEarnings[referrer] += referralReward;
                rewardToken.safeTransfer(referrer, referralReward);
                emit ReferralEarned(referrer, msg.sender, referralReward);
            }
        }

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, positionId, amount, lockId, unlockTime);
    }

    /**
     * @notice Claim rewards for a position
     */
    function claim(uint256 positionId) external nonReentrant whenNotPaused {
        require(positionOwner[positionId] == msg.sender, "not owner");
        _updateRewards();
        _claim(positionId, msg.sender);
    }

    /**
     * @notice Withdraw position (after unlock, no penalty)
     * @dev For locked positions before unlock, use withdrawEarly()
     */
    function withdraw(uint256 positionId) external nonReentrant whenNotPaused {
        require(positionOwner[positionId] == msg.sender, "not owner");
        Position storage p = positions[positionId];
        require(!p.withdrawn, "already withdrawn");

        // Enforce lock period for regular withdraw
        if (p.unlockTime > 0) {
            require(
                block.timestamp >= p.unlockTime,
                "still locked, use withdrawEarly"
            );
        }

        _updateRewards();
        _claim(positionId, msg.sender);

        p.withdrawn = true;
        totalStaked -= p.amount;
        totalWeightedStaked -= p.weightedAmount;
        totalUserStaked[msg.sender] -= p.amount;
        _updateCurrentApr();

        stakingToken.safeTransfer(msg.sender, p.amount);
        emit Withdrawn(msg.sender, positionId, p.amount);
    }

    /**
     * @notice Withdraw locked position early with 35% penalty
     * @dev Penalty applies only to principal, rewards are still claimable
     */
    function withdrawEarly(
        uint256 positionId
    ) external nonReentrant whenNotPaused {
        require(positionOwner[positionId] == msg.sender, "not owner");
        Position storage p = positions[positionId];
        require(!p.withdrawn, "already withdrawn");
        require(p.unlockTime > 0, "not locked, use withdraw");
        require(
            block.timestamp < p.unlockTime,
            "already unlocked, use withdraw"
        );

        _updateRewards();
        _claim(positionId, msg.sender); // Claim all rewards (no penalty on rewards)

        // Calculate penalty
        uint256 penaltyAmount = (p.amount * EARLY_WITHDRAWAL_PENALTY_BPS) /
            BPS_DENOMINATOR;
        uint256 amountAfterPenalty = p.amount - penaltyAmount;

        // Update state
        p.withdrawn = true;
        totalStaked -= p.amount;
        totalWeightedStaked -= p.weightedAmount;
        totalUserStaked[msg.sender] -= p.amount;
        _updateCurrentApr();

        // Penalty goes back to reward pool
        rewardReserve += penaltyAmount;

        stakingToken.safeTransfer(msg.sender, amountAfterPenalty);
        emit WithdrawnEarly(
            msg.sender,
            positionId,
            amountAfterPenalty,
            penaltyAmount
        );
    }

    /**
     * @notice Emergency withdraw (only when paused, no rewards, no penalty)
     */
    function emergencyWithdraw(
        uint256 positionId
    ) external nonReentrant whenPaused {
        require(positionOwner[positionId] == msg.sender, "not owner");
        Position storage p = positions[positionId];
        require(!p.withdrawn, "already withdrawn");

        p.withdrawn = true;
        totalStaked -= p.amount;
        totalWeightedStaked -= p.weightedAmount;
        totalUserStaked[msg.sender] -= p.amount;

        stakingToken.safeTransfer(msg.sender, p.amount);
        emit EmergencyWithdrawn(msg.sender, positionId, p.amount);
    }

    // -----------------------------
    // Internal Functions
    // -----------------------------

    function _claim(uint256 positionId, address to) internal {
        Position storage p = positions[positionId];
        uint256 accumulatedReward = (p.weightedAmount *
            accRewardPerWeightedToken) / 1e18;
        uint256 pending = accumulatedReward > p.rewardDebt
            ? accumulatedReward - p.rewardDebt
            : 0;

        if (pending > 0) {
            require(pending <= rewardReserve, "insufficient rewards");
            p.rewardDebt = accumulatedReward;
            rewardReserve -= pending;
            rewardToken.safeTransfer(to, pending);
            emit Claimed(to, positionId, pending);
        }
    }

    function _updateRewards() internal {
        if (block.timestamp <= lastRewardUpdate) return;
        if (totalWeightedStaked == 0) {
            lastRewardUpdate = block.timestamp;
            return;
        }

        uint256 timeElapsed = block.timestamp - lastRewardUpdate;
        uint256 reward = (currentAprBps * totalWeightedStaked * timeElapsed) /
            (365 days * BPS_DENOMINATOR);

        if (reward > rewardReserve) reward = rewardReserve;
        if (reward > 0) {
            accRewardPerWeightedToken += (reward * 1e18) / totalWeightedStaked;
        }

        lastRewardUpdate = block.timestamp;
    }

    function _updateCurrentApr() internal {
        for (uint256 i = aprTiers.length; i > 0; i--) {
            if (totalStaked >= aprTiers[i - 1].minTVL) {
                currentAprBps = aprTiers[i - 1].aprBps;
                return;
            }
        }
        currentAprBps = aprTiers.length > 0 ? aprTiers[0].aprBps : 0;
    }

    // -----------------------------
    // Admin Functions
    // -----------------------------

    function fundRewards(uint256 amount) external {
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        rewardReserve += amount;
        emit RewardFunded(amount);
    }

    function fundReferralRewards(uint256 amount) external onlyOwner {
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        referralReserve += amount;
    }

    function addLockOption(
        uint64 duration,
        uint32 multiplierBps,
        bool enabled
    ) external onlyOwner {
        uint256 lockId = lockOptions.length;
        lockOptions.push(
            LockOption({
                duration: duration,
                multiplierBps: multiplierBps,
                enabled: enabled
            })
        );
        emit LockOptionAdded(lockId, duration, multiplierBps);
    }

    function setLockOption(
        uint256 lockId,
        uint32 multiplierBps,
        bool enabled
    ) external onlyOwner {
        require(lockId < lockOptions.length, "invalid lockId");
        lockOptions[lockId].multiplierBps = multiplierBps;
        lockOptions[lockId].enabled = enabled;
        emit LockOptionUpdated(lockId, multiplierBps, enabled);
    }

    function setAprTier(
        uint256 tierId,
        uint256 minTVL,
        uint32 aprBps
    ) external onlyOwner {
        if (tierId >= aprTiers.length) {
            aprTiers.push(AprTier({minTVL: minTVL, aprBps: aprBps}));
        } else {
            aprTiers[tierId] = AprTier({minTVL: minTVL, aprBps: aprBps});
        }
        _updateCurrentApr();
        emit AprTierSet(tierId, minTVL, aprBps);
    }

    function setMinStakeAmount(uint256 amount) external onlyOwner {
        minStakeAmount = amount;
    }

    function setMaxPositionsPerUser(uint256 max) external onlyOwner {
        maxPositionsPerUser = max;
    }

    function setReferralBps(uint256 bps) external onlyOwner {
        require(bps <= 1000, "too high");
        referralBps = bps;
    }

    function setMinReferrerStake(uint256 amount) external onlyOwner {
        minReferrerStake = amount;
    }

    function pauseReferrals() external onlyOwner {
        referralsPaused = true;
    }

    function unpauseReferrals() external onlyOwner {
        referralsPaused = false;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function recoverERC20(address token, uint256 amount) external onlyOwner {
        require(token != address(stakingToken), "cannot recover staking token");
        require(token != address(rewardToken), "cannot recover reward token");
        IERC20(token).safeTransfer(owner(), amount);
    }

    function emergencyRecoverRewards(address to) external onlyOwner whenPaused {
        require(to != address(0), "invalid recipient");
        uint256 rewardAmount = rewardReserve;
        uint256 referralAmount = referralReserve;
        uint256 totalRecovered = rewardAmount + referralAmount;
        require(totalRecovered > 0, "nothing to recover");

        rewardReserve = 0;
        referralReserve = 0;
        rewardToken.safeTransfer(to, totalRecovered);

        emit EmergencyRewardRecovered(to, rewardAmount, referralAmount);
    }
}

