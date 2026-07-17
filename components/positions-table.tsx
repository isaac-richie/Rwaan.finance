import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import confetti from "canvas-confetti";

import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCountdown } from "@/hooks/use-countdown";
import { usePositionsWithRewards } from "@/hooks/use-positions";
import { useTransactionToasts } from "@/hooks/use-transaction-toasts";
import { useAprTiers, useCurrentAprBps, useLockOptions, useTotalStaked } from "@/hooks/use-staking-reads";
import { useClaimPosition, useWithdrawPosition } from "@/hooks/use-staking-writes";
import { useWithdrawEarly, useEarlyWithdrawalPenalty } from "@/hooks/use-early-withdrawal";
import { useMounted } from "@/hooks/use-mounted";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { RWAN_STAKING_ABI, RWAN_STAKING_ADDRESS } from "@/lib/contracts/rwanStakingAbi";
import { RWAN_DECIMALS, STAKING_PLANS } from "@/lib/utils/constants";
import { formatBps, formatDateFromSeconds, formatToken, formatUsd } from "@/lib/utils/format";
import { AprTier, aprForTVL } from "@/lib/utils/staking";
import { EarlyWithdrawModal } from "@/components/modals/early-withdraw-modal";
import { useCryptoPrices } from "@/components/crypto/use-crypto-prices";
import { cn } from "@/lib/utils/cn";

