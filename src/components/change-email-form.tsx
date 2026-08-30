"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

/** Supabase emails a confirmation link to the new address before the change
 *  takes effect. profiles.contact_email then auto-syncs on the next profile
 *  save (src/lib/profile-core.ts always copies auth.users.email in). */
export function ChangeEmailForm({ currentEmail }: { currentEmail: string | null }) {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const { error } = await createClient().auth.updateUser({ email });
      if (error) {
        setMsg({ ok: false, text: error.message });
        return;
      }
      setMsg({ ok: true, text: `Check ${email} for a confirmation link to finish the change.` });
      setEmail("");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {currentEmail && <p className="text-sm" style={{ color: "var(--ts-muted)" }}>Current: {currentEmail}</p>}
      <div>
        <label className="ts-label">New email</label>
        <input
          type="email"
          className="ts-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      {msg && <p className="text-sm" style={{ color: msg.ok ? "var(--ts-accent-strong)" : "var(--ts-danger)" }}>{msg.text}</p>}
      <button type="submit" className="ts-btn-secondary" disabled={pending || !email}>
        {pending ? "Saving…" : "Change email"}
      </button>
    </form>
  );
}
