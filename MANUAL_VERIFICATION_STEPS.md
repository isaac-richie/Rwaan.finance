# Manual BSCScan Verification Guide

## 📝 Contract Information

- **Contract Address:** `0x02764e1E158a141adebE6Fe166389A0e69e192a9`
- **Compiler:** `v0.8.20+commit.a1b79de6`
- **Optimization:** Enabled (200 runs)
- **License:** MIT

---

## 🔗 Step 1: Go to BSCScan Verification Page

👉 **Click here:** https://bscscan.com/verifyContract?a=0x02764e1E158a141adebE6Fe166389A0e69e192a9

---

## ⚙️ Step 2: Fill in the Form

### Compiler Type
- Select: **Solidity (Single file)**

### Compiler Version
- Select: **v0.8.20+commit.a1b79de6**

### Open Source License Type
- Select: **MIT License (MIT)**

### Optimization
- Select: **Yes**
- Runs: **200**

---

## 📄 Step 3: Paste the Flattened Contract

The flattened contract is in: `RWANSecureStakingV2_flat.sol`

**Copy the ENTIRE file contents** and paste into the "Enter the Solidity Contract Code below" field.

---

## 🔧 Step 4: Constructor Arguments (ABI-encoded)

Paste this in the "Constructor Arguments ABI-encoded" field:

```
000000000000000000000000acb921bf2dac2f7e8e101aad9ca013d6af5c648a000000000000000000000000acb921bf2dac2f7e8e101aad9ca013d6af5c648a0000000000000000000000000000000000000000000000008ac7230489e80000000000000000000000000000000000000000000000000000000000000000003200000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000000001f400000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a56fa5b99019a5c80000000000000000000000000000000000000000000000019d971e4fe8401e740000000000000000000000000000000000000000000000033b2e3c9fd0803ce80000000000000000000000000000000000000000000000071bcc1ef9311a1f9800000000000000000000000000000000000000000000000cecb8f27f4200f3a00000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000000000000000004b000000000000000000000000000000000000000000000000000000000000003e8000000000000000000000000000000000000000000000000000000000000032000000000000000000000000000000000000000000000000000000000000002580000000000000000000000000000000000000000000000000000000000000190
```

---

## ✅ Step 5: Verify

1. Complete the CAPTCHA
2. Click "Verify and Publish"
3. Wait 10-30 seconds for confirmation

---

## 🎉 Expected Result

After successful verification, you'll see:
- ✅ Green checkmark on contract page
- ✅ "Contract Source Code Verified" message
- ✅ Read/Write Contract tabs enabled

---

## 🚨 Troubleshooting

**If verification fails:**

1. **Check compiler version** - Must be exactly `v0.8.20+commit.a1b79de6`
2. **Check optimization** - Must be enabled with 200 runs
3. **Check constructor args** - Must be the exact hex string above (no 0x prefix)
4. **Check flattened contract** - Must include ALL imports

---

## 📞 Need Help?

If verification still fails, you can:
1. Try Blockscout verification (alternative explorer)
2. Contact BSCScan support
3. Ask in the Foundry Discord

---

**Good luck!** 🚀
