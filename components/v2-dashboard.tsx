"use client";

import { useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { parseUnits, zeroAddress } from "viem";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronRight,
  Gift,
  Gauge,
  Layers3,
  LockKeyhole,
  Network,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { ERC20_WRITE_ABI } from "@/lib/contracts/erc20WriteAbi";
import { RWAN_V5_ABI, RWAN_V5_STAKING_ADDRESS } from "@/lib/contracts/rwanV5Abi";
import {
  CountUp,
  Grain,
  Magnetic,
  Marquee,
  Reveal,
  Spotlight,
  Tilt,
} from "@/components/aurum-ui";
import { AurumFooter } from "@/components/aurum-footer";

type Plan = {
  id: string;
  days: number;
  label: string;
  rate: number;
  tone: "quiet" | "signal" | "market";
  note: string;
};

const plans: Plan[] = [
  { id: "flex", days: 0, label: "Flex", rate: 0.1, tone: "quiet", note: "No lock" },
  { id: "30", days: 30, label: "Sprint", rate: 0.2, tone: "quiet", note: "30 day lock" },
  { id: "90", days: 90, label: "Quarter", rate: 0.3, tone: "quiet", note: "90 day lock" },
  { id: "180", days: 180, label: "Season", rate: 0.5, tone: "signal", note: "180 day lock" },
  { id: "360", days: 360, label: "Year", rate: 0.7, tone: "signal", note: "360 day lock" },
  { id: "720", days: 720, label: "Marketplace", rate: 0.85, tone: "market", note: "VIP access tier" },
];

const formatNumber = (value: number, digits = 2) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);

function WalletChip() {
  const { login: open } = usePrivy();
  const { address } = useAccount();

  return (
    <Magnetic strength={0.28}>
      <button type="button" onClick={() => open()} className="v2-wallet-chip">
        <span className="v2-wallet-dot" />
        <WalletCards className="h-4 w-4" />
        {address ? `${address.slice(0, 5)}...${address.slice(-4)}` : "Connect wallet"}
        <ChevronRight className="h-3.5 w-3.5 opacity-60" />
      </button>
    </Magnetic>
  );
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  delay = 0,
}: {
  label: string;
  value: React.ReactNode;
  detail: string;
  icon: typeof Gauge;
  delay?: number;
}) {
  return (
    <Reveal className="v2-metric" delay={delay}>
      <div className="flex items-center justify-between gap-3">
        <span className="v2-eyebrow">{label}</span>
        <span className="v2-metric-icon">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="v2-metric-value">{value}</div>
      <div className="v2-metric-detail">{detail}</div>
    </Reveal>
  );
}

