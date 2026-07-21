"use client";

/**
 * OBSIDIAN — RWAAN private terminal.
 * A ground-up presentation rebuild (ob-* namespace) on top of the same
 * V5 contract logic. Design pillars: kinetic editorial type, one hero
 * widget (animated yield dial), bento stat widgets, disciplined spacing.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useReadContract, useReadContracts, useSwitchChain, useWriteContract } from "wagmi";
import { bsc } from "wagmi/chains";
import { formatUnits, parseUnits, zeroAddress } from "viem";
import { motion, useScroll, useSpring } from "framer-motion";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Gift,
  Layers3,
  LockKeyhole,
  Network,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { ERC20_WRITE_ABI } from "@/lib/contracts/erc20WriteAbi";
import { RWAN_V5_ABI, RWAN_V5_STAKING_ADDRESS } from "@/lib/contracts/rwanV5Abi";
import { CountUp, Grain, Magnetic, Marquee, Reveal, Spotlight, Tilt } from "@/components/aurum-ui";
import { AurumFooter } from "@/components/aurum-footer";
import { ObNav } from "@/components/ob-nav";
import { MyPositions } from "@/components/staking/my-positions";
import { captureReferrerFromUrl, getStoredReferrer } from "@/lib/utils/referral";

const EASE = [0.16, 1, 0.3, 1] as const;

type Plan = {
  id: string;
  days: number;
  label: string;
  rate: number;
  tone: "quiet" | "signal" | "market";
  note: string;
};

const fallbackPlans: Plan[] = [
  { id: "flex", days: 0, label: "Flex", rate: 0.03, tone: "quiet", note: "No lock" },
  { id: "30", days: 30, label: "Sprint", rate: 0.07, tone: "quiet", note: "30 day lock" },
  { id: "90", days: 90, label: "Quarter", rate: 0.12, tone: "quiet", note: "90 day lock" },
  { id: "120", days: 120, label: "Term", rate: 0.14, tone: "quiet", note: "120 day lock" },
  { id: "180", days: 180, label: "Season", rate: 0.18, tone: "signal", note: "180 day lock" },
  { id: "360", days: 360, label: "Year", rate: 0.23, tone: "signal", note: "360 day lock" },
  { id: "720", days: 720, label: "Marketplace", rate: 0.28, tone: "market", note: "VIP access tier" },
];

const fmt = (value: number, digits = 2) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);

/* ------------------------------------------------------------------ */
/* Scroll progress — hairline gold bar pinned under the nav            */
/* ------------------------------------------------------------------ */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 });
  return <motion.div className="ob-progress" style={{ scaleX }} aria-hidden="true" />;
}

