"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isAddress, zeroAddress } from "viem";

const REFERRAL_STORAGE_KEY = "rwan:referrer";
const REFERRAL_CODE_KEY = "rwan:referral-code";

export function useReferral(address?: `0x${string}`) {
  const searchParams = useSearchParams();
  const [referrer, setReferrer] = useState<`0x${string}` | null>(null);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (stored && isAddress(stored)) {
      setReferrer(stored as `0x${string}`);
    }
  }, []);

  useEffect(() => {
    if (!searchParams) return;
    const ref = searchParams.get("ref");
    if (!ref) return;
    if (referrer) return;

    const resolveAddress = async () => {
      if (isAddress(ref)) {
        if (ref === zeroAddress) return;
        if (address && ref.toLowerCase() === address.toLowerCase()) return;
        if (typeof window !== "undefined") {
          window.localStorage.setItem(REFERRAL_STORAGE_KEY, ref);
        }
        setReferrer(ref as `0x${string}`);
        return;
      }

      try {
        const response = await fetch(`/api/referral?code=${ref}`);
        if (!response.ok) return;
        const data = (await response.json()) as { wallet?: string | null };
        if (!data.wallet || !isAddress(data.wallet)) return;
        if (address && data.wallet.toLowerCase() === address.toLowerCase()) return;
        if (typeof window !== "undefined") {
          window.localStorage.setItem(REFERRAL_STORAGE_KEY, data.wallet);
        }
        setReferrer(data.wallet as `0x${string}`);
      } catch {
        // ignore lookup errors
      }
    };

    resolveAddress();
  }, [searchParams, address, referrer]);

  useEffect(() => {
    if (!address || !referrer) return;
    if (address.toLowerCase() !== referrer.toLowerCase()) return;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
    }
    setReferrer(null);
  }, [address, referrer]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!address) {
      setShareUrl("");
      return;
    }
    let active = true;
    const base = `${window.location.origin}${window.location.pathname}`;

    const fromStorage = window.localStorage.getItem(REFERRAL_CODE_KEY);
    if (fromStorage) {
      setShareUrl(`${base}?ref=${fromStorage}`);
    }

    const fetchCode = async () => {
      try {
        const response = await fetch("/api/referral", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ wallet: address }),
        });
        if (!response.ok) return;
        const data = (await response.json()) as { code?: string };
        if (!data.code || !active) return;
        window.localStorage.setItem(REFERRAL_CODE_KEY, data.code);
        setShareUrl(`${base}?ref=${data.code}`);
      } catch {
        // ignore
      }
    };

    fetchCode();
    return () => {
      active = false;
    };
  }, [address]);

  return { referrer, shareUrl };
}
