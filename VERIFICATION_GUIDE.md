# BSCScan Contract Verification Guide

## ✅ Deployed Contract Info

**Contract Address:** `0x02764e1E158a141adebE6Fe166389A0e69e192a9`  
**Network:** BSC Mainnet (Chain ID: 56)  
**Compiler Version:** `v0.8.20+commit.a1b79de6`  
**Optimization:** Enabled (200 runs)  
**License:** MIT

---

## 📝 Manual Verification Steps

### Step 1: Go to BSCScan Verification Page
**URL:** https://bscscan.com/verifyContract?a=0x02764e1E158a141adebE6Fe166389A0e69e192a9

### Step 2: Fill in the Form

| Field | Value |
|-------|-------|
| **Contract Address** | `0x02764e1E158a141adebE6Fe166389A0e69e192a9` |
| **Compiler Type** | Solidity (Single file) |
| **Compiler Version** | `v0.8.20+commit.a1b79de6` |
| **Open Source License Type** | MIT License (MIT) |

### Step 3: Contract Source Code

**File:** `RWANSecureStakingV2_flat.sol` (in your project root)

Copy the entire contents of this file and paste into the "Enter the Solidity Contract Code below" field.

### Step 4: Optimization

- **Optimization:** ✅ Yes
- **Runs:** `200`

### Step 5: Constructor Arguments (ABI-encoded)

```
0000000000000000000000000000000000000000000000000000000000000000acb921bf2dac2f7e8e101aad9ca013d6af5c648a000000000000000000000000acb921bf2dac2f7e8e101aad9ca013d6af5c648a0000000000000000000000000000000000000000000000008ac7230489e8000000000000000000000000000000000000000000000000000000000000000000320000000000000000000000000000000000000000000000000000000000000160000000000000000000000000000000000000000000000000000000000000020001f40000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a56fa5b99019a5c800000000000000000000000000000000000000000000001a784379d99db42000000000000000000000000000000000000000000000003635c9adc5dea0000000000000000000000000000000000000000000000000077586680e85b7800000000000000000000000000000000000000000000000000d3c21bcecceda100000000000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000640000000000000000000000000000000000000000000000000000000000000004b0000000000000000000000000000000000000000000000000000000000000003e8000000000000000000000000000000000000000000000000000000000000032000000000000000000000000000000000000000000000000000000000000002580000000000000000000000000000000000000000000000000000000000000190
```

**Or use this command to generate it:**
```bash
cast abi-encode "constructor(address,address,uint256,uint256,uint256[],uint32[],uint256)" \
  0xACB921bf2Dac2F7E8E101AAd9CA013d6Af5C648a \
  0xACB921bf2Dac2F7E8E101AAd9CA013d6Af5C648a \
  10000000000000000000 \
  50 \
  "[0,200000000000000000000000000,500000000000000000000000000,1000000000000000000000000000,2200000000000000000000000000,4000000000000000000000000000]" \
  "[1600,1200,1000,800,600,400]" \
  500
```

---

## 🔍 Constructor Arguments Breakdown

```solidity
constructor(
    address stakingToken_,        // 0xACB921bf2Dac2F7E8E101AAd9CA013d6Af5C648a
    address rewardToken_,         // 0xACB921bf2Dac2F7E8E101AAd9CA013d6Af5C648a
    uint256 minStakeAmount_,      // 10000000000000000000 (10 RWAN)
    uint256 maxPositionsPerUser_, // 50
    uint256[] memory tierTVL,     // [0, 200M, 500M, 1B, 2.2B, 4B]
    uint32[] memory tierAprBps,   // [1600, 1200, 1000, 800, 600, 400]
    uint256 referralBps_          // 500 (5%)
)
```

---

## ✅ Verification Checklist

Before submitting:
- [ ] Contract address is correct: `0x02764e1E158a141adebE6Fe166389A0e69e192a9`
- [ ] Compiler version: `v0.8.20+commit.a1b79de6`
- [ ] Optimization: Enabled with 200 runs
- [ ] License: MIT
- [ ] Flattened source code pasted
- [ ] Constructor arguments pasted

---

## 📱 Quick Links

- **Verify Contract:** https://bscscan.com/verifyContract?a=0x02764e1E158a141adebE6Fe166389A0e69e192a9
- **View Contract:** https://bscscan.com/address/0x02764e1E158a141adebE6Fe166389A0e69e192a9
- **Flattened File:** `RWANSecureStakingV2_flat.sol` (in project root)

---

## 🚨 If Verification Fails

Common issues:
1. **Wrong compiler version** → Use exact: `v0.8.20+commit.a1b79de6`
2. **Optimization mismatch** → Must be: Enabled, 200 runs
3. **Constructor args wrong** → Copy from above or regenerate
4. **Extra spaces/newlines** → Paste flattened file exactly as-is

---

## 🎯 After Verification

Once verified, the contract will show:
- ✅ Green checkmark on BSCScan
- Source code tab visible
- Read/Write Contract tabs enabled
- Users can interact directly from BSCScan
