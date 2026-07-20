"use client";

import Image from "next/image";
import dynamic from "next/dynamic";

import { cn } from "@/lib/utils/cn";
import { NotificationsBell } from "@/components/notifications/notifications-bell";
import { NotificationsSync } from "@/components/notifications/notifications-sync";
import { useMounted } from "@/hooks/use-mounted";

const WalletButton = dynamic(
  () => import("@/components/wallet-button").then((mod) => mod.WalletButton),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 w-[120px] animate-pulse rounded-full border border-white/5 bg-white/[0.03]" />
    ),
  }
);

const CryptoTicker = dynamic(
  () =>
    import("@/components/crypto/crypto-ticker").then(
      (mod) => mod.CryptoTicker
    ),
  {
    ssr: false,
    loading: () => (
      <div className="border-b border-white/[0.04] bg-surface-1/50">
        <div className="mx-auto h-9 w-full max-w-6xl px-4 md:px-8" />
      </div>
    ),
  }
);

export function SiteHeader() {
  const mounted = useMounted();
  return (
    <header className="sticky top-0 z-40">
      {/* Main nav bar */}
      <div className="relative z-50 border-b border-white/[0.06] bg-[hsl(225_25%_3%/0.85)] backdrop-blur-2xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3.5 md:px-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] p-0.5 shadow-sm">
              <Image
                src="/logo-rwaan-network.png"
                alt="RWAN logo"
                width={36}
                height={36}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-[10px] object-cover"
                priority
              />
              <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full border-2 border-[hsl(225_25%_3%)] bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            </div>
            <div className="flex flex-col gap-0">
              <span className="text-[13px] sm:text-[15px] font-semibold tracking-tight text-white">
                Rwan Analytics
              </span>
              <div className="flex items-center gap-1.5" />
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {mounted ? (
              <>
                <NotificationsBell />
                <WalletButton />
              </>
            ) : (
              <>
                <div className="h-9 w-9 animate-pulse rounded-full border border-white/5 bg-white/[0.03]" />
                <div className="h-10 w-[120px] animate-pulse rounded-full border border-white/5 bg-white/[0.03]" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Ticker — hidden on very small screens to save space */}
      <div className="hidden xs:block">
        <CryptoTicker compact className="relative z-10" />
      </div>
      <NotificationsSync />
    </header>
  );
}
