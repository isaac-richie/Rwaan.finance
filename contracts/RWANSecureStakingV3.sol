// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

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
