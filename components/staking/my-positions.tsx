"use client";

/**
 * MY POSITIONS — per-wallet staking positions with live-ticking rewards,
 * claim, and withdraw (or early-withdraw with penalty preview).
 * Reads only from RWANSecureStakingV5 — no indexer, fully on-chain.
 */

import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { formatUnits, type Address } from "viem";
import { CheckCircle2, Clock, Loader2, LockKeyhole, Sparkles, TriangleAlert, Unlock } from "lucide-react";

import { RWAN_V5_ABI } from "@/lib/contracts/rwanV5Abi";
import { parseContractError } from "@/lib/utils/contract-errors";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Reveal } from "@/components/aurum-ui";

type PositionStruct = readonly [Address, bigint, bigint, bigint, bigint, number, bigint, boolean];
type PlanStruct = readonly [bigint, number, number, boolean];

type PlanInfo = { lockDuration: number; dailyRateBps: number; earlyPenaltyBps: number; enabled: boolean };

type PositionView = {
  id: bigint;
  amount: bigint;
  startTime: number;
  unlockTime: number;
  planId: number;
  rewardClaimed: bigint;
  withdrawn: boolean;
  pendingAtFetch: bigint;
};

const fmt = (n: number, maxDigits = 4) => {
  if (!Number.isFinite(n) || n === 0) return "0";
  if (n < 0.0001 && n > 0) return "<0.0001";
  return n.toLocaleString("en-US", { maximumFractionDigits: maxDigits });
};

const fmtUsd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n < 1 ? 4 : 2 });

const durationLabel = (secs: number) => {
  if (secs === 0) return "Flex";
  if (secs < 3600) return `${Math.round(secs / 60)} min`;
  if (secs < 86_400) return `${+(secs / 3600).toFixed(1)} hr`;
  return `${Math.round(secs / 86_400)} days`;
};

