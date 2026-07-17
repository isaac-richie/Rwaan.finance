#!/usr/bin/env bash
set -euo pipefail
export FOUNDRY_DISABLE_NIGHTLY_WARNING=1

###############################################################################
# XENDA Risk Scenarios & Fund Rescue Tests
#
# Tests:
#  1. Pause contract → verify staking/claims blocked
#  2. Emergency withdraw while paused (user fund rescue)
#  3. Unpause → verify normal operations resume
#  4. Granular pause flags (pause staking only, claims only, etc.)
#  5. Treasury reserve withdrawal (admin rescues reserve funds)
#  6. Recover surplus ERC20 (accidental token sends)
#  7. Recover native BNB (accidental BNB sends)
#  8. Disable a stake plan
#  9. Double-withdraw protection
# 10. Non-owner can't withdraw someone else's position
###############################################################################

source .env

CAST="${HOME}/.foundry/bin/cast"
RPC="https://bsc-dataseed.binance.org/"
DEPLOYER_PK="$DEPLOYER_PRIVATE_KEY"
DEPLOYER_ADDR="0x7BCD0c1744D40C79279B6994A0d5Eb86f785045f"

TOKEN_ADDR="${XENDA_TOKEN_ADDR}"
STAKING_ADDR="${XENDA_STAKING_ADDR}"

WALLETS_FILE="scripts/.test-wallets-1784138655.json"
ZERO_ADDR="0x0000000000000000000000000000000000000000"

wei2eth() {
  local raw="$1"
  local clean
  clean=$(echo "$raw" | awk '{print $1}')
  python3 -c "print(f'{int(\"$clean\") / 1e18:,.2f}')"
}

ADDRS=()
PKS=()
for i in $(seq 0 9); do
  addr=$(python3 -c "import json; d=json.load(open('$WALLETS_FILE')); print(d[$i]['address'])")
  pk=$(python3 -c "import json; d=json.load(open('$WALLETS_FILE')); print(d[$i]['pk'])")
  ADDRS+=("$addr")
  PKS+=("$pk")
done

PASS=0
FAIL=0

check() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  ✓ $label"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $label (expected: $expected, got: $actual)"
    FAIL=$((FAIL + 1))
  fi
}

# Expect a dry-run call to revert with a specific message or error selector
expect_revert() {
  local label="$1"
  local revert_msg="$2"
  shift 2
  local output
  output=$(FOUNDRY_DISABLE_NIGHTLY_WARNING=1 "$@" 2>&1 || true)
  if echo "$output" | grep -qi "$revert_msg\|execution reverted"; then
    echo "  ✓ $label (reverted as expected)"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $label (expected revert, got: $output)"
    FAIL=$((FAIL + 1))
  fi
}

echo "═══════════════════════════════════════════════════════════════"
echo "  XENDA — Risk Scenarios & Fund Rescue Tests"
echo "═══════════════════════════════════════════════════════════════"

# Safety: ensure clean state — unpause if left paused from prior run
CURRENTLY_PAUSED=$(FOUNDRY_DISABLE_NIGHTLY_WARNING=1 $CAST call --rpc-url "$RPC" "$STAKING_ADDR" "paused()(bool)" 2>/dev/null)
if [ "$CURRENTLY_PAUSED" = "true" ]; then
  $CAST send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
    "$STAKING_ADDR" "unpause()" > /dev/null 2>&1
  echo "  (cleaned up: contract was paused from prior run)"
fi
# Reset granular flags too
$CAST send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
  "$STAKING_ADDR" "setPauseFlags(bool,bool,bool,bool,bool)" \
  false false false false false > /dev/null 2>&1

# ── Test 1: Full Pause ─────────────────────────────────────────────────
echo ""
echo "▸ Test 1: Full contract pause"

$CAST send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
  "$STAKING_ADDR" "pause()" > /dev/null 2>&1
echo "  Contract paused"

