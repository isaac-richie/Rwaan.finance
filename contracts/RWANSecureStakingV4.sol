// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title RWANSecureStakingV4
/// @notice Reserve-backed staking with configurable plans, affiliate rewards, and rank rewards.
contract RWANSecureStakingV4 is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MAX_AFFILIATE_DEPTH = 20;
    uint256 public constant MAX_RANKS = 32;
    uint256 public constant MAX_TOTAL_AFFILIATE_BPS = 20_000;
    uint256 public constant MAX_DAILY_RATE_BPS = 100;
    uint256 public constant MAX_MARKETPLACE_CREDIT_BPS = 2_000;
    uint256 public constant ACC_PRECISION = 1e18;

    bytes32 public constant PARAMETER_ROLE = keccak256("PARAMETER_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardToken;

    struct StakePlan {
        uint64 lockDuration;
        uint32 dailyRateBps;
        uint32 earlyPenaltyBps;
        bool enabled;
    }

    struct Position {
        address owner;
        uint256 amount;
        uint64 startTime;
        uint64 unlockTime;
        uint64 lastClaimTime;
        uint32 planId;
        uint256 rewardClaimed;
        bool withdrawn;
    }

    struct RankConfig {
        uint256 minPersonalStake;
        uint256 minTeamStake;
        uint32 weightBps;
        bool enabled;
    }

    struct UserRank {
        uint32 rankId;
        uint256 rewardDebt;
        uint256 accrued;
    }

    struct MarketplaceBenefit {
        uint256 minStakeAmount;
        uint32 bonusDailyRateBps;
        uint32 creditBps;
        bool claimAfterUnlock;
        bool vipEligible;
        bool enabled;
    }

    StakePlan[] public stakePlans;
    RankConfig[] public rankConfigs;
    uint32[] public affiliateLevelBps;

    uint256 public minStakeAmount;
    uint256 public maxPositionsPerUser;
    uint256 public maxDailyStakingEmission;
    uint256 public stakingEmissionAvailable;
    uint256 public lastStakingEmissionUpdate;

    uint256 public totalStaked;
    uint256 public nextPositionId = 1;
    uint256 public stakingRewardReserve;
    uint256 public affiliateRewardReserve;
    uint256 public rankRewardReserve;
    uint256 public rankRewardAllocated;
    uint256 public marketplaceCreditReserve;
    uint256 public marketplaceCreditAllocated;

    uint8 public maxAffiliateDepth;
    uint256 public maxAffiliateTotalBps;
    uint256 public minReferralStake;
    bool public affiliateRewardsPaused;
    bool public rankRewardsPaused;
    bool public stakingPaused;
    bool public claimsPaused;
    bool public withdrawalsPaused;

    uint256 public dailyRankBudget;
    uint256 public totalRankWeight;
    uint256 public accRankRewardPerWeight;
    uint256 public lastRankRewardUpdate;

    mapping(uint256 => Position) public positions;
    mapping(address => uint256[]) private _userPositions;
    mapping(address => uint256) public totalUserStaked;
    mapping(address => uint256) public teamStake;
    mapping(address => address) public referrerOf;
    mapping(address => UserRank) public userRanks;
    mapping(uint256 => MarketplaceBenefit) public marketplaceBenefits;
    mapping(uint256 => uint32) public positionRewardRateBps;
    mapping(uint256 => bool) public positionRewardRateSet;
    mapping(uint256 => uint256) public positionUnpaidRewards;
    mapping(uint256 => uint256) public positionMarketplaceCredit;
    mapping(uint256 => uint64) public positionMarketplaceCreditAvailableAt;
    mapping(uint256 => bool) public positionMarketplaceVipEligible;
    mapping(uint256 => bool) public marketplaceCreditClaimed;
    mapping(address => uint256) public userRankWeight;

    event StakePlanUpdated(
        uint256 indexed planId, uint64 lockDuration, uint32 dailyRateBps, uint32 earlyPenaltyBps, bool enabled
    );
    event PositionCreated(
        address indexed user, uint256 indexed positionId, uint256 amount, uint32 indexed planId, uint64 unlockTime
    );
    event RewardClaimed(address indexed user, uint256 indexed positionId, uint256 amount);
    event Withdrawn(address indexed user, uint256 indexed positionId, uint256 amount);
    event WithdrawnEarly(
        address indexed user, uint256 indexed positionId, uint256 amountAfterPenalty, uint256 penaltyAmount
    );
    event EmergencyWithdrawn(address indexed user, uint256 indexed positionId, uint256 amount);
    event ReferrerSet(address indexed user, address indexed referrer);
    event AffiliateConfigUpdated(uint8 maxDepth, uint256 levelCount);
    event AffiliateTotalCapUpdated(uint256 oldCapBps, uint256 newCapBps);
    event AffiliateRewardPaid(address indexed referrer, address indexed user, uint256 indexed level, uint256 amount);
    event RankConfigUpdated(
        uint256 indexed rankId, uint256 minPersonalStake, uint256 minTeamStake, uint32 weightBps, bool enabled
    );
    event UserRankUpdated(address indexed user, uint32 indexed oldRankId, uint32 indexed newRankId);
    event RankRewardClaimed(address indexed user, uint256 amount);
    event ReserveFunded(bytes32 indexed reserve, address indexed from, uint256 amount);
    event ReserveWithdrawn(bytes32 indexed reserve, address indexed to, uint256 amount);
    event TreasuryRecovered(address indexed token, address indexed to, uint256 amount);
    event NativeRecovered(address indexed to, uint256 amount);
    event PauseFlagsUpdated(
        bool stakingPaused,
        bool claimsPaused,
        bool withdrawalsPaused,
        bool affiliateRewardsPaused,
        bool rankRewardsPaused
    );
    event MinStakeAmountUpdated(uint256 amount);
    event MaxPositionsPerUserUpdated(uint256 maxPositions);
    event MinReferralStakeUpdated(uint256 amount);
    event MaxDailyStakingEmissionUpdated(uint256 amount);
    event DailyRankBudgetUpdated(uint256 amount);
    event MarketplaceBenefitUpdated(
        uint256 indexed planId,
        uint256 minStakeAmount,
        uint32 bonusDailyRateBps,
        uint32 creditBps,
        bool claimAfterUnlock,
        bool vipEligible,
        bool enabled
    );
    event MarketplaceBenefitLocked(
        address indexed user,
        uint256 indexed positionId,
        uint256 creditAmount,
        uint32 bonusDailyRateBps,
        uint64 availableAt,
        bool vipEligible
    );
    event MarketplaceCreditClaimed(address indexed user, uint256 indexed positionId, uint256 amount);

    constructor(
        address stakingToken_,
        address rewardToken_,
        address admin_,
        uint256 minStakeAmount_,
        uint256 maxPositionsPerUser_
    ) {
        require(stakingToken_ != address(0), "staking token zero");
        require(rewardToken_ != address(0), "reward token zero");
        require(admin_ != address(0), "admin zero");

        stakingToken = IERC20(stakingToken_);
        rewardToken = IERC20(rewardToken_);
        minStakeAmount = minStakeAmount_;
        maxPositionsPerUser = maxPositionsPerUser_;
        maxAffiliateDepth = 0;
        maxAffiliateTotalBps = MAX_TOTAL_AFFILIATE_BPS;
        lastStakingEmissionUpdate = block.timestamp;
        lastRankRewardUpdate = block.timestamp;

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(PARAMETER_ROLE, admin_);
        _grantRole(TREASURY_ROLE, admin_);
        _grantRole(PAUSER_ROLE, admin_);
    }

    function stakePlansLength() external view returns (uint256) {
        return stakePlans.length;
    }

    function rankConfigsLength() external view returns (uint256) {
        return rankConfigs.length;
    }

    function affiliateLevelsLength() external view returns (uint256) {
        return affiliateLevelBps.length;
    }

    function userPositions(address user) external view returns (uint256[] memory) {
        return _userPositions[user];
    }

    function protectedTokenBalance(address token) public view returns (uint256) {
        uint256 protectedAmount;
        if (token == address(stakingToken)) {
            protectedAmount += totalStaked;
        }
        if (token == address(rewardToken)) {
            protectedAmount += stakingRewardReserve + affiliateRewardReserve + rankRewardReserve + rankRewardAllocated
                + marketplaceCreditReserve + marketplaceCreditAllocated;
        }
        return protectedAmount;
    }

    function surplusTokenBalance(address token) public view returns (uint256) {
        uint256 balance = IERC20(token).balanceOf(address(this));
        uint256 protectedAmount = protectedTokenBalance(token);
        return balance > protectedAmount ? balance - protectedAmount : 0;
    }

    function pendingRewards(uint256 positionId) public view returns (uint256) {
        Position memory p = positions[positionId];
        if (p.owner == address(0)) return 0;

        uint256 unpaid = positionUnpaidRewards[positionId];
        if (p.withdrawn) return unpaid;

        StakePlan memory plan = stakePlans[p.planId];
        uint256 elapsed = block.timestamp - p.lastClaimTime;
        uint256 rateBps = positionRewardRateSet[positionId] ? positionRewardRateBps[positionId] : plan.dailyRateBps;
        return unpaid + (p.amount * rateBps * elapsed) / (1 days * BPS_DENOMINATOR);
    }

    function pendingRankRewards(address user) external view returns (uint256) {
        UserRank memory account = userRanks[user];
        uint256 weight = userRankWeight[user];
        uint256 acc = accRankRewardPerWeight;

        if (!rankRewardsPaused && totalRankWeight > 0 && dailyRankBudget > 0) {
            uint256 elapsed = block.timestamp - lastRankRewardUpdate;
            // Mirror _updateRankRewards: multiply before divide, then derive the
            // clamped reward from the same delta so the preview matches on-chain.
            uint256 accDelta = (dailyRankBudget * elapsed * ACC_PRECISION) / (1 days * totalRankWeight);
            // Reviewed: share-based reward math necessarily divides (per-weight
            // rate) then multiplies (back to a token amount); reward is derived
            // from accDelta so accounting can never over-allocate. Safe.
            // slither-disable-next-line divide-before-multiply
            uint256 reward = (accDelta * totalRankWeight) / ACC_PRECISION;
            if (reward > rankRewardReserve) {
                accDelta = (rankRewardReserve * ACC_PRECISION) / totalRankWeight;
            }
            acc += accDelta;
        }

        uint256 accumulated = (weight * acc) / ACC_PRECISION;
        uint256 pending = accumulated > account.rewardDebt ? accumulated - account.rewardDebt : 0;
        return account.accrued + pending;
    }

    function stake(uint256 amount, uint256 planId, address referrer) external nonReentrant whenNotPaused {
        require(!stakingPaused, "staking paused");
        require(planId < stakePlans.length, "invalid plan");
        require(planId <= type(uint32).max, "plan id too high");
        StakePlan memory plan = stakePlans[planId];
        require(plan.enabled, "plan disabled");
        require(amount >= minStakeAmount, "amount too low");

        MarketplaceBenefit memory benefit = marketplaceBenefits[planId];
        uint256 totalRateBps = plan.dailyRateBps;
        uint256 creditAmount;
        uint64 creditAvailableAt;
        bool vipEligible;
        if (benefit.enabled && amount >= benefit.minStakeAmount) {
            totalRateBps += benefit.bonusDailyRateBps;
            creditAmount = (amount * benefit.creditBps) / BPS_DENOMINATOR;
            vipEligible = benefit.vipEligible;
        }
        require(totalRateBps <= MAX_DAILY_RATE_BPS, "daily rate too high");

        if (maxPositionsPerUser > 0) {
            require(_userPositions[msg.sender].length < maxPositionsPerUser, "positions limit");
        }

        if (referrer != address(0)) {
            _setReferrer(msg.sender, referrer);
        }

        _pullExact(stakingToken, msg.sender, amount);

        uint64 unlockTime = plan.lockDuration > 0 ? uint64(block.timestamp + plan.lockDuration) : 0;
        if (benefit.enabled && amount >= benefit.minStakeAmount) {
            creditAvailableAt = benefit.claimAfterUnlock && unlockTime > 0 ? unlockTime : uint64(block.timestamp);
            require(creditAmount <= marketplaceCreditReserve, "marketplace reserve low");
            marketplaceCreditReserve -= creditAmount;
            marketplaceCreditAllocated += creditAmount;
        }
        uint256 positionId = nextPositionId++;

        // forge-lint: disable-next-line(unsafe-typecast)
        uint32 planId32 = uint32(planId);

        positions[positionId] = Position({
            owner: msg.sender,
            amount: amount,
            startTime: uint64(block.timestamp),
            unlockTime: unlockTime,
            lastClaimTime: uint64(block.timestamp),
            planId: planId32,
            rewardClaimed: 0,
            withdrawn: false
        });

        // forge-lint: disable-next-line(unsafe-typecast)
        positionRewardRateBps[positionId] = uint32(totalRateBps);
        positionRewardRateSet[positionId] = true;
        positionMarketplaceCredit[positionId] = creditAmount;
        positionMarketplaceCreditAvailableAt[positionId] = creditAvailableAt;
        positionMarketplaceVipEligible[positionId] = vipEligible;

        _userPositions[msg.sender].push(positionId);
        totalStaked += amount;
        totalUserStaked[msg.sender] += amount;
        _increaseTeamStake(msg.sender, amount);

        emit PositionCreated(msg.sender, positionId, amount, planId32, unlockTime);
        if (benefit.enabled && amount >= benefit.minStakeAmount) {
            emit MarketplaceBenefitLocked(
                msg.sender, positionId, creditAmount, benefit.bonusDailyRateBps, creditAvailableAt, vipEligible
            );
        }
    }

    function claim(uint256 positionId) external nonReentrant whenNotPaused {
        require(!claimsPaused, "claims paused");
        require(positions[positionId].owner == msg.sender, "not owner");
        _claim(positionId, msg.sender, true);
    }

    function withdraw(uint256 positionId) external nonReentrant whenNotPaused {
        require(!withdrawalsPaused, "withdrawals paused");
        Position storage p = positions[positionId];
        require(p.owner == msg.sender, "not owner");
        require(!p.withdrawn, "already withdrawn");
        require(p.unlockTime == 0 || block.timestamp >= p.unlockTime, "still locked");

        if (!claimsPaused) {
            _claim(positionId, msg.sender, true);
        } else {
            _checkpointRewards(positionId);
        }

        _settleMarketplaceCredit(positionId, msg.sender, false);

        p.withdrawn = true;
        totalStaked -= p.amount;
        totalUserStaked[msg.sender] -= p.amount;
        _decreaseTeamStake(msg.sender, p.amount);

        _pushExact(stakingToken, msg.sender, p.amount);
        emit Withdrawn(msg.sender, positionId, p.amount);
    }

    function withdrawEarly(uint256 positionId) external nonReentrant whenNotPaused {
        require(!withdrawalsPaused, "withdrawals paused");
        Position storage p = positions[positionId];
        require(p.owner == msg.sender, "not owner");
        require(!p.withdrawn, "already withdrawn");
        require(p.unlockTime > 0 && block.timestamp < p.unlockTime, "not early");

        if (!claimsPaused) {
            _claim(positionId, msg.sender, true);
        } else {
            _checkpointRewards(positionId);
        }

        _settleMarketplaceCredit(positionId, msg.sender, true);

        StakePlan memory plan = stakePlans[p.planId];
        uint256 penaltyAmount = (p.amount * plan.earlyPenaltyBps) / BPS_DENOMINATOR;
        uint256 amountAfterPenalty = p.amount - penaltyAmount;

        p.withdrawn = true;
        totalStaked -= p.amount;
        totalUserStaked[msg.sender] -= p.amount;
        _decreaseTeamStake(msg.sender, p.amount);

        if (address(stakingToken) == address(rewardToken) && penaltyAmount > 0) {
            stakingRewardReserve += penaltyAmount;
        }

        _pushExact(stakingToken, msg.sender, amountAfterPenalty);
        emit WithdrawnEarly(msg.sender, positionId, amountAfterPenalty, penaltyAmount);
    }

    function emergencyWithdraw(uint256 positionId) external nonReentrant {
        Position storage p = positions[positionId];
        require(p.owner == msg.sender, "not owner");
        require(!p.withdrawn, "already withdrawn");
        require(paused() || withdrawalsPaused, "emergency unavailable");

        _checkpointRewards(positionId);

        p.withdrawn = true;
        totalStaked -= p.amount;
        totalUserStaked[msg.sender] -= p.amount;
        _decreaseTeamStake(msg.sender, p.amount);

        _settleMarketplaceCredit(positionId, msg.sender, true);

        _pushExact(stakingToken, msg.sender, p.amount);
        emit EmergencyWithdrawn(msg.sender, positionId, p.amount);
    }

    function claimRankReward() external nonReentrant whenNotPaused {
        require(!rankRewardsPaused, "rank rewards paused");
        _updateRankRewards();
        _syncUserRank(msg.sender);

        uint256 amount = userRanks[msg.sender].accrued;
        require(amount > 0, "nothing to claim");
        require(amount <= rankRewardAllocated, "rank allocation low");

        userRanks[msg.sender].accrued = 0;
        rankRewardAllocated -= amount;
        _pushExact(rewardToken, msg.sender, amount);
        emit RankRewardClaimed(msg.sender, amount);
    }

    function claimMarketplaceCredit(uint256 positionId) external nonReentrant whenNotPaused {
        require(!claimsPaused, "claims paused");
        Position memory p = positions[positionId];
        require(p.owner == msg.sender, "not owner");
        require(!p.withdrawn, "already withdrawn");
        _settleMarketplaceCredit(positionId, msg.sender, false);
    }

    function fundStakingRewards(uint256 amount) external nonReentrant {
        require(amount > 0, "amount zero");
        _pullExact(rewardToken, msg.sender, amount);
        stakingRewardReserve += amount;
        emit ReserveFunded("STAKING_REWARDS", msg.sender, amount);
    }

    function fundAffiliateRewards(uint256 amount) external nonReentrant {
        require(amount > 0, "amount zero");
        _pullExact(rewardToken, msg.sender, amount);
        affiliateRewardReserve += amount;
        emit ReserveFunded("AFFILIATE_REWARDS", msg.sender, amount);
    }

    function fundRankRewards(uint256 amount) external nonReentrant {
        require(amount > 0, "amount zero");
        _pullExact(rewardToken, msg.sender, amount);
        rankRewardReserve += amount;
        emit ReserveFunded("RANK_REWARDS", msg.sender, amount);
    }

    function fundMarketplaceRewards(uint256 amount) external nonReentrant {
        require(amount > 0, "amount zero");
        _pullExact(rewardToken, msg.sender, amount);
        marketplaceCreditReserve += amount;
        emit ReserveFunded("MARKETPLACE_REWARDS", msg.sender, amount);
    }

    function withdrawStakingRewardReserve(address to, uint256 amount)
        external
        nonReentrant
        onlyRole(TREASURY_ROLE)
        whenNotPaused
    {
        _withdrawReserve(to, amount, 0);
        stakingRewardReserve -= amount;
        _pushExact(rewardToken, to, amount);
        emit ReserveWithdrawn("STAKING_REWARDS", to, amount);
    }

    function withdrawAffiliateRewardReserve(address to, uint256 amount)
        external
        nonReentrant
        onlyRole(TREASURY_ROLE)
        whenNotPaused
    {
        _withdrawReserve(to, amount, 1);
        affiliateRewardReserve -= amount;
        _pushExact(rewardToken, to, amount);
        emit ReserveWithdrawn("AFFILIATE_REWARDS", to, amount);
    }

    function withdrawRankRewardReserve(address to, uint256 amount)
        external
        nonReentrant
        onlyRole(TREASURY_ROLE)
        whenNotPaused
    {
        _withdrawReserve(to, amount, 2);
        rankRewardReserve -= amount;
        _pushExact(rewardToken, to, amount);
        emit ReserveWithdrawn("RANK_REWARDS", to, amount);
    }

    function withdrawMarketplaceRewardReserve(address to, uint256 amount)
        external
        nonReentrant
        onlyRole(TREASURY_ROLE)
        whenNotPaused
    {
        _withdrawReserve(to, amount, 3);
        marketplaceCreditReserve -= amount;
        _pushExact(rewardToken, to, amount);
        emit ReserveWithdrawn("MARKETPLACE_REWARDS", to, amount);
    }

    function recoverSurplusERC20(address token, address to, uint256 amount)
        external
        nonReentrant
        onlyRole(TREASURY_ROLE)
        whenNotPaused
    {
        require(to != address(0), "recipient zero");
        require(amount <= surplusTokenBalance(token), "exceeds surplus");
        IERC20(token).safeTransfer(to, amount);
        emit TreasuryRecovered(token, to, amount);
    }

    function recoverNative(address payable to, uint256 amount)
        external
        nonReentrant
        onlyRole(TREASURY_ROLE)
        whenNotPaused
    {
        require(to != address(0), "recipient zero");
        require(amount > 0, "amount zero");
        require(amount <= address(this).balance, "native balance low");
        (bool success,) = to.call{value: amount}("");
        require(success, "native transfer failed");
        emit NativeRecovered(to, amount);
    }

    function addStakePlan(uint64 lockDuration, uint32 dailyRateBps, uint32 earlyPenaltyBps, bool enabled)
        external
        onlyRole(PARAMETER_ROLE)
        whenNotPaused
        returns (uint256 planId)
    {
        _validatePlan(dailyRateBps, earlyPenaltyBps);
        planId = stakePlans.length;
        stakePlans.push(StakePlan(lockDuration, dailyRateBps, earlyPenaltyBps, enabled));
        emit StakePlanUpdated(planId, lockDuration, dailyRateBps, earlyPenaltyBps, enabled);
    }

    function updateStakePlan(uint256 planId, uint32 dailyRateBps, uint32 earlyPenaltyBps, bool enabled)
        external
        onlyRole(PARAMETER_ROLE)
        whenNotPaused
    {
        require(planId < stakePlans.length, "invalid plan");
        _validatePlan(dailyRateBps, earlyPenaltyBps);
        StakePlan storage plan = stakePlans[planId];
        plan.dailyRateBps = dailyRateBps;
        plan.earlyPenaltyBps = earlyPenaltyBps;
        plan.enabled = enabled;
        emit StakePlanUpdated(planId, plan.lockDuration, dailyRateBps, earlyPenaltyBps, enabled);
    }

    /// @notice Changes the duration used by future positions for this plan.
    /// @dev Existing positions keep their stored unlockTime and are not repriced.
    function setStakePlanDuration(uint256 planId, uint64 lockDuration) external onlyRole(PARAMETER_ROLE) whenNotPaused {
        require(planId < stakePlans.length, "invalid plan");
        StakePlan storage plan = stakePlans[planId];
        plan.lockDuration = lockDuration;
        emit StakePlanUpdated(planId, plan.lockDuration, plan.dailyRateBps, plan.earlyPenaltyBps, plan.enabled);
    }

    /// @notice Configures optional marketplace and VIP benefits for future positions.
    /// @dev New positions snapshot the resulting rate and benefit entitlement.
    function setMarketplaceBenefit(
        uint256 planId,
        uint256 minStakeAmount_,
        uint32 bonusDailyRateBps,
        uint32 creditBps,
        bool claimAfterUnlock,
        bool vipEligible,
        bool enabled
    ) external onlyRole(PARAMETER_ROLE) whenNotPaused {
        require(planId < stakePlans.length, "invalid plan");
        require(creditBps <= MAX_MARKETPLACE_CREDIT_BPS, "credit too high");
        require(
            uint256(stakePlans[planId].dailyRateBps) + bonusDailyRateBps <= MAX_DAILY_RATE_BPS, "daily rate too high"
        );

        marketplaceBenefits[planId] = MarketplaceBenefit({
            minStakeAmount: minStakeAmount_,
            bonusDailyRateBps: bonusDailyRateBps,
            creditBps: creditBps,
            claimAfterUnlock: claimAfterUnlock,
            vipEligible: vipEligible,
            enabled: enabled
        });

        emit MarketplaceBenefitUpdated(
            planId, minStakeAmount_, bonusDailyRateBps, creditBps, claimAfterUnlock, vipEligible, enabled
        );
    }

    function marketplaceCreditForPosition(uint256 positionId) external view returns (uint256) {
        return positionMarketplaceCredit[positionId];
    }

    function marketplaceCreditClaimable(uint256 positionId) external view returns (bool) {
        Position memory p = positions[positionId];
        return p.owner != address(0) && !p.withdrawn && !marketplaceCreditClaimed[positionId]
            && positionMarketplaceCredit[positionId] > 0
            && block.timestamp >= positionMarketplaceCreditAvailableAt[positionId];
    }

    function marketplaceVipEligible(uint256 positionId) external view returns (bool) {
        return positionMarketplaceVipEligible[positionId];
    }

    function setAffiliateLevels(uint32[] calldata levelBps, uint8 maxDepth)
        external
        onlyRole(PARAMETER_ROLE)
        whenNotPaused
    {
        require(maxDepth <= MAX_AFFILIATE_DEPTH, "depth too high");
        require(levelBps.length <= MAX_AFFILIATE_DEPTH, "too many levels");
        require(maxDepth <= levelBps.length, "depth exceeds levels");

        uint256 totalBps;
        delete affiliateLevelBps;
        for (uint256 i = 0; i < levelBps.length; i++) {
            totalBps += levelBps[i];
            affiliateLevelBps.push(levelBps[i]);
        }
        require(totalBps <= maxAffiliateTotalBps, "affiliate bps too high");

        maxAffiliateDepth = maxDepth;
        emit AffiliateConfigUpdated(maxDepth, levelBps.length);
    }

    /// @notice Tunes the aggregate affiliate payout cap without removing the hard ceiling.
    function setMaxAffiliateTotalBps(uint256 newCapBps) external onlyRole(PARAMETER_ROLE) whenNotPaused {
        require(newCapBps <= MAX_TOTAL_AFFILIATE_BPS, "affiliate cap too high");
        uint256 oldCapBps = maxAffiliateTotalBps;
        maxAffiliateTotalBps = newCapBps;
        emit AffiliateTotalCapUpdated(oldCapBps, newCapBps);
    }

    function setRankConfig(
        uint256 rankId,
        uint256 minPersonalStake_,
        uint256 minTeamStake_,
        uint32 weightBps,
        bool enabled
    ) external onlyRole(PARAMETER_ROLE) whenNotPaused {
        require(rankId > 0, "rank zero reserved");
        require(rankId <= MAX_RANKS, "rank too high");
        _updateRankRewards();

        while (rankConfigs.length <= rankId) {
            rankConfigs.push();
        }

        rankConfigs[rankId] = RankConfig({
            minPersonalStake: minPersonalStake_, minTeamStake: minTeamStake_, weightBps: weightBps, enabled: enabled
        });

        emit RankConfigUpdated(rankId, minPersonalStake_, minTeamStake_, weightBps, enabled);
    }

    function setUserRank(address user, uint32 rankId) external onlyRole(PARAMETER_ROLE) whenNotPaused {
        require(user != address(0), "user zero");
        require(rankId == 0 || rankId < rankConfigs.length, "invalid rank");
        if (rankId > 0) {
            RankConfig memory config = rankConfigs[rankId];
            require(config.enabled, "rank disabled");
            require(totalUserStaked[user] >= config.minPersonalStake, "personal stake low");
            require(teamStake[user] >= config.minTeamStake, "team stake low");
        }

        _updateRankRewards();
        _syncUserRank(user);

        UserRank storage account = userRanks[user];
        uint32 oldRankId = account.rankId;
        uint256 oldWeight = userRankWeight[user];
        uint256 newWeight = _rankWeight(rankId);
        totalRankWeight = totalRankWeight + newWeight - oldWeight;
        account.rankId = rankId;
        userRankWeight[user] = newWeight;
        account.rewardDebt = (newWeight * accRankRewardPerWeight) / ACC_PRECISION;

        emit UserRankUpdated(user, oldRankId, rankId);
    }

    function setMinStakeAmount(uint256 amount) external onlyRole(PARAMETER_ROLE) whenNotPaused {
        minStakeAmount = amount;
        emit MinStakeAmountUpdated(amount);
    }

    function setMaxPositionsPerUser(uint256 maxPositions) external onlyRole(PARAMETER_ROLE) whenNotPaused {
        maxPositionsPerUser = maxPositions;
        emit MaxPositionsPerUserUpdated(maxPositions);
    }

    function setMinReferralStake(uint256 amount) external onlyRole(PARAMETER_ROLE) whenNotPaused {
        minReferralStake = amount;
        emit MinReferralStakeUpdated(amount);
    }

    function setMaxDailyStakingEmission(uint256 amount) external onlyRole(PARAMETER_ROLE) whenNotPaused {
        _refreshStakingEmission();
        maxDailyStakingEmission = amount;
        if (amount > 0 && stakingEmissionAvailable > amount) {
            stakingEmissionAvailable = amount;
        }
        emit MaxDailyStakingEmissionUpdated(amount);
    }

    function setDailyRankBudget(uint256 amount) external onlyRole(PARAMETER_ROLE) whenNotPaused {
        _updateRankRewards();
        dailyRankBudget = amount;
        emit DailyRankBudgetUpdated(amount);
    }

    function setPauseFlags(
        bool stakingPaused_,
        bool claimsPaused_,
        bool withdrawalsPaused_,
        bool affiliateRewardsPaused_,
        bool rankRewardsPaused_
    ) external onlyRole(PAUSER_ROLE) {
        stakingPaused = stakingPaused_;
        claimsPaused = claimsPaused_;
        withdrawalsPaused = withdrawalsPaused_;
        affiliateRewardsPaused = affiliateRewardsPaused_;
        rankRewardsPaused = rankRewardsPaused_;
        emit PauseFlagsUpdated(
            stakingPaused_, claimsPaused_, withdrawalsPaused_, affiliateRewardsPaused_, rankRewardsPaused_
        );
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _claim(uint256 positionId, address to, bool payAffiliates) internal {
        Position storage p = positions[positionId];
        uint256 reward = _checkpointRewards(positionId);

        if (reward == 0) return;

        _refreshStakingEmission();
        if (reward > stakingRewardReserve) reward = stakingRewardReserve;
        if (maxDailyStakingEmission > 0 && reward > stakingEmissionAvailable) {
            reward = stakingEmissionAvailable;
        }
        if (reward == 0) return;

        stakingRewardReserve -= reward;
        positionUnpaidRewards[positionId] -= reward;
        if (maxDailyStakingEmission > 0) {
            stakingEmissionAvailable -= reward;
        }
        p.rewardClaimed += reward;

        _pushExact(rewardToken, to, reward);
        emit RewardClaimed(to, positionId, reward);

        if (payAffiliates) {
            _payAffiliateRewards(to, reward);
        }
    }

    function _payAffiliateRewards(address user, uint256 baseReward) internal {
        if (affiliateRewardsPaused || affiliateRewardReserve == 0 || maxAffiliateDepth == 0) {
            return;
        }

        address upline = referrerOf[user];
        for (uint256 i = 0; i < maxAffiliateDepth && i < affiliateLevelBps.length && upline != address(0); i++) {
            uint256 levelBps = affiliateLevelBps[i];
            if (levelBps > 0 && totalUserStaked[upline] >= minReferralStake) {
                uint256 amount = (baseReward * levelBps) / BPS_DENOMINATOR;
                if (amount > affiliateRewardReserve) amount = affiliateRewardReserve;
                if (amount > 0) {
                    affiliateRewardReserve -= amount;
                    _pushExact(rewardToken, upline, amount);
                    emit AffiliateRewardPaid(upline, user, i + 1, amount);
                }
                if (affiliateRewardReserve == 0) return;
            }
            upline = referrerOf[upline];
        }
    }

    function _setReferrer(address user, address referrer) internal {
        require(user != referrer, "self referral");
        require(referrerOf[user] == address(0), "referrer set");
        require(!_createsReferralCycle(user, referrer), "referral cycle");
        referrerOf[user] = referrer;
        emit ReferrerSet(user, referrer);
    }

    function _createsReferralCycle(address user, address referrer) internal view returns (bool) {
        address cursor = referrer;
        for (uint256 i = 0; i < MAX_AFFILIATE_DEPTH && cursor != address(0); i++) {
            if (cursor == user) return true;
            cursor = referrerOf[cursor];
        }
        return false;
    }

    function _increaseTeamStake(address user, uint256 amount) internal {
        address upline = referrerOf[user];
        for (uint256 i = 0; i < MAX_AFFILIATE_DEPTH && upline != address(0); i++) {
            teamStake[upline] += amount;
            upline = referrerOf[upline];
        }
    }

    function _decreaseTeamStake(address user, uint256 amount) internal {
        address upline = referrerOf[user];
        for (uint256 i = 0; i < MAX_AFFILIATE_DEPTH && upline != address(0); i++) {
            teamStake[upline] -= amount;
            upline = referrerOf[upline];
        }
    }

    function _refreshStakingEmission() internal {
        if (maxDailyStakingEmission == 0) {
            lastStakingEmissionUpdate = block.timestamp;
            return;
        }

        uint256 elapsed = block.timestamp - lastStakingEmissionUpdate;
        if (elapsed == 0) return;

        uint256 refill = (maxDailyStakingEmission * elapsed) / 1 days;
        stakingEmissionAvailable += refill;
        if (stakingEmissionAvailable > maxDailyStakingEmission) {
            stakingEmissionAvailable = maxDailyStakingEmission;
        }
        lastStakingEmissionUpdate = block.timestamp;
    }

    function _updateRankRewards() internal {
        if (block.timestamp <= lastRankRewardUpdate) return;
        if (rankRewardsPaused || totalRankWeight == 0 || dailyRankBudget == 0) {
            lastRankRewardUpdate = block.timestamp;
            return;
        }

        uint256 elapsed = block.timestamp - lastRankRewardUpdate;
        // Multiply by ACC_PRECISION before dividing to keep per-weight precision.
        // The token amount debited from the reserve is derived from the same
        // delta so reserve accounting and the accumulator can never diverge
        // (guarantees Σ user claims <= reward credited to rankRewardAllocated).
        uint256 accDelta = (dailyRankBudget * elapsed * ACC_PRECISION) / (1 days * totalRankWeight);
        // Reviewed: share-based reward math necessarily divides (per-weight rate)
        // then multiplies (back to a token amount). reward and the accumulator
        // are derived from the same accDelta, so Σ user claims <= reward and the
        // reserve can never be over-allocated. Intentional & safe.
        // slither-disable-next-line divide-before-multiply
        uint256 reward = (accDelta * totalRankWeight) / ACC_PRECISION;
        if (reward > rankRewardReserve) {
            reward = rankRewardReserve;
            // slither-disable-next-line divide-before-multiply
            accDelta = (reward * ACC_PRECISION) / totalRankWeight;
        }
        if (reward > 0) {
            rankRewardReserve -= reward;
            rankRewardAllocated += reward;
            accRankRewardPerWeight += accDelta;
        }
        lastRankRewardUpdate = block.timestamp;
    }

    function _syncUserRank(address user) internal {
        UserRank storage account = userRanks[user];
        uint256 weight = userRankWeight[user];
        uint256 accumulated = (weight * accRankRewardPerWeight) / ACC_PRECISION;
        uint256 pending = accumulated > account.rewardDebt ? accumulated - account.rewardDebt : 0;
        if (pending > 0) {
            account.accrued += pending;
        }
        account.rewardDebt = accumulated;
    }

    function _rankWeight(uint256 rankId) internal view returns (uint256) {
        if (rankId == 0 || rankId >= rankConfigs.length || !rankConfigs[rankId].enabled) {
            return 0;
        }
        return rankConfigs[rankId].weightBps;
    }

    function _withdrawReserve(address to, uint256 amount, uint256 reserveId) internal view {
        require(to != address(0), "recipient zero");
        require(amount > 0, "amount zero");
        if (reserveId == 0) require(amount <= stakingRewardReserve, "staking reserve low");
        if (reserveId == 1) require(amount <= affiliateRewardReserve, "affiliate reserve low");
        if (reserveId == 2) require(amount <= rankRewardReserve, "rank reserve low");
        if (reserveId == 3) require(amount <= marketplaceCreditReserve, "marketplace reserve low");
    }

    function _settleMarketplaceCredit(uint256 positionId, address to, bool earlyExit) internal {
        uint256 amount = positionMarketplaceCredit[positionId];
        if (amount == 0 || marketplaceCreditClaimed[positionId]) return;

        marketplaceCreditClaimed[positionId] = true;
        marketplaceCreditAllocated -= amount;

        if (earlyExit) {
            marketplaceCreditReserve += amount;
            return;
        }

        require(block.timestamp >= positionMarketplaceCreditAvailableAt[positionId], "credit locked");
        _pushExact(rewardToken, to, amount);
        emit MarketplaceCreditClaimed(to, positionId, amount);
    }

    function _checkpointRewards(uint256 positionId) internal returns (uint256 reward) {
        Position storage p = positions[positionId];
        reward = pendingRewards(positionId);
        positionUnpaidRewards[positionId] = reward;
        p.lastClaimTime = uint64(block.timestamp);
    }

    function _pullExact(IERC20 token, address from, uint256 amount) internal {
        uint256 balanceBefore = token.balanceOf(address(this));
        token.safeTransferFrom(from, address(this), amount);
        uint256 balanceAfter = token.balanceOf(address(this));
        require(balanceAfter >= balanceBefore && balanceAfter - balanceBefore == amount, "unsupported token transfer");
    }

    function _pushExact(IERC20 token, address to, uint256 amount) internal {
        uint256 balanceBefore = token.balanceOf(to);
        token.safeTransfer(to, amount);
        uint256 balanceAfter = token.balanceOf(to);
        require(balanceAfter >= balanceBefore && balanceAfter - balanceBefore == amount, "unsupported token transfer");
    }

    function _validatePlan(uint32 dailyRateBps, uint32 earlyPenaltyBps) internal pure {
        require(dailyRateBps <= MAX_DAILY_RATE_BPS, "daily rate too high");
        require(earlyPenaltyBps <= BPS_DENOMINATOR, "penalty too high");
    }
}
