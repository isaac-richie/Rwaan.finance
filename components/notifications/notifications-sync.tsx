"use client";

import { useEffect, useMemo } from "react";
import { useAccount, useReadContract, useReadContracts, useWatchContractEvent } from "wagmi";

import { useNotifications } from "@/components/notifications/notifications-provider";
import { RWAN_V5_ABI, RWAN_V5_STAKING_ADDRESS } from "@/lib/contracts/rwanV5Abi";
import { RWAN_DECIMALS } from "@/lib/utils/constants";
import { formatToken } from "@/lib/utils/format";

export function NotificationsSync() {
  const { address } = useAccount();
  const { addNotification } = useNotifications();

  const contractAddress = RWAN_V5_STAKING_ADDRESS;
  const enabled = Boolean(contractAddress) && Boolean(address);

  const idsRead = useReadContract({
    address: contractAddress,
    abi: RWAN_V5_ABI,
    functionName: "userPositions",
    args: address ? [address] : undefined,
    query: { enabled, refetchInterval: 120_000 },
  });

  const ids = useMemo(() => [...(idsRead.data ?? [])], [idsRead.data]);

  const positionsRead = useReadContracts({
    contracts: ids.map((id) => ({
      address: contractAddress!,
      abi: RWAN_V5_ABI,
      functionName: "positions" as const,
      args: [id] as const,
    })),
    query: { enabled: enabled && ids.length > 0, refetchInterval: 120_000 },
  });

  useEffect(() => {
    if (!address || ids.length === 0 || !positionsRead.data) return;
    const now = Math.floor(Date.now() / 1000);

    ids.forEach((id, index) => {
      const pos = positionsRead.data?.[index]?.result as
        | readonly [bigint, bigint, bigint, bigint, bigint, boolean]
        | undefined;
      if (!pos) return;
      const [, , , unlockTime, , withdrawn] = pos;
      if (withdrawn || unlockTime <= 0n) return;
      const unlockAt = Number(unlockTime);
      if (Number.isNaN(unlockAt) || unlockAt > now) return;

      addNotification({
        id: `unlock-${id.toString()}`,
        title: "Stake unlocked",
        description: `Position ${id.toString()} is ready to withdraw.`,
        kind: "unlock",
      });
    });
  }, [address, ids, positionsRead.data, addNotification]);

  useWatchContractEvent({
    address: contractAddress,
    abi: RWAN_V5_ABI,
    eventName: "AffiliateRewardPaid",
    enabled: enabled,
    poll: true,
    pollingInterval: 120_000,
    onLogs(logs) {
      if (!address) return;
      logs.forEach((log) => {
        const referrer = log.args?.referrer as `0x${string}` | undefined;
        if (!referrer) return;
        if (referrer.toLowerCase() !== address.toLowerCase()) return;

        const rewardAmount = log.args?.amount as bigint | undefined;
        const formatted = formatToken(rewardAmount ?? 0n, RWAN_DECIMALS, 4);

        addNotification({
          id: `referral-${log.transactionHash}-${log.logIndex}`,
          title: "Referral bonus received",
          description: `${formatted} $Rwaan credited to your wallet.`,
          timestamp: Date.now(),
          kind: "referral",
          amount: (rewardAmount ?? 0n).toString(),
        });
      });
    },
  });

  return null;
}
