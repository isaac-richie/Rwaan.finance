/**
 * Rwan Staking — Admin Script
 * ────────────────────────────────────────────────────────────────────────────
 * Usage:
 *   node scripts/admin-staking.mjs read              — current state
 *   node scripts/admin-staking.mjs add-1yr           — add 365-day lock plan
 *   node scripts/admin-staking.mjs fix-multipliers   — update 30d/90d/180d multipliers
 *   node scripts/admin-staking.mjs apply-all         — fix multipliers and add 365-day plan
 *
 * Set OWNER_PRIVATE_KEY in .env.local before running any write command.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Current on-chain state (as of last read):
 *   Base APR : 16%
 *   ID 1  90d   2.10x  ✅  → effective 33.6%  (target 15%)
 *   ID 2 180d   6.25x  ✅  → effective 100%   (target 30%)
 *   ID 4  30d   1.30x  ✅  → effective 20.8%  (target  5%)
 *   1yr        ——      —   not on chain yet    (target 60%)
 *
 * Plan: keep base APR at 16% and update multipliers only:
 *   30d  → 0.3125x ( 3 125 bps) →  5%
 *   90d  → 0.9375x ( 9 375 bps) → 15%
 *  180d  → 1.8750x (18 750 bps) → 30%
 *  365d  → 3.7500x (37 500 bps) → 60%
 * ────────────────────────────────────────────────────────────────────────────
 */

