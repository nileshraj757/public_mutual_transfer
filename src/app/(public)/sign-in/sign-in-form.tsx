"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authRedirectUrl } from "@/lib/native";
import { postAuthDestination } from "@/lib/post-auth-route";
import { CheckCircle, Loader } from "@/components/icons";

type Mode = "signin" | "signup";
type Status = "idle" | "loading" | "sent" | "error";

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const supabase = createClient();

  function switchMode(m: Mode) {
    setMode(m);
    setStatus("idle");
    setMessage("");
  }

  function fail(msg: string) {
    setStatus("error");
    setMessage(msg);
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: authRedirectUrl(next) },
    });
    if (error) return fail(error.message);
    setStatus("sent");
    setMessage(`We sent a confirmation link to ${email}. Click it to activate your account before signing in.`);
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (/email not confirmed/i.test(error.message)) {
        return fail("Please confirm your email first — check your inbox for the confirmation link we sent when you signed up.");
      }
      return fail(error.message);
    }
    const dest = await postAuthDestination(supabase, data.user.id, next);
    router.push(dest);
    router.refresh();
  }

  const loading = status === "loading";

  return (
    <div className="card mt-6 animate-fade-in-up">
      <div className="mb-4 flex gap-1 rounded-full bg-sand-100 p-1 text-sm">
        {([
          ["signin", "Sign in"],
          ["signup", "Sign up"],
        ] as [Mode, string][]).map(([m, label]) => (
          <button
            key={m}
            type="button"
            className={`flex-1 rounded-full px-3 py-1.5 transition ${mode === m ? "bg-white font-medium text-sand-900 shadow-warm" : "text-sand-600"}`}
            onClick={() => switchMode(m)}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "signup" && status === "sent" ? (
        <div className="flex animate-pop-in items-start gap-3 rounded-xl bg-green-50 p-3 text-sm text-green-800">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{message}</p>
        </div>
      ) : (
        <form onSubmit={mode === "signup" ? signUp : signIn} className="space-y-3">
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

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              className="input"
              placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {status === "error" && <p className="text-sm text-red-600">{message}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading && <Loader className="h-4 w-4" />}
            {loading ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>
      )}

      <p className="mt-4 text-xs text-sand-500">
        By continuing you agree to our processing of your data for mutual-transfer facilitation, as described in the{" "}
        <a href="/privacy" className="text-brand-700 underline">Privacy Policy</a>.
      </p>
    </div>
  );
}
