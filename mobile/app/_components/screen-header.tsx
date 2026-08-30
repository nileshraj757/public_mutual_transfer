"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "@/components/icons";

/**
 * Sticky glass header for non-tab screens (match detail, preferences,
 * settings, billing, admin/*): back chevron + title + optional right action.
 * Falls back to /dashboard if there's no history to go back to (e.g. right
 * after sign-in), same as the back-bar it replaces.
 */
export function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/dashboard");
  }

  return (
    <div
      className="sticky top-0 z-20 -mx-5 mb-4 flex items-center justify-between gap-3 border-b px-5 py-3.5 backdrop-blur-xl [padding-top:calc(env(safe-area-inset-top)+0.875rem)]"
      style={{ background: "var(--ts-sticky-bg)", borderColor: "var(--ts-border)" }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="grid h-9 w-9 flex-none place-items-center rounded-xl border transition active:scale-95"
          style={{ background: "var(--ts-surface)", borderColor: "var(--ts-border)", color: "var(--ts-text-strong)" }}
        >
          <ChevronRight className="h-[18px] w-[18px] rotate-180" />
        </button>
        <h1 className="truncate font-display text-lg font-bold" style={{ color: "var(--ts-text-strong)" }}>
          {title}
        </h1>
      </div>
      {right}
    </div>
  );
}
