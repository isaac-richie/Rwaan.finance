"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { fallback, http } from "wagmi";
import { bsc } from "wagmi/chains";
import { PrivyProvider } from "@privy-io/react-auth";
// IMPORTANT: createConfig MUST come from @privy-io/wagmi, not from wagmi.
// Privy's version sets ssr:true, strips injected connectors, and disables
// multiInjectedProviderDiscovery so Privy is the sole connection manager.
// Using wagmi's createConfig makes wagmi fight Privy for control, which
// desyncs useAccount() on client-side navigation (wallet appears to drop).
import { WagmiProvider, createConfig } from "@privy-io/wagmi";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

const wagmiConfig = createConfig({
  chains: [bsc],
  // EIP-6963 discovery. Privy's login modal surfaces browser-extension wallets
  // (Rabby, Trust, OKX, …) under `detected_wallets` by listening for their
  // EIP-6963 announcements — with discovery off, Rabby never appears because it
  // only announces via EIP-6963 (no dedicated Privy button; that entry is
  // deprecated). Enabling it here does NOT reintroduce the old wallet-drop
  // desync: that came from wagmi's own createConfig adding competing injected
  // connectors. We use @privy-io/wagmi's createConfig, so Privy stays the sole
  // connection manager and just gains visibility of the announced wallets.
  multiInjectedProviderDiscovery: true,
  transports: {
    [bsc.id]: fallback([
      http("/api/rpc", {
        retryCount: 1,
        retryDelay: 1_000,
        timeout: 15_000,
        batch: { batchSize: 100, wait: 16 },
      }),
    ]),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  // Privy manages wallet reconnection — do not clear wagmi/wc localStorage
  // keys here. The old cleanup was killing the wallet session on every new
  // browser tab and on client-side navigation between pages.

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: false,
            refetchIntervalInBackground: false,
            retry: (failureCount, error) => {
              const message =
                error instanceof Error ? error.message : String(error);
              if (
                message.includes("429") ||
                message.toLowerCase().includes("too many requests")
              )
                return false;
              if (
                message.includes("400") ||
                message.toLowerCase().includes("bad request")
              )
                return false;
              return failureCount < 1;
            },
            retryDelay: (attemptIndex) =>
              Math.min(1_000 * 2 ** attemptIndex, 10_000),
          },
        },
      })
  );

  if (!privyAppId) {
    return (
      <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-muted-foreground">
        Set <code>NEXT_PUBLIC_PRIVY_APP_ID</code> in your <code>.env</code> to
        enable wallet connections, then restart <code>npm run dev</code>.
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#FACC15",
          logo: "/favicon.png",
          showWalletLoginFirst: true,
          // Community-preferred wallets, in priority order. 'metamask',
          // 'bitget_wallet' and 'rabby_wallet' are pinned to the top so they
          // always get their own row; 'detected_wallets' surfaces any other
          // installed extension (Trust, imToken, OKX, 1inch, …); 'wallet_connect'
          // covers the mobile apps via QR. rabby_wallet is listed explicitly
          // (in addition to detection) so Rabby is never buried under the
          // "Other wallets" fold.
          walletList: [
            "metamask",
            "bitget_wallet",
            "rabby_wallet",
            "detected_wallets",
            "wallet_connect",
          ],
        },
        loginMethods: ["wallet"],
        defaultChain: bsc,
        supportedChains: [bsc],
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
