"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { useWatchContractEvent } from "wagmi";

import { useNotifications } from "@/components/notifications/notifications-provider";
import { usePositionsWithRewards } from "@/hooks/use-positions";
import { RWAN_STAKING_ABI, RWAN_STAKING_ADDRESS } from "@/lib/contracts/rwanStakingAbi";
import { RWAN_DECIMALS } from "@/lib/utils/constants";
import { formatToken } from "@/lib/utils/format";

export function NotificationsSync() {
  const { address } = useAccount();
  const { positions } = usePositionsWithRewards();
  const { addNotification } = useNotifications();

  useEffect(() => {
    if (!address || positions.length === 0) return;
    const now = Math.floor(Date.now() / 1000);

    positions.forEach((position) => {
      if (position.withdrawn || position.unlockTime <= 0n) return;
      const unlockAt = Number(position.unlockTime);
      if (Number.isNaN(unlockAt) || unlockAt > now) return;

      addNotification({
        id: `unlock-${position.id.toString()}`,
        title: "Stake unlocked",
        description: `Position ${position.id.toString()} is ready to withdraw.`,
        kind: "unlock",
      });
    });
  }, [address, positions, addNotification]);

  useWatchContractEvent({
    address: RWAN_STAKING_ADDRESS,
    abi: RWAN_STAKING_ABI,
    eventName: "ReferralEarned",
    poll: true,
    pollingInterval: 60_000,
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