/* ------------------------------------------------------------------ */
/* YieldDial — the hero widget. Animated SVG gauge: rotating tick      */
/* ring, gradient sweep arc, glowing center metric.                    */
/* ------------------------------------------------------------------ */
function YieldDial({ rate, days }: { rate: number; days: number }) {
  const R = 132;
  const C = 2 * Math.PI * R;
  const sweep = 0.72; // portion of the circle the gauge occupies
  const progress = Math.min(rate / 0.3, 1); // scale vs 0.30%/day gauge max

  // toFixed keeps server/client SVG output identical (avoids hydration
  // mismatches from float precision drift).
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const a = (i / 72) * Math.PI * 2;
    const long = i % 6 === 0;
    const r1 = 158;
    const r2 = long ? 148 : 153;
    return {
      x1: (170 + r1 * Math.cos(a)).toFixed(2), y1: (170 + r1 * Math.sin(a)).toFixed(2),
      x2: (170 + r2 * Math.cos(a)).toFixed(2), y2: (170 + r2 * Math.sin(a)).toFixed(2),
      o: long ? 0.5 : 0.22,
    };
  });

  return (
    <div className="ob-dial-wrap">
      <svg viewBox="0 0 340 340" className="ob-dial" role="img" aria-label={`Daily target ${rate}%`}>
        <defs>
          <linearGradient id="ob-arc" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffe9a8" />
            <stop offset="55%" stopColor="#f0b90b" />
            <stop offset="100%" stopColor="#c98a05" />
          </linearGradient>
          <filter id="ob-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* rotating tick ring */}
        <g className="ob-dial-ticks">
          {ticks.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke="#f5f2ea" strokeOpacity={t.o} strokeWidth="1.5" />
          ))}
        </g>

        {/* track */}
        <circle cx="170" cy="170" r={R} fill="none"
          stroke="rgba(245,242,234,0.09)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${(C * sweep).toFixed(2)} ${C.toFixed(2)}`}
          transform="rotate(140 170 170)" />

        {/* gradient sweep */}
        <circle cx="170" cy="170" r={R} fill="none" filter="url(#ob-glow)"
          stroke="url(#ob-arc)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${(C * sweep * progress).toFixed(2)} ${C.toFixed(2)}`}
          transform="rotate(140 170 170)"
          className="ob-dial-arc" />

        {/* inner hairline */}
        <circle cx="170" cy="170" r="104" fill="none" stroke="rgba(245,242,234,0.07)" strokeWidth="1" />
      </svg>

      <div className="ob-dial-center">
        <span className="ob-dial-eyebrow">Daily target</span>
        <span className="ob-dial-value">
          <CountUp value={rate} decimals={2} duration={2} />
          <em>%</em>
        </span>
        <span className="ob-dial-sub">{days > 0 ? (days < 1 ? `${Math.round(days * 24 * 60)}-min horizon` : `${Math.round(days)}-day horizon`) : "flexible"}</span>
      </div>

      <div className="ob-dial-chip">
        <Gift className="h-3.5 w-3.5" /> 10% marketplace credit
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sparkline — tiny gradient area chart for the TVL widget             */
/* ------------------------------------------------------------------ */
function Sparkline() {
  const W = 260, H = 64;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ob-spark" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1={H} x2={W} y2={H} stroke="rgba(240,185,11,0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Hero headline — word-by-word kinetic reveal                         */
/* ------------------------------------------------------------------ */
function KineticLine({ words, serifLast = false, delay = 0 }: { words: string[]; serifLast?: boolean; delay?: number }) {
  return (
    <span className="ob-line">
      {words.map((w, i) => (
        <span className="ob-word-mask" key={i}>
          <motion.span
            className={cn("ob-word", serifLast && i === words.length - 1 && "ob-word-serif")}
            initial={{ y: "112%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 0.9, ease: EASE, delay: delay + i * 0.075 }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export function ObsidianDashboard() {
  const { login: open } = usePrivy();
  // chainId here is the WALLET's actual chain (not the wagmi config's active
  // chain), so it correctly reflects a wallet sitting on Ethereum/elsewhere.
  const { address, chainId } = useAccount();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  // Treat "unknown chain" (undefined) as on-network so we don't nag before the
  // wallet reports; the chainId-pinned writes still enforce BSC at submit time.
  const onBsc = chainId === undefined || chainId === bsc.id;
  const [selectedPlan, setSelectedPlan] = useState("720");
  const [amount, setAmount] = useState("");

  useEffect(() => { captureReferrerFromUrl(); }, []);

  const contractAddress = RWAN_V5_STAKING_ADDRESS ?? zeroAddress;
  const contractConfigured = Boolean(RWAN_V5_STAKING_ADDRESS && RWAN_V5_STAKING_ADDRESS !== zeroAddress);
  const planCount = useReadContract({
    address: contractAddress, abi: RWAN_V5_ABI, functionName: "stakePlansLength",
    query: { enabled: contractConfigured, refetchInterval: 60_000 },
  });
  const planReads = useReadContracts({
    contracts: Array.from({ length: Math.min(Number(planCount.data ?? 0), 32) }, (_, index) => ({
      address: contractAddress, abi: RWAN_V5_ABI, functionName: "stakePlans" as const, args: [BigInt(index)] as const,
    })),
    query: { enabled: contractConfigured && Number(planCount.data ?? 0) > 0, refetchInterval: 60_000 },
  });
  const tokenRead = useReadContract({ address: contractAddress, abi: RWAN_V5_ABI, functionName: "stakingToken", query: { enabled: contractConfigured } });
  const minStakeRead = useReadContract({ address: contractAddress, abi: RWAN_V5_ABI, functionName: "minStakeAmount", query: { enabled: contractConfigured } });
  const totalStakedRead = useReadContract({ address: contractAddress, abi: RWAN_V5_ABI, functionName: "totalStaked", query: { enabled: contractConfigured, refetchInterval: 60_000 } });
  const rewardReserveRead = useReadContract({ address: contractAddress, abi: RWAN_V5_ABI, functionName: "stakingRewardReserve", query: { enabled: contractConfigured, refetchInterval: 60_000 } });
  const referrerOfRead = useReadContract({
    address: contractAddress, abi: RWAN_V5_ABI, functionName: "referrerOf",
    args: address ? [address] : undefined,
    query: { enabled: contractConfigured && Boolean(address) },
  });
  const balanceRead = useReadContract({
    address: tokenRead.data,
    abi: ERC20_WRITE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!tokenRead.data && !!address, refetchInterval: 60_000 },
  });
  const walletBalance = balanceRead.data ?? 0n;

  // V5 pays affiliate commissions directly to wallet — no on-chain accumulator to query

  const livePlans = useMemo(() => planReads.data?.flatMap((item, index) => {
    const result = item.result as readonly [bigint, bigint, bigint, boolean] | undefined;
    if (!result || !result[3]) return [];
    const secs = Number(result[0]);
    const days = secs / 86_400;
    const durationLabel = secs === 0 ? "Flex" : secs < 3600 ? `${Math.round(secs / 60)} min` : secs < 86_400 ? `${+(secs / 3600).toFixed(1)} hr` : `${Math.round(days)} days`;
    return [{ id: String(index), days, label: durationLabel, rate: Number(result[1]) / 100, tone: days >= 720 ? "market" as const : days >= 180 ? "signal" as const : "quiet" as const, note: secs === 0 ? "No lock" : `${durationLabel} lock` }];
  }) ?? [], [planReads.data]);
  const displayPlans = livePlans.length ? livePlans : fallbackPlans;

  const plan = displayPlans.find((item) => item.id === selectedPlan) ?? displayPlans[0];
  const principal = Number(amount.replace(/,/g, "")) || 0;
  const daily = principal * (plan.rate / 100);
  const termReward = plan.days ? daily * plan.days : daily * 30;
  const marketplaceCredit = plan.days >= 720 && principal >= 1000 ? principal * 0.1 : 0;
  const stakeAmount = (() => { try { return parseUnits(amount || "0", 18); } catch { return 0n; } })();
  const minimumStake = minStakeRead.data ?? 0n;
  // referrerOfRead must resolve before submitting — handleStake decides whether
  // to pass a referrer based on it, and an unresolved read reads as "no
  // referrer yet" which could wrongly re-attempt setting one and revert.
  const canSubmit = Boolean(
    address && contractConfigured && stakeAmount >= minimumStake && stakeAmount > 0n && !isWriting
      && !referrerOfRead.isLoading
  );

  const tvl = totalStakedRead.data ? Number(totalStakedRead.data) / 1e18 : null;
  const reserve = rewardReserveRead.data ? Number(rewardReserveRead.data) / 1e18 : null;

  const handleStake = async () => {
    if (!canSubmit || !tokenRead.data || !address) return;
    // Many users connect while their wallet is on Ethereum (or wherever they
    // last were). Switch them to BNB Chain first — one clear prompt — rather
    // than letting the approve/stake calls fail on the wrong network. Passing
    // chainId on each write below is the belt-and-suspenders enforcement.
    if (!onBsc) {
      try {
        await switchChainAsync({ chainId: bsc.id });
      } catch {
        return; // user rejected the switch — nothing to stake against
      }
    }
    // The contract only allows setting a referrer once per wallet — if one is
    // already on-chain, a non-zero referrer here would revert the whole stake.
    const hasReferrer = Boolean(referrerOfRead.data && referrerOfRead.data !== zeroAddress);
    const stored = getStoredReferrer();
    const referrer = hasReferrer || !stored || stored.toLowerCase() === address.toLowerCase()
      ? zeroAddress
      : stored;
    await writeContractAsync({ chainId: bsc.id, address: tokenRead.data, abi: ERC20_WRITE_ABI, functionName: "approve", args: [contractAddress, stakeAmount] });
    await writeContractAsync({ chainId: bsc.id, address: contractAddress, abi: RWAN_V5_ABI, functionName: "stake", args: [stakeAmount, BigInt(Number(plan.id)), referrer] });
    window.dispatchEvent(new Event("rwan:staked"));
  };

  const featured = displayPlans[displayPlans.length - 1];

  return (
    <div className="ob-shell">
      <Grain />
      <Spotlight />
      <ScrollProgress />
      <div className="ob-atmo" aria-hidden="true" />

      {/* ---------- Nav ---------- */}
      <ObNav />

      <main id="top">
        {/* ---------- Hero ---------- */}
        <section className="ob-hero">
          <div className="ob-hero-copy">
            <motion.p className="ob-kicker" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
              <span>Reserve-backed staking</span>
            </motion.p>
            <h1 className="ob-h1">
              <KineticLine words={["Idle", "capital"]} delay={0.1} />
              <KineticLine words={["is", "a", "choice."]} serifLast delay={0.28} />
            </h1>
            <motion.p className="ob-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75, duration: 0.8 }}>
              Seven staking plans, each with a fixed daily rate
              and lock term set on-chain — from no-lock Flex at 0.03% to the
              720-day tier at 0.28%.
            </motion.p>
            <motion.div className="ob-hero-cta" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.7, ease: EASE }}>
              <Magnetic strength={0.35}>
                <a href="#position" className="ob-btn-gold">Start staking <ArrowUpRight className="h-4 w-4" /></a>
              </Magnetic>
              <a href="#stake" className="ob-btn-ghost">Explore plans <ArrowRight className="h-4 w-4" /></a>
            </motion.div>
            <motion.div className="ob-hero-proof" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.8 }}>
              <div><strong><CountUp value={720} /></strong><span>day max horizon</span></div>
              <div><strong><CountUp value={6} /></strong><span>yield lanes</span></div>
              <div><strong>100%</strong><span>on-chain terms</span></div>
            </motion.div>
          </div>

          <motion.div className="ob-hero-widget" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.45, duration: 1, ease: EASE }}>
            <Tilt className="ob-dial-card" max={6}>
              <div className="ob-dial-head">
                <span className="ob-tag">Featured · {featured.label}</span>
                <span className="ob-live-pill"><span className="ob-live" /> live</span>
              </div>
              <YieldDial rate={featured.rate} days={featured.days} />
              <div className="ob-dial-foot">
                <div><strong>{featured.label}</strong><span>capital lock</span></div>
                <div><strong>{fmt(featured.rate * featured.days, 0)}%</strong><span>full-term total</span></div>
                <div><strong>VIP</strong><span>market tier</span></div>
              </div>
            </Tilt>
          </motion.div>
        </section>

        {/* ---------- Ticker ---------- */}
        <Reveal className="ob-ticker" y={0}>
          <Marquee items={["Reserve-backed rewards", "·", "Non-custodial", "·", "Transparent on-chain rates", "·", "720-day marketplace tier", "·", "Referral rank engine", "·"]} />
        </Reveal>

        {/* ---------- Bento widgets ---------- */}
        <section className="ob-bento ob-bento-3" aria-label="Protocol metrics">
          <Reveal className="ob-card ob-card-tvl">
            <div className="ob-card-head">
              <span className="ob-tag"><Layers3 className="h-3.5 w-3.5" /> Total value locked</span>
            </div>
            <div className="ob-card-metric">{tvl != null ? <CountUp value={tvl} suffix=" RWAAN" /> : "— RWAAN"}</div>
            <Sparkline />
            {!contractConfigured && <span className="ob-card-note">Awaiting deployment</span>}
          </Reveal>

          <Reveal className="ob-card" delay={0.07}>
            <div className="ob-card-head"><span className="ob-tag"><ShieldCheck className="h-3.5 w-3.5" /> Reward reserve</span></div>
            <div className="ob-card-metric">{reserve != null ? <CountUp value={reserve} suffix=" RWAAN" /> : "—"}</div>
            <span className="ob-card-note">Segregated reward pool, funded up-front</span>
          </Reveal>

          <Reveal className="ob-card ob-card-link" delay={0.14}>
            <Link href="/network" className="ob-card-hit" aria-label="View your network and referral earnings" />
            <div className="ob-card-head"><span className="ob-tag"><Network className="h-3.5 w-3.5" /> Your network</span></div>
            <div className="ob-card-metric">
              {address ? "View network" : "—"}
            </div>
            <span className="ob-card-note">2% on every referral claim</span>
          </Reveal>

        </section>

        {/* ---------- Plans ---------- */}
        <section id="stake" className="ob-section">
          <div className="ob-ghost-num" aria-hidden="true">01</div>
          <div className="ob-section-head">
            <Reveal><h2 className="ob-h2">Pick your <em>lock term.</em></h2></Reveal>
            <Reveal delay={0.08}><p>Every plan&apos;s rate, lock length, and early-exit penalty is set in the contract.</p></Reveal>
          </div>
          <div className="ob-plans">
            {displayPlans.map((item, index) => (
              <Reveal key={item.id} delay={index * 0.05}>
                <button
                  type="button"
                  onClick={() => setSelectedPlan(item.id)}
                  className={cn("ob-plan", selectedPlan === item.id && "ob-plan-active", item.tone === "market" && "ob-plan-market")}
                >
                  <span className="ob-plan-idx">{String(index + 1).padStart(2, "0")}</span>
                  <span className="ob-plan-check">{selectedPlan === item.id && <Check className="h-3 w-3" />}</span>
                  <span className="ob-plan-name">{item.label}</span>
                  <span className="ob-plan-rate">{item.rate.toFixed(2)}<em>%</em></span>
                  <span className="ob-plan-note">{item.note}</span>
                  {item.days >= 720 && <span className="ob-plan-vip"><Gift className="h-3 w-3" /> marketplace layer</span>}
                </button>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------- Position builder ---------- */}
        <section id="position" className="ob-section">
          <div className="ob-ghost-num" aria-hidden="true">02</div>
          <div className="ob-builder">
            <Reveal className="ob-panel">
              <div className="ob-panel-head">
                <h2 className="ob-h2-sm">Open a position</h2>
                <span className="ob-rate-pill">{plan.rate.toFixed(2)}% daily</span>
              </div>

              <div className="ob-input-header">
                <label className="ob-label" htmlFor="ob-amount">Amount to stake</label>
                {address && (
                  <span className="ob-balance">
                    Balance: <strong>{walletBalance > 0n ? fmt(Number(formatUnits(walletBalance, 18))) : "0"} RWAAN</strong>
                  </span>
                )}
              </div>
              <div className="ob-input">
                <input id="ob-amount" value={amount} inputMode="decimal"
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
                <span>RWAAN</span>
              </div>
              <div className="ob-input-meta">
                <div className="ob-quick-fills">
                  <button type="button" onClick={() => minimumStake > 0n && setAmount(formatUnits(minimumStake, 18).split(".")[0])}>Min</button>
                  <button type="button" onClick={() => walletBalance > 0n && setAmount(String(walletBalance / 10n ** 18n / 2n))}>½</button>
                  <button type="button" onClick={() => walletBalance > 0n && setAmount(String(walletBalance / 10n ** 18n))}>Max</button>
                </div>
                <span>{address ? "Wallet connected" : "Wallet not connected"}</span>
              </div>

              <div className="ob-est">
                <div><span>Daily reward</span><strong>{fmt(daily)} RWAAN</strong></div>
                <div><span>{plan.days ? `${plan.days}-day term` : "30-day reference"}</span><strong>{fmt(termReward)} RWAAN</strong></div>
                {marketplaceCredit > 0 && (
                  <div className="ob-est-vip"><span><Gift className="h-4 w-4" /> Marketplace credit</span><strong>{fmt(marketplaceCredit)} RWAAN</strong></div>
                )}
              </div>

              <Magnetic strength={0.15} className="ob-cta-wrap">
                <button type="button" className="ob-btn-gold ob-btn-full"
                  onClick={
                    !address
                      ? () => open()
                      : !onBsc
                        ? () => { switchChainAsync({ chainId: bsc.id }).catch(() => {}); }
                        : handleStake
                  }
                  disabled={
                    !contractConfigured
                      ? true
                      : !address
                        ? false
                        : !onBsc
                          ? isSwitching
                          : !canSubmit
                  }>
                  {!contractConfigured
                    ? "Contract pending"
                    : !address
                      ? "Connect wallet"
                      : !onBsc
                        ? (isSwitching ? "Switching…" : "Switch to BNB Chain")
                        : (isWriting ? "Confirm in wallet…" : "Approve & stake")}
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </Magnetic>
            </Reveal>

            <div className="ob-builder-side">
              <Reveal className="ob-side-card" delay={0.08}>
                <ShieldCheck className="ob-side-icon" />
                <h3>Reserves funded up front</h3>
                <p>Reward pools are segregated from user principal and funded before staking opens. Marketplace credits are allocated the moment you stake.</p>
              </Reveal>
              <Reveal className="ob-side-card" delay={0.16}>
                <div className="ob-pulse-head"><span className="ob-tag">Network pulse</span></div>
                <div className="ob-bars ob-bars-empty" aria-label="Network growth" style={{ opacity: 0.18 }}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <span key={i} style={{ height: "20%" }} />
                  ))}
                </div>
                <span className="ob-card-note" style={{ marginTop: "0.5rem" }}>Live once staking begins</span>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ---------- Your positions ---------- */}
        <MyPositions contractAddress={contractAddress} contractConfigured={contractConfigured} />

        {/* ---------- Perks ---------- */}
        <section id="perks" className="ob-section">
          <div className="ob-ghost-num" aria-hidden="true">04</div>
          <div className="ob-section-head">
            <Reveal><h2 className="ob-h2">What the 720-day tier <em>adds.</em></h2></Reveal>
            <Reveal delay={0.08}><p>On top of its 0.28% daily rate, the market plan carries marketplace credit and VIP eligibility.</p></Reveal>
          </div>
          <div className="ob-perks">
            {[
              [Gift, "Marketplace credit", "10% RWAAN credit against the marketplace layer."],
              [Wallet, "VIP status", "Eligibility signal across the RWAAN partner ecosystem."],
              [LockKeyhole, "Principal path", "Original stake accounted for until unlock."],
              [Network, "Network upside", "Referral levels with transparent rank rules."],
            ].map(([Icon, title, copy], i) => {
              const PerkIcon = Icon as typeof Gift;
              return (
                <Reveal className="ob-perk" key={title as string} delay={i * 0.06}>
                  <span className="ob-perk-num">{String(i + 1).padStart(2, "0")}</span>
                  <PerkIcon className="ob-perk-icon" />
                  <h3>{title as string}</h3>
                  <p>{copy as string}</p>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ---------- Closing CTA ---------- */}
        <Reveal className="ob-final">
          <div className="ob-final-glow" aria-hidden="true" />
          <h2 className="ob-h2 ob-final-title">Stake $RWAAN. <em>Earn a fixed daily rate.</em></h2>
          <Magnetic strength={0.3}>
            <button type="button" className="ob-btn-gold ob-btn-lg"
              onClick={address ? () => document.getElementById("position")?.scrollIntoView({ behavior: "smooth" }) : () => open()}>
              {address ? "Open a position" : "Connect wallet"} <ArrowUpRight className="h-4 w-4" />
            </button>
          </Magnetic>
        </Reveal>
      </main>

      <AurumFooter />
    </div>
  );
}