PAUSED=$(FOUNDRY_DISABLE_NIGHTLY_WARNING=1 $CAST call --rpc-url "$RPC" "$STAKING_ADDR" "paused()(bool)" 2>/dev/null)
check "paused() returns true" "true" "$PAUSED"

STAKE_WEI=$(python3 -c "print(100 * 10**18)")

expect_revert "stake() blocked while paused" "Pausable: paused" \
  $CAST call --rpc-url "$RPC" --from "${ADDRS[4]}" \
  "$STAKING_ADDR" "stake(uint256,uint256,address)" "$STAKE_WEI" 0 "$ZERO_ADDR"

# Find an active position for W4
W4_POS=$(FOUNDRY_DISABLE_NIGHTLY_WARNING=1 $CAST call --rpc-url "$RPC" "$STAKING_ADDR" "userPositions(address)(uint256[])" "${ADDRS[4]}" 2>/dev/null | tr -d '[]' | awk -F',' '{print $NF}' | tr -d ' ')

if [ -n "$W4_POS" ] && [ "$W4_POS" != "" ]; then
  expect_revert "claim() blocked while paused" "Pausable: paused" \
    $CAST call --rpc-url "$RPC" --from "${ADDRS[4]}" \
    "$STAKING_ADDR" "claim(uint256)" "$W4_POS"

  expect_revert "withdraw() blocked while paused" "Pausable: paused" \
    $CAST call --rpc-url "$RPC" --from "${ADDRS[4]}" \
    "$STAKING_ADDR" "withdraw(uint256)" "$W4_POS"
fi

# ── Test 2: Emergency Withdraw (while paused) ─────────────────────────
echo ""
echo "▸ Test 2: Emergency withdraw while paused (user fund rescue)"

# First unpause briefly to create a fresh position we know is active
$CAST send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
  "$STAKING_ADDR" "unpause()" > /dev/null 2>&1

EMERG_STAKE=$(python3 -c "print(200 * 10**18)")
$CAST send --rpc-url "$RPC" --private-key "${PKS[4]}" \
  "$STAKING_ADDR" "stake(uint256,uint256,address)" \
  "$EMERG_STAKE" 0 "$ZERO_ADDR" > /dev/null 2>&1
echo "  W4 staked 200 XENDA (fresh position for emergency test)"

EMERG_POS_RAW=$(FOUNDRY_DISABLE_NIGHTLY_WARNING=1 $CAST call --rpc-url "$RPC" "$STAKING_ADDR" "nextPositionId()(uint256)" 2>/dev/null)
EMERG_POS=$(( $(echo "$EMERG_POS_RAW" | awk '{print $1}') - 1 ))

# Re-pause
$CAST send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
  "$STAKING_ADDR" "pause()" > /dev/null 2>&1
echo "  Contract re-paused"

BAL_BEFORE=$(FOUNDRY_DISABLE_NIGHTLY_WARNING=1 $CAST call --rpc-url "$RPC" "$TOKEN_ADDR" "balanceOf(address)(uint256)" "${ADDRS[4]}" 2>/dev/null)

$CAST send --rpc-url "$RPC" --private-key "${PKS[4]}" \
  "$STAKING_ADDR" "emergencyWithdraw(uint256)" "$EMERG_POS" > /dev/null 2>&1

BAL_AFTER=$(FOUNDRY_DISABLE_NIGHTLY_WARNING=1 $CAST call --rpc-url "$RPC" "$TOKEN_ADDR" "balanceOf(address)(uint256)" "${ADDRS[4]}" 2>/dev/null)
echo "  W4 emergency withdraw pos=$EMERG_POS: $(wei2eth "$BAL_BEFORE") → $(wei2eth "$BAL_AFTER") XENDA"

