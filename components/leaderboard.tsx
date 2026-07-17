"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { Crown, Medal, Trophy, Users } from "lucide-react";
import { Reveal } from "@/components/aurum-ui";

type Entry = {
  rank: number;
  wallet: string;
  active_staked: string;
  total_staked: string;
  rewards_earned: string;
  referral_earned: string;
  positions: number;
};

type Payload = { metric: Metric; leaders: Entry[]; me: Entry | null };

const METRICS = [
  { id: "active_staked", label: "Staked" },
  { id: "rewards_earned", label: "Rewards" },
  { id: "referral_earned", label: "Referrals" },
] as const;
type Metric = (typeof METRICS)[number]["id"];

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const fmt = (wei: string) => {
  const n = Number(formatUnits(BigInt(wei || "0"), 18));
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

export function Leaderboard() {
  const { address } = useAccount();
  const [metric, setMetric] = useState<Metric>("active_staked");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const url = new URL("/api/leaderboard", window.location.origin);
    url.searchParams.set("metric", metric);
    url.searchParams.set("limit", "50");
    if (address) url.searchParams.set("wallet", address);

    fetch(url)
      .then((r) => r.json())
      .then((d: Payload) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [metric, address]);

  const leaders = data?.leaders ?? [];
  const me = data?.me ?? null;
  const podium = useMemo(() => leaders.slice(0, 3), [leaders]);
  const rest = useMemo(() => leaders.slice(3), [leaders]);
  const metricKey = metric as keyof Entry;

  return (
    <section className="lb-shell">
      <div className="lb-atmo" aria-hidden="true" />

      <Reveal className="lb-head">
        <div>
          <span className="lb-eyebrow"><Trophy className="h-3.5 w-3.5" /> Leaderboard</span>
          <h2 className="lb-title">Top of the <em>network.</em></h2>
        </div>
        <div className="lb-tabs" role="tablist">
          {METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={metric === m.id}
              className={metric === m.id ? "lb-tab lb-tab-active" : "lb-tab"}
              onClick={() => setMetric(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </Reveal>

      {loading && leaders.length === 0 ? (
        <div className="lb-empty"><span className="lb-spin" /> Loading standings…</div>
      ) : leaders.length === 0 ? (
        <div className="lb-empty"><Users className="h-5 w-5 opacity-50" /> No stakers yet — be the first.</div>
      ) : (
        <>
          {/* Podium */}
          <div className="lb-podium">
            {[1, 0, 2].map((slot) => {
              const e = podium[slot];
              if (!e) return <div key={slot} className="lb-pod lb-pod-empty" />;
              const place = e.rank;
              return (
                <div key={e.wallet} className={`lb-pod lb-pod-${place}`}>
                  <span className="lb-pod-medal">
                    {place === 1 ? <Crown className="h-5 w-5" /> : <Medal className="h-5 w-5" />}
                    <b>{place}</b>
                  </span>
                  <span className="lb-pod-addr">
                    {address && e.wallet === address.toLowerCase() ? "You" : short(e.wallet)}
                  </span>
                  <span className="lb-pod-val">{fmt(e[metricKey] as string)}</span>
                  <span className="lb-pod-unit">RWAN</span>
                </div>
              );
            })}
          </div>

          {/* Ranked table */}
          <div className="lb-table">
            <div className="lb-row lb-row-head">
              <span>#</span><span>Wallet</span>
              <span className="lb-num">{METRICS.find((m) => m.id === metric)?.label}</span>
              <span className="lb-num lb-hide-sm">Positions</span>
            </div>
            {rest.map((e) => {
              const mine = address && e.wallet === address.toLowerCase();
              return (
                <div key={e.wallet} className={mine ? "lb-row lb-row-me" : "lb-row"}>
                  <span className="lb-rank">{e.rank}</span>
                  <span className="lb-addr">{mine ? "You" : short(e.wallet)}</span>
                  <span className="lb-num lb-strong">{fmt(e[metricKey] as string)}</span>
                  <span className="lb-num lb-hide-sm">{e.positions}</span>
                </div>
              );
            })}
          </div>

          {/* Your position, if outside the visible list */}
          {me && !leaders.some((l) => l.wallet === me.wallet) && (
            <div className="lb-me-bar">
              <span className="lb-rank">{me.rank}</span>
              <span className="lb-addr">You</span>
              <span className="lb-num lb-strong">{fmt(me[metricKey] as string)}</span>
              <span className="lb-num lb-hide-sm">{me.positions}</span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
