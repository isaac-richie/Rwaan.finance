"use client";

import { motion } from "framer-motion";
import { MessageCircle, Twitter, ArrowLeft, ExternalLink, Heart } from "lucide-react";
import { useMemo, useState } from "react";
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";
import { RWAN_STAKING_ADDRESS, STAKING_DAPP_URL, RWAN_TOKEN_ADDRESS } from "@/lib/utils/constants";
import { cn } from "@/lib/utils/cn";

type FooterLinkProps = {
  href: string;
  label: string;
  external?: boolean;
  onClick?: () => void;
};

function FooterLink({ href, label, external = false, onClick }: FooterLinkProps) {
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="group flex items-center gap-1.5 text-[13px] text-white/30 transition-colors duration-200 hover:text-white/70"
      >
        {label}
        <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left text-[13px] text-white/30 transition-colors duration-200 hover:text-white/70"
    >
      {label}
    </button>
  );
}

type SocialIconProps = {
  href: string;
  label: string;
  children: React.ReactNode;
};

function SocialIcon({ href, label, children }: SocialIconProps) {
  return (
    <a
      href={href}
      aria-label={label}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-white/30",
        "transition-all duration-250 hover:border-[#F3BA2F]/20 hover:bg-[#F3BA2F]/[0.06] hover:text-[#F3BA2F] hover:shadow-[0_0_20px_rgba(243,186,47,0.08)]"
      )}
    >
      {children}
    </a>
  );
}

