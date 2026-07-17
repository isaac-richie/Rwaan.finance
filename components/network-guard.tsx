"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { bsc } from "wagmi/chains";
import { AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";

export function NetworkGuard() {
  const { isConnected, chain } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending, error } = useSwitchChain();
  const [isDismissed, setIsDismissed] = useState(false);

  const isWrongNetwork = isConnected && chainId !== bsc.id;

  // Reset dismissed state when network changes
  useEffect(() => {
    if (!isWrongNetwork) {
      setIsDismissed(false);
    }
  }, [isWrongNetwork]);

  // Don't show if not connected, on correct network, or manually dismissed
  if (!isConnected || !isWrongNetwork || isDismissed) {
    return null;
  }

  const handleSwitchNetwork = () => {
    if (switchChain) {
      switchChain({ chainId: bsc.id });
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-amber-500/20 bg-amber-500/10 backdrop-blur-xl"
      >
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
          {/* Icon + Message */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Wrong Network Detected
              </div>
              <div className="text-xs text-muted-foreground">
                {chain?.name ? (
                  <>
                    You&apos;re on <span className="font-medium text-foreground">{chain.name}</span>. 
                    Please switch to <span className="font-medium text-amber-500">BNB Smart Chain (BSC)</span> to use this app.
                  </>
                ) : (
                  <>
                    Please switch to <span className="font-medium text-amber-500">BNB Smart Chain (BSC)</span> to continue.
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSwitchNetwork}
              disabled={!switchChain || isPending}
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-black font-medium"
            >
              {isPending ? "Switching..." : "Switch to BSC"}
            </Button>
            <button
              onClick={() => setIsDismissed(true)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="border-t border-amber-500/20 bg-red-500/10 px-4 py-2">
            <div className="text-xs text-red-400">
              {error.message.includes("does not support programmatic chain switching") ? (
                <>
                  Your wallet doesn&apos;t support automatic network switching. 
                  Please manually switch to <span className="font-medium">BNB Smart Chain (BSC)</span> in your wallet.
                </>
              ) : (
                <>Failed to switch network: {error.message}</>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
