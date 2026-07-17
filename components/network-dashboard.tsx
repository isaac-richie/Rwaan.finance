"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { RWAN_V4_ABI, RWAN_V4_STAKING_ADDRESS } from "@/lib/contracts/rwanV4Abi";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(wei: bigint | undefined, decimals = 0): string {
  if (wei === undefined) return "—";
  const n = parseFloat(formatUnits(wei, 18));
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(decimals);
}

function short(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const RANK_LABELS: Record<number, string> = {
  1: "Rank 1", 2: "Rank 2", 3: "Rank 3", 4: "Rank 4",
  5: "Rank 5", 6: "Rank 6", 7: "Rank 7", 8: "Rank 8",
  9: "Rank 9", 10: "Rank 10", 11: "Rank 11 — Tricycle", 12: "Rank 12 — Jeep",
};

const RANK_AWARDS: Record<number, string> = {
  1: "$100", 2: "$150", 3: "$200", 4: "$300", 5: "$350",
  6: "$400", 7: "$500", 8: "$700", 9: "$1,500",
  10: "$2,500", 11: "$4,000", 12: "$8,000",
};

const RANK_TEAM_REQ: Record<number, bigint> = {
  1:  100_000_000n * 10n ** 18n,
  2:  150_000_000n * 10n ** 18n,
  3:  200_000_000n * 10n ** 18n,
  4:  250_000_000n * 10n ** 18n,
  5:  300_000_000n * 10n ** 18n,
  6:  400_000_000n * 10n ** 18n,
  7:  500_000_000n * 10n ** 18n,
  8:  700_000_000n * 10n ** 18n,
  9:  900_000_000n * 10n ** 18n,
  10: 1_000_000_000n * 10n ** 18n,
  11: 2_000_000_000n * 10n ** 18n,
  12: 3_000_000_000n * 10n ** 18n,
};

const RANK_MEMBER_REQ: Record<number, number> = {
  1: 15, 2: 50, 3: 80, 4: 120, 5: 130,
  6: 150, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0,
};

// ── types ────────────────────────────────────────────────────────────────────

interface L1Member {
  referee: string;
  amount: string;
  joined_at: string;
  sub_members: number;
  sub_volume: string;
}

interface NetworkData {
  upline: string | null;
  direct_members: number;
  l2_members: number;
  l3_members: number;
  total_members: number;
  l1: L1Member[];
  big_leg: { wallet: string; volume: string; sub_members: number } | null;
  small_leg_volume: string;
  small_leg_count: number;
}

// ── component ────────────────────────────────────────────────────────────────

export function NetworkDashboard() {
  const { address, isConnected } = useAccount();
  const [network, setNetwork] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(false);

  const addr = address?.toLowerCase();
  const staking = RWAN_V4_STAKING_ADDRESS;

  // on-chain reads
  const { data } = useReadContracts({
    contracts: staking && address ? [
      { address: staking, abi: RWAN_V4_ABI, functionName: "totalUserStaked", args: [address] },
      { address: staking, abi: RWAN_V4_ABI, functionName: "teamStake",       args: [address] },
      { address: staking, abi: RWAN_V4_ABI, functionName: "referrerOf",      args: [address] },
      { address: staking, abi: RWAN_V4_ABI, functionName: "userRanks",       args: [address] },
      { address: staking, abi: RWAN_V4_ABI, functionName: "affiliateEarned", args: [address] },
    ] : [],
    query: { enabled: !!staking && !!address },
  });

  const personalStake = data?.[0]?.result as bigint | undefined;
  const teamStake     = data?.[1]?.result as bigint | undefined;
  const uplineChain   = data?.[2]?.result as string | undefined;
  const rankData      = data?.[3]?.result as readonly [number, bigint, bigint] | undefined;
  const affEarned     = data?.[4]?.result as bigint | undefined;

  const currentRank   = rankData ? Number(rankData[0]) : 0;
  const nextRank      = currentRank < 12 ? currentRank + 1 : null;
  const nextTeamReq   = nextRank ? RANK_TEAM_REQ[nextRank] : null;
  const teamPct       = nextTeamReq && teamStake
    ? Math.min(100, Number((teamStake * 100n) / nextTeamReq))
    : 0;

  // API fetch
  useEffect(() => {
    if (!addr) return;
    setLoading(true);
    fetch(`/api/network?wallet=${addr}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setNetwork(d); })
      .finally(() => setLoading(false));
  }, [addr]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <span className="text-4xl">🔗</span>
        <p className="text-sm text-muted-foreground">Connect your wallet to see your network</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Network</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your downline, team stake, and rank progress
        </p>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "My Stake",      value: fmt(personalStake, 2) + " RWAAN" },
          { label: "Team Stake",    value: fmt(teamStake, 2) + " RWAAN" },
          { label: "Referral Earned", value: fmt(affEarned, 2) + " RWAAN" },
          { label: "Total Members", value: network ? String(network.total_members) : "—" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-lg font-bold font-mono">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Rank card ── */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Current Rank</p>
            <p className="text-xl font-bold">
              {currentRank === 0 ? "Unranked" : RANK_LABELS[currentRank]}
            </p>
            {currentRank > 0 && (
              <p className="text-sm text-emerald-500 font-semibold">{RANK_AWARDS[currentRank]}/day</p>
            )}
          </div>
          <div className="text-5xl">
            {currentRank === 0 ? "🏁" : currentRank >= 11 ? "🪼" : "⭐"}
          </div>
        </div>

        {/* Progress to next rank */}
        {nextRank && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress to {RANK_LABELS[nextRank]} ({RANK_AWARDS[nextRank]})</span>
              <span>{teamPct.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${teamPct}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-muted-foreground mb-1">Team Stake</p>
                <p className="font-mono font-semibold">{fmt(teamStake)} / {fmt(nextTeamReq ?? 0n)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-muted-foreground mb-1">Members Needed</p>
                <p className="font-mono font-semibold">
                  {network?.total_members ?? 0} / {RANK_MEMBER_REQ[nextRank] || "—"}
                </p>
              </div>
            </div>
          </div>
        )}

        {currentRank === 12 && (
          <p className="text-sm text-yellow-500 font-semibold">🏆 Maximum rank achieved — Jeep level!</p>
        )}
      </div>

      {/* ── Upline ── */}
      {(uplineChain || network?.upline) && (
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <span className="text-xl">⬆️</span>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Your Referrer</p>
            <p className="font-mono text-sm font-semibold">
              {uplineChain && uplineChain !== "0x0000000000000000000000000000000000000000"
                ? short(uplineChain)
                : network?.upline ? short(network.upline) : "—"}
            </p>
          </div>
        </div>
      )}

      {/* ── Leg summary ── */}
      {network && (network.big_leg || network.direct_members > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Big Leg 💪</p>
            {network.big_leg ? (
              <>
                <p className="font-mono text-sm font-bold">{short(network.big_leg.wallet)}</p>
                <p className="text-xs text-muted-foreground">
                  {fmt(BigInt(network.big_leg.volume))} RWAAN staked
                </p>
                <p className="text-xs text-muted-foreground">
                  {network.big_leg.sub_members} sub-members
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No referrals yet</p>
            )}
          </div>
          <div className="rounded-xl border bg-card p-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Other Legs 🌿</p>
            <p className="font-mono text-sm font-bold">
              {fmt(BigInt(network.small_leg_volume ?? "0"))} RWAAN
            </p>
            <p className="text-xs text-muted-foreground">
              {network.small_leg_count} direct member{network.small_leg_count !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      {/* ── Level breakdown ── */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <h3 className="font-semibold text-sm">Downline by Level</h3>
        {[
          { level: "L1 — Direct", count: network?.direct_members ?? 0, commission: "20%" },
          { level: "L2", count: network?.l2_members ?? 0, commission: "15%" },
          { level: "L3", count: network?.l3_members ?? 0, commission: "14%" },
        ].map((row) => (
          <div key={row.level} className="flex items-center justify-between py-2 border-b last:border-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{row.level}</span>
              <span className="text-sm text-muted-foreground">{row.count} member{row.count !== 1 ? "s" : ""}</span>
            </div>
            <span className="text-xs font-semibold text-emerald-500">{row.commission} affiliate</span>
          </div>
        ))}
        {(network?.total_members ?? 0) > (network?.direct_members ?? 0) + (network?.l2_members ?? 0) + (network?.l3_members ?? 0) && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            + deeper levels tracked on-chain via teamStake
          </p>
        )}
      </div>

      {/* ── L1 member list ── */}
      {network && network.l1.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">Direct Referrals (L1)</h3>
          </div>
          <div className="divide-y">
            {network.l1.map((m, i) => (
              <div key={m.referee} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                  <div>
                    <p className="font-mono text-sm font-semibold">{short(m.referee)}</p>
                    <p className="text-xs text-muted-foreground">{m.sub_members} sub-members</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-semibold">{fmt(BigInt(m.amount))} RWAAN</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(m.joined_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && network && network.total_members === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-xl border border-dashed">
          <span className="text-4xl">🌱</span>
          <p className="font-semibold">No downline yet</p>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Share your referral link to start building your network and earn affiliate commissions.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Loading network data…
        </div>
      )}
    </div>
  );
}
