import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWaitForTransactionReceipt } from "wagmi";

import { useToast } from "@/components/ui/use-toast";
import { useNotifications } from "@/components/notifications/notifications-provider";
import { BSC_SCAN_BASE } from "@/lib/utils/constants";
import type { TransactionMeta } from "@/types/transactions";

type TrackedTx = TransactionMeta & {
  hash: `0x${string}`;
  amount?: string; // Optional: formatted amount for display (e.g., "10,000 $Rwaan")
  action?: string; // Optional: action type (e.g., "Claimed", "Staked", "Withdrawn")
};

export function useTransactionToasts() {
  const { toast } = useToast();
  const { addNotification } = useNotifications();
  const [tracked, setTracked] = useState<TrackedTx | null>(null);
  const queryClient = useQueryClient();

  const { data, status, error } = useWaitForTransactionReceipt({
    hash: tracked?.hash,
    query: {
      enabled: Boolean(tracked?.hash),
    },
  });

  useEffect(() => {
    if (!tracked) return;
    
    // Build description with action and amount details
    let description = "Transaction submitted. Awaiting confirmation.";
    if (tracked.action && tracked.amount) {
      description = `${tracked.action} ${tracked.amount}. Awaiting confirmation.`;
    } else if (tracked.action) {
      description = `${tracked.action}. Awaiting confirmation.`;
    }
    
    toast({
      title: tracked.title,
      description,
      action: (
        <a
          className="text-xs font-medium text-primary hover:underline"
          href={`${BSC_SCAN_BASE}${tracked.hash}`}
          target="_blank"
          rel="noreferrer"
        >
          View on BscScan
        </a>
      ),
    });
  }, [toast, tracked]);

  useEffect(() => {
    if (!tracked) return;
    if (status === "success" && data && data.status === "success") {
      // Build success description with action and amount details
      let description = "Your transaction was finalized on-chain.";
      if (tracked.action && tracked.amount) {
        description = `Successfully ${tracked.action.toLowerCase()} ${tracked.amount}.`;
      } else if (tracked.action) {
        description = `${tracked.action} successfully completed.`;
      }
      
      toast({
        title: tracked.successMessage ?? "Transaction confirmed.",
        description,
        action: (
          <a
            className="text-xs font-medium text-primary hover:underline"
            href={`${BSC_SCAN_BASE}${tracked.hash}`}
            target="_blank"
            rel="noreferrer"
          >
            View on BscScan
          </a>
        ),
      });
      
      // Add to notification bell history
      addNotification({
        title: tracked.successMessage ?? "Transaction confirmed",
        description,
        amount: tracked.amount,
      });
      
      tracked.onSuccess?.();
      queryClient.invalidateQueries();
      setTracked(null);
    }
    if (status === "error" && error) {
      toast({
        title: tracked.errorMessage ?? "Transaction failed.",
        description: error.message ?? "Please try again.",
        action: tracked.retry ? (
          <button
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => tracked.retry?.()}
          >
            Retry
          </button>
        ) : undefined,
      });
      tracked.onError?.();
      setTracked(null);
    }
  }, [data, error, status, toast, tracked, queryClient, addNotification]);

  return useMemo(
    () => ({
      trackTx: (
        hash: `0x${string}`, 
        meta: TransactionMeta & { amount?: string; action?: string }
      ) =>
        setTracked({ hash, ...meta }),
    }),
    []
  );
}