export function V2Dashboard() {
  const { login: open } = usePrivy();
  const { address } = useAccount();
  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const [selectedPlan, setSelectedPlan] = useState("720");
  const [amount, setAmount] = useState("");
  const [activeNav, setActiveNav] = useState("Overview");

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

  const livePlans = useMemo(() => planReads.data?.flatMap((item, index) => {
    const result = item.result as readonly [bigint, bigint, bigint, boolean] | undefined;
    if (!result || !result[3]) return [];
    const secs = Number(result[0]);
    const days = secs / 86_400;
    const durationLabel = secs === 0 ? "Flex" : secs < 3600 ? `${Math.round(secs / 60)} min` : secs < 86_400 ? `${+(secs / 3600).toFixed(1)} hr` : `${Math.round(days)} days`;
    return [{ id: String(index), days, label: durationLabel, rate: Number(result[1]) / 100, tone: days >= 720 ? "market" as const : days >= 180 ? "signal" as const : "quiet" as const, note: secs === 0 ? "No lock" : `${durationLabel} lock` }];
  }) ?? [], [planReads.data]);
  const displayPlans = livePlans.length ? livePlans : plans;

  const plan = displayPlans.find((item) => item.id === selectedPlan) ?? displayPlans[0];
  const principal = Number(amount.replace(/,/g, "")) || 0;
  const daily = principal * (plan.rate / 100);
  const termReward = plan.days ? daily * plan.days : daily * 30;
  const marketplaceCredit = plan.days >= 720 && principal >= 1000 ? principal * 0.1 : 0;
  const stakeAmount = (() => { try { return parseUnits(amount || "0", 18); } catch { return 0n; } })();
  const minimumStake = minStakeRead.data ?? 0n;
  const canSubmit = Boolean(address && contractConfigured && stakeAmount >= minimumStake && stakeAmount > 0n && !isWriting);

  const tvl = totalStakedRead.data ? Number(totalStakedRead.data) / 1e18 : null;
  const reserve = rewardReserveRead.data ? Number(rewardReserveRead.data) / 1e18 : null;

  const handleStake = async () => {
    if (!canSubmit || !tokenRead.data || !address) return;
    await writeContractAsync({ address: tokenRead.data, abi: ERC20_WRITE_ABI, functionName: "approve", args: [contractAddress, stakeAmount] });
    await writeContractAsync({ address: contractAddress, abi: RWAN_V5_ABI, functionName: "stake", args: [stakeAmount, BigInt(Number(plan.id)), zeroAddress] });
  };

  const activeCopy = useMemo(() => {
    if (plan.id === "720") return "Your long-range position unlocks the marketplace layer.";
    if (plan.id === "flex") return "Stay liquid while your position earns its daily rate.";
    return `Lock for ${plan.days} days and let the protocol do the compounding work.`;
  }, [plan]);

  return (
    <div className="v2-shell">
      <div className="v2-grid-glow" aria-hidden="true" />
      <Grain />
      <Spotlight />

      <div className="v2-topline">
        <div className="flex items-center gap-2">
          <span className="v2-live-dot" />
          <span>{contractConfigured ? "Protocol connected" : "Deployment pending"}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">RWAN / $30.00</span>
          <span className="v2-positive">+2.84%</span>
        </div>
      </div>

      <header className="v2-nav">
        <a href="#top" className="v2-brand" onClick={() => setActiveNav("Overview")}>
          <img src="/logo-rwaan.png" alt="RWAN" className="v2-brand-mark" width={34} height={34} />
          <span>
            <strong>RWAN</strong>
            <small>staking terminal</small>
          </span>
        </a>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {["Overview", "Stake", "Rewards", "Network"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              onClick={() => setActiveNav(item)}
              className={cn("v2-nav-link", activeNav === item && "v2-nav-link-active")}
            >
              {item}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a href="#rewards" className="v2-icon-button" aria-label="View reward mechanics">
            <span className="v2-notification-dot" />
            <Sparkles className="h-4 w-4" />
          </a>
          <WalletChip />
        </div>
      </header>

      <main id="top">
        <section id="overview" className="v2-hero">
          <div className="v2-hero-copy">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="v2-kicker">
              <span>01</span>
              <span className="v2-kicker-line" />
              <span>Hold with intention</span>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
              Put your idle
              <br />
              RWAN to <em>work.</em>
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22, duration: 0.7 }}>
              A clear, reserve-backed staking layer for people who want their capital to move with the network.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34, duration: 0.6 }} className="mt-9 flex flex-wrap items-center gap-3">
              <Magnetic strength={0.4}>
                <a href="#stake" className="v2-primary-button">
                  Start staking <ArrowUpRight className="h-4 w-4" />
                </a>
              </Magnetic>
              <a href="#network" className="v2-quiet-button">
                Read the mechanics <ChevronRight className="h-4 w-4" />
              </a>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }} className="v2-hero-proof">
              <div>
                <div className="v2-hero-proof-value">
                  <CountUp value={720} suffix=" days" />
                </div>
                <div className="v2-hero-proof-label">Max lock horizon</div>
              </div>
              <span className="v2-hero-proof-div" />
              <div>
                <div className="v2-hero-proof-value">
                  <CountUp value={6} suffix=" tiers" />
                </div>
                <div className="v2-hero-proof-label">Yield lanes</div>
              </div>
              <span className="v2-hero-proof-div" />
              <div>
                <div className="v2-hero-proof-value">100%</div>
                <div className="v2-hero-proof-label">On-chain</div>
              </div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.95, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <Tilt className="v2-hero-card">
              <div className="v2-hero-orbit orbit-one" />
              <div className="v2-hero-orbit orbit-two" />
              <div className="v2-hero-sheen" aria-hidden="true" />
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <span className="v2-eyebrow">Featured position</span>
                  <h2 className="v2-hero-card-title">Marketplace 720</h2>
                </div>
                <span className="v2-live-pill"><span /> Live</span>
              </div>
              <div className="relative z-10 mt-12 grid grid-cols-2 gap-4 border-t border-[#4a3600]/25 pt-5">
                <div>
                  <div className="v2-hero-bignum">
                    <CountUp value={0.85} decimals={2} /><span>%</span>
                  </div>
                  <div className="v2-hero-card-cap">daily target</div>
                </div>
                <div className="flex flex-col justify-end text-right">
                  <div className="v2-hero-days">720 days</div>
                  <div className="v2-hero-card-cap">capital lock</div>
                </div>
              </div>
              <div className="relative z-10 mt-7 v2-hero-credit">
                <span className="flex items-center gap-2"><Gift className="h-4 w-4" /> 10% marketplace credit</span>
                <ChevronRight className="h-4 w-4 opacity-60" />
              </div>
            </Tilt>
          </motion.div>
        </section>

        <Reveal className="v2-ticker-wrap" y={0}>
          <Marquee
            items={[
              <>Reserve-backed rewards</>,
              <>·</>,
              <>Non-custodial staking</>,
              <>·</>,
              <>Transparent on-chain rates</>,
              <>·</>,
              <>720-day marketplace tier</>,
              <>·</>,
              <>Referral rank engine</>,
              <>·</>,
            ]}
          />
        </Reveal>

        <section className="v2-metrics-grid" aria-label="Protocol metrics">
          <Metric
            label="Total value locked"
            value={tvl != null ? <CountUp value={tvl} suffix=" RWAN" /> : "—"}
            detail={contractConfigured ? "Live contract read" : "Awaiting deployment"}
            icon={Layers3}
            delay={0}
          />
          <Metric
            label="Reward reserve"
            value={reserve != null ? <CountUp value={reserve} suffix=" RWAN" /> : "—"}
            detail={contractConfigured ? "Live staking reserve" : "Awaiting deployment"}
            icon={ShieldCheck}
            delay={0.08}
          />
          <Metric
            label="Your network"
            value={address ? "Connected" : "—"}
            detail="Affiliate and rank rules are on-chain"
            icon={Network}
            delay={0.16}
          />
          <Metric
            label="Contract state"
            value={contractConfigured ? "Live" : "Not deployed"}
            detail="No off-chain reward promises"
            icon={Zap}
            delay={0.24}
          />
        </section>

        <section id="stake" className="v2-workspace">
          <div className="v2-section-heading">
            <Reveal>
              <div className="v2-kicker"><span>02</span><span className="v2-kicker-line" /><span>Choose your lane</span></div>
              <h2>Lock in a <em>rhythm.</em></h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p>Every plan has a defined rate, term, and exit path. No hidden math. Live values load from the contract.</p>
            </Reveal>
          </div>

          <div className="v2-plan-grid">
            {displayPlans.map((item, index) => (
              <Reveal key={item.id} delay={index * 0.06}>
                <button
                  type="button"
                  onClick={() => setSelectedPlan(item.id)}
                  className={cn("v2-plan-card", item.tone === "market" && "v2-plan-market", selectedPlan === item.id && "v2-plan-selected")}
                >
                  {item.id === "720" && <span className="v2-plan-ribbon">Best utility</span>}
                  <div className="flex items-start justify-between">
                    <span className="v2-plan-index">{String(displayPlans.indexOf(item) + 1).padStart(2, "0")}</span>
                    <span className="v2-plan-select">{selectedPlan === item.id ? <Check className="h-3.5 w-3.5" /> : <span />}</span>
                  </div>
                  <div className="v2-plan-label">{item.label}</div>
                  <div className="v2-plan-rate">{item.rate.toFixed(2)}<span>%</span></div>
                  <div className="v2-plan-note">{item.note}</div>
                  {item.days >= 720 && <div className="v2-plan-flag"><Gift className="h-3.5 w-3.5" /> + marketplace layer</div>}
                </button>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="v2-stake-grid">
          <Reveal className="v2-calculator-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="v2-kicker"><span>03</span><span className="v2-kicker-line" /><span>Position builder</span></div>
                <h2 className="v2-calc-title">Open a position</h2>
              </div>
              <div className="v2-rate-chip"><Gauge className="h-4 w-4" /> {plan.rate.toFixed(2)}% daily</div>
            </div>

            <div className="mt-10">
              <label className="v2-field-label" htmlFor="rwan-amount">Amount to stake</label>
              <div className="v2-amount-field">
                <input id="rwan-amount" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" aria-label="Amount to stake" />
                <span>RWAN</span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-white/40">
                <span>Wallet balance <strong className="font-medium text-white/60">{address ? "Live wallet" : "Connect wallet"}</strong></span>
                <button type="button" onClick={() => setAmount(minimumStake ? String(Number(minimumStake) / 1e18) : "1000")} className="v2-min-link">Use minimum</button>
              </div>
            </div>

            <div className="v2-estimate-box">
              <div className="flex items-center justify-between"><span>Estimated daily reward</span><strong>{formatNumber(daily)} RWAN</strong></div>
              <div className="mt-4 flex items-center justify-between"><span>{plan.days ? "Estimated term reward" : "30 day reference"}</span><strong>{formatNumber(termReward)} RWAN</strong></div>
              {marketplaceCredit > 0 && <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 v2-estimate-credit"><span className="flex items-center gap-2"><Gift className="h-4 w-4" /> Marketplace credit</span><strong>{formatNumber(marketplaceCredit)} RWAN</strong></div>}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-white/45">{activeCopy}</p>
            <Magnetic strength={0.18} className="mt-7 w-full">
              <button type="button" onClick={address ? handleStake : () => open()} disabled={address ? !canSubmit : false} className="v2-action-button w-full disabled:cursor-not-allowed disabled:opacity-50">{!contractConfigured ? "Contract address pending" : address ? (isWriting ? "Confirm in wallet..." : "Approve & stake RWAN") : "Connect wallet to continue"} <ArrowUpRight className="h-4 w-4" /></button>
            </Magnetic>
          </Reveal>

          <div className="v2-side-stack">
            <Reveal className="v2-safety-card" delay={0.08}>
              <div className="v2-safety-icon"><ShieldCheck className="h-5 w-5" /></div>
              <div>
                <h3>Reserve-backed by design</h3>
                <p>Reward pools are separated and protected. Promised marketplace credits are allocated at the moment you stake.</p>
              </div>
              <ArrowUpRight className="ml-auto h-4 w-4 text-white/30" />
            </Reveal>
            <Reveal className="v2-network-card" id="network" delay={0.16}>
              <div className="flex items-center justify-between"><span className="v2-eyebrow">Network pulse</span></div>
              <div className="mt-7 flex items-end gap-1.5" aria-label="Network growth chart" style={{ opacity: 0.18 }}>
                {Array.from({ length: 12 }, (_, i) => <span key={i} className="v2-bar" style={{ height: "20%" }} />)}
              </div>
              <div className="mt-5 flex items-center justify-between text-xs text-white/40"><span>Live once staking begins</span></div>
            </Reveal>
          </div>
        </section>

        <section id="rewards" className="v2-benefits-section">
          <div className="v2-section-heading">
            <Reveal>
              <div className="v2-kicker"><span>04</span><span className="v2-kicker-line" /><span>More than yield</span></div>
              <h2>Long-term has a <em>longer view.</em></h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p>The 720-day plan is designed as a membership layer, not just a number on a screen.</p>
            </Reveal>
          </div>
          <div className="v2-benefits-grid">
            {[
              [Gift, "Marketplace credit", "10% RWAN credit to use with the marketplace layer."],
              [WalletCards, "VIP status", "Eligibility signal for the RWAN partner ecosystem."],
              [LockKeyhole, "Principal path", "Your original stake remains accounted for until unlock."],
              [BarChart3, "Network upside", "Build a referral network with transparent levels and rank rules."],
            ].map(([Icon, title, copy], index) => {
              const BenefitIcon = Icon as typeof Gift;
              return (
                <Reveal key={title as string} className="v2-benefit-card" delay={index * 0.07}>
                  <span className="v2-benefit-icon"><BenefitIcon className="h-5 w-5" /></span>
                  <h3>{title as string}</h3>
                  <p>{copy as string}</p>
                  <ArrowUpRight className="v2-benefit-arrow h-4 w-4" />
                </Reveal>
              );
            })}
          </div>
        </section>

        <Reveal className="v2-cta-band">
          <div className="v2-cta-glow" aria-hidden="true" />
          <div className="relative z-10">
            <div className="v2-eyebrow">Ready when you are</div>
            <h2 className="v2-cta-title">Make your RWAN <em>earn its keep.</em></h2>
          </div>
          <Magnetic strength={0.35} className="relative z-10">
            <button type="button" onClick={address ? () => document.getElementById("stake")?.scrollIntoView({ behavior: "smooth" }) : () => open()} className="v2-primary-button v2-cta-button">
              {address ? "Open a position" : "Connect wallet"} <ArrowUpRight className="h-4 w-4" />
            </button>
          </Magnetic>
        </Reveal>
      </main>

      <AurumFooter />
    </div>
  );
}
