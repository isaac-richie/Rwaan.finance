// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// node_modules/@openzeppelin/contracts/utils/Address.sol

// OpenZeppelin Contracts (last updated v5.0.0) (utils/Address.sol)

/**
 * @dev Collection of functions related to the address type
 */
library Address {
    /**
     * @dev The ETH balance of the account is not enough to perform the operation.
     */
    error AddressInsufficientBalance(address account);

    /**
     * @dev There's no code at `target` (it is not a contract).
     */
    error AddressEmptyCode(address target);

    /**
     * @dev A call to an address target failed. The target may have reverted.
     */
    error FailedInnerCall();

    /**
     * @dev Replacement for Solidity's `transfer`: sends `amount` wei to
     * `recipient`, forwarding all available gas and reverting on errors.
     *
     * https://eips.ethereum.org/EIPS/eip-1884[EIP1884] increases the gas cost
     * of certain opcodes, possibly making contracts go over the 2300 gas limit
     * imposed by `transfer`, making them unable to receive funds via
     * `transfer`. {sendValue} removes this limitation.
     *
     * https://consensys.net/diligence/blog/2019/09/stop-using-soliditys-transfer-now/[Learn more].
     *
     * IMPORTANT: because control is transferred to `recipient`, care must be
     * taken to not create reentrancy vulnerabilities. Consider using
     * {ReentrancyGuard} or the
     * https://solidity.readthedocs.io/en/v0.8.20/security-considerations.html#use-the-checks-effects-interactions-pattern[checks-effects-interactions pattern].
     */
    function sendValue(address payable recipient, uint256 amount) internal {
        if (address(this).balance < amount) {
            revert AddressInsufficientBalance(address(this));
        }

        (bool success, ) = recipient.call{value: amount}("");
        if (!success) {
            revert FailedInnerCall();
        }
    }

    /**
     * @dev Performs a Solidity function call using a low level `call`. A
     * plain `call` is an unsafe replacement for a function call: use this
     * function instead.
     *
     * If `target` reverts with a revert reason or custom error, it is bubbled
     * up by this function (like regular Solidity function calls). However, if
     * the call reverted with no returned reason, this function reverts with a
     * {FailedInnerCall} error.
     *
     * Returns the raw returned data. To convert to the expected return value,
     * use https://solidity.readthedocs.io/en/latest/units-and-global-variables.html?highlight=abi.decode#abi-encoding-and-decoding-functions[`abi.decode`].
     *
     * Requirements:
     *
     * - `target` must be a contract.
     * - calling `target` with `data` must not revert.
     */
    function functionCall(address target, bytes memory data) internal returns (bytes memory) {
        return functionCallWithValue(target, data, 0);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but also transferring `value` wei to `target`.
     *
     * Requirements:
     *
     * - the calling contract must have an ETH balance of at least `value`.
     * - the called Solidity function must be `payable`.
     */
    function functionCallWithValue(address target, bytes memory data, uint256 value) internal returns (bytes memory) {
        if (address(this).balance < value) {
            revert AddressInsufficientBalance(address(this));
        }
        (bool success, bytes memory returndata) = target.call{value: value}(data);
        return verifyCallResultFromTarget(target, success, returndata);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but performing a static call.
     */
    function functionStaticCall(address target, bytes memory data) internal view returns (bytes memory) {
        (bool success, bytes memory returndata) = target.staticcall(data);
        return verifyCallResultFromTarget(target, success, returndata);
    }

    /**
     * @dev Same as {xref-Address-functionCall-address-bytes-}[`functionCall`],
     * but performing a delegate call.
     */
    function functionDelegateCall(address target, bytes memory data) internal returns (bytes memory) {
        (bool success, bytes memory returndata) = target.delegatecall(data);
        return verifyCallResultFromTarget(target, success, returndata);
    }

    /**
     * @dev Tool to verify that a low level call to smart-contract was successful, and reverts if the target
     * was not a contract or bubbling up the revert reason (falling back to {FailedInnerCall}) in case of an
     * unsuccessful call.
     */
    function verifyCallResultFromTarget(
        address target,
        bool success,
        bytes memory returndata
    ) internal view returns (bytes memory) {
        if (!success) {
            _revert(returndata);
        } else {
            // only check if target is a contract if the call was successful and the return data is empty
            // otherwise we already know that it was a contract
            if (returndata.length == 0 && target.code.length == 0) {
                revert AddressEmptyCode(target);
            }
            return returndata;
        }
    }

    /**
     * @dev Tool to verify that a low level call was successful, and reverts if it wasn't, either by bubbling the
     * revert reason or with a default {FailedInnerCall} error.
     */
    function verifyCallResult(bool success, bytes memory returndata) internal pure returns (bytes memory) {
        if (!success) {
            _revert(returndata);
        } else {
            return returndata;
        }
    }

    /**
     * @dev Reverts with returndata if present. Otherwise reverts with {FailedInnerCall}.
     */
    function _revert(bytes memory returndata) private pure {
        // Look for revert reason and bubble it up if present
        if (returndata.length > 0) {
            // The easiest way to bubble the revert reason is using memory via assembly
            /// @solidity memory-safe-assembly
            assembly {
                let returndata_size := mload(returndata)
                revert(add(32, returndata), returndata_size)
            }
        } else {
            revert FailedInnerCall();
        }
    }
}

// node_modules/@openzeppelin/contracts/utils/Context.sol

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

// node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol

// OpenZeppelin Contracts (last updated v5.0.0) (token/ERC20/IERC20.sol)

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
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

// node_modules/@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol

// OpenZeppelin Contracts (last updated v5.0.0) (token/ERC20/extensions/IERC20Permit.sol)

/**
 * @dev Interface of the ERC20 Permit extension allowing approvals to be made via signatures, as defined in
 * https://eips.ethereum.org/EIPS/eip-2612[EIP-2612].
 *
 * Adds the {permit} method, which can be used to change an account's ERC20 allowance (see {IERC20-allowance}) by
 * presenting a message signed by the account. By not relying on {IERC20-approve}, the token holder account doesn't
 * need to send a transaction, and thus is not required to hold Ether at all.
 *
 * ==== Security Considerations
 *
 * There are two important considerations concerning the use of `permit`. The first is that a valid permit signature
 * expresses an allowance, and it should not be assumed to convey additional meaning. In particular, it should not be
 * considered as an intention to spend the allowance in any specific way. The second is that because permits have
 * built-in replay protection and can be submitted by anyone, they can be frontrun. A protocol that uses permits should
 * take this into consideration and allow a `permit` call to fail. Combining these two aspects, a pattern that may be
 * generally recommended is:
 *
 * ```solidity
 * function doThingWithPermit(..., uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) public {
 *     try token.permit(msg.sender, address(this), value, deadline, v, r, s) {} catch {}
 *     doThing(..., value);
 * }
 *
 * function doThing(..., uint256 value) public {
 *     token.safeTransferFrom(msg.sender, address(this), value);
 *     ...
 * }
 * ```
 *
 * Observe that: 1) `msg.sender` is used as the owner, leaving no ambiguity as to the signer intent, and 2) the use of
 * `try/catch` allows the permit to fail and makes the code tolerant to frontrunning. (See also
 * {SafeERC20-safeTransferFrom}).
 *
 * Additionally, note that smart contract wallets (such as Argent or Safe) are not able to produce permit signatures, so
 * contracts should have entry points that don't rely on permit.
 */
interface IERC20Permit {
    /**
     * @dev Sets `value` as the allowance of `spender` over ``owner``'s tokens,
     * given ``owner``'s signed approval.
     *
     * IMPORTANT: The same issues {IERC20-approve} has related to transaction
     * ordering also apply here.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `deadline` must be a timestamp in the future.
     * - `v`, `r` and `s` must be a valid `secp256k1` signature from `owner`
     * over the EIP712-formatted function arguments.
     * - the signature must use ``owner``'s current nonce (see {nonces}).
     *
     * For more information on the signature format, see the
     * https://eips.ethereum.org/EIPS/eip-2612#specification[relevant EIP
     * section].
     *
     * CAUTION: See Security Considerations above.
     */
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    /**
     * @dev Returns the current nonce for `owner`. This value must be
     * included whenever a signature is generated for {permit}.
     *
     * Every successful call to {permit} increases ``owner``'s nonce by one. This
     * prevents a signature from being used multiple times.
     */
    function nonces(address owner) external view returns (uint256);

    /**
     * @dev Returns the domain separator used in the encoding of the signature for {permit}, as defined by {EIP712}.
     */
    // solhint-disable-next-line func-name-mixedcase
    function DOMAIN_SEPARATOR() external view returns (bytes32);
}

// node_modules/@openzeppelin/contracts/utils/ReentrancyGuard.sol

// OpenZeppelin Contracts (last updated v5.0.0) (utils/ReentrancyGuard.sol)

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
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
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

    uint256 private _status;

    /**
     * @dev Unauthorized reentrant call.
     */
    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = NOT_ENTERED;
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

    function _nonReentrantBefore() private {
        // On the first call to nonReentrant, _status will be NOT_ENTERED
        if (_status == ENTERED) {
            revert ReentrancyGuardReentrantCall();
        }

        // Any calls to nonReentrant after this point will fail
        _status = ENTERED;
    }

    function _nonReentrantAfter() private {
        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = NOT_ENTERED;
    }

    /**
     * @dev Returns true if the reentrancy guard is currently set to "entered", which indicates there is a
     * `nonReentrant` function in the call stack.
     */
    function _reentrancyGuardEntered() internal view returns (bool) {
        return _status == ENTERED;
    }
}

// node_modules/@openzeppelin/contracts/access/Ownable.sol

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

// node_modules/@openzeppelin/contracts/utils/Pausable.sol

// OpenZeppelin Contracts (last updated v5.0.0) (utils/Pausable.sol)

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
     * @dev Initializes the contract in unpaused state.
     */
    constructor() {
        _paused = false;
    }

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

// node_modules/@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol

// OpenZeppelin Contracts (last updated v5.0.0) (token/ERC20/utils/SafeERC20.sol)

/**
 * @title SafeERC20
 * @dev Wrappers around ERC20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    using Address for address;

    /**
     * @dev An operation with an ERC20 token failed.
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
        _callOptionalReturn(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
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
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        bytes memory approvalCall = abi.encodeCall(token.approve, (spender, value));

        if (!_callOptionalReturnBool(token, approvalCall)) {
            _callOptionalReturn(token, abi.encodeCall(token.approve, (spender, 0)));
            _callOptionalReturn(token, approvalCall);
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     */
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        // We need to perform a low level call here, to bypass Solidity's return data size checking mechanism, since
        // we're implementing it ourselves. We use {Address-functionCall} to perform this call, which verifies that
        // the target address contains contract code and also asserts for success in the low-level call.

        bytes memory returndata = address(token).functionCall(data);
        if (returndata.length != 0 && !abi.decode(returndata, (bool))) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturn} that silents catches all reverts and returns a bool instead.
     */
    function _callOptionalReturnBool(IERC20 token, bytes memory data) private returns (bool) {
        // We need to perform a low level call here, to bypass Solidity's return data size checking mechanism, since
        // we're implementing it ourselves. We cannot use {Address-functionCall} here since this should return false
        // and not revert is the subcall reverts.

        (bool success, bytes memory returndata) = address(token).call(data);
        return success && (returndata.length == 0 || abi.decode(returndata, (bool))) && address(token).code.length > 0;
    }
}

