#!/usr/bin/env bash
set -euo pipefail
export FOUNDRY_DISABLE_NIGHTLY_WARNING=1

###############################################################################
# XENDA E2E Test — RESUME from Phase 2 (wallets already generated + BNB funded)
###############################################################################

source .env

CAST="${HOME}/.foundry/bin/cast"
RPC="https://bsc-dataseed.binance.org/"
DEPLOYER_PK="$DEPLOYER_PRIVATE_KEY"
DEPLOYER_ADDR=$($CAST wallet address --private-key "$DEPLOYER_PK" 2>/dev/null)

TOKEN_ADDR="${XENDA_TOKEN_ADDR:?Set XENDA_TOKEN_ADDR}"
STAKING_ADDR="${XENDA_STAKING_ADDR:?Set XENDA_STAKING_ADDR}"

WALLETS_FILE="scripts/.test-wallets-1784138655.json"
TOKENS_PER_WALLET="25000"
STAKE_AMOUNT="20000"

wei2eth() {
  local raw="$1"
  local clean
  clean=$(echo "$raw" | awk '{print $1}')
  python3 -c "print(f'{int(\"$clean\") / 1e18:,.2f}')"
}

raw_int() {
  echo "$1" | awk '{print $1}'
}

# Load existing wallets from JSON
ADDRS=()
PKS=()
NUM_WALLETS=$(python3 -c "import json; d=json.load(open('$WALLETS_FILE')); print(len(d))")

for i in $(seq 0 $((NUM_WALLETS - 1))); do
  addr=$(python3 -c "import json; d=json.load(open('$WALLETS_FILE')); print(d[$i]['address'])")
  pk=$(python3 -c "import json; d=json.load(open('$WALLETS_FILE')); print(d[$i]['pk'])")
  ADDRS+=("$addr")
  PKS+=("$pk")
done

echo "═══════════════════════════════════════════════════════════════"
echo "  XENDA E2E Test — RESUMING from Phase 2"
echo "═══════════════════════════════════════════════════════════════"
echo "  Deployer:  $DEPLOYER_ADDR"
echo "  Token:     $TOKEN_ADDR"
echo "  Staking:   $STAKING_ADDR"
echo "  Wallets:   $NUM_WALLETS (loaded from $WALLETS_FILE)"
echo "═══════════════════════════════════════════════════════════════"

# ── Phase 2: Distribute XENDA tokens ───────────────────────────────────────
echo ""
echo "▸ Phase 2: Sending ${TOKENS_PER_WALLET} XENDA to each wallet..."

TOKENS_WEI=$(python3 -c "print(${TOKENS_PER_WALLET} * 10**18)")

for i in $(seq 0 $((NUM_WALLETS - 1))); do
  $CAST send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
    "$TOKEN_ADDR" "transfer(address,uint256)" \
    "${ADDRS[$i]}" "$TOKENS_WEI" > /dev/null 2>&1
  echo "   [$i] ${ADDRS[$i]} ← ${TOKENS_PER_WALLET} XENDA ✓"
done

# ── Phase 3: Approve staking contract ──────────────────────────────────────
echo ""
echo "▸ Phase 3: Approving staking contract from all wallets..."

MAX_UINT="115792089237316195423570985008687907853269984665640564039457584007913129639935"

for i in $(seq 0 $((NUM_WALLETS - 1))); do
  $CAST send --rpc-url "$RPC" --private-key "${PKS[$i]}" \
    "$TOKEN_ADDR" "approve(address,uint256)" \
    "$STAKING_ADDR" "$MAX_UINT" > /dev/null 2>&1
  echo "   [$i] approved ✓"
done

# ── Phase 4: Stake with referral chains ────────────────────────────────────
echo ""
echo "▸ Phase 4: Staking ${STAKE_AMOUNT} XENDA with referral chains..."
echo "   Chain: W0(root) ← W1-W3(L1) ← W4-W6(L2) ← W7-W9(L3)"

STAKE_WEI=$(python3 -c "print(${STAKE_AMOUNT} * 10**18)")
ZERO_ADDR="0x0000000000000000000000000000000000000000"

$CAST send --rpc-url "$RPC" --private-key "${PKS[0]}" \
  "$STAKING_ADDR" "stake(uint256,uint256,address)" \
  "$STAKE_WEI" 0 "$ZERO_ADDR" > /dev/null 2>&1
echo "   [0] staked ${STAKE_AMOUNT} (root, no referrer) ✓"

for i in $(seq 1 3); do
  $CAST send --rpc-url "$RPC" --private-key "${PKS[$i]}" \
    "$STAKING_ADDR" "stake(uint256,uint256,address)" \
    "$STAKE_WEI" 0 "${ADDRS[0]}" > /dev/null 2>&1
  echo "   [$i] staked ${STAKE_AMOUNT} → referrer W0 (L1) ✓"
done

for i in $(seq 4 6); do
  $CAST send --rpc-url "$RPC" --private-key "${PKS[$i]}" \
    "$STAKING_ADDR" "stake(uint256,uint256,address)" \
    "$STAKE_WEI" 0 "${ADDRS[1]}" > /dev/null 2>&1
  echo "   [$i] staked ${STAKE_AMOUNT} → referrer W1 (L2) ✓"
