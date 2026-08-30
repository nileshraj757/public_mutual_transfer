"use client";

import { useRef, useState } from "react";

const SIZE = 96;
const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * 96×96 hold-to-reveal control: hold to fill the ring over `durationMs`, then
 * fire onComplete once. Releasing early resets progress to 0. This is a UX
 * gate only — the underlying contact data is already fetched exclusively
 * once every match member has consented (see mobile/app/(app)/matches/page.tsx),
 * so this never needs to re-check consent itself.
 */
export function HoldToReveal({ onComplete, durationMs = 2200 }: { onComplete: () => void; durationMs?: number }) {
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function start() {
    if (timer.current) clearInterval(timer.current);
    const stepMs = 35;
    const stepPct = (stepMs / durationMs) * 100;
    timer.current = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + stepPct);
        if (next >= 100) {
          if (timer.current) clearInterval(timer.current);
          timer.current = null;
          onComplete();
        }
        return next;
      });
    }, stepMs);
  }

  function end() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    setProgress(0);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        onPointerDown={start}
        onPointerUp={end}
        onPointerLeave={end}
        className="relative select-none"
        style={{ width: SIZE, height: SIZE, touchAction: "none", cursor: "pointer" }}
      >
        <svg width={SIZE} height={SIZE} className="absolute inset-0 -rotate-90">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--ts-border-strong)" strokeWidth={6} />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--ts-accent)"
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress / 100)}
            style={{ transition: "stroke-dashoffset 0.05s linear" }}
          />
        </svg>
        <div
          className="absolute inset-[10px] flex items-center justify-center rounded-full"
          style={{ background: "var(--ts-accent-soft)" }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--ts-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
      </div>
      <p className="text-xs" style={{ color: "var(--ts-muted-2)" }}>
        Hold to reveal contact details
      </p>
    </div>
  );
}