export function Footer() {
  const [activeDoc, setActiveDoc] = useState<"terms" | "privacy" | "risk" | null>(null);
  const { toast } = useToast();

  const docContent = useMemo(() => {
    switch (activeDoc) {
      case "terms":
        return {
          title: "Terms of Service",
          body: [
            "These Terms govern your use of the Rwan Analytics interface and related services. By accessing the interface, you agree to these Terms.",
            "We do not custody user funds or private keys. You are solely responsible for wallet security and transaction approvals.",
            "All interactions occur on-chain. Smart contracts may contain bugs or vulnerabilities. You assume all risk of loss.",
            "APRs, rewards, and metrics are variable and may change. Past performance is not indicative of future results.",
            "You are responsible for complying with all applicable laws and regulations in your jurisdiction.",
            "We are not liable for losses, damages, or interruptions arising from use of the interface or smart contracts.",
            "We may modify the interface or these Terms at any time. Continued use constitutes acceptance.",
          ],
        };
      case "privacy":
        return {
          title: "Privacy Policy",
          body: [
            "We do not collect personally identifiable information by default.",
            "Wallet addresses and on-chain activity are public by nature. We may display or cache on-chain data to improve performance.",
            "We may store non-sensitive settings (for example, UI preferences) in your browser.",
            "Third-party infrastructure (RPC providers, analytics, email) may process network metadata.",
            "We take reasonable measures to protect data we store but cannot guarantee absolute security.",
          ],
        };
      case "risk":
        return {
          title: "Risk Disclosure",
          body: [
            "Digital assets are volatile and can result in partial or total loss.",
            "Smart contracts and third-party dependencies may fail or be exploited.",
            "APR and yields are dynamic and depend on TVL, program parameters, and funding.",
            "This interface does not provide financial, legal, or tax advice.",
          ],
        };
      default:
        return null;
    }
  }, [activeDoc]);

  return (
    <footer className="relative mt-10 sm:mt-20 border-t border-white/[0.04]">
      {/* Subtle top glow */}
      <div className="pointer-events-none absolute -top-px left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-[#F3BA2F]/15 to-transparent" />

      <div className="bg-[hsl(225_28%_2.5%)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-14 md:px-8">
          <div className="grid gap-8 sm:gap-12 grid-cols-2 md:grid-cols-12">
            {/* Brand column */}
            <div className="col-span-2 md:col-span-4 flex flex-col gap-4 sm:gap-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] p-0.5">
                  <Image
                    src="/logo-rwaan-network.png"
                    alt="RWAAN"
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-[8px] object-cover"
                  />
                </div>
                <span className="text-[15px] font-semibold tracking-tight text-white">
                  $Rwaan
                </span>
              </div>
              <p className="text-[13px] leading-relaxed text-white/25 max-w-xs">
                The premier staking protocol on BNB Smart Chain. Stake with confidence, earn premium yield, grow your portfolio.
              </p>
              <div className="flex items-center gap-2.5">
                <SocialIcon href="https://x.com/RWAN_Official" label="$Rwaan on X">
                  <Twitter className="h-3.5 w-3.5" />
                </SocialIcon>
                <SocialIcon href="https://t.me/RWAN_Chat" label="$Rwaan on Telegram">
                  <MessageCircle className="h-3.5 w-3.5" />
                </SocialIcon>
              </div>
            </div>

            {/* Quick links */}
            <div className="col-span-1 md:col-span-3 flex flex-col gap-3 sm:gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/20">
                Protocol
              </span>
              <nav className="flex flex-col gap-2.5">
                <FooterLink href={`${STAKING_DAPP_URL}#stake-rwan`} label="Stake Now" />
                <FooterLink href={`${STAKING_DAPP_URL}#staking-plans`} label="View Plans" />
                <FooterLink
                  href="#"
                  label="Copy Contract"
                  onClick={() => {
                    navigator.clipboard.writeText(RWAN_STAKING_ADDRESS);
                    toast({
                      title: "Copied",
                      description: "Staking contract address copied",
                    });
                  }}
                />
                <FooterLink
                  href={`https://bscscan.com/address/${RWAN_STAKING_ADDRESS}`}
                  label="BscScan"
                  external
                />
              </nav>
            </div>

            {/* Resources */}
            <div className="col-span-1 md:col-span-2 flex flex-col gap-3 sm:gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/20">
                Resources
              </span>
              <nav className="flex flex-col gap-2.5">
                <FooterLink
                  href={`https://pancakeswap.finance/swap?outputCurrency=${RWAN_TOKEN_ADDRESS}`}
                  label="Buy $Rwaan"
                  external
                />
                <FooterLink
                  href={`https://bscscan.com/token/${RWAN_TOKEN_ADDRESS}`}
                  label="Token Info"
                  external
                />
              </nav>
            </div>

            {/* Legal */}
            <div className="col-span-2 md:col-span-3 flex flex-col gap-3 sm:gap-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/20">
                Legal
              </span>
              <nav className="flex flex-col gap-2.5">
                <FooterLink
                  href="#"
                  label="Terms of Service"
                  onClick={() => setActiveDoc("terms")}
                />
                <FooterLink
                  href="#"
                  label="Privacy Policy"
                  onClick={() => setActiveDoc("privacy")}
                />
                <FooterLink
                  href="#"
                  label="Risk Disclosure"
                  onClick={() => setActiveDoc("risk")}
                />
              </nav>
              <p className="text-[11px] text-white/15 leading-relaxed mt-1">
                Decentralized protocol. Use at your own risk.
              </p>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-6 sm:mt-12 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 border-t border-white/[0.04] pt-4 sm:pt-6">
            <span className="text-[11px] text-white/15">
              &copy; 2026 $Rwaan Protocol. All rights reserved.
            </span>
            <div className="flex items-center gap-2">
              <span className="flex h-1.5 w-1.5 rounded-full bg-[#F3BA2F]/50" />
              <span className="text-[11px] font-medium text-white/25">
                Built on BNB Chain
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Document modal */}
      {docContent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl rounded-2xl border border-white/[0.06] bg-[hsl(225_20%_5%)] p-4 sm:p-6 shadow-[0_30px_80px_rgba(0,0,0,0.7)] max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
              <button
                type="button"
                className="flex items-center gap-2 text-[13px] text-white/30 transition-colors hover:text-white/60"
                onClick={() => {
                  setActiveDoc(null);
                  document.getElementById("footer")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
              <span className="text-sm font-semibold text-white">
                {docContent.title}
              </span>
              <button
                type="button"
                className="text-[11px] text-white/25 hover:text-white/50 transition-colors"
                onClick={() => setActiveDoc(null)}
              >
                Close
              </button>
            </div>
            <div className="mt-5 space-y-3 text-[13px] leading-relaxed text-white/40">
              {docContent.body.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </motion.div>
        </div>
      ) : null}
    </footer>
  );
}
