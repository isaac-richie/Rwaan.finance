import * as React from "react";

import { cn } from "@/lib/utils/cn";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/25 transition-colors focus-visible:outline-none focus-visible:border-[#F3BA2F]/30 focus-visible:ring-2 focus-visible:ring-[#F3BA2F]/10 focus-visible:bg-white/[0.04]",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
