"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, ToggleLeft, Clock, Coins, ShieldCheck, Rocket } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-is-mobile";

interface HowToStakeGuideProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface StakingStep {
    number: number;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}

const STAKING_STEPS: StakingStep[] = [
    {
        number: 1,
        title: "Connect Your Wallet",
        description: "Connect your Web3 wallet (MetaMask, WalletConnect, etc.) to access staking features",
        icon: Wallet,
    },
    {
        number: 2,
        title: "Choose Staking Mode",
        description: "Select Flexible (withdraw anytime) or Locked (higher APR, fixed duration)",
        icon: ToggleLeft,
    },
    {
        number: 3,
        title: "Select Duration",
        description: "Choose your lock period: 30, 90, 180, or 365 days. Longer locks earn higher APR multipliers",
        icon: Clock,
    },
    {
        number: 4,
        title: "Enter Amount",
        description: "Input the amount of $Rwaan tokens you wish to stake. Check your available balance",
        icon: Coins,
    },
    {
        number: 5,
        title: "Approve Tokens",
        description: "Approve the staking contract to access your tokens (one-time transaction)",
        icon: ShieldCheck,
    },
    {
        number: 6,
        title: "Confirm & Stake",
        description: "Review your details and confirm the staking transaction. Your position will be active immediately",
        icon: Rocket,
    },
];

export function HowToStakeGuide({ open, onOpenChange }: HowToStakeGuideProps) {
    const isMobile = useIsMobile();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-solid max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-gold-gradient">
                        How to Stake $Rwaan
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-6 space-y-8">
                    {STAKING_STEPS.map((step, index) => {
                        const Icon = step.icon;
                        const isLast = index === STAKING_STEPS.length - 1;

                        return (
                            <motion.div
                                key={step.number}
                                initial={isMobile ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={
                                    isMobile
                                        ? { duration: 0 }
                                        : { duration: 0.3, delay: index * 0.1 }
                                }
                                className="relative flex gap-4"
                            >
                                {/* Timeline connector */}
                                {!isLast && (
                                    <div className="absolute left-[22px] top-12 bottom-0 w-[2px] bg-gradient-to-b from-primary/30 to-transparent" />
                                )}

                                {/* Icon circle */}
                                <div className="relative flex-shrink-0">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 border border-primary/30">
                                        <Icon className="h-5 w-5 text-primary" />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 pb-2">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xs font-semibold text-primary">
                                            STEP {step.number}
                                        </span>
                                    </div>
                                    <h3 className="mt-1 text-lg font-semibold text-foreground">
                                        {step.title}
                                    </h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                        {step.description}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Footer with action button */}
                <div className="mt-8 flex justify-end gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => onOpenChange(false)}
                        className="w-full sm:w-auto"
                    >
                        Got it!
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
