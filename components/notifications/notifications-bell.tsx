"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useNotifications } from "@/components/notifications/notifications-provider";

function formatTime(timestamp: number) {
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 30) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function NotificationsBell() {
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    
    // Mark all notifications as read when dropdown opens
    if (unreadCount > 0) {
      markAllRead();
    }
    
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, unreadCount, markAllRead]);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="relative h-10 w-10 rounded-full border border-white/10 bg-white/5 p-0"
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-400 px-1 text-[10px] font-semibold text-black shadow-glow">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-80 max-w-[calc(100vw-24px)] sm:max-w-[360px] overflow-hidden rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.55)] sm:right-0 sm:left-auto sm:translate-x-0 left-1/2 -translate-x-1/2">
          <div className="absolute inset-0 bg-[#0b1220]" />
          <div className="relative">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="text-sm font-semibold">Notifications</div>
              <button
                type="button"
                onClick={clearAll}
                className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Clear all
              </button>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Bell className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-sm font-medium text-foreground">All caught up!</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Your transaction history will appear here
                  </div>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className="flex w-full flex-col gap-1.5 border-b border-white/5 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold">
                        {item.title}
                      </span>
                      <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                        {formatTime(item.timestamp)}
                      </span>
                    </div>
                    {item.description ? (
                      <span className="text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    ) : null}
                    {item.amount ? (
                      <div className="mt-0.5">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {item.amount}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