export function MyPositions({
  contractAddress,
  contractConfigured,
}: {
  contractAddress: Address;
  contractConfigured: boolean;
}) {
  const { address } = useAccount();
  const { toast } = useToast();
  const { writeContractAsync } = useWriteContract();

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const [priceUsd, setPriceUsd] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/prices")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const p = d?.["rawli-analytics"]?.usd;
        if (!cancelled && typeof p === "number") setPriceUsd(p);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const enabled = contractConfigured && Boolean(address);

  const idsRead = useReadContract({
    address: contractAddress, abi: RWAN_V5_ABI, functionName: "userPositions",
    args: address ? [address] : undefined,
    query: { enabled, refetchInterval: 20_000 },
  });
  const ids = useMemo(() => [...(idsRead.data ?? [])], [idsRead.data]);

  const positionsRead = useReadContracts({
    contracts: ids.map((id) => ({
      address: contractAddress, abi: RWAN_V5_ABI, functionName: "positions" as const, args: [id] as const,
    })),
    query: { enabled: enabled && ids.length > 0, refetchInterval: 20_000 },
  });
  const pendingRead = useReadContracts({
    contracts: ids.map((id) => ({
      address: contractAddress, abi: RWAN_V5_ABI, functionName: "pendingRewards" as const, args: [id] as const,
    })),
    query: { enabled: enabled && ids.length > 0, refetchInterval: 20_000 },
  });
  const pausedRead = useReadContracts({
    contracts: [
      { address: contractAddress, abi: RWAN_V5_ABI, functionName: "claimsPaused" as const },
      { address: contractAddress, abi: RWAN_V5_ABI, functionName: "withdrawalsPaused" as const },
    ],
    query: { enabled: contractConfigured, refetchInterval: 30_000 },
  });
  const claimsPaused = Boolean(pausedRead.data?.[0]?.result);
  const withdrawalsPaused = Boolean(pausedRead.data?.[1]?.result);

  // Snapshot the moment pendingRead resolves — the live ticker projects
  // forward from this baseline instead of re-fetching every second.
  const [pendingFetchedAtMs, setPendingFetchedAtMs] = useState(() => Date.now());
  useEffect(() => {
    if (pendingRead.data) setPendingFetchedAtMs(Date.now());
  }, [pendingRead.data]);

  const positions = useMemo<PositionView[]>(() => {
    return ids.flatMap((id, i) => {
      const res = positionsRead.data?.[i]?.result as PositionStruct | undefined;
      if (!res || res[0] === "0x0000000000000000000000000000000000000000") return [];
      const pending = pendingRead.data?.[i]?.result as bigint | undefined;
      return [{
        id,
        amount: res[1],
        startTime: Number(res[2]),
        unlockTime: Number(res[3]),
        planId: Number(res[5]),
        rewardClaimed: res[6],
        withdrawn: res[7],
        pendingAtFetch: pending ?? 0n,
      }];
    });
  }, [ids, positionsRead.data, pendingRead.data]);

  const uniquePlanIds = useMemo(
    () => Array.from(new Set(positions.map((p) => p.planId))),
    [positions]
  );
  const plansRead = useReadContracts({
    contracts: uniquePlanIds.map((pid) => ({
      address: contractAddress, abi: RWAN_V5_ABI, functionName: "stakePlans" as const, args: [BigInt(pid)] as const,
    })),
    query: { enabled: contractConfigured && uniquePlanIds.length > 0 },
  });
  const planMap = useMemo(() => {
    const map = new Map<number, PlanInfo>();
    plansRead.data?.forEach((r, i) => {
      const res = r.result as PlanStruct | undefined;
      if (res) map.set(uniquePlanIds[i], { lockDuration: Number(res[0]), dailyRateBps: res[1], earlyPenaltyBps: res[2], enabled: res[3] });
    });
    return map;
  }, [plansRead.data, uniquePlanIds]);

  // Live projection: pendingAtFetch + (amount * rate/day) * elapsed since fetch.
  // Computed in float token units — this is a display projection only, the
  // real value re-syncs from chain every 20s.
  const liveDisplay = useMemo(() => {
    const elapsedSec = Math.max(0, (nowMs - pendingFetchedAtMs) / 1000);
    return new Map(
      positions.map((p) => {
        if (p.withdrawn) return [p.id, Number(formatUnits(p.pendingAtFetch, 18))] as const;
        const plan = planMap.get(p.planId);
        const rateBps = plan?.dailyRateBps ?? 0;
        const amountTokens = Number(formatUnits(p.amount, 18));
        const perSecond = (amountTokens * (rateBps / 10_000)) / 86_400;
        const base = Number(formatUnits(p.pendingAtFetch, 18));
        return [p.id, base + perSecond * elapsedSec] as const;
      })
    );
  }, [positions, planMap, nowMs, pendingFetchedAtMs]);

  const totals = useMemo(() => {
    let staked = 0, pending = 0, claimed = 0, active = 0;
    for (const p of positions) {
      claimed += Number(formatUnits(p.rewardClaimed, 18));
      if (!p.withdrawn) {
        staked += Number(formatUnits(p.amount, 18));
        pending += liveDisplay.get(p.id) ?? 0;
        active += 1;
      }
    }
    return { staked, pending, claimed, active };
  }, [positions, liveDisplay]);

  const [claimingId, setClaimingId] = useState<bigint | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<bigint | null>(null);
  const [earlyConfirmId, setEarlyConfirmId] = useState<bigint | null>(null);

  const refetchAll = async () => {
    await Promise.all([idsRead.refetch(), positionsRead.refetch(), pendingRead.refetch()]);
  };

  // The stake panel above dispatches this after a successful stake so a new
  // position shows up immediately instead of waiting for the next poll.
  useEffect(() => {
    const handler = () => { refetchAll(); };
    window.addEventListener("rwan:staked", handler);
    return () => window.removeEventListener("rwan:staked", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractAddress]);

  const handleClaim = async (id: bigint) => {
    setClaimingId(id);
    try {
      await writeContractAsync({ address: contractAddress, abi: RWAN_V5_ABI, functionName: "claim", args: [id] });
      toast({ title: "Rewards claimed", description: "Pending rewards were sent to your wallet." });
      await refetchAll();
    } catch (e) {
      const parsed = parseContractError(e);
      toast({ title: parsed.title, description: parsed.description });
    } finally {
      setClaimingId(null);
    }
  };

  const handleWithdraw = async (id: bigint) => {
    setWithdrawingId(id);
    try {
      await writeContractAsync({ address: contractAddress, abi: RWAN_V5_ABI, functionName: "withdraw", args: [id] });
      toast({ title: "Position withdrawn", description: "Principal and any pending rewards were sent to your wallet." });
      await refetchAll();
    } catch (e) {
      const parsed = parseContractError(e);
      toast({ title: parsed.title, description: parsed.description });
    } finally {
      setWithdrawingId(null);
    }
  };

  const handleWithdrawEarly = async (id: bigint) => {
    setWithdrawingId(id);
    try {
      await writeContractAsync({ address: contractAddress, abi: RWAN_V5_ABI, functionName: "withdrawEarly", args: [id] });
      toast({ title: "Withdrawn early", description: "The plan's early-exit penalty was applied; the remainder was sent to your wallet." });
      await refetchAll();
    } catch (e) {
      const parsed = parseContractError(e);
      toast({ title: parsed.title, description: parsed.description });
    } finally {
      setWithdrawingId(null);
      setEarlyConfirmId(null);
    }
  };

  const earlyConfirmPosition = positions.find((p) => p.id === earlyConfirmId);
  const earlyConfirmPlan = earlyConfirmPosition ? planMap.get(earlyConfirmPosition.planId) : undefined;
  const earlyPenaltyTokens = earlyConfirmPosition && earlyConfirmPlan
    ? (Number(formatUnits(earlyConfirmPosition.amount, 18)) * earlyConfirmPlan.earlyPenaltyBps) / 10_000
    : 0;
  const earlyReceiveTokens = earlyConfirmPosition
    ? Number(formatUnits(earlyConfirmPosition.amount, 18)) - earlyPenaltyTokens
    : 0;

  const isLoading = enabled && (idsRead.isLoading || (ids.length > 0 && positionsRead.isLoading));

  return (
    <section id="my-positions" className="ob-section">
      <div className="ob-ghost-num" aria-hidden="true">03</div>
      <div className="ob-section-head">
        <Reveal><h2 className="ob-h2">Your <em>positions.</em></h2></Reveal>
        <Reveal delay={0.08}><p>Every figure below reads straight from the contract — current rewards tick live, total payout is your lifetime claimed amount.</p></Reveal>
      </div>

      {!address ? (
        <Reveal className="ob-pos-empty">
          <LockKeyhole className="h-5 w-5" />
          <p>Connect your wallet to view your staking positions, claim rewards, and withdraw.</p>
        </Reveal>
      ) : isLoading ? (
        <div className="ob-pos-grid">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="ob-pos-card ob-pos-skeleton" aria-hidden="true" />
          ))}
        </div>
      ) : positions.length === 0 ? (
        <Reveal className="ob-pos-empty">
          <Sparkles className="h-5 w-5" />
          <p>No positions yet — open your first stake above and it will appear here.</p>
        </Reveal>
      ) : (
        <>
          <Reveal className="ob-pos-summary">
            <div className="ob-pos-stat">
              <span>Staked (active)</span>
              <strong>{fmt(totals.staked)} <em>RWAAN</em></strong>
              {priceUsd > 0 && <small>≈ {fmtUsd(totals.staked * priceUsd)}</small>}
            </div>
            <div className="ob-pos-stat ob-pos-stat-live">
              <span><Sparkles className="h-3 w-3" /> Current rewards</span>
              <strong className="ob-pos-ticking">{fmt(totals.pending, 6)} <em>RWAAN</em></strong>
              {priceUsd > 0 && <small>≈ {fmtUsd(totals.pending * priceUsd)}</small>}
            </div>
            <div className="ob-pos-stat">
              <span>Total paid out</span>
              <strong>{fmt(totals.claimed)} <em>RWAAN</em></strong>
              {priceUsd > 0 && <small>≈ {fmtUsd(totals.claimed * priceUsd)}</small>}
            </div>
            <div className="ob-pos-stat">
              <span>Open positions</span>
              <strong>{totals.active}</strong>
            </div>
          </Reveal>

          <div className="ob-pos-grid">
            {positions.map((p, i) => (
              <PositionCard
                key={p.id.toString()}
                position={p}
                plan={planMap.get(p.planId)}
                nowMs={nowMs}
                priceUsd={priceUsd}
                liveValue={liveDisplay.get(p.id) ?? 0}
                delay={i * 0.05}
                claimsPaused={claimsPaused}
                withdrawalsPaused={withdrawalsPaused}
                isClaiming={claimingId === p.id}
                isWithdrawing={withdrawingId === p.id}
                onClaim={() => handleClaim(p.id)}
                onWithdraw={() => handleWithdraw(p.id)}
                onRequestEarlyWithdraw={() => setEarlyConfirmId(p.id)}
              />
            ))}
          </div>
        </>
      )}

      <Dialog open={earlyConfirmId !== null} onOpenChange={(open) => !open && setEarlyConfirmId(null)}>
        <DialogContent className="ob-confirm-modal">
          <DialogHeader>
            <div className="ob-confirm-icon"><TriangleAlert className="h-5 w-5" /></div>
            <DialogTitle>Withdraw before unlock?</DialogTitle>
            <DialogDescription>
              This position is still locked. Withdrawing now applies the plan&apos;s early-exit penalty to your principal.
            </DialogDescription>
          </DialogHeader>
          <div className="ob-confirm-rows">
            <div><span>Staked amount</span><strong>{fmt(earlyReceiveTokens + earlyPenaltyTokens)} RWAAN</strong></div>
            <div className="ob-confirm-penalty"><span>Early-exit penalty ({earlyConfirmPlan ? (earlyConfirmPlan.earlyPenaltyBps / 100).toFixed(0) : "—"}%)</span><strong>-{fmt(earlyPenaltyTokens)} RWAAN</strong></div>
            <div className="ob-confirm-receive"><span>You receive</span><strong>{fmt(earlyReceiveTokens)} RWAAN</strong></div>
          </div>
          <DialogFooter>
            <button type="button" className="ob-btn-ghost" onClick={() => setEarlyConfirmId(null)}>Cancel</button>
            <button
              type="button"
              className="ob-btn-gold"
              disabled={withdrawingId !== null}
              onClick={() => earlyConfirmId && handleWithdrawEarly(earlyConfirmId)}
            >
              {withdrawingId !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm early withdrawal"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function PositionCard({
  position, plan, nowMs, priceUsd, liveValue, delay,
  claimsPaused, withdrawalsPaused, isClaiming, isWithdrawing,
  onClaim, onWithdraw, onRequestEarlyWithdraw,
}: {
  position: PositionView;
  plan?: PlanInfo;
  nowMs: number;
  priceUsd: number;
  liveValue: number;
  delay: number;
  claimsPaused: boolean;
  withdrawalsPaused: boolean;
  isClaiming: boolean;
  isWithdrawing: boolean;
  onClaim: () => void;
  onWithdraw: () => void;
  onRequestEarlyWithdraw: () => void;
}) {
  const nowSec = nowMs / 1000;
  const isFlexible = position.unlockTime === 0;
  const isUnlocked = isFlexible || nowSec >= position.unlockTime;
  const amountTokens = Number(formatUnits(position.amount, 18));
  const claimedTokens = Number(formatUnits(position.rewardClaimed, 18));
  const rate = plan ? plan.dailyRateBps / 100 : 0;

  const statusBadge = position.withdrawn
    ? { label: "Withdrawn", cls: "ob-pos-badge-done", Icon: CheckCircle2 }
    : isFlexible
      ? { label: "Flexible", cls: "ob-pos-badge-flex", Icon: Unlock }
      : isUnlocked
        ? { label: "Unlocked", cls: "ob-pos-badge-unlocked", Icon: Unlock }
        : { label: "Locked", cls: "ob-pos-badge-locked", Icon: LockKeyhole };

  let progressPct = 100;
  if (!isFlexible && !position.withdrawn) {
    const total = Math.max(position.unlockTime - position.startTime, 1);
    progressPct = Math.min(Math.max(((nowSec - position.startTime) / total) * 100, 0), 100);
  }

  const remainingSec = !isFlexible ? Math.max(position.unlockTime - nowSec, 0) : 0;
  const remainingLabel = remainingSec > 0
    ? `${Math.floor(remainingSec / 86_400)}d ${Math.floor((remainingSec % 86_400) / 3600)}h left`
    : null;

  const isClaimable = !position.withdrawn && !claimsPaused && liveValue > 0;

  return (
    <Reveal className={`ob-pos-card ${position.withdrawn ? "ob-pos-card-done" : ""}`} delay={delay}>
      <div className="ob-pos-card-head">
        <div>
          <span className="ob-pos-plan-label">{plan ? durationLabel(plan.lockDuration) : "…"}</span>
          {plan && !isFlexible && <span className="ob-pos-rate">{rate.toFixed(2)}%/day</span>}
          {plan && isFlexible && <span className="ob-pos-rate">{rate.toFixed(2)}%/day · no lock</span>}
        </div>
        <span className={`ob-pos-badge ${statusBadge.cls}`}><statusBadge.Icon className="h-3 w-3" /> {statusBadge.label}</span>
      </div>

      <div className="ob-pos-amount">
        {fmt(amountTokens)} <em>RWAAN</em>
        {priceUsd > 0 && <small>≈ {fmtUsd(amountTokens * priceUsd)}</small>}
      </div>

      {!isFlexible && !position.withdrawn && (
        <div className="ob-pos-timeline">
          <div className="ob-pos-progress"><div style={{ width: `${progressPct}%` }} /></div>
          <div className="ob-pos-timeline-labels">
            <span><Clock className="h-3 w-3" /> {remainingLabel ?? "Unlocked"}</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
        </div>
      )}

      <div className="ob-pos-rewards">
        <div>
          <span>{position.withdrawn ? "Final reward" : "Current reward"}</span>
          <strong className={position.withdrawn ? "" : "ob-pos-ticking"}>{fmt(liveValue, 6)} RWAAN</strong>
        </div>
        <div>
          <span>Claimed to date</span>
          <strong>{fmt(claimedTokens)} RWAAN</strong>
        </div>
      </div>

      {!position.withdrawn && (
        <div className="ob-pos-actions">
          <button type="button" className="ob-btn-ghost" disabled={!isClaimable || isClaiming} onClick={onClaim}>
            {isClaiming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Claim"}
          </button>
          {isUnlocked ? (
            <button type="button" className="ob-btn-gold" disabled={withdrawalsPaused || isWithdrawing} onClick={onWithdraw}>
              {isWithdrawing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Withdraw"}
            </button>
          ) : (
            <button type="button" className="ob-btn-ghost ob-btn-warn" disabled={withdrawalsPaused || isWithdrawing} onClick={onRequestEarlyWithdraw}>
              Withdraw early{plan ? ` (-${(plan.earlyPenaltyBps / 100).toFixed(0)}%)` : ""}
            </button>
          )}
        </div>
      )}
    </Reveal>
  );
}
