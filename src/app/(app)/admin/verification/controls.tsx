"use client";

import { useTransition } from "react";
import { setVerification } from "../actions";
import type { VerificationStatus } from "@/lib/types";

export function VerificationControls({ profileId, current }: { profileId: string; current: VerificationStatus }) {
  const [pending, startTransition] = useTransition();

  function set(status: VerificationStatus) {
    startTransition(() => setVerification(profileId, status));
  }

  return (
    <div className="flex gap-2">
      <button
        className="btn-secondary px-3 py-1.5 text-sm"
        disabled={pending || current === "verified"}
        onClick={() => set("verified")}
      >
        Verify
      </button>
      <button
        className="btn-secondary px-3 py-1.5 text-sm"
        disabled={pending || current === "rejected"}
        onClick={() => set("rejected")}
      >
        Reject
      </button>
    </div>
  );
}
