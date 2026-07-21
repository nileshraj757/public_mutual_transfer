"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authRedirectUrl, isNativeApp } from "@/lib/native";
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

  async function signInWithGoogle() {
    setStatus("loading");
    setMessage("");
    const redirectTo = authRedirectUrl(next);

    if (isNativeApp()) {
      // Google blocks OAuth inside an embedded WebView, so hand the flow off to
      // the system browser (Custom Tabs / SFSafariViewController) instead of
      // navigating the app's own WebView. skipBrowserRedirect keeps Supabase
      // from trying to redirect this WebView itself. The redirect back into the
      // app arrives as a mutualtransfer:// deep link, caught by NativeBridge,
      // exactly like the email confirmation flow.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data?.url) return fail(error?.message || "Could not start Google sign-in.");
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: data.url });
      setStatus("idle");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) fail(error.message);
    // On success the browser navigates away to Google; nothing more to do here.
  }

  const loading = status === "loading";

  return (
    <div className="card mt-6 animate-fade-in-up">
      <button
        type="button"
        className="btn-secondary flex w-full items-center justify-center gap-2"
        onClick={signInWithGoogle}
        disabled={loading}
      >
        <GoogleIcon className="h-4 w-4" />
        Continue with Google
      </button>

      <div className="my-4 flex items-center gap-3 text-xs text-sand-400">
        <div className="h-px flex-1 bg-sand-200" />
        or
        <div className="h-px flex-1 bg-sand-200" />
      </div>

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

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
