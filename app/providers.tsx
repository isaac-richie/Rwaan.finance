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
