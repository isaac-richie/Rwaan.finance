import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 ease-soft-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 mobile-tap",
  {
    variants: {
      variant: {
        default:
          "bg-[#F3BA2F] text-[hsl(225,25%,5%)] font-semibold shadow-[0_0_20px_rgba(243,186,47,0.15)] hover:bg-[#E8A817] hover:shadow-[0_0_30px_rgba(243,186,47,0.2)] active:scale-[0.97] button-shimmer",
        secondary:
          "bg-white/[0.04] text-white/70 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/90 hover:border-white/[0.1] active:scale-[0.97]",
        ghost:
          "bg-transparent text-white/50 hover:bg-white/[0.04] hover:text-white/70 active:scale-[0.97]",
        outline:
          "border border-white/[0.08] text-white/60 hover:bg-white/[0.04] hover:text-white/80 hover:border-white/[0.12] active:scale-[0.97]",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3.5 text-[13px]",
        lg: "h-12 px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
