# RWANSecureStakingV3 - Early Withdrawal Penalty System

## 🎯 Overview

**Contract Version**: V3
**Major Feature**: 35% Early Withdrawal Penalty
**Status**: ✅ Fully Tested (24/24 tests passing)

---

## 📋 Key Changes from V2

### V2 Behavior (Hard Lock)
- ❌ **No early withdrawal** allowed for locked positions
- ❌ Users MUST wait until `unlockTime`
- ✅ Simple, predictable
- ❌ Zero flexibility

### V3 Behavior (Penalty System)
- ✅ **Early withdrawal allowed** with 35% penalty
- ✅ Penalty goes to reward pool (benefits all stakers)
- ✅ Rewards still claimable (no penalty on rewards)
- ✅ More flexible for users
- ✅ Still incentivizes long-term staking

---

## 🔑 Core Features

### 1. **Flexible Staking** (Lock ID 0)
- No lock period
- Standard APR (16% base)
- 1x multiplier
- Withdraw anytime, no penalty

### 2. **Locked Staking** (Lock ID 1-2)
- **Plan 1**: 3 months, 1.25x multiplier (~20% APR)
- **Plan 2**: 6 months, 2x multiplier (~32% APR)
- Higher rewards for commitment

### 3. **Early Withdrawal System**
```solidity
// 35% penalty on principal only
uint256 public constant EARLY_WITHDRAWAL_PENALTY_BPS = 3500;

function withdrawEarly(uint256 positionId) external {
    // Claims ALL rewards (no penalty)
    _claim(positionId, msg.sender);
    
    // Calculate 35% penalty on principal
    uint256 penalty = (amount * 3500) / 10_000;
    uint256 amountAfterPenalty = amount - penalty;
    
    // Penalty goes to reward pool
    rewardReserve += penalty;
    
    // User receives: principal (minus penalty) + all rewards
    stakingToken.safeTransfer(msg.sender, amountAfterPenalty);
}
```

---

## 💰 User Scenarios

### Scenario 1: Flexible Stake (No Lock)
**User**: Stake 1,000 tokens, flexible
**Time**: 30 days
**Withdraw**: Anytime
**Result**: Get 1,000 tokens + rewards, **no penalty**

### Scenario 2: Locked Stake - Wait Full Period
**User**: Stake 1,000 tokens, 6 months
**Time**: Wait 180 days
**Withdraw**: After unlock
**Result**: Get 1,000 tokens + rewards, **no penalty**

### Scenario 3: Locked Stake - Early Withdrawal
**User**: Stake 1,000 tokens, 6 months
**Time**: Wait only 60 days (still locked)
**Withdraw**: `withdrawEarly()`
**Result**:
- Principal: 650 tokens (65% of 1,000)
- Penalty: 350 tokens (35%, goes to reward pool)
- Rewards: Full rewards earned (no penalty)
- **Total Received**: 650 + rewards

### Scenario 4: Emergency Withdraw (Contract Paused)
**User**: Stake 1,000 tokens, 6 months
**Contract**: Paused by owner
**Withdraw**: `emergencyWithdraw()`
**Result**: Get 1,000 tokens, **no rewards, no penalty**

---

## 🛡️ Security Features

### Penalty Protection
1. ✅ Cannot withdraw early from flexible (use `withdraw()` instead)
2. ✅ Cannot withdraw early from already unlocked (use `withdraw()` instead)
3. ✅ Penalty only applies to principal, not rewards
4. ✅ Penalty goes to reward pool (benefits protocol)
5. ✅ Cannot withdraw twice

### View Functions
```solidity
// Check if can withdraw without penalty
function canWithdrawWithoutPenalty(uint256 positionId) 
    external view returns (bool)

// Calculate penalty before withdrawal
function calculateEarlyWithdrawalPenalty(uint256 positionId)
    external view returns (
        uint256 amountAfterPenalty,
        uint256 penaltyAmount
    )
```

---

## 🧪 Test Coverage (24/24 Passing)

### Basic Tests ✅
- `testStakeFlexible()` - Flexible staking works
- `testStakeLocked3Months()` - 3 month lock works
- `testStakeLocked6Months()` - 6 month lock works

