"use client";

import { useReferralReserve, useRewardReserve, useStakingContractBalance } from "@/hooks/use-staking-reads";
import { formatToken } from "@/lib/utils/format";
import { RWAN_DECIMALS } from "@/lib/utils/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function FundOverview() {
    const referralReserve = useReferralReserve();
    const rewardReserve = useRewardReserve();
    const totalBalance = useStakingContractBalance();

    const loading = referralReserve.isLoading || rewardReserve.isLoading || totalBalance.isLoading;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Fund Overview</CardTitle>
                <CardDescription>Current balances held by the contract.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                    </div>
                ) : (
                    <div className="grid gap-4">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                            <span className="text-sm font-medium">Referral Reserve</span>
                            <span className="font-mono font-bold text-primary">
                                {formatToken(referralReserve.data, RWAN_DECIMALS)} RWAN
                            </span>
                        </div>

                        <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                            <span className="text-sm font-medium">Reward Reserve</span>
                            <span className="font-mono font-bold text-primary">
                                {formatToken(rewardReserve.data, RWAN_DECIMALS)} RWAN
                            </span>
                        </div>

                        <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/50 border border-primary/20">
                            <span className="text-sm font-medium">Total Contract Balance</span>
                            <span className="font-mono font-bold text-primary">
                                {formatToken(totalBalance.data, RWAN_DECIMALS)} RWAN
                            </span>
                        </div>

                        <div className="text-xs text-muted-foreground mt-2">
                            <p>Unallocated (Floating): {
                                formatToken(
                                    (totalBalance.data ?? 0n) - (referralReserve.data ?? 0n) - (rewardReserve.data ?? 0n),
                                    RWAN_DECIMALS
                                )
                            } RWAN</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
