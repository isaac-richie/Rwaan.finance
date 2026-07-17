"use client";

import * as React from "react";
import { useAccount } from "wagmi";

export type NotificationItem = {
  id: string;
  title: string;
  description?: string;
  kind?: "referral" | "unlock" | "system";
  amount?: string;
  timestamp: number;
  read: boolean;
};

type NotificationsContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (notification: Omit<NotificationItem, "id" | "read" | "timestamp"> & {
    id?: string;
    timestamp?: number;
  }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
};

const NotificationsContext = React.createContext<NotificationsContextValue | undefined>(
  undefined
);

const STORAGE_KEY = "rwan:notifications";
const MAX_NOTIFICATIONS = 50;
const API_BASE = "/api/notifications";

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { address } = useAccount();
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const storageKey = React.useMemo(
    () =>
      address
        ? `${STORAGE_KEY}:${address.toLowerCase()}`
        : `${STORAGE_KEY}:guest`,
    [address]
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return;
      if (typeof stored !== "string") return;
      const trimmed = stored.trim();
      if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return;
      const parsed = JSON.parse(trimmed) as NotificationItem[];
      if (Array.isArray(parsed)) {
        setNotifications(parsed);
        return;
      }
    } catch {
      // ignore malformed storage
    }
    setNotifications([]);
  }, [storageKey]);

  React.useEffect(() => {
    if (!address) return;
    const wallet = address.toLowerCase();
    let active = true;
    const fetchRemote = async () => {
      try {
        const response = await fetch(`${API_BASE}?wallet=${wallet}`);
        if (!response.ok) return;
        const data = (await response.json()) as { notifications?: NotificationItem[] };
        if (active && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      } catch {
        // ignore remote fetch failures
      }
    };
    fetchRemote();
    return () => {
      active = false;
    };
  }, [address]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(notifications));
  }, [notifications, storageKey]);

  const addNotification = React.useCallback(
    (
      notification: Omit<NotificationItem, "id" | "read" | "timestamp"> & {
        id?: string;
        timestamp?: number;
      }
    ) => {
      const id = notification.id ?? crypto.randomUUID();
      const timestamp = notification.timestamp ?? Date.now();

      setNotifications((current) => {
        if (current.some((item) => item.id === id)) return current;
        const next = [
          {
            id,
            title: notification.title,
            description: notification.description,
            kind: notification.kind,
            amount: notification.amount,
            timestamp,
            read: false,
          },
          ...current,
        ];
        return next.slice(0, MAX_NOTIFICATIONS);
      });

      if (address) {
        fetch(API_BASE, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id,
            wallet: address,
            title: notification.title,
            description: notification.description,
            kind: notification.kind,
            amount: notification.amount,
            timestamp,
            read: false,
          }),
        }).catch(() => undefined);
      }
    },
    [address]
  );

  const markRead = React.useCallback((id: string) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
    if (address) {
      fetch(API_BASE, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "markRead", wallet: address, id }),
      }).catch(() => undefined);
    }
  }, [address]);

  const markAllRead = React.useCallback(() => {
    setNotifications((current) =>
      current.map((item) => ({ ...item, read: true }))
    );
    if (address) {
      fetch(API_BASE, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "markAllRead", wallet: address }),
      }).catch(() => undefined);
    }
  }, [address]);

  const clearAll = React.useCallback(() => {
    setNotifications([]);
    if (address) {
      fetch(API_BASE, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "clearAll", wallet: address }),
      }).catch(() => undefined);
    }
  }, [address]);

  const unreadCount = React.useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markRead,
        markAllRead,
        clearAll,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = React.useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return context;
}
