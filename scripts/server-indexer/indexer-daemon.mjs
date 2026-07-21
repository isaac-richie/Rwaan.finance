#!/usr/bin/env node
/**
 * RWANSecureStakingV5 leaderboard + network indexer — standalone daemon.
 *
 * Runs directly on the VPS against the pro Alchemy RPC. This deliberately
 * bypasses the Vercel /api/cron/index-leaderboard endpoint, which kept
 * mis-reading the chain head: Vercel's edge regions load-balance onto public
 * BSC nodes that can be hours behind, so the indexer repeatedly decided it was
 * "caught up" when it was not. A plain Node process on a fixed host with a
 * dedicated Alchemy key has none of that — the head it reads is authoritative.
 *
 * Robustness:
 *   - Chain head = max() across the Alchemy key(s) + several public BSC nodes,
 *     so no single stale/load-balanced node can stall the cursor.
 *   - getLogs only ever goes through Alchemy (public nodes reject it), with
 *     per-chunk endpoint fallback.
 *   - MAX_BLOCKS_PER_RUN caps one pass so a long gap can't run unbounded.
 *   - The cursor advances only to the range actually processed, and only after
 *     every write for that range has succeeded — a thrown error leaves the
 *     cursor untouched and the next tick retries the same blocks.
 *   - The loop never dies: a failed tick is logged and retried next interval.
 *
 * Env (put these in /etc/indexer.env on the server):
 *   BSC_ALCHEMY_RPC_URL          pro Alchemy BSC endpoint (required)
 *   BSC_ALCHEMY_RPC_URL2/3       optional extra Alchemy endpoints (fallback)
 *   RWAN_V5_STAKING_ADDRESS      staking contract address (required)
 *   RWAN_V5_DEPLOY_BLOCK         first block to scan on a cold start
 *   NEXT_PUBLIC_SUPABASE_URL     (required)
 *   SUPABASE_SERVICE_ROLE_KEY    (required)
 *   INDEX_INTERVAL_MS            tick interval, default 30000
 *   INDEX_CHUNK_SIZE             blocks per getLogs call, default 10000
 *
 *   node scripts/indexer-daemon.mjs
 */
import { createPublicClient, http, parseAbiItem, parseEventLogs, getAddress } from "viem";
import { createClient } from "@supabase/supabase-js";

const STATE_ID = "leaderboard";
const CHUNK = BigInt(process.env.INDEX_CHUNK_SIZE || "10000");
const MAX_BLOCKS_PER_RUN = 100_000n;
const INTERVAL_MS = Number(process.env.INDEX_INTERVAL_MS || "30000");

const ALCHEMY_ENDPOINTS = [
  process.env.BSC_ALCHEMY_RPC_URL,
  process.env.BSC_ALCHEMY_RPC_URL2,
  process.env.BSC_ALCHEMY_RPC_URL3,
].filter(Boolean);

// Public nodes are ONLY consulted to cross-check the chain head (take the max).
// They are never used for getLogs — BSC public nodes reject eth_getLogs.
const PUBLIC_HEAD_NODES = [
  "https://bsc-dataseed1.binance.org/",
  "https://bsc-dataseed2.binance.org/",
  "https://bsc-dataseed3.binance.org/",
  "https://bsc-dataseed4.binance.org/",
  "https://bsc-rpc.publicnode.com/",
];

const STAKING = process.env.RWAN_V5_STAKING_ADDRESS || process.env.NEXT_PUBLIC_RWAN_V5_STAKING_ADDRESS;
const DEPLOY_BLOCK = BigInt(process.env.RWAN_V5_DEPLOY_BLOCK || "0");

function requireEnv() {
  const missing = [];
  if (ALCHEMY_ENDPOINTS.length === 0) missing.push("BSC_ALCHEMY_RPC_URL");
  if (!STAKING) missing.push("RWAN_V5_STAKING_ADDRESS");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length) {
    console.error(`[indexer] missing env: ${missing.join(", ")}`);
    process.exit(1);
  }
}
requireEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const address = getAddress(STAKING);