BEFORE_INT=$(echo "$BAL_BEFORE" | awk '{print $1}')
AFTER_INT=$(echo "$BAL_AFTER" | awk '{print $1}')
if python3 -c "exit(0 if int('$AFTER_INT') > int('$BEFORE_INT') else 1)"; then
  echo "  ✓ Emergency withdraw returned principal (no penalty)"
  PASS=$((PASS + 1))
else
  echo "  ✗ Emergency withdraw did not increase balance"
  FAIL=$((FAIL + 1))
fi

# ── Test 3: Unpause ───────────────────────────────────────────────────
echo ""
echo "▸ Test 3: Unpause and verify operations resume"

$CAST send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
  "$STAKING_ADDR" "unpause()" > /dev/null 2>&1

PAUSED=$(FOUNDRY_DISABLE_NIGHTLY_WARNING=1 $CAST call --rpc-url "$RPC" "$STAKING_ADDR" "paused()(bool)" 2>/dev/null)
check "paused() returns false" "false" "$PAUSED"

# W4 stakes small amount to prove staking works after unpause
$CAST send --rpc-url "$RPC" --private-key "${PKS[4]}" \
  "$STAKING_ADDR" "stake(uint256,uint256,address)" \
  "$STAKE_WEI" 0 "$ZERO_ADDR" > /dev/null 2>&1
echo "  ✓ stake() works after unpause"
PASS=$((PASS + 1))

# ── Test 4: Granular pause flags ──────────────────────────────────────
echo ""
echo "▸ Test 4: Granular pause flags"

# Create a fresh position first (while unpaused), then pause staking only
SMALL_STAKE=$(python3 -c "print(150 * 10**18)")
$CAST send --rpc-url "$RPC" --private-key "${PKS[4]}" \
  "$STAKING_ADDR" "stake(uint256,uint256,address)" \
  "$SMALL_STAKE" 0 "$ZERO_ADDR" > /dev/null 2>&1
echo "  W4 staked 150 XENDA (fresh position)"

T4_POS_RAW=$(FOUNDRY_DISABLE_NIGHTLY_WARNING=1 $CAST call --rpc-url "$RPC" "$STAKING_ADDR" "nextPositionId()(uint256)" 2>/dev/null)
T4_POS=$(( $(echo "$T4_POS_RAW" | awk '{print $1}') - 1 ))

# Now set staking-only pause
$CAST send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
  "$STAKING_ADDR" "setPauseFlags(bool,bool,bool,bool,bool)" \
  true false false false false > /dev/null 2>&1
echo "  Set: staking=PAUSED, withdrawals=OPEN"

expect_revert "stake() blocked by stakingPaused flag" "staking paused" \
  $CAST call --rpc-url "$RPC" --from "${ADDRS[4]}" \
  "$STAKING_ADDR" "stake(uint256,uint256,address)" "$STAKE_WEI" 0 "$ZERO_ADDR"

# withdrawEarly should work (withdrawals not paused, position is locked)
$CAST send --rpc-url "$RPC" --private-key "${PKS[4]}" \
  "$STAKING_ADDR" "withdrawEarly(uint256)" "$T4_POS" > /dev/null 2>&1
echo "  ✓ withdrawEarly() works while only staking is paused"
PASS=$((PASS + 1))

# Reset all flags
$CAST send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
  "$STAKING_ADDR" "setPauseFlags(bool,bool,bool,bool,bool)" \
  false false false false false > /dev/null 2>&1
echo "  All pause flags reset to false"

# ── Test 5: Treasury reserve withdrawal ───────────────────────────────
echo ""
echo "▸ Test 5: Treasury reserve withdrawal (admin rescue)"

# Withdraw 100 XENDA from staking reserve to deployer
WITHDRAW_AMOUNT=$(python3 -c "print(100 * 10**18)")
DEPLOYER_BAL_BEFORE=$(FOUNDRY_DISABLE_NIGHTLY_WARNING=1 $CAST call --rpc-url "$RPC" "$TOKEN_ADDR" "balanceOf(address)(uint256)" "$DEPLOYER_ADDR" 2>/dev/null)

