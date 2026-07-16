"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authRedirectUrl } from "@/lib/native";
import { CheckCircle, Loader, Phone } from "@/components/icons";

type Mode = "magic" | "phone" | "password";
type Status = "idle" | "loading" | "sent" | "error";

/** Strip spaces/dashes; ensure a leading + so Supabase gets E.164 (+919876543210). */
function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[\s-()]/g, "");
  return cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
}

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false); // phone flow: moved to code-entry step
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const supabase = createClient();
  const redirectTo = authRedirectUrl(next);

  function switchMode(m: Mode) {
    setMode(m);
    setStatus("idle");
    setMessage("");
    setOtpSent(false);
    setOtp("");
  }

  function fail(msg: string) {
    setStatus("error");
    setMessage(msg);
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });
    if (error) return fail(error.message);
    setStatus("sent");
    setMessage(`Check ${email} for your sign-in link.`);
  }

  async function sendPhoneOtp(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const { error } = await supabase.auth.signInWithOtp({ phone: normalizePhone(phone) });
    if (error) return fail(error.message);
    setOtpSent(true);
    setStatus("idle");
    setMessage("");
  }

  async function verifyPhoneOtp(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const { error } = await supabase.auth.verifyOtp({ phone: normalizePhone(phone), token: otp.trim(), type: "sms" });
    if (error) return fail(error.message);
    router.push(next);
    router.refresh();
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return fail(error.message);
    router.push(next);
    router.refresh();
  }

  const loading = status === "loading";

  return (
    <div className="card mt-6 animate-fade-in-up">
      <div className="mb-4 flex gap-1 rounded-full bg-sand-100 p-1 text-sm">
        {([
          ["magic", "Email"],
          ["phone", "Phone OTP"],
          ["password", "Password"],
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

      {mode === "magic" && status === "sent" ? (
        <div className="flex animate-pop-in items-start gap-3 rounded-xl bg-green-50 p-3 text-sm text-green-800">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{message}</p>
        </div>
      ) : mode === "phone" ? (
        // ── Phone OTP: two steps (enter number → enter code) ──
        !otpSent ? (
          <form onSubmit={sendPhoneOtp} className="space-y-3">
            <div>
              <label className="label" htmlFor="phone">Mobile number</label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                required
                className="input"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <p className="mt-1 text-xs text-sand-500">Include your country code. We&apos;ll text you a 6-digit code.</p>
            </div>
            {status === "error" && <p className="text-sm text-red-600">{message}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Loader className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
              {loading ? "Sending…" : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyPhoneOtp} className="space-y-3">
            <div>
              <label className="label" htmlFor="otp">Enter the 6-digit code</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                className="input tracking-[0.4em]"
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              />
              <p className="mt-1 text-xs text-sand-500">Sent to {normalizePhone(phone)}.</p>
            </div>
            {status === "error" && <p className="text-sm text-red-600">{message}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading || otp.length < 6}>
              {loading && <Loader className="h-4 w-4" />}
              {loading ? "Verifying…" : "Verify & sign in"}
            </button>
            <button
              type="button"
              className="w-full text-center text-xs text-sand-500 underline"
              onClick={() => { setOtpSent(false); setOtp(""); setStatus("idle"); setMessage(""); }}
            >
              Change number / resend
            </button>
          </form>
        )
      ) : (
        // ── Email link / Password ──
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

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading && <Loader className="h-4 w-4" />}
            {loading ? "Working…" : mode === "magic" ? "Send me a sign-in link" : "Sign in"}
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
