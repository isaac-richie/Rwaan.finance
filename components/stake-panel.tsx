import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTokenAllowance, useTokenBalance, useTokenMetadata, useApproveToken } from "@/hooks/use-erc20";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useReferral } from "@/hooks/use-referral";
import { useTransactionToasts } from "@/hooks/use-transaction-toasts";
import { useLockOptions, useStakingToken } from "@/hooks/use-staking-reads";
import { useStakeFlexible, useStakeLocked } from "@/hooks/use-staking-writes";
import { RWAN_DECIMALS } from "@/lib/utils/constants";
import { formatDuration, formatMultiplier, formatToken } from "@/lib/utils/format";

export function StakePanel() {
  const { address } = useAccount();
  const isMobile = useIsMobile();
  const tokenAddress = useStakingToken();
  const tokenMeta = useTokenMetadata(tokenAddress.data as `0x${string}` | undefined);
  const decimals = tokenMeta.decimals ?? RWAN_DECIMALS;
  const balance = useTokenBalance(tokenAddress.data as `0x${string}` | undefined, address);
  const allowance = useTokenAllowance(tokenAddress.data as `0x${string}` | undefined, address);
  const approve = useApproveToken(tokenAddress.data as `0x${string}` | undefined);
  const { stakeFlexible, isPending: isStakeFlexiblePending } = useStakeFlexible();
  const { stakeLocked, isPending: isStakeLockedPending } = useStakeLocked();
  const { trackTx } = useTransactionToasts();
  const lockOptions = useLockOptions();
  const { referrer } = useReferral(address);

  const [activeTab, setActiveTab] = useState<"flexible" | "locked">("flexible");
  const [amount, setAmount] = useState("");
  const [selectedOption, setSelectedOption] = useState<string>("");

  const parsedAmount = useMemo(() => {
    if (!amount) return null;
    try {
      return parseUnits(amount, decimals);
    } catch {
      return null;
    }
  }, [amount, decimals]);

  const balanceFormatted = formatToken(balance.data, decimals);
  const needsApproval =
    parsedAmount !== null &&
    allowance.data !== undefined &&
    allowance.data < parsedAmount;

  const handleApprove = async () => {
    if (!parsedAmount) return;
    const hash = await approve.approve(parsedAmount);
    if (!hash) return;
    trackTx(hash, {
      title: "Approve RWAN",
      successMessage: "Approval confirmed.",
      errorMessage: "Approval failed.",
      retry: handleApprove,
    });
  };

  const handleStakeFlexible = async () => {
    if (!parsedAmount) return;
    const hash = await stakeFlexible(parsedAmount, referrer ?? undefined);
    if (!hash) return;
    trackTx(hash, {
      title: "Stake flexible",
      successMessage: "Flexible stake active.",
      errorMessage: "Stake failed.",
      retry: handleStakeFlexible,
    });
    setAmount("");
  };

  const handleStakeLocked = async () => {
    if (!parsedAmount || !selectedOption) return;
    const hash = await stakeLocked(parsedAmount, BigInt(selectedOption), referrer ?? undefined);
    if (!hash) return;
    trackTx(hash, {
      title: "Stake locked",
      successMessage: "Locked position created.",
      errorMessage: "Stake failed.",
      retry: handleStakeLocked,
    });
    setAmount("");
  };

  const disabled =
    !address ||
    !parsedAmount ||
    parsedAmount <= 0n ||
    tokenAddress.isLoading ||
    !tokenAddress.data ||
    allowance.isLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stake RWAN</CardTitle>
        <CardDescription>
          Choose flexible liquidity or lock for boosted multipliers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!address ? (
          <EmptyState
            title="Wallet required"
            description="Connect your wallet to start staking RWAN."
          />
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "flexible" | "locked")}>
              <TabsList>
                <TabsTrigger value="flexible">Flexible</TabsTrigger>
                <TabsTrigger value="locked">Locked</TabsTrigger>
              </TabsList>
              <TabsContent value="flexible">
                <motion.div
                  initial={isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={isMobile ? { duration: 0 } : { duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Available balance</span>
                    <span>{balanceFormatted} RWAN</span>
                  </div>
                  <Input
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    inputMode="decimal"
                  />
                  <div className="flex flex-wrap gap-3">
                    {needsApproval ? (
                      <Button
                        variant="secondary"
                        disabled={disabled || approve.isPending}
                        onClick={handleApprove}
                      >
                        {approve.isPending ? "Approving..." : "Approve"}
                      </Button>
                    ) : null}
                    <Button
                      disabled={disabled || needsApproval || isStakeFlexiblePending}
                      onClick={handleStakeFlexible}
                    >
                      {isStakeFlexiblePending ? "Staking..." : "Stake"}
                    </Button>
                  </div>
                </motion.div>
              </TabsContent>
              <TabsContent value="locked">
                <motion.div
                  initial={isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={isMobile ? { duration: 0 } : { duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Available balance</span>
                    <span>{balanceFormatted} RWAN</span>
                  </div>
                  <Input
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    inputMode="decimal"
                  />
                  <Select value={selectedOption} onValueChange={setSelectedOption}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select lock duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {lockOptions.options
                        .filter(
                          (option): option is NonNullable<typeof option> =>
                            Boolean(option)
                        )
                        .filter((option) => option.active)
                        .map((option) => (
                          <SelectItem key={option.id.toString()} value={option.id.toString()}>
                            {formatDuration(option.duration)} · {formatMultiplier(option.multiplierBps)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-3">
                    {needsApproval ? (
                      <Button
                        variant="secondary"
                        disabled={disabled || approve.isPending}
                        onClick={handleApprove}
                      >
                        {approve.isPending ? "Approving..." : "Approve"}
                      </Button>
                    ) : null}
                    <Button
                      disabled={
                        disabled ||
                        needsApproval ||
                        !selectedOption ||
                        isStakeLockedPending
                      }
                      onClick={handleStakeLocked}
                    >
                      {isStakeLockedPending ? "Staking..." : "Stake locked"}
                    </Button>
                  </div>
                </motion.div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}
