import "./globals.css";

import type { Metadata } from "next";
import { Space_Grotesk, Syne, Instrument_Serif } from "next/font/google";

import { PriceTicker } from "@/components/price-ticker";
import { ToastRoot } from "@/components/toast-root";
import { Toaster } from "@/components/ui/toaster";
import { NetworkGuard } from "@/components/network-guard";
import { WalletStateManager } from "@/components/wallet-state-manager";
import { ScrollPerformanceOptimizer } from "@/components/scroll-performance";
import { Providers } from "./providers";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "$RWAN Staking - Premium Yield on BNB Chain",
  description: "Stake $RWAN on BNB Smart Chain with flexible and locked options. Earn premium yield with confidence.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${syne.variable} ${instrumentSerif.variable} font-sans`}
      >
        <Providers>
          <ToastRoot>
            <WalletStateManager />
            <ScrollPerformanceOptimizer />
            <NetworkGuard />
            <div className="relative min-h-screen flex flex-col">
              <PriceTicker />
              <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 pb-8 sm:px-8 md:px-12">
                {children}
              </main>
            </div>
            <Toaster />
          </ToastRoot>
        </Providers>
      </body>
    </html>
  );
}
