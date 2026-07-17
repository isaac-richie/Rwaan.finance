"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransactionToasts } from "@/hooks/use-transaction-toasts";
import { useLockOptions } from "@/hooks/use-staking-reads";
import { useAddLockOption, useSetLockOption } from "@/hooks/use-staking-writes";
import { cn } from "@/lib/utils/cn";
import { formatDuration } from "@/lib/utils/format";

export function LockOptionsManager() {
  const { options, isLoading } = useLockOptions();
  const { addLockOption, isPending: isAdding } = useAddLockOption();
  const { setLockOption, isPending: isUpdating } = useSetLockOption();
  const { trackTx } = useTransactionToasts();

  const [durationDays, setDurationDays] = useState("");
  const [multiplier, setMultiplier] = useState("");
  const [enabled, setEnabled] = useState(true);

  const parsedDuration = useMemo(() => {
    const days = Number(durationDays);
    return Number.isFinite(days) && days > 0 ? BigInt(Math.floor(days * 86400)) : null;
  }, [durationDays]);

  const parsedMultiplier = useMemo(() => {
    const value = Number(multiplier);
    // Convert multiplier (e.g. 1.25) to basis points (12500)
    // 1x = 10000 bps, 2x = 20000 bps, etc.
    return Number.isFinite(value) && value > 0 ? BigInt(Math.floor(value * 10000)) : null;
  }, [multiplier]);

  const handleAdd = async () => {
    if (!parsedDuration || !parsedMultiplier) return;
    const hash = await addLockOption(parsedDuration, parsedMultiplier, enabled);
    if (!hash) return;
    trackTx(hash, {
      title: "Add lock option",
      successMessage: "Lock option added.",
      errorMessage: "Failed to add lock option.",
      retry: handleAdd,
    });
    setDurationDays("");
    setMultiplier("");
  };

  const handleUpdate = async (
    id: bigint,
    duration: bigint,
    multiplierBps: bigint,
    isEnabled: boolean
  ) => {
    const hash = await setLockOption(id, multiplierBps, isEnabled);
    if (!hash) return;
    trackTx(hash, {
      title: "Update lock option",
      successMessage: "Lock option updated.",
      errorMessage: "Failed to update lock option.",
      retry: () => handleUpdate(id, duration, multiplierBps, isEnabled),
    });
  };

  return (
    <div className="glass glass-solid rounded-2xl p-5">
      <div className="text-lg font-semibold">Lock options</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Manage lock durations and multipliers.
      </div>

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          options
            .filter(
              (option): option is NonNullable<typeof option> => Boolean(option)
            )
            .map((option) => (
            <motion.div
              key={option.id.toString()}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {formatDuration(option.duration)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {(Number(option.multiplierBps) / 10000).toFixed(2)}x multiplier
                </div>
              </div>
              <Button
                size="sm"
                variant={option.active ? "secondary" : "outline"}
                disabled={isUpdating}
                onClick={() =>
                  handleUpdate(
                    option.id,
                    option.duration,
                    option.multiplierBps,
                    !option.active
                  )
                }
              >
                {option.active ? "Disable" : "Enable"}
              </Button>
            </motion.div>
          ))
        )}
      </div>

      <div className="mt-6 border-t border-white/10 pt-4">
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Add option
        </div>
        <div className="mt-3 grid gap-3">
          <Input
            placeholder="Duration in days"
            value={durationDays}
            onChange={(event) => setDurationDays(event.target.value)}
            inputMode="decimal"
          />
          <Input
            placeholder="Multiplier (e.g. 1.25)"
            value={multiplier}
            onChange={(event) => setMultiplier(event.target.value)}
            inputMode="decimal"
          />
          <button
            type="button"
            className={cn(
              "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-muted-foreground transition-colors hover:text-foreground",
              enabled && "border-primary/40 text-foreground"
            )}
            onClick={() => setEnabled((prev) => !prev)}
          >
            {enabled ? "Active on launch" : "Inactive on launch"}
          </button>
          <Button
            onClick={handleAdd}
            disabled={!parsedDuration || !parsedMultiplier || isAdding}
          >
            {isAdding ? "Adding..." : "Add lock option"}
          </Button>
        </div>
      </div>
    </div>
  );
}
