"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { formatUnits, zeroAddress } from "viem";
import {
  ArrowLeft,
  Check,
  Copy,
  Link2,
  Network,
  ShieldCheck,
  Star,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

import { RWAN_V4_ABI, RWAN_V4_STAKING_ADDRESS } from "@/lib/contracts/rwanV4Abi";
import { CountUp, Grain, Magnetic, Reveal, Spotlight } from "@/components/aurum-ui";
import { AurumFooter } from "@/components/aurum-footer";
import { WalletButton } from "@/components/wallet-button";
import { buildReferralLink } from "@/lib/utils/referral";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(wei: bigint | undefined, decimals = 2): string {
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
  1: "Rank 1",  2: "Rank 2",  3: "Rank 3",  4: "Rank 4",
  5: "Rank 5",  6: "Rank 6",  7: "Rank 7",  8: "Rank 8",
  9: "Rank 9",  10: "Rank 10", 11: "Tricycle", 12: "Jeep",
};

const RANK_AWARDS: Record<number, string> = {
  1: "$100",  2: "$150",  3: "$200",  4: "$300",  5: "$350",
  6: "$400",  7: "$500",  8: "$700",  9: "$1,500",
  10: "$2,500", 11: "$4,000", 12: "$8,000",
};

// ── types ─────────────────────────────────────────────────────────────────────

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

// ── component ─────────────────────────────────────────────────────────────────

export function NetworkDashboard() {
  const { login: open } = usePrivy();
  const { address, isConnected } = useAccount();
  const [network, setNetwork] = useState<NetworkData | null>(null);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const staking = RWAN_V4_STAKING_ADDRESS;
  const referralLink = address ? buildReferralLink(address) : "";

  // ── clipboard copy with textarea fallback ──────────────────────────────────
  const handleCopyLink = () => {
    if (!referralLink) return;
    const tryClipboard = () => {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        return navigator.clipboard.writeText(referralLink);
      }
      return Promise.reject(new Error("no clipboard api"));
    };
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = referralLink;
      ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    };
    tryClipboard()
      .catch(fallback)
      .finally(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  };

  // ── on-chain reads ─────────────────────────────────────────────────────────
  const chainReads = useReadContracts({
    contracts: staking && address ? [
      { address: staking, abi: RWAN_V4_ABI, functionName: "totalUserStaked", args: [address] },
      { address: staking, abi: RWAN_V4_ABI, functionName: "teamStake",       args: [address] },
      { address: staking, abi: RWAN_V4_ABI, functionName: "referrerOf",      args: [address] },
      { address: staking, abi: RWAN_V4_ABI, functionName: "userRanks",       args: [address] },
    ] : [],
    query: { enabled: !!staking && !!address, refetchInterval: 30_000 },
  });

  // ── rank config reads — dynamic, straight from the contract ───────────────
  const rankConfigsLengthRead = useReadContract({
    address: staking ?? zeroAddress,
    abi: RWAN_V4_ABI,
    functionName: "rankConfigsLength",
    query: { enabled: !!staking },
  });
  const rankCount = Number(rankConfigsLengthRead.data ?? 0);

  const rankConfigsRead = useReadContracts({
    contracts: Array.from({ length: rankCount }, (_, i) => ({
      address: staking!,
      abi: RWAN_V4_ABI,
      functionName: "rankConfigs" as const,
      args: [BigInt(i + 1)] as const,
    })),
    query: { enabled: !!staking && rankCount > 0 },
  });

  // Build map: rankId (1-indexed) → minTeamStake (bigint)
  const rankTeamReq = useMemo<Map<number, bigint>>(() => {
    const m = new Map<number, bigint>();
    rankConfigsRead.data?.forEach((r, i) => {
      const res = r.result as readonly [bigint, bigint, number, boolean] | undefined;
      if (res && res[3]) m.set(i + 1, res[1]); // minTeamStake
    });
    return m;
  }, [rankConfigsRead.data]);

  const personalStake = chainReads.data?.[0]?.result as bigint | undefined;
  const teamStake     = chainReads.data?.[1]?.result as bigint | undefined;
  const uplineChain   = chainReads.data?.[2]?.result as string | undefined;
  const rankData      = chainReads.data?.[3]?.result as readonly [number, bigint, bigint] | undefined;

  const currentRank = rankData ? Number(rankData[0]) : 0;
  const nextRank    = currentRank < 12 ? currentRank + 1 : null;
  const nextTeamReq = nextRank
    ? (rankTeamReq.get(nextRank) ?? null)
    : null;

  const teamPct = nextTeamReq && teamStake
    ? Math.min(100, Number((teamStake * 100n) / nextTeamReq))
    : 0;

  // ── Supabase network fetch ─────────────────────────────────────────────────
  const addr = address?.toLowerCase();
  useEffect(() => {
    if (!addr) return;
    setNetworkLoading(true);
    fetch(`/api/network?wallet=${addr}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setNetwork(d); })
      .finally(() => setNetworkLoading(false));
  }, [addr]);

  const uplineDisplay =
    uplineChain && uplineChain !== "0x0000000000000000000000000000000000000000"
      ? short(uplineChain)
      : network?.upline
        ? short(network.upline)
        : null;

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ob-shell">
      <Grain />
      <Spotlight />
      <div className="ob-atmo" aria-hidden="true" />

      {/* ── Nav ── */}
      <div className="ob-topline">
        <span className="ob-top-item">
          <span className="ob-live" /> V4 live · BNB Chain
        </span>
      </div>
      <header className="ob-nav">
        <Link href="/" className="ob-brand">
          <img src="/logo-rwaan.png" alt="Rawli Analytics" className="ob-brand-mark" width={34} height={34} />
          <span className="ob-brand-name">Rawli Analytics</span>
        </Link>
        <nav className="ob-nav-links" aria-label="Primary">
          <Link href="/#stake">Plans</Link>
          <Link href="/#position">Stake</Link>
          <Link href="/#my-positions">Positions</Link>
          <Link href="/network" aria-current="page">Network</Link>
          <Link href="/#perks">Perks</Link>
          <Link href="/#footer">Legal</Link>
        </nav>
        <Magnetic strength={0.25}>
          <WalletButton />
        </Magnetic>
      </header>

      <main>
        {/* ── Page header ── */}
        <section className="ob-section" style={{ paddingTop: "3rem" }}>
          <div className="ob-section-head">
            <Reveal>
              <Link href="/" className="ob-back-link">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to staking
              </Link>
            </Reveal>
            <Reveal delay={0.04}>
              <h1 className="ob-h2">Your <em>network.</em></h1>
            </Reveal>
            <Reveal delay={0.08}>
              <p>Downline depth, team stake, and rank progress — all live from the V4 contract.</p>
            </Reveal>
          </div>
        </section>

        {!isConnected ? (
          /* ── Not connected state ── */
          <Reveal className="ob-pos-empty ob-pos-empty-net">
            <Network className="h-5 w-5" />
            <p>Connect your wallet to view your network stats, referral link, and rank progress.</p>
            <Magnetic strength={0.25}>
              <button type="button" className="ob-btn-gold" onClick={() => open()}>
                <Wallet className="h-4 w-4" /> Connect wallet
              </button>
            </Magnetic>
          </Reveal>
        ) : (
          <>
            {/* ── Stats bento ── */}
            <section className="ob-bento" aria-label="Network metrics">
              <Reveal className="ob-card">
                <div className="ob-card-head"><span className="ob-tag"><Wallet className="h-3.5 w-3.5" /> My Stake</span></div>
                <div className="ob-card-metric">
                  {personalStake != null
                    ? <CountUp value={Number(formatUnits(personalStake, 18))} suffix=" RWAAN" decimals={0} />
                    : "— RWAAN"}
                </div>
                <span className="ob-card-note">Your own active principal</span>
              </Reveal>

              <Reveal className="ob-card" delay={0.07}>
                <div className="ob-card-head"><span className="ob-tag"><Users className="h-3.5 w-3.5" /> Team Stake</span></div>
                <div className="ob-card-metric">
                  {teamStake != null
                    ? <CountUp value={Number(formatUnits(teamStake, 18))} suffix=" RWAAN" decimals={0} />
                    : "— RWAAN"}
                </div>
                <span className="ob-card-note">Cumulative downline principal</span>
              </Reveal>

              <Reveal className="ob-card" delay={0.14}>
                <div className="ob-card-head"><span className="ob-tag"><Zap className="h-3.5 w-3.5" /> Affiliate Rewards</span></div>
                <div className="ob-card-metric">Paid to wallet</div>
                <span className="ob-card-note">Commissions sent on every stake</span>
              </Reveal>

              <Reveal className="ob-card" delay={0.21}>
                <div className="ob-card-head"><span className="ob-tag"><Network className="h-3.5 w-3.5" /> Total Members</span></div>
                <div className="ob-card-metric">
                  {networkLoading ? "…" : network ? String(network.total_members) : "0"}
                </div>
                <span className="ob-card-note">
                  {network
                    ? `L1: ${network.direct_members} · L2: ${network.l2_members} · L3: ${network.l3_members}`
                    : "L1 · L2 · L3 counted"}
                </span>
              </Reveal>
            </section>

            {/* ── Referral link ── */}
            <section className="ob-section">
              <div className="ob-ghost-num" aria-hidden="true">01</div>
              <div className="ob-section-head">
                <Reveal><h2 className="ob-h2">Your referral <em>link.</em></h2></Reveal>
                <Reveal delay={0.06}>
                  <p>
                    Anyone who stakes through this link joins your L1 downline — you earn 20% affiliate
                    commission on their stake, 15% on L2, and 14% on L3.
                  </p>
                </Reveal>
              </div>

              <Reveal className="ob-referral-card">
                <div className="ob-referral-row">
                  <Link2 className="ob-referral-icon" />
                  <input
                    readOnly
                    value={referralLink}
                    onFocus={(e) => e.currentTarget.select()}
                    className="ob-referral-input"
                    aria-label="Your referral link"
                  />
                  <Magnetic strength={0.2}>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className={`ob-btn-gold ob-copy-btn ${copied ? "ob-copy-btn-done" : ""}`}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </Magnetic>
                </div>
                {uplineDisplay && (
                  <p className="ob-referral-upline">
                    Your referrer: <code>{uplineDisplay}</code>
                  </p>
                )}
              </Reveal>
            </section>

            {/* ── Rank card ── */}
            <section className="ob-section">
              <div className="ob-ghost-num" aria-hidden="true">02</div>
              <div className="ob-section-head">
                <Reveal><h2 className="ob-h2">Rank &amp; <em>progress.</em></h2></Reveal>
                <Reveal delay={0.06}>
                  <p>Rank is calculated from team stake on-chain. Each tier unlocks a daily reward from the rank pool.</p>
                </Reveal>
              </div>

              <Reveal className="ob-rank-card">
                <div className="ob-rank-head">
                  <div>
                    <span className="ob-tag"><Star className="h-3.5 w-3.5" /> Current rank</span>
                    <div className="ob-rank-title">
                      {currentRank === 0 ? "Unranked" : RANK_LABELS[currentRank]}
                    </div>
                    {currentRank > 0 && (
                      <div className="ob-rank-award">{RANK_AWARDS[currentRank]} / day</div>
                    )}
                  </div>
                  <div className="ob-rank-badge">
                    {currentRank === 0 ? "🏁" : currentRank >= 11 ? "🏆" : "⭐"}
                  </div>
                </div>

                {currentRank === 12 && (
                  <div className="ob-rank-maxed">
                    Maximum rank achieved — Jeep level unlocked.
                  </div>
                )}

                {nextRank && (
                  <div className="ob-rank-progress">
                    <div className="ob-rank-progress-label">
                      <span>Progress to {RANK_LABELS[nextRank]}</span>
                      <span className="ob-rank-pct">{teamPct.toFixed(1)}%</span>
                    </div>
                    <div className="ob-rank-bar-track">
                      <div className="ob-rank-bar-fill" style={{ width: `${teamPct}%` }} />
                    </div>
                    <div className="ob-rank-stats">
                      <div className="ob-rank-stat">
                        <span>Team Stake</span>
                        <strong>
                          {fmt(teamStake)} / {nextTeamReq != null ? fmt(nextTeamReq) : "—"} RWAAN
                        </strong>
                      </div>
                      <div className="ob-rank-stat">
                        <span>Award at next rank</span>
                        <strong>{RANK_AWARDS[nextRank]}/day</strong>
                      </div>
                    </div>
                  </div>
                )}
              </Reveal>

              {/* Rank table */}
              <Reveal delay={0.1} className="ob-rank-table-wrap">
                <table className="ob-rank-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Team Stake Required</th>
                      <th>Daily Award</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 12 }, (_, i) => {
                      const rid = i + 1;
                      const req = rankTeamReq.get(rid);
                      const isActive = rid === currentRank;
                      const isDone = rid < currentRank;
                      return (
                        <tr key={rid} className={isActive ? "ob-rank-row-active" : isDone ? "ob-rank-row-done" : ""}>
                          <td>{RANK_LABELS[rid] ?? `Rank ${rid}`}</td>
                          <td>{req != null ? `${fmt(req)} RWAAN` : "—"}</td>
                          <td>{RANK_AWARDS[rid]}</td>
                          <td>
                            {isActive ? <span className="ob-live-pill"><span className="ob-live" /> active</span>
                              : isDone ? <span className="ob-rank-achieved">achieved</span>
                              : <span className="ob-rank-locked">locked</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Reveal>
            </section>

            {/* ── Downline ── */}
            <section className="ob-section">
              <div className="ob-ghost-num" aria-hidden="true">03</div>
              <div className="ob-section-head">
                <Reveal><h2 className="ob-h2">Your <em>downline.</em></h2></Reveal>
                <Reveal delay={0.06}><p>Direct referrals and their sub-networks, indexed from on-chain Staked events.</p></Reveal>
              </div>

              {/* Leg split */}
              {network && (network.big_leg || network.direct_members > 0) && (
                <Reveal className="ob-leg-grid">
                  <div className="ob-card">
                    <div className="ob-card-head"><span className="ob-tag">Big leg</span></div>
                    {network.big_leg ? (
                      <>
                        <div className="ob-card-metric" style={{ fontSize: "1.1rem" }}>
                          {short(network.big_leg.wallet)}
                        </div>
                        <span className="ob-card-note">
                          {fmt(BigInt(network.big_leg.volume))} RWAAN · {network.big_leg.sub_members} sub-members
                        </span>
                      </>
                    ) : (
                      <span className="ob-card-note">No referrals yet</span>
                    )}
                  </div>
                  <div className="ob-card">
                    <div className="ob-card-head"><span className="ob-tag">Other legs</span></div>
                    <div className="ob-card-metric" style={{ fontSize: "1.1rem" }}>
                      {fmt(BigInt(network.small_leg_volume ?? "0"))} RWAAN
                    </div>
                    <span className="ob-card-note">
                      {network.small_leg_count} direct member{network.small_leg_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </Reveal>
              )}

              {/* Level breakdown */}
              <Reveal delay={0.08} className="ob-downline-levels">
                {[
                  { level: "L1 — Direct", count: network?.direct_members ?? 0, commission: "20%" },
                  { level: "L2", count: network?.l2_members ?? 0, commission: "15%" },
                  { level: "L3", count: network?.l3_members ?? 0, commission: "14%" },
                ].map((row) => (
                  <div key={row.level} className="ob-downline-row">
                    <span className="ob-tag">{row.level}</span>
                    <span className="ob-downline-count">{row.count} member{row.count !== 1 ? "s" : ""}</span>
                    <span className="ob-downline-comm">{row.commission} affiliate</span>
                  </div>
                ))}
              </Reveal>

              {/* L1 member list */}
              {network && network.l1.length > 0 && (
                <Reveal delay={0.12} className="ob-l1-list">
                  <div className="ob-l1-head">
                    <span className="ob-tag"><ShieldCheck className="h-3.5 w-3.5" /> Direct referrals</span>
                  </div>
                  {network.l1.map((m, i) => (
                    <div key={m.referee} className="ob-l1-row">
                      <span className="ob-l1-idx">{String(i + 1).padStart(2, "0")}</span>
                      <div className="ob-l1-info">
                        <span className="ob-l1-addr">{short(m.referee)}</span>
                        <span className="ob-card-note">{m.sub_members} sub-members</span>
                      </div>
                      <div className="ob-l1-right">
                        <span className="ob-l1-amount">{fmt(BigInt(m.amount))} RWAAN</span>
                        <span className="ob-card-note">{new Date(m.joined_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </Reveal>
              )}

              {/* Empty state */}
              {!networkLoading && network && network.total_members === 0 && (
                <Reveal className="ob-pos-empty">
                  <Network className="h-5 w-5" />
                  <p>No downline yet. Share your referral link above to start earning affiliate commissions.</p>
                </Reveal>
              )}

              {networkLoading && (
                <div className="ob-pos-empty">
                  <p style={{ opacity: 0.5 }}>Loading network…</p>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <AurumFooter />
    </div>
  );
}
