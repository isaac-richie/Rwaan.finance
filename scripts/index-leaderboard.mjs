#!/usr/bin/env node
/**
 * Leaderboard indexer for RWANSecureStakingV5.
 *
 * Scans on-chain events from the last-synced block, reconciles per-position and
 * per-wallet aggregates, and upserts them into Supabase. Idempotent via a block
 * cursor (indexer_state). Run on a cron (e.g. every 1-2 min) or a Vercel cron.
 *
 * Env:
 *   LEADERBOARD_RPC_URL         (server RPC; falls back to BSC_TESTNET_RPC_URL)
 *   RWAN_V5_STAKING_ADDRESS     staking contract address
 *   RWAN_V5_DEPLOY_BLOCK        block the contract was deployed at (first sync)
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 *   node scripts/index-leaderboard.mjs
 */
import { createPublicClient, http, parseAbiItem, getAddress } from "viem";
import { createClient } from "@supabase/supabase-js";

const RPC = process.env.LEADERBOARD_RPC_URL || process.env.BSC_TESTNET_RPC_URL;
const STAKING = process.env.RWAN_V5_STAKING_ADDRESS;
const DEPLOY_BLOCK = BigInt(process.env.RWAN_V5_DEPLOY_BLOCK || "0");
const CHUNK = 4_000n; // public RPCs cap getLogs ranges; stay conservative
const STATE_ID = "leaderboard";

if (!RPC || !STAKING) throw new Error("Set LEADERBOARD_RPC_URL and RWAN_V5_STAKING_ADDRESS");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const client = createPublicClient({ transport: http(RPC) });
const address = getAddress(STAKING);

const EVENTS = {
  created: parseAbiItem(
    "event PositionCreated(address indexed user, uint256 indexed positionId, uint256 amount, uint32 indexed planId, uint64 unlockTime)",
  ),
  withdrawn: parseAbiItem(
    "event Withdrawn(address indexed user, uint256 indexed positionId, uint256 amount)",
  ),
  withdrawnEarly: parseAbiItem(
    "event WithdrawnEarly(address indexed user, uint256 indexed positionId, uint256 amountAfterPenalty, uint256 penaltyAmount)",
  ),
  emergency: parseAbiItem(
    "event EmergencyWithdrawn(address indexed user, uint256 indexed positionId, uint256 amount)",
  ),
  reward: parseAbiItem(
    "event RewardClaimed(address indexed user, uint256 indexed positionId, uint256 amount)",
  ),
  rankReward: parseAbiItem("event RankRewardClaimed(address indexed user, uint256 amount)"),
  marketplace: parseAbiItem(
    "event MarketplaceCreditClaimed(address indexed user, uint256 indexed positionId, uint256 amount)",
  ),
  affiliate: parseAbiItem(
    "event AffiliateRewardPaid(address indexed referrer, address indexed user, uint256 indexed level, uint256 amount)",
  ),
};

const zeroDelta = () => ({ active: 0n, total: 0n, rewards: 0n, referral: 0n, positions: 0 });

async function main() {
  // 1) resolve sync window
  const head = await client.getBlockNumber();
  const { data: state } = await supabase
    .from("indexer_state")
    .select("last_block")
    .eq("id", STATE_ID)
    .maybeSingle();
  let from = state?.last_block ? BigInt(state.last_block) + 1n : DEPLOY_BLOCK;
  if (from > head) {
    console.log(`up to date (head ${head})`);
    return;
  }

  const statDeltas = new Map(); // wallet -> delta
  const posCache = new Map(); // id -> { owner, amount, active }
  const closes = []; // { id, key } to resolve
  const touchPositions = new Map(); // id -> { owner, amount, active } to upsert

  const delta = (w) => {
    const k = w.toLowerCase();
    if (!statDeltas.has(k)) statDeltas.set(k, zeroDelta());
    return statDeltas.get(k);
  };

  // 2) scan in chunks
  for (let start = from; start <= head; start += CHUNK) {
    const end = start + CHUNK - 1n > head ? head : start + CHUNK - 1n;
    const logs = await client.getLogs({
      address,
      events: Object.values(EVENTS),
      fromBlock: start,
      toBlock: end,
    });
    // stable order: block then logIndex
    logs.sort((a, b) =>
      a.blockNumber === b.blockNumber
        ? a.logIndex - b.logIndex
        : Number(a.blockNumber - b.blockNumber),
    );

    for (const log of logs) {
      const n = log.eventName;
      const a = log.args;
      if (n === "PositionCreated") {
        const id = a.positionId.toString();
        const owner = a.user.toLowerCase();
        posCache.set(id, { owner, amount: a.amount, active: true });
        touchPositions.set(id, { owner, amount: a.amount.toString(), active: true });
        const d = delta(owner);
        d.active += a.amount;
        d.total += a.amount;
        d.positions += 1;
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

  // 3) resolve closes (positions may live in DB from earlier runs)
  const missing = closes.filter((id) => !posCache.has(id));
  if (missing.length) {
    const { data } = await supabase
      .from("leaderboard_positions")
      .select("position_id, owner, amount, active")
      .in("position_id", missing);
    for (const row of data ?? []) {
      posCache.set(row.position_id, {
        owner: row.owner,
        amount: BigInt(row.amount),
        active: row.active,
      });
    }
  }
  for (const id of closes) {
    const p = posCache.get(id);
    if (!p || !p.active) continue; // unknown or already closed => skip (idempotent)
    p.active = false;
    touchPositions.set(id, { owner: p.owner, amount: p.amount.toString(), active: false });
    const d = delta(p.owner);
    d.active -= p.amount;
    d.positions -= 1;
  }

  // 4) persist positions
  if (touchPositions.size) {
    const rows = [...touchPositions.entries()].map(([position_id, v]) => ({
      position_id,
      owner: v.owner,
      amount: v.amount,
      active: v.active,
    }));
    await supabase.from("leaderboard_positions").upsert(rows);
  }

  // 5) apply stat deltas onto existing rows
  const wallets = [...statDeltas.keys()];
  if (wallets.length) {
    const { data: existing } = await supabase
      .from("leaderboard_stats")
      .select("*")
      .in("wallet", wallets);
    const cur = new Map((existing ?? []).map((r) => [r.wallet, r]));

    const rows = wallets.map((w) => {
      const base = cur.get(w) ?? {
        active_staked: 0,
        total_staked: 0,
        rewards_earned: 0,
        referral_earned: 0,
        positions: 0,
      };
      const d = statDeltas.get(w);
      const add = (x, y) => (BigInt(x) + y).toString();
      let active = BigInt(base.active_staked) + d.active;
      if (active < 0n) active = 0n; // guard against out-of-window closes
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
    await supabase.from("leaderboard_stats").upsert(rows);
  }

  // 6) advance cursor
  await supabase.from("indexer_state").upsert({ id: STATE_ID, last_block: Number(head) });
  console.log(
    `indexed ${from}..${head}: ${wallets.length} wallets, ${touchPositions.size} positions touched`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