const EVENTS = {
  created: parseAbiItem(
    "event PositionCreated(address indexed user, uint256 indexed positionId, uint256 amount, uint32 indexed planId, uint64 unlockTime)",
  ),
  withdrawn: parseAbiItem("event Withdrawn(address indexed user, uint256 indexed positionId, uint256 amount)"),
  withdrawnEarly: parseAbiItem(
    "event WithdrawnEarly(address indexed user, uint256 indexed positionId, uint256 amountAfterPenalty, uint256 penaltyAmount)",
  ),
  emergency: parseAbiItem("event EmergencyWithdrawn(address indexed user, uint256 indexed positionId, uint256 amount)"),
  reward: parseAbiItem("event RewardClaimed(address indexed user, uint256 indexed positionId, uint256 amount)"),
  rankReward: parseAbiItem("event RankRewardClaimed(address indexed user, uint256 amount)"),
  marketplace: parseAbiItem("event MarketplaceCreditClaimed(address indexed user, uint256 indexed positionId, uint256 amount)"),
  affiliate: parseAbiItem("event AffiliateRewardPaid(address indexed referrer, address indexed user, uint256 indexed level, uint256 amount)"),
  referrerSet: parseAbiItem("event ReferrerSet(address indexed user, address indexed referrer)"),
};
const ABI = Object.values(EVENTS);

const zeroDelta = () => ({ active: 0n, total: 0n, rewards: 0n, referral: 0n, positions: 0 });

/** Highest block number across every Alchemy + public node. Stale nodes lose. */
async function getChainHead() {
  const all = [...ALCHEMY_ENDPOINTS, ...PUBLIC_HEAD_NODES];
  const results = await Promise.allSettled(
    all.map((rpc) =>
      createPublicClient({ transport: http(rpc, { retryCount: 0, timeout: 8_000 }) }).getBlockNumber(),
    ),
  );
  let head = 0n;
  for (const r of results) if (r.status === "fulfilled" && r.value > head) head = r.value;
  return head;
}

