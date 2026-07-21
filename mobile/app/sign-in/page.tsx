"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignInForm } from "@/app/(public)/sign-in/sign-in-form";
import { MailSpot } from "@/components/illustrations";
import { useAuth } from "../providers";

/** Standalone sign-in screen. Reuses the web SignInForm verbatim (Google,
 *  email + password). Redirects into the app if already signed in. */
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
        <p className="mt-2 text-sm text-sand-600">Sign in with Google, or your email and password.</p>
      </div>

      <Suspense>
        <SignInForm />
      </Suspense>
    </div>
  );
}
