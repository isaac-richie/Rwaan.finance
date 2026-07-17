"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTransactionToasts } from "@/hooks/use-transaction-toasts";
import { useTransferOwnership } from "@/hooks/use-staking-writes";

export function OwnershipTransferForm() {
  const { transferOwnership, isPending } = useTransferOwnership();
  const { trackTx } = useTransactionToasts();

  const [newOwner, setNewOwner] = useState("");
  const isAddress = /^0x[a-fA-F0-9]{40}$/.test(newOwner);

  const handleTransfer = async () => {
    if (!isAddress) return;
    const hash = await transferOwnership(newOwner as `0x${string}`);
    if (!hash) return;
    trackTx(hash, {
      title: "Transfer ownership",
      successMessage: "Ownership transferred.",
      errorMessage: "Transfer failed.",
      retry: handleTransfer,
    });
    setNewOwner("");
  };

  return (
    <div className="glass glass-solid rounded-2xl p-5">
      <div className="text-lg font-semibold">Transfer ownership</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Assign contract ownership to a new wallet address.
      </div>
      <div className="mt-4 space-y-3">
        <Input
          placeholder="New owner address"
          value={newOwner}
          onChange={(event) => setNewOwner(event.target.value)}
        />
        <Button disabled={!isAddress || isPending} onClick={handleTransfer}>
          {isPending ? "Transferring..." : "Transfer ownership"}
        </Button>
      </div>
    </div>
  );
}
