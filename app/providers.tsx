"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { createConfig, fallback, http } from "wagmi";
import { bsc } from "wagmi/chains";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

const wagmiConfig = createConfig({
  chains: [bsc],
  transports: {
    [bsc.id]: fallback([
      http("/api/rpc", { retryCount: 1, retryDelay: 1_000, timeout: 15_000 }),
    ]),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined" && !window.sessionStorage.getItem("_rwanClean")) {
      ["wagmi.store", "wagmi.connected", "wagmi.wallet", "wagmi.injected", "wc@2", "WCM_VERSION"].forEach((k) => {
        Object.keys(localStorage).filter((lk) => lk.startsWith(k)).forEach((lk) => localStorage.removeItem(lk));
      });
      window.sessionStorage.setItem("_rwanClean", "1");
    }
  }, []);

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
