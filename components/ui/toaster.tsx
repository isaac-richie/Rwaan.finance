"use client";

import * as React from "react";

import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider as RadixToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";

export type ToastProps = {
  id?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
};

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <RadixToastProvider duration={8000}>
      {toasts.map((toastItem) => (
        <Toast key={toastItem.id}>
          {/* Visual indicator bar */}
          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-primary/50" />
          
          <div className="flex flex-1 flex-col gap-1 pl-3">
            {toastItem.title ? <ToastTitle>{toastItem.title}</ToastTitle> : null}
            {toastItem.description ? (
              <ToastDescription>{toastItem.description}</ToastDescription>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {toastItem.action ? <ToastAction altText="Action">{toastItem.action}</ToastAction> : null}
            <ToastClose onClick={() => toastItem.id && dismiss(toastItem.id)} />
          </div>
        </Toast>
      ))}
      <ToastViewport />
    </RadixToastProvider>
  );
}
