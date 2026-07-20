"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import {
  ArrowLeft,
  Check,
  Copy,
  Link2,
  LockKeyhole,
  Network,
  ShieldCheck,
  Star,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

import { RWAN_V5_ABI, RWAN_V5_STAKING_ADDRESS } from "@/lib/contracts/rwanV5Abi";
import { CountUp, Grain, Magnetic, Reveal, Spotlight } from "@/components/aurum-ui";
import { AurumFooter } from "@/components/aurum-footer";
import { ObNav } from "@/components/ob-nav";
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
  referral_earned: string;
}

// ── component ─────────────────────────────────────────────────────────────────

export function NetworkDashboard() {
  const { login: open } = usePrivy();
  const { address, isConnected } = useAccount();
  const [network, setNetwork] = useState<NetworkData | null>(null);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const staking = RWAN_V5_STAKING_ADDRESS;
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
      { address: staking, abi: RWAN_V5_ABI, functionName: "totalUserStaked", args: [address] },
      { address: staking, abi: RWAN_V5_ABI, functionName: "teamStake",       args: [address] },
      { address: staking, abi: RWAN_V5_ABI, functionName: "referrerOf",      args: [address] },
      { address: staking, abi: RWAN_V5_ABI, functionName: "milestonesCount" },
      { address: staking, abi: RWAN_V5_ABI, functionName: "pendingMilestones", args: [address] },
    ] : [],
    query: { enabled: !!staking && !!address, refetchInterval: 30_000 },
  });

  const personalStake    = chainReads.data?.[0]?.result as bigint | undefined;
  const teamStake        = chainReads.data?.[1]?.result as bigint | undefined;
  const uplineChain      = chainReads.data?.[2]?.result as string | undefined;
  const milestonesCount  = Number(chainReads.data?.[3]?.result ?? 0);
  const pendingIdsRaw    = chainReads.data?.[4]?.result as bigint[] | undefined;
  const pendingIds       = useMemo(() => pendingIdsRaw ?? [], [pendingIdsRaw]);

  // ── milestone config + claim status reads ─────────────────────────────────
  const milestoneReads = useReadContracts({
    contracts: staking && milestonesCount > 0
      ? Array.from({ length: milestonesCount }, (_, i) => [
          { address: staking!, abi: RWAN_V5_ABI, functionName: "milestones" as const, args: [BigInt(i + 1)] as const },
          ...(address
            ? [{ address: staking!, abi: RWAN_V5_ABI, functionName: "milestoneClaimed" as const, args: [address, BigInt(i + 1)] as const }]
            : []),
        ]).flat()
      : [],
    query: { enabled: !!staking && milestonesCount > 0, refetchInterval: 30_000 },
  });

  interface MilestoneInfo {
    id: number;
    minTeamStake: bigint;
    reward: bigint;
    enabled: boolean;
    claimed: boolean;
    claimable: boolean;
  }

  const milestones = useMemo<MilestoneInfo[]>(() => {
    if (!milestoneReads.data || milestonesCount === 0) return [];
    const stride = address ? 2 : 1;
    const result: MilestoneInfo[] = [];
    for (let i = 0; i < milestonesCount; i++) {
      const cfg = milestoneReads.data[i * stride]?.result as readonly [bigint, bigint, boolean] | undefined;
      const claimed = address ? (milestoneReads.data[i * stride + 1]?.result as boolean | undefined) ?? false : false;
      if (!cfg) continue;
      const id = i + 1;
      result.push({
        id,
        minTeamStake: cfg[0],
        reward: cfg[1],
        enabled: cfg[2],
        claimed,
        claimable: pendingIds.some((pid) => Number(pid) === id),
      });
    }
    return result;
  }, [milestoneReads.data, milestonesCount, address, pendingIds]);

  const claimedCount = milestones.filter((m) => m.claimed).length;
  const nextMilestone = milestones.find((m) => !m.claimed && m.enabled);

  const teamPct = nextMilestone && teamStake
    ? Math.min(100, Number((teamStake * 100n) / nextMilestone.minTeamStake))
    : 0;

  // ── claim milestone ───────────────────────────────────────────────────────
  const { writeContract: claimMilestone, data: claimTxHash, isPending: isClaiming } = useWriteContract();
  const { isLoading: isClaimConfirming, isSuccess: isClaimConfirmed } = useWaitForTransactionReceipt({ hash: claimTxHash });

  useEffect(() => {
    if (isClaimConfirmed) chainReads.refetch();
  }, [isClaimConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClaim = (milestoneId: number) => {
    if (!staking) return;
    claimMilestone({
      address: staking,
      abi: RWAN_V5_ABI,
      functionName: "claimMilestone",
      args: [BigInt(milestoneId)],
    });
  };

  const handleClaimAll = () => {
    if (!staking || pendingIds.length === 0) return;
    claimMilestone({
      address: staking,
      abi: RWAN_V5_ABI,
      functionName: "claimMultipleMilestones",
      args: [pendingIds],
    });
  };

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
      <ObNav currentPage="network" />

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
              <p>Downline depth, team stake, and milestone progress.</p>
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
                <div className="ob-card-head"><span className="ob-tag"><Zap className="h-3.5 w-3.5" /> Affiliate Earned</span></div>
                <div className="ob-card-metric">
                  {networkLoading
                    ? "…"
                    : network?.referral_earned
                      ? <CountUp value={Number(formatUnits(BigInt(network.referral_earned), 18))} suffix=" RWAAN" decimals={2} />
                      : "0.00 RWAAN"}
                </div>
                <span className="ob-card-note">2% commission paid to wallet on every claim</span>
              </Reveal>

              <Reveal className="ob-card" delay={0.21}>
                <div className="ob-card-head"><span className="ob-tag"><Network className="h-3.5 w-3.5" /> Total Members</span></div>
                <div className="ob-card-metric">
                  {networkLoading ? "…" : network ? String(network.total_members) : "0"}
                </div>
                <span className="ob-card-note">
                  {network
                    ? `${network.direct_members} direct referral${network.direct_members !== 1 ? "s" : ""}`
                    : ""}
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
                    Anyone who stakes through this link becomes your direct referral — you earn
                    2% of every reward they claim, paid instantly to your wallet in RWAAN.
                  </p>
                </Reveal>
              </div>

              {personalStake != null && personalStake > 0n ? (
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
              ) : (
                <Reveal className="ob-referral-card">
                  <div className="ob-referral-locked">
                    <LockKeyhole className="h-5 w-5" />
                    <p>You need an active staking position to unlock your referral link.</p>
                    <Link href="/#stake" className="ob-btn-gold" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px", fontSize: "13px" }}>
                      <Zap className="h-4 w-4" /> Stake now
                    </Link>
                  </div>
                </Reveal>
              )}
            </section>

            {/* ── Milestone card ── */}
            <section className="ob-section">
              <div className="ob-ghost-num" aria-hidden="true">02</div>
              <div className="ob-section-head">
                <Reveal><h2 className="ob-h2">Rank <em>milestones.</em></h2></Reveal>
                <Reveal delay={0.06}>
                  <p>One-time RWAAN rewards based on your direct referral team stake. Claim each milestone once when your team reaches the threshold.</p>
                </Reveal>
              </div>

              <Reveal className="ob-rank-card">
                <div className="ob-rank-head">
                  <div>
                    <span className="ob-tag"><Star className="h-3.5 w-3.5" /> Milestones claimed</span>
                    <div className="ob-rank-title">
                      {claimedCount} / {milestones.length}
                    </div>
                    {pendingIds.length > 0 && (
                      <div className="ob-rank-award">{pendingIds.length} reward{pendingIds.length > 1 ? "s" : ""} ready to claim</div>
                    )}
                  </div>
                  <div className="ob-rank-badge">
                    {claimedCount === 0 ? "\u{1F3C1}" : claimedCount >= milestones.length ? "\u{1F3C6}" : "⭐"}
                  </div>
                </div>

                {claimedCount === milestones.length && milestones.length > 0 && (
                  <div className="ob-rank-maxed">
                    All milestones claimed — congratulations!
                  </div>
                )}

                {nextMilestone && (
                  <div className="ob-rank-progress">
                    <div className="ob-rank-progress-label">
                      <span>Progress to Milestone {nextMilestone.id}</span>
                      <span className="ob-rank-pct">{teamPct.toFixed(1)}%</span>
                    </div>
                    <div className="ob-rank-bar-track">
                      <div className="ob-rank-bar-fill" style={{ width: `${teamPct}%` }} />
                    </div>
                    <div className="ob-rank-stats">
                      <div className="ob-rank-stat">
                        <span>Team Stake</span>
                        <strong>
                          {fmt(teamStake)} / {fmt(nextMilestone.minTeamStake)} RWAAN
                        </strong>
                      </div>
                      <div className="ob-rank-stat">
                        <span>Reward</span>
                        <strong>{fmt(nextMilestone.reward)} RWAAN</strong>
                      </div>
                    </div>
                  </div>
                )}

                {pendingIds.length > 1 && (
                  <div style={{ marginTop: "1rem" }}>
                    <Magnetic strength={0.2}>
                      <button
                        type="button"
                        className="ob-btn-gold"
                        disabled={isClaiming || isClaimConfirming}
                        onClick={handleClaimAll}
                      >
                        {isClaiming || isClaimConfirming ? "Claiming…" : `Claim all ${pendingIds.length} rewards`}
                      </button>
                    </Magnetic>
                  </div>
                )}
              </Reveal>

              {/* Milestone table */}
              <Reveal delay={0.1} className="ob-rank-table-wrap">
                <table className="ob-rank-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Team Stake Required</th>
                      <th>Reward</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones.map((m) => (
                      <tr key={m.id} className={m.claimed ? "ob-rank-row-done" : m.claimable ? "ob-rank-row-active" : ""}>
                        <td>{m.id}</td>
                        <td>{fmt(m.minTeamStake)} RWAAN</td>
                        <td>{fmt(m.reward)} RWAAN</td>
                        <td>
                          {m.claimed ? (
                            <span className="ob-rank-achieved">claimed</span>
                          ) : m.claimable ? (
                            <button
                              type="button"
                              className="ob-btn-gold"
                              style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
                              disabled={isClaiming || isClaimConfirming}
                              onClick={() => handleClaim(m.id)}
                            >
                              {isClaiming || isClaimConfirming ? "…" : "Claim"}
                            </button>
                          ) : (
                            <span className="ob-rank-locked">locked</span>
                          )}
                        </td>
                      </tr>
                    ))}
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
                <div className="ob-downline-row">
                  <span className="ob-tag">Direct referrals</span>
                  <span className="ob-downline-count">{network?.direct_members ?? 0} member{(network?.direct_members ?? 0) !== 1 ? "s" : ""}</span>
                  <span className="ob-downline-comm">2% affiliate</span>
                </div>
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
