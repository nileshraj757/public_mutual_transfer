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
    <label className="flex items-center gap-3">
      <input type="checkbox" checked={active} onChange={toggle} disabled={pending} className="h-4 w-4" />
      <span className="text-sm text-sand-700">
        {active ? "Active — I appear in matches" : "Paused — hidden from matching"}
      </span>
    </label>
  );
}

export function DeleteAccountButton() {
  const router = useRouter();
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

  return (
    <div className="space-y-3">
      <p className="text-sm text-sand-600">
        This permanently deletes your profile, preferences, matches, messages, notifications and your login — everything.
        This cannot be undone. Type <strong>DELETE</strong> to confirm.
      </p>
      <input className="input max-w-xs" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-danger" onClick={remove} disabled={pending || confirm !== "DELETE"}>
        {pending ? "Deleting…" : "Delete my account and all my data"}
      </button>
    </div>
  );
}
