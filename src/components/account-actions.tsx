"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isNativeApp } from "@/lib/native";
import { callFn } from "@/lib/functions";

export function ActiveToggle({ initial, onDone }: { initial: boolean; onDone?: () => void }) {
  const router = useRouter();
  const [active, setActive] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !active;
    setActive(next);
    startTransition(async () => {
      if (isNativeApp()) {
        await callFn(createClient(), "account-active", { is_active: next });
      } else {
        await fetch("/api/account/active", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: next }),
        });
      }
      router.refresh();
      onDone?.();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm" style={{ color: "var(--ts-text-strong)" }}>
        {active ? "Active — I appear in matches" : "Paused — hidden from matching"}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        disabled={pending}
        onClick={toggle}
        className="relative h-[26px] w-11 flex-none rounded-full transition disabled:opacity-50"
        style={{ background: active ? "var(--ts-accent)" : "var(--ts-border-strong)" }}
      >
        <span
          className="absolute top-[3px] h-5 w-5 rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)]"
          style={{ left: 3, transform: `translateX(${active ? 18 : 0}px)` }}
        />
      </button>
    </div>
  );
}

export function DeleteAccountButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function remove() {
    setError("");
    startTransition(async () => {
      try {
        if (isNativeApp()) {
          await callFn(createClient(), "account-delete");
          await createClient().auth.signOut();
          router.replace("/sign-in");
          return;
        }
        const res = await fetch("/api/account/delete", { method: "POST" });
        if (res.ok) {
          await createClient().auth.signOut();
          router.push("/?deleted=1");
          router.refresh();
        } else {
          setError((await res.json().catch(() => ({})))?.error ?? "Couldn't delete your account.");
        }
      } catch (e) {
        setError((e as Error).message || "Couldn't delete your account.");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border py-3.5 text-sm font-semibold transition"
        style={{ background: "var(--ts-danger-soft)", borderColor: "var(--ts-danger-border)", color: "var(--ts-danger)" }}
      >
        Delete my account
      </button>
    );
  }

  return (
    <div className="animate-ts-card-in space-y-3 rounded-2xl border p-3.5" style={{ background: "var(--ts-danger-soft)", borderColor: "var(--ts-danger-border)" }}>
      <p className="text-sm" style={{ color: "var(--ts-text-strong)" }}>
        This permanently deletes your profile, preferences, matches, messages, notifications and your login —
        everything. This cannot be undone. Type <strong>DELETE</strong> to confirm.
      </p>
      <input className="ts-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" />
      {error && <p className="text-sm" style={{ color: "var(--ts-danger)" }}>{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="ts-btn-secondary flex-1 text-xs" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </button>
        <button type="button" className="ts-btn-danger flex-1 text-xs" onClick={remove} disabled={pending || confirm !== "DELETE"}>
          {pending ? "Deleting…" : "Delete my account"}
        </button>
      </div>
    </div>
  );
}
