"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { Magnetic } from "@/components/aurum-ui";
import { WalletButton } from "@/components/wallet-button";

interface NavLink {
  label: string;
  href: string;
  current?: boolean;
}

const LINKS: NavLink[] = [
  { label: "Plans", href: "/#stake" },
  { label: "Stake", href: "/#position" },
  { label: "Positions", href: "/#my-positions" },
  { label: "Network", href: "/network" },
  { label: "Perks", href: "/#perks" },
  { label: "Legal", href: "/#footer" },
];

export function ObNav({ currentPage }: { currentPage?: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const brand =
    currentPage === "network" ? (
      <Link href="/" className="ob-brand">
        <img src="/logo-rwaan.png" alt="Rawli Analytics" className="ob-brand-mark" width={34} height={34} />
        <span className="ob-brand-name">Rawli Analytics</span>
      </Link>
    ) : (
      <a href="#top" className="ob-brand">
        <img src="/logo-rwaan.png" alt="Rawli Analytics" className="ob-brand-mark" width={34} height={34} />
        <span className="ob-brand-name">Rawli Analytics</span>
      </a>
    );

  return (
    <header className="ob-nav" ref={menuRef}>
      {brand}

      <nav className="ob-nav-links" aria-label="Primary">
        {LINKS.map((l) =>
          l.href.startsWith("/") && !l.href.startsWith("/#") ? (
            <Link key={l.label} href={l.href} aria-current={currentPage === l.href.slice(1) ? "page" : undefined}>
              {l.label}
            </Link>
          ) : currentPage === "network" ? (
            <Link key={l.label} href={l.href}>
              {l.label}
            </Link>
          ) : (
            <a key={l.label} href={l.href}>
              {l.label}
            </a>
          )
        )}
      </nav>

      <div className="ob-nav-actions">
        <button
          type="button"
          className="ob-menu-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
        </button>

        <Magnetic strength={0.25}>
          <WalletButton />
        </Magnetic>
      </div>

      {open && (
        <nav className="ob-mobile-menu" aria-label="Mobile navigation">
          {LINKS.map((l) =>
            l.href.startsWith("/") && !l.href.startsWith("/#") ? (
              <Link
                key={l.label}
                href={l.href}
                className="ob-mobile-link"
                aria-current={currentPage === l.href.slice(1) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ) : currentPage === "network" ? (
              <Link key={l.label} href={l.href} className="ob-mobile-link" onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ) : (
              <a key={l.label} href={l.href} className="ob-mobile-link" onClick={() => setOpen(false)}>
                {l.label}
              </a>
            )
          )}
        </nav>
      )}
    </header>
  );
}
