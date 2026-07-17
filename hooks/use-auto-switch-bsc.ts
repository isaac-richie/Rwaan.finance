/**
 * Auto-switch to BSC chain when wallet connects
 * Wallet-aware chain switching hook
 */

"use client";

import { useEffect } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { bsc } from "wagmi/chains";

export function useAutoSwitchToBsc() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    // Only attempt switch if wallet is connected
    const walletConnected = isConnected && !!address;
    
    if (!walletConnected) return;
    if (!switchChain) return;

    // If not on BSC, auto-switch
    if (chainId !== bsc.id) {
      console.log("[AutoSwitch] Switching to BSC chain from chain ID", chainId);
      
      try {
        switchChain({ chainId: bsc.id });
      } catch (error) {
        console.error("[AutoSwitch] Failed to switch to BSC:", error);
      }
    }
  }, [address, isConnected, chainId, switchChain]);
}
