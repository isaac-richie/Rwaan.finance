"use client";

import { useCallback, useEffect, useState } from "react";

import type { CryptoPrice, CryptoToken } from "@/types/crypto";

const TOKENS: CryptoToken[] = [
  { symbol: "BTC", coingeckoId: "bitcoin" },
  { symbol: "BNB", coingeckoId: "binancecoin" },
  { symbol: "CAKE", coingeckoId: "pancakeswap-token" },
  { symbol: "$Rwaan", coingeckoId: "rawli-analytics", highlight: true },
  { symbol: "USDC", coingeckoId: "usd-coin" },
  { symbol: "SFUND", coingeckoId: "seedify-fund" },
];

const RWAN_FALLBACK: CryptoPrice = {
  symbol: "$Rwaan",
  priceUsd: 0.042,
  change24h: 1.2,
  isFallback: true,
};

const PRICE_API = "/api/prices";

export function useCryptoPrices() {
  const [data, setData] = useState<CryptoPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(PRICE_API, { headers: { accept: "application/json" } });
      if (!response.ok) {
        throw new Error(`Price feed error: ${response.status}`);
      }
      const payload = (await response.json()) as Record<
        string,
        { usd?: number; usd_24h_change?: number }
      >;

      const prices = TOKENS.map((token) => {
        const entry = payload[token.coingeckoId];
        if (token.symbol === "$Rwaan" && (!entry?.usd || !entry.usd_24h_change)) {
          return RWAN_FALLBACK;
        }
        return {
          symbol: token.symbol,
          priceUsd: entry?.usd ?? 0,
          change24h: entry?.usd_24h_change ?? 0,
          isFallback: token.symbol === "$Rwaan" && !entry?.usd,
        } satisfies CryptoPrice;
      });

      setData(prices);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to fetch prices.");
      setData((current) =>
        current.length
          ? current
          : TOKENS.map((token) =>
              token.symbol === "$Rwaan"
                ? RWAN_FALLBACK
                : { symbol: token.symbol, priceUsd: 0, change24h: 0 }
            )
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      fetchPrices();
    }
    const interval = setInterval(fetchPrices, 15_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchPrices]);

  return {
    tokens: TOKENS,
    prices: data,
    isLoading,
    error,
  };
}
