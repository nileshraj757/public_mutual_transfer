"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authRedirectUrl, isNativeApp } from "@/lib/native";
import { postAuthDestination } from "@/lib/post-auth-route";
import { CheckCircle, Loader } from "@/components/icons";
import { SegmentedControl } from "./segmented-control";

type Mode = "signin" | "signup";
type Status = "idle" | "loading" | "sent" | "error";

/**
 * Mobile-local fork of src/app/(public)/sign-in/sign-in-form.tsx — identical
 * auth logic (email/password, Google OAuth via system browser, post-auth
 * routing), restyled to the glass design system. Kept as a separate file
 * (rather than restyling the shared one in place) so the web sign-in page is
 * completely unaffected.
 */
export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    if (password !== confirmPassword) return fail("Passwords don't match.");
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

  async function signInWithGoogle() {
    setStatus("loading");
    setMessage("");
    const redirectTo = authRedirectUrl(next);

    // Google blocks OAuth inside an embedded WebView, so hand the flow off to
    // the system browser; the redirect back into the app arrives as a
    // mutualtransfer:// deep link caught by NativeBridge.
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) return fail(error?.message || "Could not start Google sign-in.");
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url: data.url });
    setStatus("idle");
  }

  const loading = status === "loading";

  return (
    <div className="flex w-full flex-col items-center text-center">
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] border backdrop-blur-xl"
        style={{ background: "var(--ts-surface)", borderColor: "var(--ts-border)", boxShadow: "var(--ts-shadow-card)" }}
      >
        <svg width="30" height="30" viewBox="0 0 40 40" fill="none" aria-hidden>
          <path d="M11 16.5h13.5M21 12l4.5 4.5-4.5 4.5" stroke="#3FD99B" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M29 23.5H15.5M19 28l-4.5-4.5L19 19" stroke="#F0A63C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="font-display text-[22px] font-bold tracking-[-0.3px]" style={{ color: "var(--ts-text-strong)" }}>
        Transfer Setu
      </h1>
      <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed" style={{ color: "var(--ts-muted)" }}>
        Facilitating mutual transfers for court &amp; judicial employees
      </p>

      <div className="mt-7 w-full">
        <SegmentedControl
          options={[
            { label: "Sign in", value: "signin" as Mode },
            { label: "Create account", value: "signup" as Mode },
          ]}
          value={mode}
          onChange={switchMode}
        />
      </div>

      {mode === "signup" && status === "sent" ? (
        <div className="mt-5 flex animate-ts-card-in items-start gap-3 rounded-2xl border p-3.5 text-left text-sm" style={{ background: "var(--ts-accent-soft)", borderColor: "var(--ts-accent-border)", color: "var(--ts-text-strong)" }}>
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: "var(--ts-accent-strong)" }} />
          <p>{message}</p>
        </div>
      ) : (
        <form onSubmit={mode === "signup" ? signUp : signIn} className="mt-6 w-full space-y-3 text-left">
          <div>
            <label className="ts-label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="ts-input" placeholder="you@court.gov.in" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="ts-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              className="ts-input"
              placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {mode === "signup" && (
            <div className="animate-ts-card-in">
              <label className="ts-label" htmlFor="confirm-password">Confirm password</label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={8}
                className="ts-input"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          )}

          {status === "error" && <p className="text-sm" style={{ color: "var(--ts-danger)" }}>{message}</p>}

          <button type="submit" className="ts-btn-primary mt-2 w-full py-3.5" disabled={loading}>
            {loading && <Loader className="h-4 w-4" />}
            {loading ? "Working…" : mode === "signup" ? "Create account" : "Continue"}
          </button>
        </form>
      )}

      <div className="my-5 flex w-full items-center gap-2.5">
        <div className="h-px flex-1" style={{ background: "var(--ts-border)" }} />
        <span className="text-[11px]" style={{ color: "var(--ts-faint)" }}>OR</span>
        <div className="h-px flex-1" style={{ background: "var(--ts-border)" }} />
      </div>

      <button type="button" className="ts-btn-secondary w-full py-3.5" onClick={signInWithGoogle} disabled={loading}>
        <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-white text-[11px] font-extrabold text-[#4285F4]">G</span>
        Continue with Google
      </button>

      <p className="mt-5 text-[11px] leading-relaxed" style={{ color: "var(--ts-faint)" }}>
        This platform only facilitates discovery. Transfers are approved solely by the competent authority. By continuing you agree to our processing of your data, as described in the{" "}
        <a href="/privacy" style={{ color: "var(--ts-accent-strong)" }} className="underline">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
