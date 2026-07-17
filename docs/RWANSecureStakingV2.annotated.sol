// SPDX-License-Identifier: MIT // License identifier for tooling and compliance.
pragma solidity ^0.8.20; // Solidity compiler version with built-in overflow checks.

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol"; // ERC20 interface for token interactions.
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol"; // Safe wrappers for ERC20 transfers.
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol"; // Ownership control for admin functions.
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol"; // Emergency pause functionality.
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol"; // Reentrancy protection.

/// @title RWANSecureStakingV2 // Contract title for documentation.
/// @notice Secure staking with independent positions, fixed + locked tiers, TVL-based APR, and referrals. // High-level contract behavior.
contract RWANSecureStakingV2 is Ownable, Pausable, ReentrancyGuard { // Main staking contract with owner, pausable, and reentrancy guard.
    using SafeERC20 for IERC20; // Enable SafeERC20 functions on IERC20 instances.

    uint256 public constant BPS_DENOMINATOR = 10_000; // Basis points denominator (10000 = 100%).
    uint256 public constant ACC_PRECISION = 1e18; // Precision factor for reward accounting.
    uint256 public constant YEAR = 365 days; // Seconds per year for APR calculations.
    uint256 public constant MAX_APR_TIERS = 25; // Cap on number of APR tiers.
    uint256 public constant MAX_REFERRAL_BPS = 2_000; // Max referral bps (20%).

    IERC20 public immutable stakingToken; // Token that users stake.
    IERC20 public immutable rewardToken; // Token used to pay rewards.

    struct LockOption { // Lock configuration.
        uint64 duration; // Lock duration in seconds.
        uint32 multiplierBps; // Multiplier in bps (10000 = 1.0x).
        bool enabled; // Whether this lock option can be used.
    }

    struct AprTier { // APR tier for TVL-based APR.
        uint256 minTVL; // Minimum TVL required to qualify for this tier.
        uint32 aprBps; // APR in basis points for 1.0x positions.
    }

    struct Position { // Staking position data.
        uint256 amount; // Raw staked amount.
        uint256 weightedAmount; // Amount adjusted by lock multiplier.
        uint64 startTime; // Timestamp when stake was created.
        uint64 unlockTime; // Unlock time; 0 for fixed (no lock).
        uint32 lockId; // Index into lockOptions.
        bool withdrawn; // Whether position has been withdrawn.
        uint256 rewardDebt; // Snapshot for reward accounting.
    }

    LockOption[] public lockOptions; // List of lock options; index 0 is fixed.
    AprTier[] public aprTiers; // TVL-based APR tiers.

    uint256 public totalStaked; // Total staked principal.
    uint256 public totalWeightedStaked; // Total weighted stake (after multipliers).
    uint256 public accRewardPerWeighted; // Accumulated reward per weighted unit.
    uint256 public lastUpdateTime; // Last time rewards were updated.

    uint256 public rewardReserve;   // Rewards available to distribute.
    uint256 public rewardAllocated; // Rewards accrued but not yet claimed.
    uint256 public referralReserve; // Rewards reserved for referrals.

    uint256 public minStakeAmount; // Minimum stake amount.
    uint256 public maxPositionsPerUser; // Max positions per user (0 = unlimited).
    uint256 public referralBps; // Referral reward rate in bps.
    uint256 public minReferrerStake; // Minimum stake required to earn referral.
    bool public referralsPaused; // Whether referral payouts are paused.

    uint256 public nextPositionId = 1; // Auto-incrementing position ID.

    mapping(uint256 => Position) public positions; // Position ID to Position data.
    mapping(uint256 => address) public positionOwner; // Position ID to owner address.
    mapping(address => uint256[]) private _userPositions; // User to list of position IDs.
    mapping(address => address) public referrerOf; // User to referrer mapping.
    mapping(address => uint256) public totalUserStaked; // User to total staked amount.

    event LockOptionAdded(uint256 indexed lockId, uint64 duration, uint32 multiplierBps, bool enabled); // Emitted when a lock option is added.
    event LockOptionUpdated(uint256 indexed lockId, uint64 duration, uint32 multiplierBps, bool enabled); // Emitted when a lock option is updated.
    event AprTiersUpdated(uint256 count); // Emitted when APR tiers change.
    event FundedRewards(address indexed from, uint256 amount); // Emitted when rewards funded.
    event FundedReferral(address indexed from, uint256 amount); // Emitted when referral rewards funded.
    event Staked(address indexed user, uint256 indexed positionId, uint256 amount, uint256 weightedAmount, uint32 lockId, uint64 unlockTime); // Emitted on stake.
    event Claimed(address indexed user, uint256 indexed positionId, uint256 rewardAmount); // Emitted on reward claim.
    event ReferralPaid(address indexed referrer, address indexed referee, uint256 rewardAmount); // Emitted on referral payout.
    event Withdrawn(address indexed user, uint256 indexed positionId, uint256 amount); // Emitted on withdraw.
    event EmergencyWithdrawn(address indexed user, uint256 indexed positionId, uint256 amount); // Emitted on emergency withdraw.
    event ReferrerSet(address indexed user, address indexed referrer); // Emitted when referrer set.
    event RescueToken(address indexed token, address indexed to, uint256 amount); // Emitted on token rescue.
    event ReferralsPaused(bool paused); // Emitted when referral pause state changes.

    constructor( // Constructor to initialize contract parameters.
        address stakingToken_, // Address of staking token.
        address rewardToken_, // Address of reward token.
        uint256 minStakeAmount_, // Minimum stake amount.
        uint256 maxPositionsPerUser_, // Max positions per user.
        uint256[] memory tierTVL, // TVL thresholds for APR tiers.
        uint32[] memory tierAprBps, // APR bps per tier.
        uint256 referralBps_ // Referral bps.
    ) Ownable(msg.sender) { // Set initial owner to deployer.
        require(stakingToken_ != address(0), "staking token zero"); // Validate staking token.
        require(rewardToken_ != address(0), "reward token zero"); // Validate reward token.
        require(referralBps_ <= MAX_REFERRAL_BPS, "referral bps too high"); // Validate referral bps.

        stakingToken = IERC20(stakingToken_); // Set staking token.
        rewardToken = IERC20(rewardToken_); // Set reward token.

        minStakeAmount = minStakeAmount_; // Set minimum stake.
        maxPositionsPerUser = maxPositionsPerUser_; // Set position limit.
        referralBps = referralBps_; // Set referral bps.

        // fixed option at index 0 // Comment indicates fixed option at index 0.
        lockOptions.push(LockOption({duration: 0, multiplierBps: 10_000, enabled: true})); // Add fixed lock option.
        emit LockOptionAdded(0, 0, 10_000, true); // Emit event for fixed option.

        _setAprTiers(tierTVL, tierAprBps); // Initialize APR tiers.
        lastUpdateTime = block.timestamp; // Initialize reward update time.
    }

    // ----------------------------- // Section divider.
    // Views // Read-only functions.
    // ----------------------------- // Section divider.

    function lockOptionsCount() external view returns (uint256) { // Returns lock option count.
        return lockOptions.length; // Length of lockOptions array.
    }

    function aprTiersCount() external view returns (uint256) { // Returns APR tier count.
        return aprTiers.length; // Length of aprTiers array.
    }

    function userPositions(address user) external view returns (uint256[] memory) { // Returns user's positions.
        return _userPositions[user]; // Return list of position IDs.
    }

    function currentAprBps() external view returns (uint32) { // Returns current APR based on TVL.
        return _aprForTVL(totalStaked); // Compute APR for current TVL.
    }

    function pendingRewards(uint256 positionId) public view returns (uint256) { // Calculates pending rewards for a position.
        Position memory p = positions[positionId]; // Load position into memory.
        if (p.withdrawn || p.weightedAmount == 0) return 0; // No rewards if withdrawn or zero weight.

        uint256 acc = accRewardPerWeighted; // Start with current accumulator.
        uint256 tws = totalWeightedStaked; // Cache total weighted stake.
        if (tws > 0) { // Only compute if there is stake.
            uint256 elapsed = block.timestamp - lastUpdateTime; // Time since last update.
            if (elapsed > 0) { // Only if time passed.
                uint256 rate = _targetRewardRatePerSecond(tws, totalStaked); // Compute reward rate per second.
                if (rate > 0 && rewardReserve > 0) { // Only if rate and reserve are positive.
                    uint256 reward = rate * elapsed; // Compute reward for elapsed time.
                    if (reward > rewardReserve) reward = rewardReserve; // Cap by reserve.
                    acc = acc + (reward * ACC_PRECISION) / tws; // Update accumulator.
                }
            }
        }

        uint256 accumulated = (p.weightedAmount * acc) / ACC_PRECISION; // Compute total accumulated rewards.
        if (accumulated <= p.rewardDebt) return 0; // No pending rewards if not above debt.
        return accumulated - p.rewardDebt; // Pending rewards.
    }

    // ----------------------------- // Section divider.
    // Admin // Owner-only functions.
    // ----------------------------- // Section divider.

    function pause() external onlyOwner { // Pause contract.
        _pause(); // Trigger pause.
    }

    function unpause() external onlyOwner { // Unpause contract.
        _unpause(); // Trigger unpause.
    }

    function addLockOption(uint64 duration, uint32 multiplierBps, bool enabled) external onlyOwner { // Add new lock option.
        require(duration > 0, "duration zero"); // Validate duration.
        require(multiplierBps > 0, "multiplier zero"); // Validate multiplier.
        lockOptions.push(LockOption({duration: duration, multiplierBps: multiplierBps, enabled: enabled})); // Push new lock option.
        emit LockOptionAdded(lockOptions.length - 1, duration, multiplierBps, enabled); // Emit event.
    }

    function setLockOption(uint256 lockId, uint64 duration, uint32 multiplierBps, bool enabled) external onlyOwner { // Update a lock option.
        require(lockId < lockOptions.length, "lockId out of range"); // Validate lockId.
        require(lockId != 0, "fixed locked"); // Prevent editing fixed option.
        require(duration > 0, "duration zero"); // Validate duration.
        require(multiplierBps > 0, "multiplier zero"); // Validate multiplier.
        lockOptions[lockId] = LockOption({duration: duration, multiplierBps: multiplierBps, enabled: enabled}); // Update option.
        emit LockOptionUpdated(lockId, duration, multiplierBps, enabled); // Emit event.
    }

    function setAprTiers(uint256[] memory tierTVL, uint32[] memory tierAprBps) external onlyOwner { // Update APR tiers.
        _updateRewards(); // Update rewards before changing tiers.
        _setAprTiers(tierTVL, tierAprBps); // Apply new tiers.
    }

    function setMinStakeAmount(uint256 amount) external onlyOwner { // Set minimum stake.
        minStakeAmount = amount; // Update minStakeAmount.
    }

    function setMaxPositionsPerUser(uint256 maxPositions) external onlyOwner { // Set max positions per user.
        maxPositionsPerUser = maxPositions; // Update max positions.
    }

    function setReferralBps(uint256 bps) external onlyOwner { // Set referral bps.
        require(bps <= MAX_REFERRAL_BPS, "referral bps too high"); // Validate referral bps.
        referralBps = bps; // Update referral bps.
    }

    function setMinReferrerStake(uint256 amount) external onlyOwner { // Set minimum stake for referrers.
        minReferrerStake = amount; // Update minReferrerStake.
    }

    function pauseReferrals() external onlyOwner { // Pause referral payouts.
        referralsPaused = true; // Set paused.
        emit ReferralsPaused(true); // Emit event.
    }

    function unpauseReferrals() external onlyOwner { // Unpause referral payouts.
        referralsPaused = false; // Set unpaused.
        emit ReferralsPaused(false); // Emit event.
    }

    function fundRewards(uint256 amount) external nonReentrant { // Fund reward reserve.
        require(amount > 0, "amount zero"); // Validate amount.
        uint256 beforeBal = rewardToken.balanceOf(address(this)); // Balance before transfer.
        rewardToken.safeTransferFrom(msg.sender, address(this), amount); // Transfer rewards in.
        uint256 received = rewardToken.balanceOf(address(this)) - beforeBal; // Calculate actual received.
        rewardReserve += received; // Increase reward reserve.
        emit FundedRewards(msg.sender, received); // Emit event.
    }

    function fundReferralRewards(uint256 amount) external nonReentrant { // Fund referral reserve.
        require(amount > 0, "amount zero"); // Validate amount.
        uint256 beforeBal = rewardToken.balanceOf(address(this)); // Balance before transfer.
        rewardToken.safeTransferFrom(msg.sender, address(this), amount); // Transfer referral rewards in.
        uint256 received = rewardToken.balanceOf(address(this)) - beforeBal; // Calculate actual received.
        referralReserve += received; // Increase referral reserve.
        emit FundedReferral(msg.sender, received); // Emit event.
    }

    /// @notice Recover tokens accidentally sent to this contract (excluding staking and reward tokens). // Notice for token rescue.
    function recoverERC20(address token, uint256 amount, address to) external onlyOwner { // Recover arbitrary ERC20.
        require(token != address(stakingToken), "no staking token"); // Prevent recovery of staking token.
        require(token != address(rewardToken), "no reward token"); // Prevent recovery of reward token.
        IERC20(token).safeTransfer(to, amount); // Transfer tokens out.
        emit RescueToken(token, to, amount); // Emit rescue event.
    }

    /// @notice Recover excess staking tokens (only truly excess beyond staked + rewards budgets). // Notice for staking token excess rescue.
    function recoverStakingTokenExcess(uint256 amount, address to) external onlyOwner { // Recover excess staking tokens.
        uint256 bal = stakingToken.balanceOf(address(this)); // Current staking token balance.
        uint256 protectedAmount = totalStaked; // Protected amount = total staked.
        if (address(rewardToken) == address(stakingToken)) { // If reward token is same as staking token.
            protectedAmount += rewardReserve + rewardAllocated + referralReserve; // Protect rewards too.
        }
        require(bal > protectedAmount, "no excess"); // Ensure there is excess.
        uint256 excess = bal - protectedAmount; // Compute excess.
        require(amount <= excess, "exceeds excess"); // Validate requested amount.
        stakingToken.safeTransfer(to, amount); // Transfer excess out.
        emit RescueToken(address(stakingToken), to, amount); // Emit rescue event.
    }

    // ----------------------------- // Section divider.
    // User actions // User-facing functions.
    // ----------------------------- // Section divider.

    function stakeFixed(uint256 amount, address referrer) external nonReentrant whenNotPaused { // Stake in fixed plan.
        _stake(amount, 0, referrer); // Call internal stake with lockId 0.
    }

    function stakeLocked(uint256 amount, uint256 lockId, address referrer) external nonReentrant whenNotPaused { // Stake in locked plan.
        require(lockId != 0, "use fixed"); // Require non-zero lockId for locked.
        _stake(amount, lockId, referrer); // Call internal stake with lockId.
    }

    function claim(uint256 positionId) external nonReentrant whenNotPaused { // Claim rewards for a position.
        require(positionOwner[positionId] == msg.sender, "not owner"); // Only owner can claim.
        _updateRewards(); // Update rewards before claiming.
        _claim(positionId, msg.sender); // Claim rewards.
    }

    function withdraw(uint256 positionId) external nonReentrant whenNotPaused { // Withdraw after unlock.
        require(positionOwner[positionId] == msg.sender, "not owner"); // Only owner can withdraw.
        Position storage p = positions[positionId]; // Load position storage.
        require(!p.withdrawn, "already withdrawn"); // Ensure not withdrawn.
        if (p.unlockTime > 0) { // If locked plan.
            require(block.timestamp >= p.unlockTime, "locked"); // Enforce lock.
        }

        _updateRewards(); // Update rewards before withdrawal.
        _claim(positionId, msg.sender); // Claim pending rewards.

        p.withdrawn = true; // Mark withdrawn.
        totalStaked -= p.amount; // Update total staked.
        totalWeightedStaked -= p.weightedAmount; // Update total weighted stake.
        totalUserStaked[msg.sender] -= p.amount; // Update user total.

        stakingToken.safeTransfer(msg.sender, p.amount); // Transfer principal out.
        emit Withdrawn(msg.sender, positionId, p.amount); // Emit withdraw event.
    }

    /// @notice Emergency withdraw principal only (no rewards). Requires contract to be paused. // Notice for emergency withdrawal.
    function emergencyWithdraw(uint256 positionId) external nonReentrant whenPaused { // Emergency withdraw principal.
        require(positionOwner[positionId] == msg.sender, "not owner"); // Only owner can withdraw.
        Position storage p = positions[positionId]; // Load position storage.
        require(!p.withdrawn, "already withdrawn"); // Ensure not withdrawn.

        p.withdrawn = true; // Mark withdrawn.
        totalStaked -= p.amount; // Update total staked.
        totalWeightedStaked -= p.weightedAmount; // Update total weighted stake.
        totalUserStaked[msg.sender] -= p.amount; // Update user total.

        stakingToken.safeTransfer(msg.sender, p.amount); // Transfer principal out.
        emit EmergencyWithdrawn(msg.sender, positionId, p.amount); // Emit emergency event.
    }

    // ----------------------------- // Section divider.
    // Internal // Internal helper functions.
    // ----------------------------- // Section divider.

    function _stake(uint256 amount, uint256 lockId, address referrer) internal { // Internal stake implementation.
        require(lockId < lockOptions.length, "lockId out of range"); // Validate lockId.
        LockOption memory opt = lockOptions[lockId]; // Load lock option.
        require(opt.enabled, "lock disabled"); // Ensure lock is enabled.

        if (maxPositionsPerUser > 0) { // If max positions is enforced.
            require(_userPositions[msg.sender].length < maxPositionsPerUser, "positions limit"); // Enforce limit.
        }

        _updateRewards(); // Update rewards before staking.

        uint256 beforeBal = stakingToken.balanceOf(address(this)); // Balance before transfer.
        stakingToken.safeTransferFrom(msg.sender, address(this), amount); // Transfer stake into contract.
        uint256 received = stakingToken.balanceOf(address(this)) - beforeBal; // Actual received after fees.
        require(received >= minStakeAmount, "amount too small"); // Enforce min stake.

        uint256 weightedAmount = (received * opt.multiplierBps) / BPS_DENOMINATOR; // Compute weighted amount.
        uint64 unlockTime = opt.duration == 0 ? 0 : uint64(block.timestamp + opt.duration); // Compute unlock time.

        uint256 positionId = nextPositionId++; // Generate new position ID.
        positions[positionId] = Position({ // Store new position.
            amount: received, // Raw amount.
            weightedAmount: weightedAmount, // Weighted amount.
            startTime: uint64(block.timestamp), // Start time.
            unlockTime: unlockTime, // Unlock time.
            lockId: uint32(lockId), // Lock ID.
            withdrawn: false, // Not withdrawn yet.
            rewardDebt: (weightedAmount * accRewardPerWeighted) / ACC_PRECISION // Initialize reward debt.
        }); // End of position struct assignment.

        positionOwner[positionId] = msg.sender; // Set position owner.
        _userPositions[msg.sender].push(positionId); // Add position to user list.

        totalStaked += received; // Update total staked.
        totalWeightedStaked += weightedAmount; // Update total weighted staked.
        totalUserStaked[msg.sender] += received; // Update user staked total.

        _setReferrer(msg.sender, referrer); // Set referrer if eligible.

        emit Staked(msg.sender, positionId, received, weightedAmount, uint32(lockId), unlockTime); // Emit stake event.
    }

    function _claim(uint256 positionId, address user) internal { // Internal reward claim.
        Position storage p = positions[positionId]; // Load position storage.
        if (p.withdrawn || p.weightedAmount == 0) return; // Exit if withdrawn or zero weight.

        uint256 accumulated = (p.weightedAmount * accRewardPerWeighted) / ACC_PRECISION; // Total rewards accumulated.
        if (accumulated <= p.rewardDebt) return; // Exit if no rewards.
        uint256 pending = accumulated - p.rewardDebt; // Compute pending rewards.

        p.rewardDebt = accumulated; // Update reward debt.
        if (pending == 0) return; // Exit if zero pending.

        // reduce allocated rewards (should not underflow) // Comment about allocated rewards.
        if (rewardAllocated >= pending) { // If allocated rewards cover pending.
            rewardAllocated -= pending; // Reduce allocated rewards.
        } else { // Otherwise, set to zero.
            rewardAllocated = 0; // Avoid underflow.
        }

        rewardToken.safeTransfer(user, pending); // Transfer rewards to user.
        emit Claimed(user, positionId, pending); // Emit claim event.

        _payReferral(user, pending); // Pay referral rewards if applicable.
    }

    function _payReferral(address user, uint256 userReward) internal { // Internal referral payout.
        if (referralsPaused) return; // Exit if referrals paused.
        if (referralBps == 0 || referralReserve == 0) return; // Exit if no referral budget.
        address ref = referrerOf[user]; // Get referrer.
        if (ref == address(0) || ref == user) return; // Exit if no valid referrer.
        if (minReferrerStake > 0 && totalUserStaked[ref] < minReferrerStake) return; // Ensure referrer meets stake requirement.

        uint256 refReward = (userReward * referralBps) / BPS_DENOMINATOR; // Compute referral reward.
        if (refReward == 0) return; // Exit if zero reward.

        uint256 pay = refReward > referralReserve ? referralReserve : refReward; // Cap by reserve.
        if (pay == 0) return; // Exit if nothing to pay.

        referralReserve -= pay; // Reduce referral reserve.
        rewardToken.safeTransfer(ref, pay); // Transfer referral reward.
        emit ReferralPaid(ref, user, pay); // Emit referral event.
    }

    function _setReferrer(address user, address referrer) internal { // Internal referrer assignment.
        if (referrer == address(0)) return; // Ignore zero referrer.
        if (referrer == user) return; // Prevent self-referral.
        if (referrerOf[user] != address(0)) return; // Only set once.
        referrerOf[user] = referrer; // Set referrer.
        emit ReferrerSet(user, referrer); // Emit referrer set event.
    }

    function _updateRewards() internal { // Internal reward update.
        uint256 nowTs = block.timestamp; // Current timestamp.
        if (nowTs <= lastUpdateTime) return; // Exit if no time elapsed.

        uint256 elapsed = nowTs - lastUpdateTime; // Time since last update.
        lastUpdateTime = nowTs; // Update last update time.

        if (totalWeightedStaked == 0 || elapsed == 0) return; // Exit if no stake or no time.
        if (rewardReserve == 0) return; // Exit if no reserve.

        uint256 rate = _targetRewardRatePerSecond(totalWeightedStaked, totalStaked); // Compute target reward rate.
        if (rate == 0) return; // Exit if rate is zero.

        uint256 reward = rate * elapsed; // Compute reward for elapsed time.
        if (reward > rewardReserve) reward = rewardReserve; // Cap by reserve.

        rewardReserve -= reward; // Reduce reserve.
        rewardAllocated += reward; // Increase allocated rewards.
        accRewardPerWeighted = accRewardPerWeighted + (reward * ACC_PRECISION) / totalWeightedStaked; // Update accumulator.
    }

    function _targetRewardRatePerSecond(uint256 _totalWeightedStaked, uint256 _totalStaked) internal view returns (uint256) { // Compute reward rate per second.
        if (_totalWeightedStaked == 0) return 0; // Avoid division by zero.
        uint256 aprBps = _aprForTVL(_totalStaked); // Get APR for TVL.
        if (aprBps == 0) return 0; // Exit if APR is zero.
        return (_totalWeightedStaked * aprBps) / BPS_DENOMINATOR / YEAR; // Convert APR to per-second rate.
    }

    function _aprForTVL(uint256 tvl) internal view returns (uint32) { // Get APR tier for TVL.
        uint256 len = aprTiers.length; // Cache tier count.
        if (len == 0) return 0; // Return zero if no tiers.
        uint32 result = aprTiers[0].aprBps; // Default to first tier.
        for (uint256 i = 1; i < len; i++) { // Loop through tiers.
            if (tvl < aprTiers[i].minTVL) break; // Stop when TVL below next threshold.
            result = aprTiers[i].aprBps; // Update to higher tier.
        }
        return result; // Return chosen APR.
    }

    function _setAprTiers(uint256[] memory tierTVL, uint32[] memory tierAprBps) internal { // Internal tier setup.
        require(tierTVL.length == tierAprBps.length, "length mismatch"); // Validate input lengths.
        require(tierTVL.length > 0, "no tiers"); // Require at least one tier.
        require(tierTVL[0] == 0, "first tvl must be 0"); // Require first tier at TVL 0.
        require(tierTVL.length <= MAX_APR_TIERS, "too many tiers"); // Enforce tier count limit.

        delete aprTiers; // Clear existing tiers.
        uint256 lastTVL = 0; // Track last TVL to enforce ascending order.
        for (uint256 i = 0; i < tierTVL.length; i++) { // Loop through tiers.
            uint256 minTVL = tierTVL[i]; // Current tier TVL threshold.
            uint32 aprBps = tierAprBps[i]; // Current tier APR bps.
            require(i == 0 || minTVL > lastTVL, "tvl not ascending"); // Enforce ascending TVL.
            aprTiers.push(AprTier({minTVL: minTVL, aprBps: aprBps})); // Add tier.
            lastTVL = minTVL; // Update last TVL.
        }
        emit AprTiersUpdated(tierTVL.length); // Emit event.
    }
} // End of contract.