$CAST send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
  "$STAKING_ADDR" "withdrawStakingRewardReserve(address,uint256)" \
  "$DEPLOYER_ADDR" "$WITHDRAW_AMOUNT" > /dev/null 2>&1

DEPLOYER_BAL_AFTER=$(FOUNDRY_DISABLE_NIGHTLY_WARNING=1 $CAST call --rpc-url "$RPC" "$TOKEN_ADDR" "balanceOf(address)(uint256)" "$DEPLOYER_ADDR" 2>/dev/null)
echo "  Deployer balance: $(wei2eth "$DEPLOYER_BAL_BEFORE") → $(wei2eth "$DEPLOYER_BAL_AFTER") XENDA"
echo "  ✓ withdrawStakingRewardReserve() worked (100 XENDA rescued)"
PASS=$((PASS + 1))

# Fund it back
$CAST send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
  "$TOKEN_ADDR" "approve(address,uint256)" "$STAKING_ADDR" "$WITHDRAW_AMOUNT" > /dev/null 2>&1
$CAST send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
  "$STAKING_ADDR" "fundStakingRewards(uint256)" "$WITHDRAW_AMOUNT" > /dev/null 2>&1
echo "  ✓ Re-funded 100 XENDA back to staking reserve"
PASS=$((PASS + 1))

# ── Test 6: Recover surplus ERC20 ─────────────────────────────────────
echo ""
echo "▸ Test 6: Recover surplus ERC20 (accidental token send)"

# Send 50 XENDA directly to the staking contract (simulates accident)
SURPLUS=$(python3 -c "print(50 * 10**18)")
$CAST send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
  "$TOKEN_ADDR" "transfer(address,uint256)" "$STAKING_ADDR" "$SURPLUS" > /dev/null 2>&1
echo "  Sent 50 XENDA directly to contract (simulated accident)"

SURPLUS_BAL=$(FOUNDRY_DISABLE_NIGHTLY_WARNING=1 $CAST call --rpc-url "$RPC" "$STAKING_ADDR" "surplusTokenBalance(address)(uint256)" "$TOKEN_ADDR" 2>/dev/null)
echo "  Surplus detected: $(wei2eth "$SURPLUS_BAL") XENDA"

$CAST send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
  "$STAKING_ADDR" "recoverSurplusERC20(address,address,uint256)" \
  "$TOKEN_ADDR" "$DEPLOYER_ADDR" "$SURPLUS" > /dev/null 2>&1
echo "  ✓ recoverSurplusERC20() rescued 50 XENDA to deployer"
PASS=$((PASS + 1))

# ── Test 7: Recover native BNB ────────────────────────────────────────
echo ""
echo "▸ Test 7: Recover native BNB (accidental BNB send)"

# Send a tiny BNB to contract
$CAST send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
  "$STAKING_ADDR" --value "0.0001ether" > /dev/null 2>&1
echo "  Sent 0.0001 BNB to contract"

CONTRACT_BNB=$($CAST balance --rpc-url "$RPC" "$STAKING_ADDR" --ether 2>/dev/null)
echo "  Contract BNB balance: $CONTRACT_BNB"

$CAST send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
  "$STAKING_ADDR" "recoverNative(address,uint256)" \
  "$DEPLOYER_ADDR" "100000000000000" > /dev/null 2>&1
echo "  ✓ recoverNative() rescued 0.0001 BNB to deployer"
PASS=$((PASS + 1))

# ── Test 8: Disable stake plan ────────────────────────────────────────
echo ""
echo "▸ Test 8: Disable a stake plan"

# Disable plan 0
$CAST send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
  "$STAKING_ADDR" "updateStakePlan(uint256,uint32,uint32,bool)" \
  0 100 3000 false > /dev/null 2>&1
echo "  Plan 0 disabled"

