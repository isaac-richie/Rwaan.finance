import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "premium-card flex flex-col items-center gap-4 rounded-2xl p-8 text-center",
        className
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <Inbox className="h-5 w-5 text-white/20" />
      </span>
      <div className="space-y-1.5">
        <div className="text-[15px] font-semibold text-white/80">{title}</div>
        <p className="text-[13px] text-white/30 max-w-sm">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
