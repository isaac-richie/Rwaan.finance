"use client";

import { useEffect, useState } from "react";

const TOKENS = [
  { symbol: "BTC",   id: "bitcoin" },
  { symbol: "ETH",   id: "ethereum" },
  { symbol: "BNB",   id: "binancecoin" },
  { symbol: "SOL",   id: "solana" },
  { symbol: "USDT",  id: "tether" },
  { symbol: "CAKE",  id: "pancakeswap-token" },
  { symbol: "SFUND", id: "seedify-fund" },
  { symbol: "RWAAN", id: "rawli-analytics" },
];

type PriceMap = Record<string, { usd: number; usd_24h_change: number }>;

function fmt(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (price >= 1)    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

function TickerItem({ symbol, price, change }: { symbol: string; price: number; change: number }) {
  const up = change >= 0;
  return (
    <span className="ticker-item">
      <span className="ticker-symbol">{symbol}</span>
      <span className="ticker-price">${fmt(price)}</span>
      <span className={`ticker-change ${up ? "ticker-up" : "ticker-dn"}`}>
        {up ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
      </span>
    </span>
  );
}

export function PriceTicker() {
  const [prices, setPrices] = useState<PriceMap | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/prices", { next: { revalidate: 30 } });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setPrices(data);
      } catch {}
    }
    load();
    const id = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (!prices) {
    return (
      <div className="ticker-bar">
        <div className="ticker-track">
          <span className="ticker-loading">Loading prices…</span>
        </div>
      </div>
    );
  }

  const items = TOKENS.flatMap(({ symbol, id }) => {
    const d = prices[id];
    if (!d) return [];
    return [{ symbol, price: d.usd, change: d.usd_24h_change }];
  });

  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <div
      className="ticker-bar"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="ticker-track" style={{ animationPlayState: paused ? "paused" : "running" }}>
        {doubled.map((t, i) => (
          <TickerItem key={i} {...t} />
        ))}
      </div>
    </div>
  );
}
