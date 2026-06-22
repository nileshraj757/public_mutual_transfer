import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { SignInForm } from "./sign-in-form";

export const metadata = { title: "Sign in — Mutual Transfer" };

export default function SignInPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">Sign in or create your account</h1>
      <p className="mt-2 text-sm text-slate-600">
        We use free, password-less email links — no SMS, no cost. Enter your email and we&apos;ll send you a secure
        sign-in link.
      </p>

      {!isSupabaseConfigured ? (
        <div className="card mt-6 border-amber-300 bg-amber-50 text-sm text-amber-900">
          Supabase isn&apos;t configured yet. Copy <code>.env.example</code> to <code>.env.local</code>, add your free
          Supabase keys, then restart the dev server. See the README.
        </div>
      ) : (
        <Suspense>
          <SignInForm />
        </Suspense>
      )}
    </div>
  );
}
