// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

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
    event EmergencyRewardRecovered(
        address indexed to,
        uint256 rewardAmount,
        uint256 referralAmount
    );

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
            LockOption({
                duration: 90 days,
                multiplierBps: 20_000,
                enabled: true
            })
        );
        emit LockOptionAdded(1, 90 days, 20_000, true);

        lockOptions.push(
            LockOption({
                duration: 180 days,
                multiplierBps: 40_000,
                enabled: true
            })
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

    function pendingRewards(
        uint256 positionId
    ) external view returns (uint256) {
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

    /// @notice Emergency recovery of reward and referral reserves when contract is paused (exploit scenario).
    /// @dev Can only be called when paused. Recovers all reward and referral reserves immediately.
    /// @param to Address to send recovered funds
    function emergencyRecoverRewards(address to) external onlyOwner whenPaused {
        require(to != address(0), "invalid recipient");

        uint256 rewardAmount = rewardReserve;
        uint256 referralAmount = referralReserve;
        uint256 totalRecovered = rewardAmount + referralAmount;

        require(totalRecovered > 0, "nothing to recover");

        // Zero out reserves
        rewardReserve = 0;
        referralReserve = 0;

        // Transfer funds
        rewardToken.safeTransfer(to, totalRecovered);

        emit EmergencyRewardRecovered(to, rewardAmount, referralAmount);
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
