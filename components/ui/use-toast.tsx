"use client";

import * as React from "react";

import type { ToastProps } from "@/components/ui/toaster";

type ToastContextValue = {
  toasts: ToastProps[];
  toast: (toast: ToastProps) => void;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | undefined>(
  undefined
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const toast = React.useCallback((toastData: ToastProps) => {
    const newToast = { ...toastData, id: crypto.randomUUID() };
    setToasts((current) => [...current, newToast]);
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((current) => current.filter((toastItem) => toastItem.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
