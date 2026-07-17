"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils/cn";
import { Skeleton } from "@/components/ui/skeleton";
import { TickerItem } from "@/components/crypto/ticker-item";
import { useCryptoPrices } from "@/components/crypto/use-crypto-prices";

export function CryptoTicker({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { tokens, prices, isLoading, error } = useCryptoPrices();

  // Memoize the duplicated list to prevent re-renders when prices change
  const tickerItems = useMemo(() => [...tokens, ...tokens], [tokens]);

  return (
    <div
      className={cn(
        "relative overflow-hidden border-y border-white/15 bg-[#06080d]",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-r before:from-[#F3BA2F]/10 before:via-transparent before:to-[#F3BA2F]/10 before:opacity-60",
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-none after:border-y after:border-primary/25 after:opacity-40",
        compact && "opacity-90",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-6xl items-center gap-6 px-4 md:px-8",
          compact ? "py-2" : "py-3"
        )}
      >
        <span className="hidden text-xs uppercase tracking-[0.4em] text-muted-foreground md:inline-flex">
          Live prices
        </span>
        <div className="relative flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={`ticker-skeleton-${index}`} className="h-9 w-32 rounded-full" />
              ))}
            </div>
          ) : prices.length === 0 ? (
            <div className="min-h-[36px] text-xs text-rose-200">
              Market feed unavailable. Showing fallback values.
            </div>
          ) : (
            <div
              className="flex w-max gap-3 animate-marquee hover:[animation-play-state:paused]"
              style={{ "--duration": "40s", "--gap": "0.75rem" } as React.CSSProperties}
            >
              {tickerItems.map((token, index) => (
                <TickerItem
                  key={`${token.symbol}-${index}`}
                  token={token}
                  price={prices.find((item) => item.symbol === token.symbol)}
                />
              ))}
            </div>
          )}
        </div>
        {error && prices.length > 0 ? (
          <div className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] text-muted-foreground backdrop-blur">
            Live feed delayed
          </div>
        ) : null}
      </div>
    </div>
  );
}
