"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers";
import { SignInForm } from "../_components/sign-in-form";

/** Standalone sign-in screen. Redirects into the app if already signed in. */
export default function SignInPage() {
  const { loading, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session) router.replace("/dashboard");
  }, [loading, session, router]);

  return (
    <div className="mx-auto flex max-w-md flex-col px-1 py-10 [padding-top:calc(env(safe-area-inset-top)+2.5rem)]">
      <Suspense>
        <SignInForm />
      </Suspense>
    </div>
  );
}
