"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type EarlyWithdrawModalProps = {
  open: boolean;
  penaltyAmount: string;
  onConfirm: () => void;
  onClose: () => void;
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export function EarlyWithdrawModal({
  open,
  penaltyAmount,
  onConfirm,
  onClose,
}: EarlyWithdrawModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-10 backdrop-blur-sm"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            className={cn("glass relative w-full max-w-md rounded-3xl p-8")}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              onClick={onClose}
              className="absolute right-6 top-6 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Early withdrawal
            </div>
            <h3 className="mt-3 text-2xl font-semibold">35% Penalty applies</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Withdrawing before unlock incurs a{" "}
              <span className="text-amber-500 font-semibold">35% penalty</span> on
              your staked principal. You will lose{" "}
              <span className="text-foreground font-semibold">{penaltyAmount} $Rwaan</span>{" "}
              (35% of your stake).
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={onConfirm}>Withdraw with penalty</Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