// contracts/RWANSecureStakingV2.sol

/// @title RWANSecureStakingV2
/// @notice Secure staking with independent positions, fixed + locked tiers, TVL-based APR, and referrals.
contract RWANSecureStakingV2 is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant ACC_PRECISION = 1e18;
    uint256 public constant YEAR = 365 days;
    uint256 public constant MAX_APR_TIERS = 25;
    uint256 public constant MAX_REFERRAL_BPS = 2_000; // 20%

    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;

    struct LockOption {
        uint64 duration;
        uint32 multiplierBps; // 10000 = 1.0x
        bool enabled;
    }

    struct AprTier {
        uint256 minTVL;
        uint32 aprBps; // base APR for 1.0x positions
    }

    struct Position {
        uint256 amount;
        uint256 weightedAmount;
        uint64 startTime;
        uint64 unlockTime; // 0 for fixed
        uint32 lockId; // index into lockOptions
        bool withdrawn;
        uint256 rewardDebt;
    }

    LockOption[] public lockOptions; // index 0 reserved for fixed
    AprTier[] public aprTiers;

    uint256 public totalStaked;
    uint256 public totalWeightedStaked;
    uint256 public accRewardPerWeighted;
    uint256 public lastUpdateTime;

    uint256 public rewardReserve; // undistributed rewards
    uint256 public rewardAllocated; // distributed but unpaid rewards
    uint256 public referralReserve; // referral reward budget

    uint256 public minStakeAmount;
    uint256 public maxPositionsPerUser; // 0 = unlimited
    uint256 public referralBps;
    uint256 public minReferrerStake; // referrer must stake at least this amount to earn
    bool public referralsPaused;

    uint256 public nextPositionId = 1;

    mapping(uint256 => Position) public positions;
    mapping(uint256 => address) public positionOwner;
    mapping(address => uint256[]) private _userPositions;
    mapping(address => address) public referrerOf;
    mapping(address => uint256) public totalUserStaked;

    event LockOptionAdded(
        uint256 indexed lockId,
        uint64 duration,
        uint32 multiplierBps,
        bool enabled
    );
    event LockOptionUpdated(
        uint256 indexed lockId,
        uint64 duration,
        uint32 multiplierBps,
        bool enabled
    );
    event AprTiersUpdated(uint256 count);
    event MinStakeAmountUpdated(uint256 amount);
    event MaxPositionsPerUserUpdated(uint256 maxPositions);
    event ReferralBpsUpdated(uint256 bps);
    event MinReferrerStakeUpdated(uint256 amount);
    event FundedRewards(address indexed from, uint256 amount);
    event FundedReferral(address indexed from, uint256 amount);
    event Staked(
        address indexed user,
        uint256 indexed positionId,
        uint256 amount,
        uint256 weightedAmount,
        uint32 lockId,
        uint64 unlockTime
    );
    event Claimed(
        address indexed user,
        uint256 indexed positionId,
        uint256 rewardAmount
    );
    event ReferralPaid(
        address indexed referrer,
        address indexed referee,
        uint256 rewardAmount
    );
    event Withdrawn(
        address indexed user,
        uint256 indexed positionId,
        uint256 amount
    );
    event EmergencyWithdrawn(
        address indexed user,
        uint256 indexed positionId,
        uint256 amount
    );
    event ReferrerSet(address indexed user, address indexed referrer);
    event RescueToken(
        address indexed token,
        address indexed to,
        uint256 amount
    );
    event ReferralsPaused(bool paused);

    constructor(
        address stakingToken_,
        address rewardToken_,
        uint256 minStakeAmount_,
        uint256 maxPositionsPerUser_,
        uint256[] memory tierTVL,
        uint32[] memory tierAprBps,
        uint256 referralBps_
    ) Ownable(msg.sender) {
        require(stakingToken_ != address(0), "staking token zero");
        require(rewardToken_ != address(0), "reward token zero");
        require(referralBps_ <= MAX_REFERRAL_BPS, "referral bps too high");

        stakingToken = IERC20(stakingToken_);
        rewardToken = IERC20(rewardToken_);

        minStakeAmount = minStakeAmount_;
        maxPositionsPerUser = maxPositionsPerUser_;
        referralBps = referralBps_;

        // fixed option at index 0
        lockOptions.push(
            LockOption({duration: 0, multiplierBps: 10_000, enabled: true})
        );
        emit LockOptionAdded(0, 0, 10_000, true);

        // default locked tiers (Option A): 3-month 2.0x, 6-month 4.0x
        lockOptions.push(
            LockOption({duration: 90 days, multiplierBps: 20_000, enabled: true})
        );
        emit LockOptionAdded(1, 90 days, 20_000, true);

        lockOptions.push(
            LockOption({duration: 180 days, multiplierBps: 40_000, enabled: true})
        );
        emit LockOptionAdded(2, 180 days, 40_000, true);

        _setAprTiers(tierTVL, tierAprBps);
        lastUpdateTime = block.timestamp;
    }

    // -----------------------------
    // Views
    // -----------------------------

    function lockOptionsCount() external view returns (uint256) {
        return lockOptions.length;
    }

    function aprTiersCount() external view returns (uint256) {
        return aprTiers.length;
    }

    function userPositions(
        address user
    ) external view returns (uint256[] memory) {
        return _userPositions[user];
    }

    function currentAprBps() external view returns (uint32) {
        return _aprForTVL(totalStaked);
    }

    function pendingRewards(uint256 positionId) public view returns (uint256) {
        Position memory p = positions[positionId];
        if (p.withdrawn || p.weightedAmount == 0) return 0;

        uint256 acc = accRewardPerWeighted;
        uint256 tws = totalWeightedStaked;
        if (tws > 0) {
            uint256 elapsed = block.timestamp - lastUpdateTime;
            if (elapsed > 0) {
                uint256 rate = _targetRewardRatePerSecond(tws, totalStaked);
                if (rate > 0 && rewardReserve > 0) {
                    uint256 reward = rate * elapsed;
                    if (reward > rewardReserve) reward = rewardReserve;
                    acc = acc + (reward * ACC_PRECISION) / tws;
                }
            }
        }

        uint256 accumulated = (p.weightedAmount * acc) / ACC_PRECISION;
        if (accumulated <= p.rewardDebt) return 0;
        return accumulated - p.rewardDebt;
    }

    // -----------------------------
    // Admin
    // -----------------------------

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function addLockOption(
        uint64 duration,
        uint32 multiplierBps,
        bool enabled
    ) external onlyOwner {
        require(duration > 0, "duration zero");
        require(multiplierBps > 0, "multiplier zero");
        lockOptions.push(
            LockOption({
                duration: duration,
                multiplierBps: multiplierBps,
                enabled: enabled
            })
        );
        emit LockOptionAdded(
            lockOptions.length - 1,
            duration,
            multiplierBps,
            enabled
        );
    }

    function setLockOption(
        uint256 lockId,
        uint64 duration,
        uint32 multiplierBps,
        bool enabled
    ) external onlyOwner {
        require(lockId < lockOptions.length, "lockId out of range");
        require(lockId != 0, "fixed locked");
        require(duration > 0, "duration zero");
        require(multiplierBps > 0, "multiplier zero");
        lockOptions[lockId] = LockOption({
            duration: duration,
            multiplierBps: multiplierBps,
            enabled: enabled
        });
        emit LockOptionUpdated(lockId, duration, multiplierBps, enabled);
    }

    function setAprTiers(
        uint256[] memory tierTVL,
        uint32[] memory tierAprBps
    ) external onlyOwner {
        _updateRewards();
        _setAprTiers(tierTVL, tierAprBps);
    }

    function setMinStakeAmount(uint256 amount) external onlyOwner {
        minStakeAmount = amount;
        emit MinStakeAmountUpdated(amount);
    }

    function setMaxPositionsPerUser(uint256 maxPositions) external onlyOwner {
        maxPositionsPerUser = maxPositions;
        emit MaxPositionsPerUserUpdated(maxPositions);
    }

    function setReferralBps(uint256 bps) external onlyOwner {
        require(bps <= MAX_REFERRAL_BPS, "referral bps too high");
        referralBps = bps;
        emit ReferralBpsUpdated(bps);
    }

    function setMinReferrerStake(uint256 amount) external onlyOwner {
        minReferrerStake = amount;
        emit MinReferrerStakeUpdated(amount);
    }

    function pauseReferrals() external onlyOwner {
        referralsPaused = true;
        emit ReferralsPaused(true);
    }

    function unpauseReferrals() external onlyOwner {
        referralsPaused = false;
        emit ReferralsPaused(false);
    }

    function fundRewards(uint256 amount) external nonReentrant {
        require(amount > 0, "amount zero");
        uint256 beforeBal = rewardToken.balanceOf(address(this));
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = rewardToken.balanceOf(address(this)) - beforeBal;
        rewardReserve += received;
        emit FundedRewards(msg.sender, received);
    }

    function fundReferralRewards(uint256 amount) external nonReentrant {
        require(amount > 0, "amount zero");
        uint256 beforeBal = rewardToken.balanceOf(address(this));
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = rewardToken.balanceOf(address(this)) - beforeBal;
        referralReserve += received;
        emit FundedReferral(msg.sender, received);
    }

    /// @notice Recover tokens accidentally sent to this contract (excluding staking and reward tokens).
    function recoverERC20(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner {
        require(token != address(stakingToken), "no staking token");
        require(token != address(rewardToken), "no reward token");
        IERC20(token).safeTransfer(to, amount);
        emit RescueToken(token, to, amount);
    }

    /// @notice Recover excess staking tokens (only truly excess beyond staked + rewards budgets).
    function recoverStakingTokenExcess(
        uint256 amount,
        address to
    ) external onlyOwner {
        uint256 bal = stakingToken.balanceOf(address(this));
        uint256 protectedAmount = totalStaked;
        if (address(rewardToken) == address(stakingToken)) {
            protectedAmount +=
                rewardReserve +
                rewardAllocated +
                referralReserve;
        }
        require(bal > protectedAmount, "no excess");
        uint256 excess = bal - protectedAmount;
        require(amount <= excess, "exceeds excess");
        stakingToken.safeTransfer(to, amount);
        emit RescueToken(address(stakingToken), to, amount);
    }

    // -----------------------------
    // User actions
    // -----------------------------

    function stakeFixed(
        uint256 amount,
        address referrer
    ) external nonReentrant whenNotPaused {
        _stake(amount, 0, referrer);
    }

    function stakeLocked(
        uint256 amount,
        uint256 lockId,
        address referrer
    ) external nonReentrant whenNotPaused {
        require(lockId != 0, "use fixed");
        _stake(amount, lockId, referrer);
    }

    function claim(uint256 positionId) external nonReentrant whenNotPaused {
        require(positionOwner[positionId] == msg.sender, "not owner");
        _updateRewards();
        _claim(positionId, msg.sender);
    }

    function withdraw(uint256 positionId) external nonReentrant whenNotPaused {
        require(positionOwner[positionId] == msg.sender, "not owner");
        Position storage p = positions[positionId];
        require(!p.withdrawn, "already withdrawn");
        if (p.unlockTime > 0) {
            require(block.timestamp >= p.unlockTime, "locked");
        }

        _updateRewards();
        _claim(positionId, msg.sender);

        p.withdrawn = true;
        totalStaked -= p.amount;
        totalWeightedStaked -= p.weightedAmount;
        totalUserStaked[msg.sender] -= p.amount;

        stakingToken.safeTransfer(msg.sender, p.amount);
        emit Withdrawn(msg.sender, positionId, p.amount);
    }

    /// @notice Emergency withdraw principal only (no rewards). Requires contract to be paused.
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
    // Internal
    // -----------------------------

    function _stake(uint256 amount, uint256 lockId, address referrer) internal {
        require(lockId < lockOptions.length, "lockId out of range");
        LockOption memory opt = lockOptions[lockId];
        require(opt.enabled, "lock disabled");

        if (maxPositionsPerUser > 0) {
            require(
                _userPositions[msg.sender].length < maxPositionsPerUser,
                "positions limit"
            );
        }

        _updateRewards();

        uint256 beforeBal = stakingToken.balanceOf(address(this));
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = stakingToken.balanceOf(address(this)) - beforeBal;
        require(received >= minStakeAmount, "amount too small");

        uint256 weightedAmount = (received * opt.multiplierBps) /
            BPS_DENOMINATOR;
        uint64 unlockTime = opt.duration == 0
            ? 0
            : uint64(block.timestamp + opt.duration);

        uint256 positionId = nextPositionId++;
        positions[positionId] = Position({
            amount: received,
            weightedAmount: weightedAmount,
            startTime: uint64(block.timestamp),
            unlockTime: unlockTime,
            lockId: uint32(lockId),
            withdrawn: false,
            rewardDebt: (weightedAmount * accRewardPerWeighted) / ACC_PRECISION
        });

        positionOwner[positionId] = msg.sender;
        _userPositions[msg.sender].push(positionId);

        totalStaked += received;
        totalWeightedStaked += weightedAmount;
        totalUserStaked[msg.sender] += received;

        _setReferrer(msg.sender, referrer);

        emit Staked(
            msg.sender,
            positionId,
            received,
            weightedAmount,
            uint32(lockId),
            unlockTime
        );
    }

    function _claim(uint256 positionId, address user) internal {
        Position storage p = positions[positionId];
        if (p.withdrawn || p.weightedAmount == 0) return;

        uint256 accumulated = (p.weightedAmount * accRewardPerWeighted) /
            ACC_PRECISION;
        if (accumulated <= p.rewardDebt) return;
        uint256 pending = accumulated - p.rewardDebt;

        p.rewardDebt = accumulated;
        if (pending == 0) return;

        // reduce allocated rewards (should not underflow)
        if (rewardAllocated >= pending) {
            rewardAllocated -= pending;
        } else {
            rewardAllocated = 0;
        }

        rewardToken.safeTransfer(user, pending);
        emit Claimed(user, positionId, pending);

        _payReferral(user, pending);
    }

    function _payReferral(address user, uint256 userReward) internal {
        if (referralsPaused) return;
        if (referralBps == 0 || referralReserve == 0) return;
        address ref = referrerOf[user];
        if (ref == address(0) || ref == user) return;
        if (minReferrerStake > 0 && totalUserStaked[ref] < minReferrerStake)
            return;

        uint256 refReward = (userReward * referralBps) / BPS_DENOMINATOR;
        if (refReward == 0) return;

        uint256 pay = refReward > referralReserve ? referralReserve : refReward;
        if (pay == 0) return;

        referralReserve -= pay;
        rewardToken.safeTransfer(ref, pay);
        emit ReferralPaid(ref, user, pay);
    }

    function _setReferrer(address user, address referrer) internal {
        if (referrer == address(0)) return;
        if (referrer == user) return;
        if (referrerOf[user] != address(0)) return;
        referrerOf[user] = referrer;
        emit ReferrerSet(user, referrer);
    }

    function _updateRewards() internal {
        uint256 nowTs = block.timestamp;
        if (nowTs <= lastUpdateTime) return;

        uint256 elapsed = nowTs - lastUpdateTime;
        lastUpdateTime = nowTs;

        if (totalWeightedStaked == 0 || elapsed == 0) return;
        if (rewardReserve == 0) return;

        uint256 rate = _targetRewardRatePerSecond(
            totalWeightedStaked,
            totalStaked
        );
        if (rate == 0) return;

        uint256 reward = rate * elapsed;
        if (reward > rewardReserve) reward = rewardReserve;

        rewardReserve -= reward;
        rewardAllocated += reward;
        accRewardPerWeighted =
            accRewardPerWeighted +
            (reward * ACC_PRECISION) /
            totalWeightedStaked;
    }

    function _targetRewardRatePerSecond(
        uint256 _totalWeightedStaked,
        uint256 _totalStaked
    ) internal view returns (uint256) {
        if (_totalWeightedStaked == 0) return 0;
        uint256 aprBps = _aprForTVL(_totalStaked);
        if (aprBps == 0) return 0;
        return (_totalWeightedStaked * aprBps) / BPS_DENOMINATOR / YEAR;
    }

    function _aprForTVL(uint256 tvl) internal view returns (uint32) {
        uint256 len = aprTiers.length;
        if (len == 0) return 0;
        uint32 result = aprTiers[0].aprBps;
        for (uint256 i = 1; i < len; i++) {
            if (tvl < aprTiers[i].minTVL) break;
            result = aprTiers[i].aprBps;
        }
        return result;
    }

    function _setAprTiers(
        uint256[] memory tierTVL,
        uint32[] memory tierAprBps
    ) internal {
        require(tierTVL.length == tierAprBps.length, "length mismatch");
        require(tierTVL.length > 0, "no tiers");
        require(tierTVL[0] == 0, "first tvl must be 0");
        require(tierTVL.length <= MAX_APR_TIERS, "too many tiers");

        delete aprTiers;
        uint256 lastTVL = 0;
        for (uint256 i = 0; i < tierTVL.length; i++) {
            uint256 minTVL = tierTVL[i];
            uint32 aprBps = tierAprBps[i];
            require(i == 0 || minTVL > lastTVL, "tvl not ascending");
            aprTiers.push(AprTier({minTVL: minTVL, aprBps: aprBps}));
            lastTVL = minTVL;
        }
        emit AprTiersUpdated(tierTVL.length);
    }
}

