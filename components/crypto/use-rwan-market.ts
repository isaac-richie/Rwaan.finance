"use client";

import { useEffect, useRef, useState } from "react";

type RwanMarketData = {
  fully_diluted_valuation?: { usd?: number };
};

type RwanMarketResponse = {
  market_data?: RwanMarketData;
};

export function useRwanMarket() {
  const [fdv, setFdv] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasSuccessRef = useRef(false);

  useEffect(() => {
    let active = true;

    const fetchMarket = async () => {
      try {
        setError(null);
        const response = await fetch("/api/rwan-market", {
          headers: { accept: "application/json" },
        });
        if (!response.ok) {
          throw new Error(`Market feed error: ${response.status}`);
        }
        const data = (await response.json()) as RwanMarketResponse;
        const nextFdv = data.market_data?.fully_diluted_valuation?.usd ?? null;
        if (active) {
          if (nextFdv !== null) {
            setFdv(nextFdv);
            hasSuccessRef.current = true;
          } else if (!hasSuccessRef.current) {
            setFdv(null);
          }
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Unable to fetch FDV.");
          if (!hasSuccessRef.current) {
            setFdv(null);
          }
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchMarket();
    const interval = setInterval(fetchMarket, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return { fdv, isLoading, error };
}
