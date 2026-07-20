/**
 * Leaderboard + network indexer (server-side).
 *
 * Scans RWANSecureStakingV5 events from the last-synced block and reconciles
 * per-position and per-wallet aggregates, referral_links, and network_stats
 * into Supabase. Idempotent via a block cursor in `indexer_state`.
 *
 * This mirrors scripts/index-leaderboard.mjs, which is kept as a manual
 * escape hatch (it auto-executes on import, so it can't be reused here).
 * Keep the two in sync when changing indexing behaviour.
 */
import { createPublicClient, http, parseAbiItem, parseEventLogs, getAddress } from "viem";
import { supabaseAdmin } from "@/lib/server/supabase";

const STATE_ID = "leaderboard";

/** Blocks pulled per getLogs call. Alchemy handles large ranges comfortably. */
const CHUNK = 10_000n;

/**
 * Hard ceiling on blocks processed in a single invocation, so a long gap
 * (or a first run from the deploy block) can't overrun the function timeout
 * mid-write. Remaining blocks are picked up by the next run.
 */
const MAX_BLOCKS_PER_RUN = 100_000n;

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
  referrerSet: parseAbiItem("event ReferrerSet(address indexed user, address indexed referrer)"),
};

interface Delta {
  active: bigint;
  total: bigint;
  rewards: bigint;
  referral: bigint;
  positions: number;
}

const zeroDelta = (): Delta => ({
  active: 0n,
  total: 0n,
  rewards: 0n,
  referral: 0n,
  positions: 0,
});

export interface IndexResult {
  ok: boolean;
  skipped?: string;
  fromBlock?: string;
  toBlock?: string;
  head?: string;
  wallets?: number;
  positions?: number;
  referrals?: number;
  caughtUp?: boolean;
}

