"use client";

import { Button } from "@/components/ui/button";

export default function ErrorState({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="glass mx-auto flex max-w-2xl flex-col gap-4 rounded-2xl p-8">
      <div className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
        Something went wrong
      </div>
      <h1 className="text-2xl font-semibold">We hit an unexpected error.</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "Please refresh or try again in a moment."}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Retry</Button>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
