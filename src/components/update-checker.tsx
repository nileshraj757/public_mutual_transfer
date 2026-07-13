"use client";

import { useEffect, useRef, useState } from "react";
import { isNativeApp } from "@/lib/native";

const POLL_MS = 60_000;

/**
 * Detects when a newer deployment has gone live while this session is still
 * open (the native shell just points at the live URL, so most changes need
 * no new APK — only a reload) and offers a one-tap reload.
 */
export function UpdateChecker() {
  const [available, setAvailable] = useState(false);
  const baseline = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { id } = await res.json();
        if (cancelled || !id || id === "dev") return;
        if (baseline.current === null) {
          baseline.current = id;
        } else if (id !== baseline.current) {
          setAvailable(true);
        }
      } catch {
        /* offline or transient — try again next tick */
      }
    }

    check();
    const interval = setInterval(check, POLL_MS);

    // Re-check the moment the app comes back to the foreground — the WebView
    // often stays alive across a background/resume cycle, so polling alone
    // can lag behind what the user actually experiences as "reopening".
    function onVisible() {
      if (document.visibilityState === "visible") check();
    }
    document.addEventListener("visibilitychange", onVisible);

    let removeNativeListener: (() => void) | undefined;
    if (isNativeApp()) {
      import("@capacitor/app").then(({ App }) => {
        App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) check();
        }).then((sub) => {
          removeNativeListener = () => sub.remove();
        });
      });
    }

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      removeNativeListener?.();
    };
  }, []);

  if (!available) return null;

  return (
    <div className="flex items-center justify-center gap-3 bg-brand-600 px-4 py-2 text-sm text-white [padding-top:calc(0.5rem+env(safe-area-inset-top))]">
      <span>A new version is available.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-md bg-white/15 px-3 py-1 font-semibold hover:bg-white/25"
      >
        Reload
      </button>
    </div>
  );
}