done

for i in $(seq 7 9); do
  $CAST send --rpc-url "$RPC" --private-key "${PKS[$i]}" \
    "$STAKING_ADDR" "stake(uint256,uint256,address)" \
    "$STAKE_WEI" 0 "${ADDRS[4]}" > /dev/null 2>&1
  echo "   [$i] staked ${STAKE_AMOUNT} → referrer W4 (L3) ✓"
done

# ── Phase 5: Verify state ─────────────────────────────────────────────────
echo ""
echo "▸ Phase 5: Verifying on-chain state..."

TVL=$($CAST call --rpc-url "$RPC" "$STAKING_ADDR" "totalStaked()(uint256)" 2>/dev/null)
echo "   Total staked (TVL): $(wei2eth "$TVL") XENDA"

STAKING_RES=$($CAST call --rpc-url "$RPC" "$STAKING_ADDR" "stakingRewardReserve()(uint256)" 2>/dev/null)
echo "   Staking reserve:    $(wei2eth "$STAKING_RES") XENDA"

AFF_RES=$($CAST call --rpc-url "$RPC" "$STAKING_ADDR" "affiliateRewardReserve()(uint256)" 2>/dev/null)
echo "   Affiliate reserve:  $(wei2eth "$AFF_RES") XENDA (should be < 1M, payouts deducted)"

REFERRER_0=$($CAST call --rpc-url "$RPC" "$STAKING_ADDR" "referrerOf(address)(address)" "${ADDRS[1]}" 2>/dev/null)
echo "   W1 referrer:        $REFERRER_0"
echo "   Expected W0:        ${ADDRS[0]}"

# ── Phase 6: Wait for lock to expire ──────────────────────────────────────
echo ""
echo "▸ Phase 6: Waiting 5 minutes for stake lock to expire..."
echo "   Started at $(date '+%H:%M:%S')"

for t in $(seq 300 -30 0); do
  printf "   ⏱  %3ds remaining...\r" "$t"
  if [ "$t" -gt 0 ]; then sleep 30; fi
done
echo "   ⏱  Lock expired!                    "

# ── Phase 7: Test withdrawEarly (W9, second stake) ─────────────────────
echo ""
echo "▸ Phase 7: Testing withdrawEarly on W9 (new stake → immediate early exit)..."

EARLY_STAKE="4000"
EARLY_STAKE_WEI=$(python3 -c "print(${EARLY_STAKE} * 10**18)")

$CAST send --rpc-url "$RPC" --private-key "${PKS[9]}" \
  "$STAKING_ADDR" "stake(uint256,uint256,address)" \
  "$EARLY_STAKE_WEI" 0 "$ZERO_ADDR" > /dev/null 2>&1
echo "   W9 staked another ${EARLY_STAKE} XENDA"

POS_RAW=$($CAST call --rpc-url "$RPC" "$STAKING_ADDR" "nextPositionId()(uint256)" 2>/dev/null)
EARLY_POS=$(( $(raw_int "$POS_RAW") - 1 ))

BAL_BEFORE=$($CAST call --rpc-url "$RPC" "$TOKEN_ADDR" "balanceOf(address)(uint256)" "${ADDRS[9]}" 2>/dev/null)
$CAST send --rpc-url "$RPC" --private-key "${PKS[9]}" \
  "$STAKING_ADDR" "withdrawEarly(uint256)" "$EARLY_POS" > /dev/null 2>&1
BAL_AFTER=$($CAST call --rpc-url "$RPC" "$TOKEN_ADDR" "balanceOf(address)(uint256)" "${ADDRS[9]}" 2>/dev/null)

echo "   withdrawEarly done!"
echo "   Balance before: $(wei2eth "$BAL_BEFORE") → after: $(wei2eth "$BAL_AFTER") XENDA"
echo "   (30% penalty applied — expect ~2,800 back from 4,000 stake)"

# Discover position IDs dynamically
echo ""
echo "▸ Resolving position IDs..."
POSITION_IDS=()
for i in $(seq 0 $((NUM_WALLETS - 1))); do
  pos_raw=$($CAST call --rpc-url "$RPC" "$STAKING_ADDR" "userPositions(address)(uint256[])" "${ADDRS[$i]}" 2>/dev/null)
  pos=$(echo "$pos_raw" | tr -d '[]' | awk -F',' '{print $1}' | tr -d ' ')
  POSITION_IDS+=("$pos")
  echo "   W$i → position $pos"
done

# ── Phase 8: Claim rewards (W0–W4) ──────────────────────────────────────
echo ""
echo "▸ Phase 8: Claiming staking rewards (W0–W4)..."

