"use client";

import { AnimatePresence, motion } from "framer-motion";

import type { CryptoPrice, CryptoToken } from "@/types/crypto";
import { cn } from "@/lib/utils/cn";

const formatPrice = (value: number) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  });

const formatChange = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;

export function TickerItem({
  token,
  price,
}: {
  token: CryptoToken;
  price: CryptoPrice | undefined;
}) {
  const change = price?.change24h ?? 0;
  const isPositive = change >= 0;
  const highlight = token.highlight;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-muted-foreground transition-transform duration-200 hover:-translate-y-0.5",
        highlight && "border-primary/40 text-foreground shadow-glow"
      )}
    >
      <span className={cn("text-sm font-semibold", highlight && "text-primary")}>
        {token.symbol}
      </span>
      <span className="min-w-[88px] text-right text-sm text-foreground tabular-nums">
        ${formatPrice(price?.priceUsd ?? 0)}
      </span>
      <span
        className={cn(
          "min-w-[72px] text-right text-xs font-medium tabular-nums",
          isPositive ? "text-emerald-300" : "text-rose-300"
        )}
      >
        {isPositive ? "▲" : "▼"} {formatChange(change)}
      </span>
    </div>
  );
}
