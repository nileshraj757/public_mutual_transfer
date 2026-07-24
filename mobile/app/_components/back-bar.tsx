"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "@/components/icons";

/**
 * Mobile-only back bar shown under the top nav on every authenticated screen.
 * The Android hardware back button already navigates history (see
 * NativeBridge), but a visible in-UI control is friendlier to discover and is
 * the only option on iOS. Falls back to the Matches tab if there's no history
 * to go back to (e.g. right after sign-in).
 */
export function BackBar() {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/dashboard");
  }

  return (
    <div className="border-b border-sand-200 bg-sand-50/85 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4">
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1 py-2 text-sm font-medium text-sand-600 transition hover:text-sand-900"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          Back
        </button>
      </div>
    </div>
  );
}
