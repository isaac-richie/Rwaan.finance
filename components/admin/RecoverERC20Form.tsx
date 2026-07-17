"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { parseUnits } from "viem";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTransactionToasts } from "@/hooks/use-transaction-toasts";
import { useRecoverERC20 } from "@/hooks/use-staking-writes";
import { RWAN_DECIMALS } from "@/lib/utils/constants";

export function RecoverERC20Form() {
  const { recoverERC20, isPending } = useRecoverERC20();
  const { trackTx } = useTransactionToasts();
  const { address } = useAccount();

  const [token, setToken] = useState("");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");

  const parsedAmount = useMemo(() => {
    if (!amount) return null;
    try {
      return parseUnits(amount, RWAN_DECIMALS);
    } catch {
      return null;
    }
  }, [amount]);

  const isAddress = /^0x[a-fA-F0-9]{40}$/.test(token);
  const recipientAddress = recipient.trim() || address;
  const isRecipientValid = recipientAddress
    ? /^0x[a-fA-F0-9]{40}$/.test(recipientAddress)
    : false;

  const handleRecover = async () => {
    if (!parsedAmount || !isAddress || !recipientAddress || !isRecipientValid) {
      return;
    }
    // V3: recoverERC20 always sends to owner, no recipient parameter
    const hash = await recoverERC20(
      token as `0x${string}`,
      parsedAmount
    );
    if (!hash) return;
    trackTx(hash, {
      title: "Recover ERC20",
      successMessage: "Token recovered to owner address.",
      errorMessage: "Recovery failed.",
      retry: handleRecover,
    });
    setAmount("");
  };

  return (
    <div className="glass glass-solid rounded-2xl p-5">
      <div className="text-lg font-semibold">Recover ERC20</div>
      <div className="mt-1 text-xs text-muted-foreground">
        Rescue tokens mistakenly sent to the staking contract.
      </div>
      <div className="mt-4 space-y-3">
        <Input
          placeholder="Token contract address"
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
        <Input
          placeholder={address ? `Recipient (${address.slice(0, 6)}...${address.slice(-4)})` : "Recipient address"}
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
        />
        <Input
          placeholder="Amount"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
        />
        <Button
          disabled={!parsedAmount || !isAddress || !isRecipientValid || isPending}
          onClick={handleRecover}
        >
          {isPending ? "Recovering..." : "Recover tokens"}
        </Button>
      </div>
    </div>
  );
}
