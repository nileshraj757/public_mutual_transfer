"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ActiveToggle({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [active, setActive] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !active;
    setActive(next);
    startTransition(async () => {
      await fetch("/api/account/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: next }),
      });
      router.refresh();
    });
  }

  return (
    <label className="flex items-center gap-3">
      <input type="checkbox" checked={active} onChange={toggle} disabled={pending} className="h-4 w-4" />
      <span className="text-sm text-slate-700">
        {active ? "Active — I appear in matches and browse" : "Paused — hidden from matching and browse"}
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
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (res.ok) {
        await createClient().auth.signOut();
        router.push("/?deleted=1");
        router.refresh();
      } else {
        setError((await res.json().catch(() => ({})))?.error ?? "Couldn't delete your account.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
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
