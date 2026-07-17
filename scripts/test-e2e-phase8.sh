#!/usr/bin/env bash
set -euo pipefail
export FOUNDRY_DISABLE_NIGHTLY_WARNING=1

###############################################################################
# XENDA E2E Test — RESUME from Phase 8 (Phase 7 done, correct position IDs)
###############################################################################

source .env

CAST="${HOME}/.foundry/bin/cast"
RPC="https://bsc-dataseed.binance.org/"
DEPLOYER_PK="$DEPLOYER_PRIVATE_KEY"

TOKEN_ADDR="${XENDA_TOKEN_ADDR:?Set XENDA_TOKEN_ADDR}"
STAKING_ADDR="${XENDA_STAKING_ADDR:?Set XENDA_STAKING_ADDR}"

WALLETS_FILE="scripts/.test-wallets-1784138655.json"

wei2eth() {
  local raw="$1"
  local clean
  clean=$(echo "$raw" | awk '{print $1}')
  python3 -c "print(f'{int(\"$clean\") / 1e18:,.2f}')"
}

ADDRS=()
PKS=()
NUM_WALLETS=$(python3 -c "import json; d=json.load(open('$WALLETS_FILE')); print(len(d))")

for i in $(seq 0 $((NUM_WALLETS - 1))); do
  addr=$(python3 -c "import json; d=json.load(open('$WALLETS_FILE')); print(d[$i]['address'])")
  pk=$(python3 -c "import json; d=json.load(open('$WALLETS_FILE')); print(d[$i]['pk'])")
  ADDRS+=("$addr")
  PKS+=("$pk")
done

# Position IDs: W0=21, W1=22, ..., W9=30
POS_BASE=21

echo "═══════════════════════════════════════════════════════════════"
echo "  XENDA E2E Test — RESUMING from Phase 8"
echo "  Position IDs: $POS_BASE to $((POS_BASE + 9))"
echo "═══════════════════════════════════════════════════════════════"

# ── Phase 8: Claim rewards (W0–W4) ──────────────────────────────────────
echo ""
echo "▸ Phase 8: Claiming staking rewards (W0–W4)..."

for i in $(seq 0 4); do
  POS=$((POS_BASE + i))
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
  POS=$((POS_BASE + i))
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
  echo "   [W$i] ${ADDRS[$i]}: $(wei2eth "$BAL") XENDA, $BNB BNB"
done

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ALL TESTS COMPLETE"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Tested:"
echo "   ✓ Staking (10 wallets × 20K XENDA)"
echo "   ✓ 3-level referral chain (L1: W0←W1-3 | L2: W1←W4-6 | L3: W4←W7-9)"
echo "   ✓ Early withdraw (30% penalty) — Phase 7 ✓"
echo "   ✓ Claim staking rewards"
echo "   ✓ Full withdraw (after lock)"
echo "   ✓ Rank assignment (Rank 1 + Rank 2)"
echo "   ✓ Rank reward accrual + claim"
