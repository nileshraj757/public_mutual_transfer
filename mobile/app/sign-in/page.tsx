"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SignInForm } from "@/app/(public)/sign-in/sign-in-form";
import { MailSpot } from "@/components/illustrations";
import { isNativeApp, nativePlatform, authRedirectUrl } from "@/lib/native";
import { useAuth } from "../providers";

/** Standalone sign-in screen. Reuses the web SignInForm verbatim (magic link,
 *  phone OTP, password). Redirects into the app if already signed in. */
export default function SignInPage() {
  const { loading, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session) router.replace("/dashboard");
  }, [loading, session, router]);

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16 [padding-top:calc(env(safe-area-inset-top)+2rem)]">
      <div className="text-center">
        <MailSpot className="mx-auto h-24 w-auto animate-pop-in" />
        <h1 className="mt-3 font-display text-2xl font-semibold text-sand-900">Welcome</h1>
        <p className="mt-2 text-sm text-sand-600">
          Sign in with an email magic link, a one-time code on your phone, or your password.
        </p>
      </div>

      <DebugPanel />

      <Suspense>
        <SignInForm />
      </Suspense>
    </div>
  );
}

/** TEMPORARY diagnostic — remove once native redirect detection is confirmed
 *  working. Shows what the app thinks at runtime, no email round-trip needed. */
function DebugPanel() {
  const [info, setInfo] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    // Read on next tick too, in case Capacitor's bridge injects a moment after
    // first paint — this rules out a pure timing race.
    const read = () => ({
      "window.Capacitor present": String(!!(window as unknown as { Capacitor?: unknown }).Capacitor),
      "isNativeApp()": String(isNativeApp()),
      "nativePlatform()": nativePlatform(),
      "authRedirectUrl('/dashboard')": authRedirectUrl("/dashboard"),
      "window.location.origin": window.location.origin,
    });
    setInfo(read());
    const t = setTimeout(() => setInfo(read()), 1500);
    return () => clearTimeout(t);
  }, []);

  if (!info) return null;
  return (
    <div className="mt-4 space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[11px] text-amber-900">
      <p className="font-semibold">Debug (temporary)</p>
      {Object.entries(info).map(([k, v]) => (
        <p key={k} className="break-all">
          <span className="font-medium">{k}:</span> {v}
        </p>
      ))}
    </div>
  );
}
