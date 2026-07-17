"use client";

import { useAccount } from "wagmi";

import { LockOptionsManager } from "@/components/admin/LockOptionsManager";
import { OwnershipTransferForm } from "@/components/admin/OwnershipTransferForm";
import { RecoverERC20Form } from "@/components/admin/RecoverERC20Form";
import { FundOverview } from "@/components/admin/FundOverview"; // New component
import { RewardNotifier } from "@/components/admin/RewardNotifier";
import { EmergencyControls } from "@/components/admin/EmergencyControls";
import { StakingSettings } from "@/components/admin/StakingSettings";
import { Section } from "@/components/section";
import { Skeleton } from "@/components/ui/skeleton";
import { useOwner } from "@/hooks/use-staking-reads";
import { useMounted } from "@/hooks/use-mounted";
import { formatAddress } from "@/lib/utils/format";

export function AdminPanel({ forceShow = false }: { forceShow?: boolean }) {
  const mounted = useMounted();
  const { address, isConnected } = useAccount();
  const owner = useOwner();

  // CRITICAL: Require wagmi connection for admin actions
  const walletConnected = isConnected && !!address;

  // CRITICAL: Check wallet is connected AND address matches owner
  const isOwner =
    walletConnected &&
    address &&
    owner.data &&
    address.toLowerCase() === owner.data.toLowerCase();

  // Prevent SSR rendering
  if (!mounted) {
    return null;
  }

  // CRITICAL: If wallet disconnected, hide admin panel immediately
  if (!walletConnected) {
    return null;
  }

  if (owner.isLoading) {
    return (
      <div className="glass glass-solid rounded-2xl p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-20 w-full" />
      </div>
    );
  }

  if (!isOwner && !forceShow) return null;

  return (
    <Section
      title="Admin"
      description="Owner-only controls for protocol configuration."
    >
      <div className="glass glass-solid rounded-2xl p-6 animate-fade-in">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Admin panel
            </div>
            <h3 className="mt-2 text-2xl font-semibold">Protocol controls</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Connected as owner: {formatAddress(owner.data as string)}
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <FundOverview />
          <EmergencyControls />
          <StakingSettings />
          <LockOptionsManager />
          <RewardNotifier />
          <RecoverERC20Form />
          <OwnershipTransferForm />
        </div>
      </div>
    </Section>
  );
}
