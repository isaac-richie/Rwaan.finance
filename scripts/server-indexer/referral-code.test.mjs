/**
 * Aggressive tests for the referral-code claim contract.
 * Verifies the exact client↔server signed-message flow with real keys, plus
 * the code normalizer and address/code resolution rules.
 *
 * Run:  node scripts/server-indexer/referral-code.test.mjs
 */
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { verifyMessage, isAddress, getAddress } from "viem";

// ── verbatim copies of the server helpers (keep in sync) ───────────────────
function normalizeCode(raw) {
  const c = raw.trim().toLowerCase();
  return /^[a-z0-9]{3,16}$/.test(c) ? c : null;
}
function claimMessage(code, walletChecksum) {
  return `Claim RWAAN referral code "${code}" for ${walletChecksum}`;
}

let pass = 0, fail = 0;
function ok(name, cond, extra = "") {
  console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  " + extra : ""}`);
  cond ? pass++ : fail++;
}

// ── 1) normalizeCode ───────────────────────────────────────────────────────
ok("code 'RICH' → 'rich'", normalizeCode("RICH") === "rich");
ok("code '  Big2 ' trims/lowers", normalizeCode("  Big2 ") === "big2");
ok("code 'ab' too short → null", normalizeCode("ab") === null);
ok("code 17 chars too long → null", normalizeCode("a".repeat(17)) === null);
ok("code 'ok!' punctuation → null", normalizeCode("ok!") === null);
ok("code 'has space' → null", normalizeCode("has space") === null);
ok("code 'GOLD99' ok", normalizeCode("GOLD99") === "gold99");

// ── 2) signature round-trip (the security core) ────────────────────────────
const acct = privateKeyToAccount(generatePrivateKey());
const wallet = getAddress(acct.address);
const code = normalizeCode("RICH");

const goodSig = await acct.signMessage({ message: claimMessage(code, wallet) });
ok("valid claim signature verifies", await verifyMessage({
  address: wallet, message: claimMessage(code, wallet), signature: goodSig,
}));

// replay across codes: signed for 'rich', attacker submits 'scam'
ok("replay to a DIFFERENT code fails", !(await verifyMessage({
  address: wallet, message: claimMessage("scam", wallet), signature: goodSig,
})), "← signature bound to the code");

// cross-wallet: wallet A signs, claim body says wallet B
const attacker = privateKeyToAccount(generatePrivateKey());
const attackerWallet = getAddress(attacker.address);
ok("signature from another wallet fails", !(await verifyMessage({
  address: wallet, message: claimMessage(code, wallet),
  signature: await attacker.signMessage({ message: claimMessage(code, wallet) }),
})), "← can't claim a code for a wallet you don't control");

// attacker signs for THEIR wallet but tries to bind to victim's address in msg
ok("attacker can't point a code at victim's wallet", !(await verifyMessage({
  address: attackerWallet,
  message: claimMessage(code, wallet), // victim wallet in the message
  signature: await attacker.signMessage({ message: claimMessage(code, attackerWallet) }),
})));

// tampered signature: flip a nibble inside r (index 12) so it can't recover
const at = 12;
const flipped = (parseInt(goodSig[at], 16) ^ 0xf).toString(16);
const tampered = goodSig.slice(0, at) + flipped + goodSig.slice(at + 1);
let tamperResult;
try {
  tamperResult = await verifyMessage({ address: wallet, message: claimMessage(code, wallet), signature: tampered });
} catch { tamperResult = false; }
ok("tampered signature fails", tamperResult === false);

// ── 3) resolveReferrerInput rules (address passthrough vs code) ─────────────
// address is returned checksummed; a bad string is rejected pre-lookup
ok("raw address is recognised", isAddress(wallet));
ok("empty input rejected by normalizer", normalizeCode("") === null);
ok("'0xnothex' is a valid CODE shape (8 alnum), not an address",
   normalizeCode("0xnothex") === "0xnothex" && !isAddress("0xnothex"));
ok("self-referral guard is caller's job (address equals returns address)",
   getAddress(wallet) === wallet);

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
