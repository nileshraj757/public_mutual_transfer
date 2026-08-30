"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface ToastValue {
  show: (message: string) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

/** Bottom-center toast pill, auto-dismiss after 2s. Mounted once in
 *  mobile/app/providers.tsx so any screen can call useToast().show(msg). */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string) => {
    setMessage(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {message && (
        <div
          className="fixed left-1/2 z-50 -translate-x-1/2 animate-ts-toast-in whitespace-nowrap rounded-full border px-5 py-2.5 text-xs font-semibold backdrop-blur-xl"
          style={{
            bottom: "calc(96px + env(safe-area-inset-bottom))",
            background: "rgba(20,26,24,0.85)",
            borderColor: "var(--ts-border-strong)",
            color: "#fff",
          }}
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
