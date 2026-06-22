"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SITE_URL } from "@/lib/env";

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const supabase = createClient();
  const redirectTo = `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
      setMessage(`Check ${email} for your sign-in link.`);
    }
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      router.push(next);
      router.refresh();
    }
  }

  return (
    <div className="card mt-6">
      <div className="mb-4 flex gap-2 rounded-lg bg-slate-100 p-1 text-sm">
        <button
          className={`flex-1 rounded-md px-3 py-1.5 ${mode === "magic" ? "bg-white font-medium shadow-sm" : "text-slate-600"}`}
          onClick={() => setMode("magic")}
        >
          Email link
        </button>
        <button
          className={`flex-1 rounded-md px-3 py-1.5 ${mode === "password" ? "bg-white font-medium shadow-sm" : "text-slate-600"}`}
          onClick={() => setMode("password")}
        >
          Password (demo)
        </button>
      </div>

      {status === "sent" ? (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{message}</p>
      ) : (
        <form onSubmit={mode === "magic" ? sendMagicLink : signInWithPassword} className="space-y-3">
          <div>
            <label className="label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              required
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {mode === "password" && (
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                className="input"
                placeholder="Demo accounts use: Passw0rd!"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {status === "error" && <p className="text-sm text-red-600">{message}</p>}

          <button type="submit" className="btn-primary w-full" disabled={status === "loading"}>
            {status === "loading"
              ? "Working…"
              : mode === "magic"
                ? "Send me a sign-in link"
                : "Sign in"}
          </button>
        </form>
      )}

      <p className="mt-4 text-xs text-slate-500">
        By continuing you agree to our processing of your data for mutual-transfer facilitation, as described in the{" "}
        <a href="/privacy" className="text-brand-700 underline">Privacy Policy</a>.
      </p>
    </div>
  );
}