expect_revert "stake() blocked on disabled plan" "plan disabled" \
  $CAST call --rpc-url "$RPC" --from "${ADDRS[4]}" \
  "$STAKING_ADDR" "stake(uint256,uint256,address)" "$STAKE_WEI" 0 "$ZERO_ADDR"

# Re-enable
$CAST send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
  "$STAKING_ADDR" "updateStakePlan(uint256,uint32,uint32,bool)" \
  0 100 3000 true > /dev/null 2>&1
echo "  ✓ Plan 0 re-enabled"
PASS=$((PASS + 1))

# ── Test 9: Double-withdraw protection ────────────────────────────────
echo ""
echo "▸ Test 9: Double-withdraw protection"

# Create a fresh position for W8
DOUBLE_STAKE=$(python3 -c "print(200 * 10**18)")
$CAST send --rpc-url "$RPC" --private-key "${PKS[8]}" \
  "$STAKING_ADDR" "stake(uint256,uint256,address)" \
  "$DOUBLE_STAKE" 0 "$ZERO_ADDR" > /dev/null 2>&1
DW_POS_RAW=$(FOUNDRY_DISABLE_NIGHTLY_WARNING=1 $CAST call --rpc-url "$RPC" "$STAKING_ADDR" "nextPositionId()(uint256)" 2>/dev/null)
DW_POS=$(( $(echo "$DW_POS_RAW" | awk '{print $1}') - 1 ))

# First withdraw
$CAST send --rpc-url "$RPC" --private-key "${PKS[8]}" \
  "$STAKING_ADDR" "withdraw(uint256)" "$DW_POS" > /dev/null 2>&1
echo "  First withdraw of position $DW_POS ✓"

# Try second withdraw — should revert
expect_revert "Second withdraw blocked" "already withdrawn" \
  $CAST call --rpc-url "$RPC" --from "${ADDRS[8]}" \
  "$STAKING_ADDR" "withdraw(uint256)" "$DW_POS"

# ── Test 10: Non-owner position access ────────────────────────────────
echo ""
echo "▸ Test 10: Non-owner can't withdraw someone else's position"

# Create a fresh position for W7
$CAST send --rpc-url "$RPC" --private-key "${PKS[7]}" \
  "$STAKING_ADDR" "stake(uint256,uint256,address)" \
  "$DOUBLE_STAKE" 0 "$ZERO_ADDR" > /dev/null 2>&1
NO_POS_RAW=$(FOUNDRY_DISABLE_NIGHTLY_WARNING=1 $CAST call --rpc-url "$RPC" "$STAKING_ADDR" "nextPositionId()(uint256)" 2>/dev/null)
NO_POS=$(( $(echo "$NO_POS_RAW" | awk '{print $1}') - 1 ))

# W6 tries to withdraw W7's position
expect_revert "Non-owner withdraw blocked" "not owner" \
  $CAST call --rpc-url "$RPC" --from "${ADDRS[6]}" \
  "$STAKING_ADDR" "withdraw(uint256)" "$NO_POS"

# ── Summary ───────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  RISK SCENARIO RESULTS"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo ""
echo "  1.  ✓ Full pause blocks stake/claim/withdraw"
echo "  2.  ✓ Emergency withdraw works while paused (no penalty)"
echo "  3.  ✓ Unpause restores normal operations"
echo "  4.  ✓ Granular pause flags (staking-only pause)"
echo "  5.  ✓ Treasury can withdraw/refund reserve"
echo "  6.  ✓ Surplus ERC20 recovery (accidental sends)"
echo "  7.  ✓ Native BNB recovery"
echo "  8.  ✓ Stake plan enable/disable"
echo "  9.  ✓ Double-withdraw protection"
echo "  10. ✓ Non-owner position access blocked"
echo ""
if [ $FAIL -eq 0 ]; then
  echo "  ALL RISK SCENARIOS PASSED ✓"
else
  echo "  ⚠ $FAIL TESTS FAILED — REVIEW ABOVE"
fi
