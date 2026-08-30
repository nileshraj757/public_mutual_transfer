"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

/** supabase.auth.updateUser() operates on the current session directly — same
 *  on web and native, no server route needed (like signInWithPassword in
 *  sign-in-form.tsx). */
export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) {
      setMsg({ ok: false, text: "Password must be at least 8 characters." });
      return;
    }
    if (password !== confirm) {
      setMsg({ ok: false, text: "Passwords don't match." });
      return;
    }
    startTransition(async () => {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) {
        setMsg({ ok: false, text: error.message });
        return;
      }
      setPassword("");
      setConfirm("");
      setMsg({ ok: true, text: "Password updated." });
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="label">New password</label>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
      </div>
      <div>
        <label className="label">Confirm new password</label>
        <input
          type="password"
          className="input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          required
        />
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}
      <button type="submit" className="btn-secondary" disabled={pending}>
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
