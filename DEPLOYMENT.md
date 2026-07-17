# RWAN Staking Contract Deployment Guide

## 📋 Prerequisites

1. **Foundry installed**
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Environment variables** (create `.env` in project root)
   ```bash
   BSC_RPC_URL=https://bsc-dataseed.binance.org/
   DEPLOYER_PRIVATE_KEY=your_private_key_here
   BSCSCAN_API_KEY=your_bscscan_api_key_here
   ```

3. **Load environment**
   ```bash
   source .env
   ```

---

## 🚀 Deploy to BSC Mainnet

```bash
forge script script/DeployRWANSecureStakingV2.s.sol:DeployRWANSecureStakingV2 \
  --rpc-url $BSC_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BSCSCAN_API_KEY \
  -vvvv
```

**What this does:**
- Deploys the staking contract to BSC mainnet
- Verifies source code on BSCScan
- Shows detailed logs (`-vvvv`)

---

## 🧪 Deploy to BSC Testnet (for testing)

```bash
# Update .env with testnet RPC
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/

forge script script/DeployRWANSecureStakingV2.s.sol:DeployRWANSecureStakingV2 \
  --rpc-url $BSC_TESTNET_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BSCSCAN_API_KEY \
  -vvvv
```

---

## 📝 What Gets Deployed

### Initial Configuration

| Parameter | Value | Meaning |
|-----------|-------|---------|
| **Staking Token** | `0xACB921bf2Dac2F7E8E101AAd9CA013d6Af5C648a` | RWAN token (stake this) |
| **Reward Token** | Same as staking token | Users earn RWAN |
| **Min Stake** | `0` | No minimum (any amount allowed) |
| **Max Positions** | `0` | Unlimited positions per user |
| **Referral Bonus** | `500 bps` (5%) | Referrers earn 5% of referee's rewards |

### Lock Options (created automatically)

| Index | Duration | Multiplier | Effective APR (at 16% base) |
|-------|----------|------------|------------------------------|
| `0` | Fixed (0 days) | 1.0x | 16% |
| `1` | 3 months (90 days) | 2.0x | 32% |
| `2` | 6 months (180 days) | 4.0x | 64% |

### APR Tiers (TVL-based, dilution model)

| TVL Range | Base APR | Notes |
|-----------|----------|-------|
| 0 - 200M | 16% | Early stage, high rewards |
| 200M - 500M | 12% | Growing TVL |
| 500M - 1B | 10% | Medium TVL |
| 1B - 2.2B | 8% | Large TVL |
| 2.2B - 4B | 6% | Very large TVL |
| 4B+ | 4% | Max dilution |

**Note:** Locked positions multiply these rates by their multiplier.

---

## ⚠️ Post-Deployment Steps (Critical)

### 1. Fund the Reward Reserve
The contract needs tokens to pay stakers:

```bash
# Approve staking contract to spend your tokens
cast send $RWAN_TOKEN_ADDRESS \
  "approve(address,uint256)" \
  $STAKING_CONTRACT_ADDRESS \
  1000000000000000000000000 \
  --rpc-url $BSC_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY

# Fund rewards (example: 1M RWAN)
cast send $STAKING_CONTRACT_ADDRESS \
  "fundRewards(uint256)" \
  1000000000000000000000000 \
  --rpc-url $BSC_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### 2. Fund the Referral Reserve
Referrers need a separate budget:

```bash
# Fund referral rewards (example: 100K RWAN)
cast send $STAKING_CONTRACT_ADDRESS \
  "fundReferralRewards(uint256)" \
  100000000000000000000000 \
  --rpc-url $BSC_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### 3. Update Frontend `.env`
Replace the old contract address:

```bash
NEXT_PUBLIC_RWAN_STAKING_ADDRESS=<your_new_deployed_address>
```

---

## 🔍 Verify Deployment

Check the contract on BSCScan:
```
https://bscscan.com/address/<your_deployed_address>
```

Verify state:
```bash
# Check total staked
cast call $STAKING_CONTRACT_ADDRESS "totalStaked()" --rpc-url $BSC_RPC_URL

# Check reward reserve
cast call $STAKING_CONTRACT_ADDRESS "rewardReserve()" --rpc-url $BSC_RPC_URL

# Check owner
cast call $STAKING_CONTRACT_ADDRESS "owner()" --rpc-url $BSC_RPC_URL
```

---

## 🛠️ Admin Functions (After Deploy)

### Add a new lock option
```bash
cast send $STAKING_CONTRACT_ADDRESS \
  "addLockOption(uint64,uint32,bool)" \
  31536000 \     # 1 year in seconds
  50000 \        # 5.0x multiplier (50000 bps)
  true \         # enabled
  --rpc-url $BSC_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### Update APR tiers
```bash
# Prepare new tier arrays, then call:
cast send $STAKING_CONTRACT_ADDRESS \
  "setAprTiers(uint256[],uint32[])" \
  "[0,100000000000000000000000000]" \
  "[2000,1500]" \
  --rpc-url $BSC_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### Pause contract (emergency)
```bash
cast send $STAKING_CONTRACT_ADDRESS \
  "pause()" \
  --rpc-url $BSC_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

---

## 📊 Understanding the Parameters

### Why TVL-based APR tiers?
- **Early adopters get higher APR** (16%) to incentivize initial staking
- **As TVL grows, APR decreases** (dilution model)
- **Protects protocol** from unsustainable emission rates

### Why multipliers for locked positions?
- **Rewards long-term commitment** (6-month lockers get 4x APR)
- **Reduces sell pressure** (tokens locked = more stability)
- **Fair tradeoff** (higher reward = less liquidity)

### Why separate referral reserve?
- **Sustainable referral program** (doesn't drain main rewards)
- **Clear accounting** (easy to track referral budget)
- **Can pause referrals independently** if needed

---

## 🚨 Security Checklist Before Mainnet

- [ ] Contract audited by reputable firm
- [ ] Foundry tests pass (`forge test`)
- [ ] Deploy to testnet first
- [ ] Test all user flows (stake, claim, withdraw)
- [ ] Test admin functions (pause, recover tokens)
- [ ] Verify BSCScan source code
- [ ] Fund rewards + referral reserves
- [ ] Update frontend with correct address
- [ ] Transfer ownership to multisig (recommended)

---

## 📞 Need Help?

Common issues:
- **"Insufficient allowance"** → Approve tokens first
- **"No excess"** (recoverERC20) → Not enough tokens to recover
- **"Lock disabled"** → Enable lock option via `setLockOption`
- **Gas estimation failed** → Check RPC URL, wallet balance

---

## 🎯 Quick Reference

```bash
# Dry run (simulate without broadcasting)
forge script script/DeployRWANSecureStakingV2.s.sol:DeployRWANSecureStakingV2 \
  --rpc-url $BSC_RPC_URL

# Deploy with verification
forge script script/DeployRWANSecureStakingV2.s.sol:DeployRWANSecureStakingV2 \
  --rpc-url $BSC_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $BSCSCAN_API_KEY

# Generate ABI for frontend
forge inspect RWANSecureStakingV2 abi > lib/contracts/rwanStakingAbi.json
```
