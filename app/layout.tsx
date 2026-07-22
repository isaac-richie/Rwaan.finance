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

const SITE_URL = "https://www.rawli.finance";
const SITE_NAME = "Rawli Finance";
const SITE_DESC =
  "Non-custodial $RWAAN staking on BNB Smart Chain. Seven plans from no-lock Flex to a 720-day marketplace tier, with rates and terms set on-chain. Staking contract 0x85DFdDbf41e8220A89B014f4E89a908bCDEd182b, verified on BscScan.";

// Full, consistent site identity. Automated site classifiers (GoPlus, Blockaid,
// ScamSniffer) weigh complete metadata, a stable canonical origin, and a real
// project description as legitimacy signals — drainer clones rarely have them.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Rawli Finance — $RWAAN Staking (Fixed Daily Rates)",
    template: "%s — Rawli Finance",
  },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  keywords: [
    "RWAAN", "Rawli Finance", "staking", "BNB Smart Chain", "BSC", "DeFi",
    "fixed daily rate", "non-custodial", "yield", "referral",
  ],
  authors: [{ name: "Rawli Finance" }],
  publisher: SITE_NAME,
  category: "finance",
  alternates: { canonical: SITE_URL },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Rawli Finance — $RWAAN Staking",
    description: SITE_DESC,
    images: [{ url: "/logo-rwaan-network.png", width: 512, height: 512, alt: "Rawli Finance" }],
  },
  twitter: {
    card: "summary",
    title: "Rawli Finance — $RWAAN Staking",
    description: SITE_DESC,
    images: ["/logo-rwaan-network.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
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
