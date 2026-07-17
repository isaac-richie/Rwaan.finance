import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-medium tracking-wide",
  {
    variants: {
      variant: {
        default: "border-white/[0.06] bg-white/[0.04] text-white/60",
        accent: "border-[#F3BA2F]/15 bg-[#F3BA2F]/[0.06] text-[#F3BA2F]",
        warning: "border-amber-500/15 bg-amber-500/[0.06] text-amber-300",
        outline: "border-white/[0.08] bg-transparent text-white/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