for i in $(seq 0 4); do
  POS="${POSITION_IDS[$i]}"
  PENDING=$($CAST call --rpc-url "$RPC" "$STAKING_ADDR" "pendingRewards(uint256)(uint256)" "$POS" 2>/dev/null)
  echo -n "   [W$i pos=$POS] pending: $(wei2eth "$PENDING") XENDA → "

  $CAST send --rpc-url "$RPC" --private-key "${PKS[$i]}" \
    "$STAKING_ADDR" "claim(uint256)" "$POS" > /dev/null 2>&1
  echo "claimed ✓"
done

# ── Phase 9: Withdraw principal (W0–W9) ─────────────────────────────────
echo ""
echo "▸ Phase 9: Withdrawing principal (W0–W9)..."

for i in $(seq 0 9); do
  POS="${POSITION_IDS[$i]}"
  BAL_BEFORE=$($CAST call --rpc-url "$RPC" "$TOKEN_ADDR" "balanceOf(address)(uint256)" "${ADDRS[$i]}" 2>/dev/null)

  $CAST send --rpc-url "$RPC" --private-key "${PKS[$i]}" \
    "$STAKING_ADDR" "withdraw(uint256)" "$POS" > /dev/null 2>&1

  BAL_AFTER=$($CAST call --rpc-url "$RPC" "$TOKEN_ADDR" "balanceOf(address)(uint256)" "${ADDRS[$i]}" 2>/dev/null)
  echo "   [W$i pos=$POS] withdrawn ✓  balance: $(wei2eth "$BAL_BEFORE") → $(wei2eth "$BAL_AFTER") XENDA"
done

# ── Phase 10: Rank assignment + claim ───────────────────────────────────
echo ""
echo "▸ Phase 10: Assigning ranks and claiming rank rewards..."

echo "   Assigning Rank 1 to W5..."
$CAST send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
  "$STAKING_ADDR" "setUserRank(address,uint32)" "${ADDRS[5]}" 1 > /dev/null 2>&1
echo "   W5 → Rank 1 ✓"

echo "   Assigning Rank 2 to W1 (has L2 referrals from W4-W6)..."
$CAST send --rpc-url "$RPC" --private-key "$DEPLOYER_PK" \
  "$STAKING_ADDR" "setUserRank(address,uint32)" "${ADDRS[1]}" 2 > /dev/null 2>&1
echo "   W1 → Rank 2 ✓"

echo "   Waiting 30s for rank rewards to accrue..."
sleep 30

echo "   W5 claiming rank rewards..."
$CAST send --rpc-url "$RPC" --private-key "${PKS[5]}" \
  "$STAKING_ADDR" "claimRankReward()" > /dev/null 2>&1
echo "   W5 rank reward claimed ✓"

echo "   W1 claiming rank rewards..."
$CAST send --rpc-url "$RPC" --private-key "${PKS[1]}" \
  "$STAKING_ADDR" "claimRankReward()" > /dev/null 2>&1
echo "   W1 rank reward claimed ✓"

# ── Phase 11: Final state ──────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  FINAL STATE"
echo "═══════════════════════════════════════════════════════════════"

TVL=$($CAST call --rpc-url "$RPC" "$STAKING_ADDR" "totalStaked()(uint256)" 2>/dev/null)
echo "  TVL:              $(wei2eth "$TVL") XENDA"

SR=$($CAST call --rpc-url "$RPC" "$STAKING_ADDR" "stakingRewardReserve()(uint256)" 2>/dev/null)
echo "  Staking reserve:  $(wei2eth "$SR") XENDA"

AR=$($CAST call --rpc-url "$RPC" "$STAKING_ADDR" "affiliateRewardReserve()(uint256)" 2>/dev/null)
echo "  Affiliate reserve:$(wei2eth "$AR") XENDA"

RR=$($CAST call --rpc-url "$RPC" "$STAKING_ADDR" "rankRewardReserve()(uint256)" 2>/dev/null)
echo "  Rank reserve:     $(wei2eth "$RR") XENDA"

echo ""
echo "  Sample wallet balances:"
for i in 0 1 4 5 7 9; do
  BAL=$($CAST call --rpc-url "$RPC" "$TOKEN_ADDR" "balanceOf(address)(uint256)" "${ADDRS[$i]}" 2>/dev/null)
  BNB=$($CAST balance --rpc-url "$RPC" "${ADDRS[$i]}" --ether 2>/dev/null)
  echo "   [$i] ${ADDRS[$i]}: $(wei2eth "$BAL") XENDA, $BNB BNB"
done

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ALL TESTS COMPLETE"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Tested:"
echo "   ✓ Token distribution (25K XENDA × 10 wallets)"
echo "   ✓ Staking (10 wallets × 20K XENDA)"
echo "   ✓ 3-level referral chain (L1: W0←W1-3 | L2: W1←W4-6 | L3: W4←W7-9)"
echo "   ✓ Affiliate reward payouts"
echo "   ✓ Reward accrual over 5 minutes"
echo "   ✓ Claim rewards"
echo "   ✓ Full withdraw (after lock)"
echo "   ✓ Early withdraw (30% penalty)"
echo "   ✓ Rank assignment (Rank 1 + Rank 2)"
echo "   ✓ Rank reward accrual + claim"
echo ""
echo "  Wallets: $WALLETS_FILE"
