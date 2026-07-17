/**
 * Global wallet guard hook
 * Ensures all wallet-dependent state is cleared on disconnect
 * Prevents stale data leaks and race conditions
 */

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Guards against stale wallet data
 * Call this at app root level to enable global disconnect cleanup
 */
export function useWalletStateGuard() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const prevAddress = useRef<string | undefined>(address);
  const prevWalletReady = useRef<boolean>(Boolean(isConnected && address));

  useEffect(() => {
    // Detect wallet disconnect or address change
    const walletReady = Boolean(isConnected && address);
    const wasReady = prevWalletReady.current;
    const addressChanged = prevAddress.current !== address;
    if ((wasReady && !walletReady) || (wasReady && addressChanged)) {
      console.log("[WalletGuard] Clearing wallet state:", {
        wasConnected: wasReady,
        isNowDisconnected: !walletReady,
        addressChanged,
        prevAddress: prevAddress.current,
        newAddress: address,
      });

      // Clear ALL React Query cache
      // This removes all cached blockchain reads
      queryClient.clear();

      // Also explicitly invalidate all queries to trigger refetch when reconnected
      queryClient.invalidateQueries();

      // Clear localStorage wallet data to prevent auto-reconnect
      if (typeof window !== "undefined") {
        const keysToRemove = [
          "wagmi.store",
          "wagmi.recentConnectorId",
          "wagmi.wallet",
          "wagmi.connected",
          "@rainbow-kit/recent-wallet",
          "walletconnect"
        ];

        keysToRemove.forEach(key => localStorage.removeItem(key));

        console.log("[WalletGuard] Cleared persistent connection state");
      }
    }

    // Update refs for next comparison
    prevAddress.current = address;
    prevWalletReady.current = walletReady;
  }, [address, isConnected, queryClient]);
}

/**
 * Hook to check if wallet operations are safe
 * Returns true only if wallet is connected and ready
 */
export function useWalletReady() {
  const { address, isConnected } = useAccount();
  return isConnected && !!address;
}

/**
 * Hook that returns address only if wallet is connected
 * Returns undefined if disconnected (safer than direct useAccount)
 */
export function useSafeAddress() {
  const { address, isConnected } = useAccount();
  return isConnected ? address : undefined;
}
