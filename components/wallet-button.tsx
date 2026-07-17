"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { Check, Copy, ExternalLink, LogOut, Wallet } from "lucide-react";

export function WalletButton() {
  const { login, logout, ready, authenticated } = usePrivy();
  const { address } = useAccount();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const connected = ready && authenticated && !!address;

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleClick = useCallback(() => {
    if (connected) {
      setOpen((v) => !v);
    } else {
      login();
    }
  }, [connected, login]);

  const handleCopy = useCallback(() => {
    if (!address) return;
    navigator.clipboard?.writeText(address).catch(() => {});
    setCopied(true);
    setTimeout(() => { setCopied(false); setOpen(false); }, 1200);
  }, [address]);

  const handleDisconnect = useCallback(() => {
    setOpen(false);
    logout();
  }, [logout]);

  return (
    <div ref={wrapRef} className="ob-wallet-wrap">
      <button type="button" className="ob-wallet" onClick={handleClick}>
        <Wallet className="h-4 w-4" />
        {connected ? `${address!.slice(0, 5)}…${address!.slice(-4)}` : "Connect"}
      </button>
      {open && connected && (
        <div className="ob-wallet-dropdown">
          <div className="ob-wd-addr">
            <span className="ob-wd-label">Connected</span>
            <code>{address}</code>
          </div>
          <div className="ob-wd-divider" />
          <button type="button" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy address"}
          </button>
          <a href={`https://bscscan.com/address/${address}`} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            View on BSCScan
          </a>
          <div className="ob-wd-divider" />
          <button type="button" className="ob-wd-danger" onClick={handleDisconnect}>
            <LogOut className="h-3.5 w-3.5" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