import { createPublicClient, createWalletClient, http, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── Load .env files ──────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const root  = resolve(__dir, "..");

function loadEnv(...files) {
  const env = {};
  for (const f of files) {
    try {
      readFileSync(resolve(root, f), "utf8")
        .split("\n")
        .forEach(line => {
          const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
          if (m && m[2].trim()) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
        });
    } catch {}
  }
  return env;
}

const env = loadEnv(".env", ".env.local");

// ── Constants ────────────────────────────────────────────────────────────────
const STAKING_ADDRESS  = "0x890Bc48a6463586c75a7C9db0Af7FC3e5cA15625";
const RPC_URL          = env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/";
const OWNER_PK         = env.OWNER_PRIVATE_KEY;

// Target plan config — source of truth
const TARGET_PLANS = [
  { durationSec: 30  * 86400, label: "30 Days",  multiplierBps: 3_125,  targetAprBps: 500  },
  { durationSec: 90  * 86400, label: "90 Days",  multiplierBps: 9_375,  targetAprBps: 1500 },
  { durationSec: 180 * 86400, label: "180 Days", multiplierBps: 18_750, targetAprBps: 3000 },
  { durationSec: 365 * 86400, label: "365 Days", multiplierBps: 37_500, targetAprBps: 6000 },
];

// Minimal ABI
const ABI = [
  { type: "function", name: "lockOptionsLength", inputs: [],                                            outputs: [{ type: "uint256" }],                                                                                  stateMutability: "view"        },
  { type: "function", name: "lockOptions",        inputs: [{ name: "id", type: "uint256" }],             outputs: [{ name: "duration", type: "uint64" }, { name: "multiplierBps", type: "uint32" }, { name: "enabled", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "aprTiers",           inputs: [{ name: "id", type: "uint256" }],             outputs: [{ name: "minTVL", type: "uint256" }, { name: "aprBps", type: "uint32" }],                             stateMutability: "view"        },
  { type: "function", name: "currentAprBps",      inputs: [],                                            outputs: [{ type: "uint32" }],                                                                                   stateMutability: "view"        },
  { type: "function", name: "totalStaked",        inputs: [],                                            outputs: [{ type: "uint256" }],                                                                                  stateMutability: "view"        },
  { type: "function", name: "owner",              inputs: [],                                            outputs: [{ type: "address" }],                                                                                  stateMutability: "view"        },
  { type: "function", name: "addLockOption",      inputs: [{ name: "duration", type: "uint64" }, { name: "multiplierBps", type: "uint32" }, { name: "enabled", type: "bool" }],                                         outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "setLockOption",      inputs: [{ name: "lockId", type: "uint256" }, { name: "multiplierBps", type: "uint32" }, { name: "enabled", type: "bool" }],                                          outputs: [], stateMutability: "nonpayable" },
];

// ── Clients ──────────────────────────────────────────────────────────────────
const publicClient = createPublicClient({ chain: bsc, transport: http(RPC_URL) });

function getWalletClient() {
  if (!OWNER_PK || OWNER_PK.trim() === "") {
    console.error("\n❌  OWNER_PRIVATE_KEY is not set in .env.local");
    console.error("    Add: OWNER_PRIVATE_KEY=0xyour_key_here\n");
    process.exit(1);
  }
  const pk = OWNER_PK.startsWith("0x") ? OWNER_PK : `0x${OWNER_PK}`;
  const account = privateKeyToAccount(pk);
  const client  = createWalletClient({ chain: bsc, transport: http(RPC_URL), account });
  return { client, account };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtBps  = (bps) => `${(Number(bps) / 100).toFixed(2)}%`;
const fmtSec  = (sec) => `${Math.round(Number(sec) / 86400)}d`;
const fmtMult = (bps) => `${(Number(bps) / 10_000).toFixed(2)}x`;

async function readLockOptions() {
  const count = await publicClient.readContract({ address: STAKING_ADDRESS, abi: ABI, functionName: "lockOptionsLength" });
  const opts = [];
  for (let i = 0; i < Number(count); i++) {
    const [duration, multiplierBps, enabled] = await publicClient.readContract({
      address: STAKING_ADDRESS, abi: ABI, functionName: "lockOptions", args: [BigInt(i)],
    });
    opts.push({ id: i, duration: Number(duration), multiplierBps: Number(multiplierBps), enabled });
  }
  return opts;
}

async function readAprTiers() {
  const tiers = [];
  for (let i = 0; i < 10; i++) {
    try {
      const [minTVL, aprBps] = await publicClient.readContract({
        address: STAKING_ADDRESS, abi: ABI, functionName: "aprTiers", args: [BigInt(i)],
      });
      if (aprBps === 0n && minTVL === 0n && i > 0) break;
      tiers.push({ id: i, minTVL, aprBps: Number(aprBps) });
    } catch { break; }
  }
  return tiers;
}

async function sendTx(client, fnName, args, label) {
  process.stdout.write(`  → ${label} … `);
  const hash = await client.writeContract({ address: STAKING_ADDRESS, abi: ABI, functionName: fnName, args });
  process.stdout.write(`sent\n    tx: https://bscscan.com/tx/${hash}\n`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`    ✅ confirmed block ${receipt.blockNumber}`);
  return receipt;
}

// ── Commands ─────────────────────────────────────────────────────────────────

async function cmdRead() {
  console.log("\n📋  Current Contract State — BSC Mainnet");
  console.log("═══════════════════════════════════════════════════════");

  const [owner, currentApr, totalStaked] = await Promise.all([
    publicClient.readContract({ address: STAKING_ADDRESS, abi: ABI, functionName: "owner" }),
    publicClient.readContract({ address: STAKING_ADDRESS, abi: ABI, functionName: "currentAprBps" }),
    publicClient.readContract({ address: STAKING_ADDRESS, abi: ABI, functionName: "totalStaked" }),
  ]);

  console.log(`  Owner       : ${owner}`);
  console.log(`  Current APR : ${fmtBps(currentApr)}`);
  console.log(`  Total Staked: ${Number(formatEther(totalStaked)).toLocaleString()} $Rwaan\n`);

  const opts = await readLockOptions();
  console.log("  Lock Options:");
  console.log("  ┌────┬──────────┬────────────┬────────┬─────────────┐");
  console.log("  │ ID │ Duration │ Multiplier │ Active │ Effective % │");
  console.log("  ├────┼──────────┼────────────┼────────┼─────────────┤");
  for (const o of opts) {
    const eff = (Number(currentApr) * o.multiplierBps / 10_000 / 100).toFixed(2);
    const active = o.enabled ? "✅" : "❌";
    console.log(`  │ ${String(o.id).padEnd(2)} │ ${fmtSec(o.duration).padEnd(8)} │ ${fmtMult(o.multiplierBps).padEnd(10)} │   ${active}   │ ${(eff + "%").padEnd(11)} │`);
  }
  console.log("  └────┴──────────┴────────────┴────────┴─────────────┘\n");

  const tiers = await readAprTiers();
  console.log("  APR Tiers:");
  console.log("  ┌────┬──────────────────────────┬────────┐");
  console.log("  │ ID │ Min TVL ($Rwaan)          │ APR    │");
  console.log("  ├────┼──────────────────────────┼────────┤");
  for (const t of tiers) {
    console.log(`  │ ${String(t.id).padEnd(2)} │ ${Number(formatEther(t.minTVL)).toLocaleString().padEnd(24)} │ ${fmtBps(t.aprBps).padEnd(6)} │`);
  }
  console.log("  └────┴──────────────────────────┴────────┘\n");
}

async function cmdAdd1yr() {
  console.log("\n🔒  Adding 365-day lock plan…");
  const opts = await readLockOptions();
  const exists = opts.find(o => o.duration === 365 * 86400);
  if (exists) {
    console.log(`⚠️   365-day plan already exists at ID ${exists.id} (enabled: ${exists.enabled})`);
    if (!exists.enabled) {
      console.log("    Re-enabling it with correct multiplier…");
      const { client } = getWalletClient();
      await sendTx(client, "setLockOption", [BigInt(exists.id), 37_500, true], `setLockOption(${exists.id}, 37500, true)`);
    }
    return;
  }
  const { client, account } = getWalletClient();
  console.log(`  Wallet  : ${account.address}`);
  console.log(`  Duration: 365 days (${365 * 86400} sec)`);
  console.log(`  Mult    : 3.75x (37500 bps) → target 60% APR at 16% base`);
  await sendTx(client, "addLockOption", [BigInt(365 * 86400), 37_500, true], "addLockOption(31536000, 37500, true)");
  console.log("\n✅  365-day plan live!\n");
}

async function cmdFixMultipliers() {
  console.log("\n🔧  Updating multipliers on existing plans…");
  console.log("  Goal: 30d→0.3125x(5%)  90d→0.9375x(15%)  180d→1.875x(30%)  at 16% base APR");

  const opts   = await readLockOptions();
  const { client, account } = getWalletClient();
  console.log(`  Wallet: ${account.address}\n`);

  // Map duration → target multiplierBps
  const targetMult = {
    [30  * 86400]: 3_125,   // 0.3125x
    [90  * 86400]: 9_375,   // 0.9375x
    [180 * 86400]: 18_750,  // 1.875x
    [365 * 86400]: 37_500,  // 3.75x
  };

  let updated = 0;
  for (const o of opts) {
    const want = targetMult[o.duration];
    if (!want) { console.log(`  ID ${o.id} (${fmtSec(o.duration)}): no target → skipped`); continue; }

    if (o.multiplierBps === want && o.enabled) {
      console.log(`  ID ${o.id} (${fmtSec(o.duration)}): already correct ${fmtMult(want)} ✓`);
      continue;
    }

    // Only update the ACTIVE/primary plan for each duration (skip disabled duplicates)
    const primary = opts.filter(x => x.duration === o.duration && x.enabled);
    if (!o.enabled && primary.length > 0) {
      console.log(`  ID ${o.id} (${fmtSec(o.duration)}): disabled duplicate → skipped`);
      continue;
    }

    console.log(`  ID ${o.id} (${fmtSec(o.duration)}): ${fmtMult(o.multiplierBps)} → ${fmtMult(want)}`);
    await sendTx(client, "setLockOption", [BigInt(o.id), want, true], `setLockOption(${o.id}, ${want}, true)`);
    updated++;
  }

  if (updated === 0) console.log("\n  All multipliers already correct ✓");
  else console.log(`\n✅  Updated ${updated} plan(s)\n`);
}

async function cmdSetBaseApr() {
  console.log("\nBase APR tier updates are disabled for this rollout.");
  console.log("We are keeping the current 16% base APR and changing lock multipliers only.\n");
}

async function cmdApplyAll() {
  console.log("\n🚀  apply-all: updating multipliers → adding 1yr plan");
  console.log("═══════════════════════════════════════════════════════\n");
  await cmdFixMultipliers();
  await cmdAdd1yr();
  console.log("\n🎉  Done! Run 'node scripts/admin-staking.mjs read' to verify.\n");
}

// ── Entry ─────────────────────────────────────────────────────────────────────
const [,, cmd, ...args] = process.argv;

switch (cmd) {
  case "read":            await cmdRead();           break;
  case "add-1yr":         await cmdAdd1yr();         break;
  case "fix-multipliers": await cmdFixMultipliers();  break;
  case "set-base-apr":    await cmdSetBaseApr();     break;
  case "apply-all":       await cmdApplyAll();       break;
  default:
    console.log(`
Rwan Staking Admin Script
──────────────────────────────────────────────────
  read              Show current lock options & APR tiers
  add-1yr           Add the 365-day plan to the contract
  fix-multipliers   Update 30d/90d/180d to correct multipliers
  set-base-apr      Disabled for this rollout
  apply-all         Fix multipliers and add 1yr plan

Example (full setup):
  node scripts/admin-staking.mjs apply-all

Example (just add 1yr):
  node scripts/admin-staking.mjs add-1yr

After setting OWNER_PRIVATE_KEY in .env.local:
  OWNER_PRIVATE_KEY=0x...your_key...
`);
}
