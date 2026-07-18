"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { postAuthDestination } from "@/lib/post-auth-route";
import { Splash } from "../../_components/splash";

/**
 * Client-side signup-confirmation / magic-link PKCE completion. Replaces the
 * web app's server route src/app/auth/callback/route.ts.
 *
 * The native deep link (mutualtransfer://auth/callback?code=…) is caught by
 * NativeBridge, which forwards ?code=&next= to this in-WebView page. We exchange
 * the code for a session (the PKCE verifier is in localStorage from sign-in),
 * then route to onboarding (no profile yet) or the intended destination.
 *
 * useSearchParams isn't used (it forces a Suspense boundary under static export);
 * we read window.location directly instead.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const next = params.get("next") || "/dashboard";
      if (!code) {
        setError(true);
        return;
      }

      const supabase = createClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        setError(true);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError(true);
        return;
      }

      const dest = await postAuthDestination(supabase, user.id, next);
      router.replace(dest);
    })();
  }, [router]);

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center p-8 text-center">
        <div className="max-w-sm">
          <h1 className="font-display text-xl font-semibold text-sand-900">Sign-in link invalid</h1>
          <p className="mt-2 text-sm text-sand-600">
            That link has expired or was already used. Please request a new one.
          </p>
          <button className="btn-primary mt-4" onClick={() => router.replace("/sign-in")}>
            Back to sign in
          </button>
        </div>
      </main>
    );
  }

  return <Splash label="Signing you in…" />;
}
