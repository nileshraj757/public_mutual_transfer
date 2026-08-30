"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isNativeApp } from "@/lib/native";
import { createClient } from "@/lib/supabase/client";
import { callFn } from "@/lib/functions";

/**
 * Block a match member: hides each other from Search (browse_profiles) and
 * ends any shared match (src/app/api/profiles/block/route.ts,
 * supabase/functions/profile-block). Unblocking happens later, from
 * Settings → Privacy (blocked-users-list.tsx).
 */
export function BlockButton({
  members,
  onDone,
}: {
  members: { id: string; label: string }[];
  /** Mobile re-fetch (router.refresh() is a no-op under static export). */
  onDone?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [targetId, setTargetId] = useState(members[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function block() {
    setError("");
    startTransition(async () => {
      try {
        if (isNativeApp()) {
          await callFn(createClient(), "profile-block", { profile_id: targetId });
        } else {
          const res = await fetch("/api/profiles/block", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profile_id: targetId }),
          });
          if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Couldn't block.");
        }
        setDone(true);
        setOpen(false);
        router.refresh();
        onDone?.();
      } catch (e) {
        setError((e as Error).message || "Couldn't block.");
      }
    });
  }

  if (!members.length) return null;
  if (done) return <p className="text-sm" style={{ color: "var(--ts-muted)" }}>Blocked.</p>;

  if (!open) {
    return (
      <button type="button" className="ts-btn-secondary px-4 py-2.5 text-xs" style={{ color: "var(--ts-danger)" }} onClick={() => setOpen(true)}>
        Block
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {members.length > 1 && (
        <select className="ts-input" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      )}
      <p className="text-sm" style={{ color: "var(--ts-muted)" }}>
        Blocking hides you from each other in Search and ends this match. Unblock later from Settings → Privacy.
      </p>
      {error && <p className="text-sm" style={{ color: "var(--ts-danger)" }}>{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="ts-btn-danger px-4 py-2.5 text-xs" onClick={block} disabled={pending}>
          {pending ? "Blocking…" : "Confirm block"}
        </button>
        <button type="button" className="ts-btn-secondary px-4 py-2.5 text-xs" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