### Withdrawal Tests ✅
- `testWithdrawFlexible()` - Flexible withdraw (no penalty)
- `testWithdrawLockedAfterUnlock()` - Normal withdraw after unlock (no penalty)
- `testWithdrawEarly35Penalty()` - Early withdraw with 35% penalty
- `testWithdrawEarly35PenaltyExactCalculation()` - Penalty math correct

### Edge Cases ✅
- `testCannotWithdrawEarlyFlexiblePosition()` - Revert if flexible
- `testCannotWithdrawEarlyUnlockedPosition()` - Revert if unlocked
- `testCannotWithdrawLockedBeforeUnlock()` - Must use `withdrawEarly()`
- `testCannotWithdrawTwice()` - Cannot double withdraw
- `testCannotWithdrawEarlyTwice()` - Cannot double early withdraw
- `testOnlyOwnerCanWithdraw()` - Position ownership enforced

### Rewards Tests ✅
- `testEarlyWithdrawalStillClaimsRewards()` - Rewards not penalized
- `testPenaltyGoesToRewardPool()` - Penalty added to reserve

### View Functions ✅
- `testCanWithdrawWithoutPenalty()` - View function works
- `testCanWithdrawWithoutPenaltyFlexible()` - Flexible always true
- `testCalculateEarlyWithdrawalPenalty()` - Penalty calculation correct
- `testCalculateEarlyWithdrawalPenaltyAfterUnlock()` - Zero penalty when unlocked

### Multiple Positions ✅
- `testMultiplePositionsEarlyWithdrawal()` - Independent positions work

### Emergency ✅
- `testEmergencyWithdrawNoPenalty()` - Emergency withdraw (no penalty, no rewards)

### Referrals ✅
- `testReferralBonusNotAffectedByEarlyWithdrawal()` - Referrer keeps bonus

### Performance ✅
- `testGasWithdrawEarly()` - Gas efficient (<200k gas)

### Integration ✅
- `testComprehensiveScenario()` - Full user journey

---

## 📊 Penalty Economics

### For Users
**Pros**:
- ✅ Can exit early if needed
- ✅ Keep all rewards earned
- ✅ Clear 35% penalty (transparent)

**Cons**:
- ❌ Lose 35% of principal if exit early
- ❌ Better to wait full period

### For Protocol
**Pros**:
- ✅ Penalty goes to reward pool (benefits remaining stakers)
- ✅ Still incentivizes long-term holding
- ✅ More flexible than hard lock
- ✅ Predictable penalty amount

**Example**:
- User stakes 10,000 tokens (6 months)
- Withdraws early after 2 months
- **Penalty**: 3,500 tokens → reward pool
- **User gets**: 6,500 tokens + rewards
- **Benefit**: 3,500 tokens added to reward pool for all stakers

---

## 🔄 Migration from V2

### Differences
| Feature | V2 | V3 |
|---------|----|----|
| Early withdrawal | ❌ Not allowed | ✅ Allowed with penalty |
| Penalty | N/A | 35% of principal |
| Rewards on early exit | N/A | ✅ Full rewards claimable |
| Flexibility | Low | High |
| User control | Locked until unlock | Can exit anytime |

### Backward Compatibility
- ✅ Same staking functions (`stake()`)
- ✅ Same lock options (flexible, 3mo, 6mo)
- ✅ Same APR tiers
- ✅ Same referral system
- ✅ Additional `withdrawEarly()` function

---

## 🚀 Deployment Steps

