import { useEffect, useMemo, useState } from "react";

export function useCountdown(targetTimestamp: number | null) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    if (!targetTimestamp) {
      return { remaining: 0, isUnlocked: true };
    }
    const remaining = Math.max(targetTimestamp - now, 0);
    return { remaining, isUnlocked: remaining === 0 };
  }, [now, targetTimestamp]);
}
