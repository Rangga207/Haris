"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "./button";

type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextType {
  toast: (options: { type?: ToastType; title?: string; message: string }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({
      type = "info",
      title,
      message,
    }: {
      type?: ToastType;
      title?: string;
      message: string;
    }) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message }]);

      // Auto dismiss after 4 seconds
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const success = (message: string, title?: string) =>
    addToast({ type: "success", title, message });
  const error = (message: string, title?: string) =>
    addToast({ type: "error", title, message });
  const info = (message: string, title?: string) =>
    addToast({ type: "info", title, message });

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-lg border text-sm transition-all transform animate-in slide-in-from-bottom-2",
              t.type === "success" && "bg-white border-semantic-green/40 text-body",
              t.type === "error" && "bg-white border-semantic-red/40 text-body",
              t.type === "info" && "bg-white border-sky text-body"
            )}
          >
            {t.type === "success" && (
              <CheckCircle2 className="w-5 h-5 text-semantic-green flex-shrink-0 mt-0.5" />
            )}
            {t.type === "error" && (
              <AlertCircle className="w-5 h-5 text-semantic-red flex-shrink-0 mt-0.5" />
            )}
            {t.type === "info" && (
              <Info className="w-5 h-5 text-blue flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              {t.title && <div className="font-semibold text-navy">{t.title}</div>}
              <div className="text-muted text-xs mt-0.5">{t.message}</div>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-muted hover:text-navy p-1 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