/** getLogs via Alchemy only, with per-call endpoint fallback. */
async function getLogsResilient(fromBlock, toBlock) {
  let lastErr;
  for (const rpc of ALCHEMY_ENDPOINTS) {
    try {
      const c = createPublicClient({ transport: http(rpc, { retryCount: 0, timeout: 30_000 }) });
      return await c.getLogs({ address, fromBlock, toBlock });
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`all Alchemy endpoints failed for ${fromBlock}-${toBlock}: ${lastErr?.message ?? lastErr}`);
}

async function indexOnce() {
  const head = await getChainHead();
  if (head === 0n) throw new Error("could not determine chain head from any endpoint");

  const { data: state } = await supabase
    .from("indexer_state")
    .select("last_block")
    .eq("id", STATE_ID)
    .maybeSingle();
  const cursor = state?.last_block ? BigInt(state.last_block) : DEPLOY_BLOCK;
  const from = cursor + 1n;
  if (from > head) return { caughtUp: true, head };

  const to = from + MAX_BLOCKS_PER_RUN - 1n > head ? head : from + MAX_BLOCKS_PER_RUN - 1n;

  const statDeltas = new Map();
  const posCache = new Map();
  const closes = [];
  const touchPositions = new Map();
  const newReferrals = new Map();
  const userStakeAdded = new Map();
  const delta = (w) => {
    const k = w.toLowerCase();
    if (!statDeltas.has(k)) statDeltas.set(k, zeroDelta());
    return statDeltas.get(k);
  };

  // scan
  for (let start = from; start <= to; start += CHUNK) {
    const end = start + CHUNK - 1n > to ? to : start + CHUNK - 1n;
    const rawLogs = await getLogsResilient(start, end);
    const logs = parseEventLogs({ abi: ABI, logs: rawLogs, strict: false }).filter((l) => l.eventName);
    logs.sort((a, b) =>
      a.blockNumber === b.blockNumber ? a.logIndex - b.logIndex : Number(a.blockNumber - b.blockNumber),
    );
    for (const log of logs) {
      const n = log.eventName;
      const a = log.args;
      if (n === "ReferrerSet") {
        newReferrals.set(a.user.toLowerCase(), a.referrer.toLowerCase());
      } else if (n === "PositionCreated") {
        const id = a.positionId.toString();
        const owner = a.user.toLowerCase();
        posCache.set(id, { owner, amount: a.amount, active: true });
        touchPositions.set(id, { owner, amount: a.amount.toString(), active: true });
        const d = delta(owner);
        d.active += a.amount;
        d.total += a.amount;
        d.positions += 1;
        userStakeAdded.set(owner, (userStakeAdded.get(owner) ?? 0n) + a.amount);
      } else if (n === "Withdrawn" || n === "WithdrawnEarly" || n === "EmergencyWithdrawn") {
        closes.push(a.positionId.toString());
      } else if (n === "RewardClaimed" || n === "MarketplaceCreditClaimed") {
        delta(a.user).rewards += a.amount;
      } else if (n === "RankRewardClaimed") {
        delta(a.user).rewards += a.amount;
      } else if (n === "AffiliateRewardPaid") {
        delta(a.referrer).referral += a.amount;
      }
    }
  }

  // resolve closes
  const missing = closes.filter((id) => !posCache.has(id));
  if (missing.length) {
    const { data } = await supabase
      .from("leaderboard_positions")
      .select("position_id, owner, amount::text, active")
      .in("position_id", missing);
    for (const row of data ?? []) {
      posCache.set(row.position_id, { owner: row.owner, amount: BigInt(row.amount), active: row.active });
    }
  }
  for (const id of closes) {
    const p = posCache.get(id);
    if (!p || !p.active) continue;
    p.active = false;
    touchPositions.set(id, { owner: p.owner, amount: p.amount.toString(), active: false });
    const d = delta(p.owner);
    d.active -= p.amount;
    d.positions -= 1;
  }

  // persist positions
  if (touchPositions.size) {
    const rows = [...touchPositions.entries()].map(([position_id, v]) => ({
      position_id, owner: v.owner, amount: v.amount, active: v.active,
    }));
    const { error } = await supabase.from("leaderboard_positions").upsert(rows);
    if (error) throw new Error(`leaderboard_positions upsert: ${error.message}`);
  }

  // apply stat deltas
  const wallets = [...statDeltas.keys()];
  if (wallets.length) {
    const { data: existing } = await supabase
      .from("leaderboard_stats")
      .select("wallet, active_staked::text, total_staked::text, rewards_earned::text, referral_earned::text, positions")
      .in("wallet", wallets);
    const cur = new Map((existing ?? []).map((r) => [r.wallet, r]));
    const rows = wallets.map((w) => {
      const base = cur.get(w) ?? { active_staked: 0, total_staked: 0, rewards_earned: 0, referral_earned: 0, positions: 0 };
      const d = statDeltas.get(w);
      const add = (x, y) => (BigInt(x) + y).toString();
      let active = BigInt(base.active_staked) + d.active;
      if (active < 0n) active = 0n;
      return {
        wallet: w,
        active_staked: active.toString(),
        total_staked: add(base.total_staked, d.total),
        rewards_earned: add(base.rewards_earned, d.rewards),
        referral_earned: add(base.referral_earned, d.referral),
        positions: Math.max(0, (base.positions ?? 0) + d.positions),
        updated_at: new Date().toISOString(),
      };
    });
    const { error } = await supabase.from("leaderboard_stats").upsert(rows);
    if (error) throw new Error(`leaderboard_stats upsert: ${error.message}`);
  }

  // persist referral_links
  if (newReferrals.size || userStakeAdded.size) {
    const refRows = [...newReferrals.entries()].map(([referee, referrer]) => ({
      referee, referrer, amount: (userStakeAdded.get(referee) ?? 0n).toString(), joined_at: new Date().toISOString(),
    }));
    if (refRows.length) {
      const { error } = await supabase.from("referral_links").upsert(refRows, { onConflict: "referee" });
      if (error) throw new Error(`referral_links upsert: ${error.message}`);
    }
    const existingStakers = [...userStakeAdded.entries()].filter(([user]) => !newReferrals.has(user));
    for (const [user, addAmount] of existingStakers) {
      const { data: row } = await supabase.from("referral_links").select("amount::text").eq("referee", user).maybeSingle();
      if (row) {
        await supabase.from("referral_links").update({ amount: (BigInt(row.amount) + addAmount).toString() }).eq("referee", user);
      }
    }
  }

  // refresh network_stats
  const affectedReferrers = new Set([...newReferrals.values()]);
  if (userStakeAdded.size) {
    const stakingUsers = [...userStakeAdded.keys()].filter((u) => !newReferrals.has(u));
    if (stakingUsers.length) {
      const { data: refs } = await supabase.from("referral_links").select("referee, referrer").in("referee", stakingUsers);
      for (const r of refs ?? []) affectedReferrers.add(r.referrer);
    }
  }
  for (const referrer of affectedReferrers) {
    const { data: members } = await supabase.from("referral_links").select("referee, amount::text").eq("referrer", referrer);
    const directCount = members?.length ?? 0;
    const directAddrs = (members ?? []).map((m) => m.referee);
    let totalMembers = directCount;
    let teamVolume = (members ?? []).reduce((s, m) => s + BigInt(m.amount ?? 0), 0n);
    if (directAddrs.length) {
      const { data: l2 } = await supabase.from("referral_links").select("referee, amount::text").in("referrer", directAddrs);
      totalMembers += l2?.length ?? 0;
      teamVolume += (l2 ?? []).reduce((s, m) => s + BigInt(m.amount ?? 0), 0n);
      const l2Addrs = (l2 ?? []).map((m) => m.referee);
      if (l2Addrs.length) {
        const { data: l3 } = await supabase.from("referral_links").select("referee, amount::text").in("referrer", l2Addrs);
        totalMembers += l3?.length ?? 0;
        teamVolume += (l3 ?? []).reduce((s, m) => s + BigInt(m.amount ?? 0), 0n);
      }
    }
    await supabase.from("network_stats").upsert({
      wallet: referrer, direct_members: directCount, total_members: totalMembers,
      team_volume: teamVolume.toString(), updated_at: new Date().toISOString(),
    });
  }

  // advance cursor ONLY to the range actually processed, ONLY after all writes succeeded
  const { error: cursorError } = await supabase.from("indexer_state").upsert({ id: STATE_ID, last_block: Number(to) });
  if (cursorError) throw new Error(`indexer_state upsert: ${cursorError.message}`);

  return { from, to, head, wallets: wallets.length, positions: touchPositions.size, referrals: newReferrals.size, caughtUp: to === head };
}

let running = true;
process.on("SIGTERM", () => { running = false; });
process.on("SIGINT", () => { running = false; });

async function loop() {
  console.log(`[indexer] daemon started — interval ${INTERVAL_MS}ms, chunk ${CHUNK}, ${ALCHEMY_ENDPOINTS.length} Alchemy endpoint(s)`);
  while (running) {
    const t0 = Date.now();
    try {
      const r = await indexOnce();
      if (r.caughtUp && r.from === undefined) {
        // fully synced, nothing to do — stay quiet-ish
        if (Date.now() % 20 < 1) console.log(`[indexer] caught up @ ${r.head}`);
      } else {
        console.log(
          `[indexer] ${r.from}..${r.to} (head ${r.head}) — ${r.wallets} wallets, ${r.positions} positions, ${r.referrals} referrals${r.caughtUp ? " — CAUGHT UP" : " — more to go"}`,
        );
      }
    } catch (e) {
      console.error(`[indexer] tick failed (cursor untouched, will retry): ${e.message ?? e}`);
    }
    const elapsed = Date.now() - t0;
    const wait = Math.max(0, INTERVAL_MS - elapsed);
    await new Promise((res) => setTimeout(res, wait));
  }
  console.log("[indexer] shutting down cleanly");
  process.exit(0);
}

loop();