export function PositionsTable({ decimals = RWAN_DECIMALS }: { decimals?: number }) {
  const mounted = useMounted();
  const isMobile = useIsMobile();
  const { address } = useAccount();
  const { positions, isLoading } = usePositionsWithRewards();
  const { claim, isPending: isClaimPending } = useClaimPosition();
  const { withdraw, isPending: isWithdrawPending } = useWithdrawPosition();
  const { writeContractAsync: withdrawEarly, isPending: isWithdrawEarlyPending } = useWithdrawEarly();
  const { trackTx } = useTransactionToasts();
  const lockOptions = useLockOptions();
  const totalStaked = useTotalStaked();
  const aprTiers = useAprTiers();
  const currentApr = useCurrentAprBps();
  const { prices } = useCryptoPrices();
  const rwanPriceUsd = prices.find((item) => item.symbol === "$Rwaan")?.priceUsd ?? 0;

  const [pendingClaimId, setPendingClaimId] = useState<bigint | null>(null);
  const [pendingWithdrawId, setPendingWithdrawId] = useState<bigint | null>(null);
  const [earlyWithdrawModalOpen, setEarlyWithdrawModalOpen] = useState(false);
  const [selectedPositionForEarlyWithdraw, setSelectedPositionForEarlyWithdraw] = useState<bigint | null>(null);

  const totalPending = useMemo(
    () => positions.reduce((sum, position) => sum + position.pendingRewards, 0n),
    [positions]
  );

  const baseAprBps = useMemo(() => {
    if (currentApr.data !== undefined) return BigInt(currentApr.data);
    if (!totalStaked.data) return 0n;
    const tiers = aprTiers.tiers.filter(Boolean) as AprTier[];
    if (tiers.length === 0) return 0n;
    return aprForTVL(totalStaked.data, tiers);
  }, [currentApr.data, totalStaked.data, aprTiers.tiers]);

  const lockOptionsMap = useMemo(() => {
    const options = lockOptions.options.filter(
      (option): option is NonNullable<typeof option> => Boolean(option)
    );
    return new Map(options.map((option) => [option.id, option]));
  }, [lockOptions.options]);

  const handleClaim = async (positionId: bigint) => {
    if (!address) return;
    setPendingClaimId(positionId);
    const hash = await claim(positionId);
    if (!hash) { setPendingClaimId(null); return; }
    const position = positions.find(p => p.id === positionId);
    const rewardAmount = position ? formatToken(position.pendingRewards, decimals) : "0";
    trackTx(hash, { title: "Claim rewards", successMessage: "Rewards claimed.", errorMessage: "Claim failed.", retry: () => handleClaim(positionId), action: "Claimed", amount: `${rewardAmount} $Rwaan` });
    confetti({ particleCount: isMobile ? 40 : 80, spread: isMobile ? 40 : 60, origin: { y: 0.6 }, colors: ["#F3BA2F", "#10B981"] });
    setPendingClaimId(null);
  };

  const handleWithdraw = async (positionId: bigint) => {
    if (!address) return;
    setPendingWithdrawId(positionId);
    const hash = await withdraw(positionId);
    if (!hash) { setPendingWithdrawId(null); return; }
    const position = positions.find(p => p.id === positionId);
    const stakedAmount = position ? formatToken(position.amount, decimals) : "0";
    trackTx(hash, { title: "Withdraw position", successMessage: "Position withdrawn.", errorMessage: "Withdraw failed.", retry: () => handleWithdraw(positionId), action: "Withdrew", amount: `${stakedAmount} $Rwaan` });
    setPendingWithdrawId(null);
  };

  const handleRequestEarlyWithdraw = (positionId: bigint) => {
    setSelectedPositionForEarlyWithdraw(positionId);
    setEarlyWithdrawModalOpen(true);
  };

  const handleConfirmEarlyWithdraw = async () => {
    if (!selectedPositionForEarlyWithdraw || !address) return;
    setEarlyWithdrawModalOpen(false);
    setPendingWithdrawId(selectedPositionForEarlyWithdraw);
    try {
      const hash = await withdrawEarly?.({
        address: RWAN_STAKING_ADDRESS, abi: RWAN_STAKING_ABI, functionName: "withdrawEarly", args: [selectedPositionForEarlyWithdraw],
      });
      if (!hash) { setPendingWithdrawId(null); setSelectedPositionForEarlyWithdraw(null); return; }
      const position = positions.find(p => p.id === selectedPositionForEarlyWithdraw);
      const stakedAmount = position ? formatToken(position.amount, decimals) : "0";
      trackTx(hash, { title: "Early withdrawal", successMessage: "Position withdrawn (35% penalty applied).", errorMessage: "Early withdrawal failed.", retry: handleConfirmEarlyWithdraw, action: "Withdrew Early", amount: `${stakedAmount} $Rwaan` });
    } catch (error) { console.error("Early withdrawal error:", error); } finally { setPendingWithdrawId(null); setSelectedPositionForEarlyWithdraw(null); }
  };

  if (!mounted) {
    return (
      <div className="premium-card rounded-2xl p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!address) {
    return <EmptyState title="Wallet required" description="Connect your wallet to view your staking positions." />;
  }

  if (!isLoading && positions.length === 0) {
    return <EmptyState title="No positions yet" description="Stake $Rwaan to open your first position. Each stake creates its own reward stream." />;
  }

  return (
    <div className="premium-card rounded-2xl p-4 md:p-6 overflow-hidden">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[15px] font-semibold text-white">Your positions</div>
          <div className="text-[12px] text-white/25 mt-0.5">
            Accrued interest: <span className="text-[#F3BA2F]/70 font-medium">{formatToken(totalPending, decimals)} $Rwaan</span>
          </div>
        </div>
        <Badge variant="accent">{positions.length} position{positions.length !== 1 ? "s" : ""}</Badge>
      </div>

      {/* Mobile card layout */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoading
          ? Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={`skeleton-mobile-${index}`} className="h-40 w-full rounded-xl" />
          ))
          : positions.map((position) => (
            <MobilePositionCard
              key={position.id.toString()}
              position={position}
              decimals={decimals}
              onClaim={handleClaim}
              onWithdraw={handleWithdraw}
              onEarlyWithdraw={handleRequestEarlyWithdraw}
              isClaimPending={pendingClaimId === position.id}
              isWithdrawPending={pendingWithdrawId === position.id}
              baseAprBps={baseAprBps}
              lockOption={lockOptionsMap.get(position.lockId)}
              walletConnected={Boolean(address)}
              priceUsd={rwanPriceUsd}
            />
          ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block overflow-x-auto">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>Amount</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>APR</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Unlock Date</TableHead>
              <TableHead>Accrued Interest</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell colSpan={7}><Skeleton className="h-10 w-full rounded-lg" /></TableCell>
                </TableRow>
              ))
              : positions.map((position) => (
                <PositionRow
                  key={position.id.toString()}
                  position={position}
                  decimals={decimals}
                  onClaim={handleClaim}
                  onWithdraw={handleWithdraw}
                  onEarlyWithdraw={handleRequestEarlyWithdraw}
                  isClaimPending={pendingClaimId === position.id}
                  isWithdrawPending={pendingWithdrawId === position.id}
                  baseAprBps={baseAprBps}
                  lockOption={lockOptionsMap.get(position.lockId)}
                  walletConnected={Boolean(address)}
                  priceUsd={rwanPriceUsd}
                />
              ))}
          </TableBody>
        </Table>
      </div>

      <EarlyWithdrawModal
        open={earlyWithdrawModalOpen}
        penaltyAmount={
          selectedPositionForEarlyWithdraw
            ? formatToken((positions.find(p => p.id === selectedPositionForEarlyWithdraw)?.amount ?? 0n) * 35n / 100n, decimals)
            : "0"
        }
        onConfirm={handleConfirmEarlyWithdraw}
        onClose={() => { setEarlyWithdrawModalOpen(false); setSelectedPositionForEarlyWithdraw(null); }}
      />
    </div>
  );
}