### 1. Deploy V3 Contract
```bash
forge script script/DeployRWANSecureStakingV3.s.sol \
  --rpc-url $BSC_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

### 2. Add Lock Options
```solidity
// Already included in constructor
// Lock ID 0: Flexible (0 seconds, 1x)
// Add via script:
// Lock ID 1: 90 days, 1.25x
// Lock ID 2: 180 days, 2x
```

### 3. Fund Rewards
```solidity
token.approve(stakingContract, amount);
stakingContract.fundRewards(amount);
```

### 4. Update Frontend
- Add `withdrawEarly()` button
- Show penalty calculation
- Add "Early Withdrawal" flow
- Update UI to explain 35% penalty

---

## 📱 Frontend Integration

### New UI Components Needed

#### 1. Early Withdrawal Button
```tsx
{position.unlockTime > 0 && 
 Date.now() < position.unlockTime * 1000 && (
  <Button onClick={() => handleWithdrawEarly(position.id)}>
    Withdraw Early (35% penalty)
  </Button>
)}
```

#### 2. Penalty Preview
```tsx
const { amountAfterPenalty, penaltyAmount } = 
  await stakingContract.calculateEarlyWithdrawalPenalty(positionId);

<div>
  <p>Principal after penalty: {formatToken(amountAfterPenalty)}</p>
  <p>Penalty (goes to reward pool): {formatToken(penaltyAmount)}</p>
  <p>Rewards (no penalty): {formatToken(rewards)}</p>
</div>
```

#### 3. Confirmation Modal
```tsx
<Modal>
  <h3>⚠️ Early Withdrawal</h3>
  <p>You will lose 35% of your staked amount as a penalty.</p>
  <p>Penalty: {penaltyAmount} $Rwaan</p>
  <p>You will receive: {amountAfterPenalty + rewards} $Rwaan</p>
  <p>Are you sure?</p>
  <Button onClick={confirmWithdrawEarly}>Yes, Withdraw Early</Button>
</Modal>
```

---

## 🎓 User Education

### Key Messages
1. ✅ **Early withdrawal is available** (unlike V2)
2. ⚠️ **35% penalty applies** to your staked amount
3. ✅ **Rewards are not penalized** - you keep all earned rewards
4. 💡 **Penalty helps everyone** - goes to reward pool for remaining stakers
5. ⏰ **Wait if possible** - no penalty after unlock time

### Example Messages
**When staking**:
> "You can withdraw early anytime, but a 35% penalty applies. Wait until [date] to avoid the penalty."

**Before early withdrawal**:
> "⚠️ Early Withdrawal: You will lose 35% of your 1,000 $Rwaan stake (350 $Rwaan penalty). You'll receive 650 $Rwaan + 15 $Rwaan rewards = 665 $Rwaan total."

**After early withdrawal**:
> "✅ Early withdrawal complete. You received 665 $Rwaan (650 principal + 15 rewards). 350 $Rwaan penalty was added to the reward pool."

---

## 🔍 Contract Verification

```bash
# Flatten contract
forge flatten contracts/RWANSecureStakingV3.sol > RWANSecureStakingV3_flat.sol

# Verify on BSCScan
forge verify-contract \
  --chain-id 56 \
  --num-of-optimizations 200 \
  --watch \
  --constructor-args $(cast abi-encode "constructor(...)" ...) \
  --etherscan-api-key $BSCSCAN_API_KEY \
  <CONTRACT_ADDRESS> \
  contracts/RWANSecureStakingV3.sol:RWANSecureStakingV3
```

---

## ✅ Contract Status

**File**: `contracts/RWANSecureStakingV3.sol`
**Tests**: `test/RWANSecureStakingV3.t.sol`
**Test Results**: ✅ 24/24 passing
**Gas Efficiency**: ✅ <200k gas for `withdrawEarly()`
**Security**: ✅ All edge cases covered
**Ready for Deployment**: ✅ YES

---

## 🚨 Important Notes

1. **Penalty is on PRINCIPAL only**, not on rewards
2. **Penalty goes to reward pool**, benefits all remaining stakers
3. **Emergency withdraw has NO penalty** (when contract paused)
4. **Cannot withdraw early if already unlocked** (use regular `withdraw()`)
5. **Cannot withdraw early if flexible** (use regular `withdraw()`)

---

## 📞 Support

If users ask about early withdrawal:
- ✅ Explain 35% penalty clearly
- ✅ Show them `calculateEarlyWithdrawalPenalty()` result
- ✅ Mention rewards are not penalized
- ✅ Suggest waiting if close to unlock
- ✅ Confirm penalty goes to reward pool (not lost)

---

**Contract Ready for Production ✅**