export async function runLeaderboardIndex(): Promise<IndexResult> {
  // Alchemy endpoints support eth_getLogs with large block ranges.
  // The public BSC node does NOT — it rejects getLogs even for tiny ranges.
  // So we only use Alchemy endpoints for actual log scanning.
  // Only Alchemy endpoints support eth_getLogs with large block ranges.
  // LEADERBOARD_RPC_URL / public BSC nodes reject getLogs entirely — never
  // include them here even as a fallback.
  const logEndpoints = [
    process.env.BSC_ALCHEMY_RPC_URL,
    process.env.BSC_ALCHEMY_RPC_URL2,
    process.env.BSC_ALCHEMY_RPC_URL3,
  ].filter((u): u is string => Boolean(u));

  const staking =
    process.env.RWAN_V5_STAKING_ADDRESS || process.env.NEXT_PUBLIC_RWAN_V5_STAKING_ADDRESS;
  const deployBlock = BigInt(process.env.RWAN_V5_DEPLOY_BLOCK || "0");

  if (logEndpoints.length === 0) return { ok: false, skipped: "no Alchemy RPC url configured" };
  if (!staking) return { ok: false, skipped: "no staking address configured" };
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, skipped: "supabase env not configured" };
  }

  const { data: priorState } = await supabaseAdmin
    .from("indexer_state")
    .select("last_block")
    .eq("id", STATE_ID)
    .maybeSingle();
  const cursor = priorState?.last_block ? BigInt(priorState.last_block) : deployBlock;

  // Try each Alchemy endpoint. A capped key returns stale block numbers instead
  // of erroring, so reject any head that hasn't advanced past the cursor.
  let client: ReturnType<typeof createPublicClient> | null = null;
  for (const rpc of logEndpoints) {
    try {
      const c = createPublicClient({ transport: http(rpc, { retryCount: 0, timeout: 5_000 }) });
      const h = await c.getBlockNumber();
      if (h > cursor) {
        client = c;
        break;
      }
    } catch {
      // endpoint dead or capped — try next
    }
  }
  if (!client) return { ok: false, skipped: `no Alchemy endpoint returned a live head past cursor ${cursor}` };

  const address = getAddress(staking);

  // 1) resolve sync window (cursor was already fetched above for endpoint selection)
  const head = await client.getBlockNumber();
  const from = cursor + 1n;
  if (from > head) {
    return { ok: true, caughtUp: true, head: head.toString() };
  }

  // Cap the window so one invocation can't overrun the function timeout.
  const to = from + MAX_BLOCKS_PER_RUN - 1n > head ? head : from + MAX_BLOCKS_PER_RUN - 1n;

  const statDeltas = new Map<string, Delta>();
  const posCache = new Map<string, { owner: string; amount: bigint; active: boolean }>();
  const closes: string[] = [];
  const touchPositions = new Map<string, { owner: string; amount: string; active: boolean }>();
  const newReferrals = new Map<string, string>(); // referee -> referrer
  const userStakeAdded = new Map<string, bigint>();

  const delta = (w: string): Delta => {
    const k = w.toLowerCase();
    if (!statDeltas.has(k)) statDeltas.set(k, zeroDelta());
    return statDeltas.get(k)!;
  };

  const ABI = Object.values(EVENTS);

  // 2) scan in chunks — fetch by address only (no topic filter), then decode
  for (let start = from; start <= to; start += CHUNK) {
    const end = start + CHUNK - 1n > to ? to : start + CHUNK - 1n;
    const rawLogs = await client.getLogs({ address, fromBlock: start, toBlock: end });
    const logs = parseEventLogs({ abi: ABI, logs: rawLogs, strict: false }).filter(
      (l) => l.eventName,
    );
    logs.sort((a, b) =>
      a.blockNumber === b.blockNumber
        ? a.logIndex - b.logIndex
        : Number(a.blockNumber - b.blockNumber),
    );

    for (const log of logs) {
      const n = log.eventName;
      const a = log.args as Record<string, unknown>;
      if (n === "ReferrerSet") {
        newReferrals.set(
          (a.user as string).toLowerCase(),
          (a.referrer as string).toLowerCase(),
        );
      } else if (n === "PositionCreated") {
        const id = (a.positionId as bigint).toString();
        const owner = (a.user as string).toLowerCase();
        const amount = a.amount as bigint;
        posCache.set(id, { owner, amount, active: true });
        touchPositions.set(id, { owner, amount: amount.toString(), active: true });
        const d = delta(owner);
        d.active += amount;
        d.total += amount;
        d.positions += 1;
        userStakeAdded.set(owner, (userStakeAdded.get(owner) ?? 0n) + amount);
      } else if (n === "Withdrawn" || n === "WithdrawnEarly" || n === "EmergencyWithdrawn") {
        closes.push((a.positionId as bigint).toString());
      } else if (n === "RewardClaimed" || n === "MarketplaceCreditClaimed") {
        delta(a.user as string).rewards += a.amount as bigint;
      } else if (n === "RankRewardClaimed") {
        delta(a.user as string).rewards += a.amount as bigint;
      } else if (n === "AffiliateRewardPaid") {
        delta(a.referrer as string).referral += a.amount as bigint;
      }
    }
  }

  // 3) resolve closes (positions may live in the DB from earlier runs)
  const missing = closes.filter((id) => !posCache.has(id));
  if (missing.length) {
    const { data } = await supabaseAdmin
      .from("leaderboard_positions")
      .select("position_id, owner, amount::text, active")
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
    if (!p || !p.active) continue; // unknown or already closed => idempotent skip
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
    const { error } = await supabaseAdmin.from("leaderboard_positions").upsert(rows);
    if (error) throw new Error(`leaderboard_positions upsert: ${error.message}`);
  }

  // 5) apply stat deltas onto existing rows
  const wallets = [...statDeltas.keys()];
  if (wallets.length) {
    // ::text is required — these are wei values well beyond 2^53, and PostgREST
    // serialises `numeric` as a float64. Reading them as numbers and writing
    // them back rounds the value on every pass, permanently corrupting it.
    const { data: existing } = await supabaseAdmin
      .from("leaderboard_stats")
      .select(
        "wallet, active_staked::text, total_staked::text, rewards_earned::text, referral_earned::text, positions",
      )
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
      const d = statDeltas.get(w)!;
      const add = (x: string | number, y: bigint) => (BigInt(x) + y).toString();
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
    const { error } = await supabaseAdmin.from("leaderboard_stats").upsert(rows);
    if (error) throw new Error(`leaderboard_stats upsert: ${error.message}`);
  }

  // 6) persist referral_links
  if (newReferrals.size || userStakeAdded.size) {
    const refRows = [...newReferrals.entries()].map(([referee, referrer]) => ({
      referee,
      referrer,
      amount: (userStakeAdded.get(referee) ?? 0n).toString(),
      joined_at: new Date().toISOString(),
    }));
    if (refRows.length) {
      const { error } = await supabaseAdmin
        .from("referral_links")
        .upsert(refRows, { onConflict: "referee" });
      if (error) throw new Error(`referral_links upsert: ${error.message}`);
    }

    // existing referrals who staked again: increment their tracked amount
    const existingStakers = [...userStakeAdded.entries()].filter(
      ([user]) => !newReferrals.has(user),
    );
    for (const [user, addAmount] of existingStakers) {
      const { data: row } = await supabaseAdmin
        .from("referral_links")
        .select("amount::text")
        .eq("referee", user)
        .maybeSingle();
      if (row) {
        await supabaseAdmin
          .from("referral_links")
          .update({ amount: (BigInt(row.amount) + addAmount).toString() })
          .eq("referee", user);
      }
    }
  }

  // 7) refresh network_stats for every referrer touched this scan
  const affectedReferrers = new Set<string>([...newReferrals.values()]);
  if (userStakeAdded.size) {
    const stakingUsers = [...userStakeAdded.keys()].filter((u) => !newReferrals.has(u));
    if (stakingUsers.length) {
      const { data: refs } = await supabaseAdmin
        .from("referral_links")
        .select("referee, referrer")
        .in("referee", stakingUsers);
      for (const r of refs ?? []) affectedReferrers.add(r.referrer);
    }
  }

  for (const referrer of affectedReferrers) {
    const { data: members } = await supabaseAdmin
      .from("referral_links")
      .select("referee, amount::text")
      .eq("referrer", referrer);
    const directCount = members?.length ?? 0;
    const directAddrs = (members ?? []).map((m) => m.referee);

    let totalMembers = directCount;
    let teamVolume = (members ?? []).reduce((s, m) => s + BigInt(m.amount ?? 0), 0n);

    if (directAddrs.length) {
      const { data: l2 } = await supabaseAdmin
        .from("referral_links")
        .select("referee, amount::text")
        .in("referrer", directAddrs);
      totalMembers += l2?.length ?? 0;
      teamVolume += (l2 ?? []).reduce((s, m) => s + BigInt(m.amount ?? 0), 0n);

      const l2Addrs = (l2 ?? []).map((m) => m.referee);
      if (l2Addrs.length) {
        const { data: l3 } = await supabaseAdmin
          .from("referral_links")
          .select("referee, amount::text")
          .in("referrer", l2Addrs);
        totalMembers += l3?.length ?? 0;
        teamVolume += (l3 ?? []).reduce((s, m) => s + BigInt(m.amount ?? 0), 0n);
      }
    }

    await supabaseAdmin.from("network_stats").upsert({
      wallet: referrer,
      direct_members: directCount,
      total_members: totalMembers,
      team_volume: teamVolume.toString(),
      updated_at: new Date().toISOString(),
    });
  }

  // 8) advance cursor to the range actually processed (not head — the window
  //    may have been capped, and skipping the remainder would lose events).
  const { error: cursorError } = await supabaseAdmin
    .from("indexer_state")
    .upsert({ id: STATE_ID, last_block: Number(to) });
  if (cursorError) throw new Error(`indexer_state upsert: ${cursorError.message}`);

  return {
    ok: true,
    fromBlock: from.toString(),
    toBlock: to.toString(),
    head: head.toString(),
    wallets: wallets.length,
    positions: touchPositions.size,
    referrals: newReferrals.size,
    caughtUp: to === head,
  };
}
