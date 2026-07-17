"use client";

import { ToastProvider } from "@/components/ui/use-toast";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";

export function ToastRoot({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <NotificationsProvider>{children}</NotificationsProvider>
    </ToastProvider>
  );
}