type PositionProps = {
  position: { id: bigint; amount: bigint; weightedAmount: bigint; startTime: bigint; unlockTime: bigint; lockId: bigint; pendingRewards: bigint; };
  decimals: number; onClaim: (positionId: bigint) => void; onWithdraw: (positionId: bigint) => void; onEarlyWithdraw: (positionId: bigint) => void;
  isClaimPending: boolean; isWithdrawPending: boolean; baseAprBps: bigint;
  lockOption?: { id: bigint; duration: bigint; multiplierBps: bigint; active: boolean }; walletConnected: boolean; priceUsd: number;
};

function MobilePositionCard({
  position, decimals, onClaim, onWithdraw, onEarlyWithdraw, isClaimPending, isWithdrawPending, baseAprBps, lockOption, walletConnected, priceUsd,
}: PositionProps) {
  const unlockAt = position.unlockTime > 0n ? Number(position.unlockTime) : null;
  const { remaining, isUnlocked } = useCountdown(unlockAt);
  const plan = lockOption ? STAKING_PLANS.find((item) => BigInt(item.durationSeconds) === lockOption.duration) : undefined;
  const multiplierBps = position.amount > 0n ? (position.weightedAmount * 10_000n) / position.amount : 10_000n;
  const effectiveAprBps = baseAprBps > 0n ? (baseAprBps * multiplierBps) / 10_000n : 0n;
  const isClaimable = position.pendingRewards > 0n;
  const isFlexible = position.unlockTime === 0n;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
      {/* Top row: Amount + Plan badge */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[14px] font-semibold text-white/80">{formatToken(position.amount, decimals)} $Rwaan</div>
          <div className="text-[11px] text-white/20 mt-0.5">
            {priceUsd > 0 ? `≈ ${formatUsd(Number(formatUnits(position.amount, decimals)) * priceUsd)}` : "—"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-emerald-400/70">{effectiveAprBps ? formatBps(effectiveAprBps) : "—"}</span>
          <Badge variant="outline" className="text-[10px]">{plan?.label ?? (isFlexible ? "Flexible" : "Custom")}</Badge>
        </div>
      </div>

      {/* Dates row */}
      <div className="flex items-center justify-between text-[11px] text-white/30">
        <span>Started {formatDateFromSeconds(Number(position.startTime))}</span>
        <span>
          {unlockAt
            ? isUnlocked ? "Unlocked" : `${Math.floor(remaining / 86400)}d ${Math.floor((remaining % 86400) / 3600)}h left`
            : "Flexible"}
        </span>
      </div>

      {/* Timeline */}
      <PositionTimeline startTime={position.startTime} unlockTime={position.unlockTime} />

      {/* Rewards + Actions */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.04]">
        <div>
          <div className="text-[10px] text-white/20 uppercase tracking-wider">Accrued</div>
          <div className="text-[13px] font-medium text-[#F3BA2F]/70">{formatToken(position.pendingRewards, decimals)} $Rwaan</div>
        </div>
        <div className="flex gap-2">
          {walletConnected && (
            <>
              <Button
                size="sm"
                variant="secondary"
                className={cn(
                  "text-[12px] h-8 px-3",
                  isClaimable && !isClaimPending ? "claim-pulse border-emerald-400/15 text-emerald-400/80 hover:bg-emerald-400/[0.06]" : ""
                )}
                disabled={!isClaimable || isClaimPending}
                onClick={() => onClaim(position.id)}
              >
                {isClaimPending ? "..." : "Claim"}
              </Button>
              {(isFlexible || isUnlocked) ? (
                <Button size="sm" className="text-[12px] h-8 px-3" disabled={isWithdrawPending} onClick={() => onWithdraw(position.id)}>
                  {isWithdrawPending ? "..." : "Withdraw"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[11px] h-8 px-2.5 border-amber-500/20 text-amber-400/70 hover:bg-amber-500/[0.06]"
                  disabled={isWithdrawPending}
                  onClick={() => onEarlyWithdraw(position.id)}
                >
                  {isWithdrawPending ? "..." : "Early (35%)"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PositionRow({
  position, decimals, onClaim, onWithdraw, onEarlyWithdraw, isClaimPending, isWithdrawPending, baseAprBps, lockOption, walletConnected, priceUsd,
}: PositionProps) {
  const unlockAt = position.unlockTime > 0n ? Number(position.unlockTime) : null;
  const { remaining, isUnlocked } = useCountdown(unlockAt);
  const plan = lockOption ? STAKING_PLANS.find((item) => BigInt(item.durationSeconds) === lockOption.duration) : undefined;
  const multiplierBps = position.amount > 0n ? (position.weightedAmount * 10_000n) / position.amount : 10_000n;
  const effectiveAprBps = baseAprBps > 0n ? (baseAprBps * multiplierBps) / 10_000n : 0n;
  const isClaimable = position.pendingRewards > 0n;
  const isFlexible = position.unlockTime === 0n;

  return (
    <>
      <TableRow className="border-b border-white/[0.03]">
        <TableCell>
          <div className="flex flex-col">
            <span className="font-medium text-white/80">{formatToken(position.amount, decimals)} $Rwaan</span>
            <span className="text-[11px] text-white/20 mt-0.5">
              {priceUsd > 0 ? `≈ ${formatUsd(Number(formatUnits(position.amount, decimals)) * priceUsd)}` : "—"}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <span className="text-white/60">{plan?.label ?? (isFlexible ? "Flexible" : "Custom")}</span>
        </TableCell>
        <TableCell>
          <span className="text-emerald-400/70 font-medium">{effectiveAprBps ? formatBps(effectiveAprBps) : "—"}</span>
        </TableCell>
        <TableCell><span className="text-white/40">{formatDateFromSeconds(Number(position.startTime))}</span></TableCell>
        <TableCell>
          {unlockAt ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default text-white/40">{formatDateFromSeconds(unlockAt)}</span>
                </TooltipTrigger>
                <TooltipContent>
                  {isUnlocked ? "Position unlocked." : `${Math.floor(remaining / 86400)}d ${Math.floor((remaining % 86400) / 3600)}h remaining`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-emerald-400/50 text-[12px] font-medium">Flexible</span>
          )}
        </TableCell>
        <TableCell>
          <span className="text-[#F3BA2F]/70 font-medium">{formatToken(position.pendingRewards, decimals)} $Rwaan</span>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex flex-wrap justify-end gap-2">
            {!walletConnected ? (
              <span className="text-[11px] text-white/20 italic">Wallet required</span>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  className={isClaimable && !isClaimPending ? "claim-pulse border-emerald-400/15 text-emerald-400/80 hover:bg-emerald-400/[0.06]" : ""}
                  disabled={!isClaimable || isClaimPending}
                  onClick={() => onClaim(position.id)}
                >
                  {isClaimPending ? "Claiming..." : "Claim"}
                </Button>
                {(isFlexible || isUnlocked) ? (
                  <Button size="sm" disabled={isWithdrawPending} onClick={() => onWithdraw(position.id)}>
                    {isWithdrawPending ? "Withdrawing..." : "Withdraw"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-500/20 text-amber-400/70 hover:bg-amber-500/[0.06]"
                    disabled={isWithdrawPending}
                    onClick={() => onEarlyWithdraw(position.id)}
                  >
                    {isWithdrawPending ? "Withdrawing..." : "Early Withdraw (35%)"}
                  </Button>
                )}
              </>
            )}
          </div>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={7} className="pb-4 pt-1">
          <PositionTimeline startTime={position.startTime} unlockTime={position.unlockTime} />
        </TableCell>
      </TableRow>
    </>
  );
}

function PositionTimeline({ startTime, unlockTime }: { startTime: bigint; unlockTime: bigint }) {
  const start = Number(startTime);
  const unlock = unlockTime > 0n ? Number(unlockTime) : null;
  const now = Math.floor(Date.now() / 1000);

  if (!unlock) {
    return (
      <div className="flex items-center gap-2.5 text-[11px] text-white/20">
        <span className="rounded-md bg-emerald-400/[0.08] border border-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400/80">
          Flexible
        </span>
        <span>Rewards accrue immediately.</span>
      </div>
    );
  }

  const total = Math.max(unlock - start, 1);
  const progress = Math.min(Math.max((now - start) / total, 0), 1);
  const pct = `${Math.round(progress * 100)}%`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[10px] text-white/15">
        <span>Start {formatDateFromSeconds(start)}</span>
        <span>Unlock {formatDateFromSeconds(unlock)}</span>
      </div>
      <div className="relative h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400/80 to-[#F3BA2F]/80" style={{ width: pct }} />
      </div>
      <div className="flex items-center justify-between text-[10px] text-white/15">
        <span>Claimable anytime</span>
        <span>{Math.round(progress * 100)}% elapsed</span>
      </div>
    </div>
  );
}
