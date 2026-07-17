"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/* Brand marks as inline SVG (accurate logos, no extra deps) */
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TelegramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.35-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

const TERMS = [
  ["Eligibility", "You confirm you are at least 18 (or the age of majority where you live) and legally able to enter this agreement."],
  ["Risk of loss", "Staking digital assets carries substantial risk, including the total loss of principal. Only commit what you can afford to lose."],
  ["Not advice", "Nothing on this interface is financial, investment, legal, or tax advice. Do your own research."],
  ["Provided as-is", "The protocol is non-custodial and offered without warranties. Smart contracts may contain bugs or be exploited."],
  ["Rates are targets", "Displayed rates are targets, not guarantees, and depend on on-chain conditions and available reward reserves."],
  ["Your responsibility", "You are solely responsible for your wallet, keys, and compliance with the laws of your jurisdiction."],
  ["Liability", "To the fullest extent permitted by law, the operators are not liable for losses from use of the protocol, network failures, or third-party services."],
];

function TermsModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="au-foot-link">
          Terms &amp; Conditions
        </button>
      </DialogTrigger>
      <DialogContent className="au-terms-modal">
        <div className="au-terms-head">
          <span className="v2-brand-mark small">R</span>
          <div>
            <DialogTitle asChild>
              <h3>Terms &amp; Conditions</h3>
            </DialogTitle>
            <DialogDescription asChild>
              <p>Please read before using the RWAN staking interface.</p>
            </DialogDescription>
          </div>
        </div>

        <div className="au-terms-body">
          {TERMS.map(([title, copy]) => (
            <div className="au-terms-item" key={title}>
              <h4>{title}</h4>
              <p>{copy}</p>
            </div>
          ))}
          <p className="au-terms-note">
            This summary does not replace the full agreement. By continuing to use
            the interface you accept these terms in full.
          </p>
        </div>

        <div className="au-terms-foot">
          <Link href="/terms-of-service" className="au-foot-link">
            Read full terms <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <DialogClose asChild>
            <button type="button" className="au-terms-accept">I understand</button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AurumFooter() {
  return (
    <footer id="footer" className="au-footer">
      <div className="au-footer-top">
        <div className="au-footer-brand">
          <div className="au-footer-brandline">
            <span className="v2-brand-mark small">R</span>
            <strong>RWAN</strong>
          </div>
          <p>Transparent, reserve-backed staking infrastructure on BNB Chain.</p>
          <div className="au-socials">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="au-social"
              aria-label="RWAN on X (Twitter)"
            >
              <XIcon className="h-4 w-4" />
            </a>
            <a
              href="https://telegram.org"
              target="_blank"
              rel="noopener noreferrer"
              className="au-social"
              aria-label="RWAN on Telegram"
            >
              <TelegramIcon className="h-[18px] w-[18px]" />
            </a>
          </div>
        </div>

        <nav className="au-footer-links" aria-label="Footer">
          <span className="au-foot-eyebrow">Legal</span>
          <TermsModal />
          <Link href="/privacy-policy" className="au-foot-link">Privacy Policy</Link>
          <Link href="/risk-disclosure" className="au-foot-link">Risk Disclosure</Link>
        </nav>
      </div>

      <div className="au-footer-bottom">
        <span>© {new Date().getFullYear()} RWAN. All rights reserved.</span>
        <span className="au-footer-meta">
          <span className="v2-footer-dot" /> BNB Chain
          <span className="au-foot-sep">·</span>
          Not financial advice
        </span>
      </div>
    </footer>
  );
}
