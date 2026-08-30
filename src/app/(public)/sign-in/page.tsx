import { Suspense } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { SignInForm } from "./sign-in-form";
import { MailSpot } from "@/components/illustrations";

export const metadata = { title: "Sign in — TransferSetu" };

export default function SignInPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <div className="text-center">
        <MailSpot className="mx-auto h-24 w-auto animate-pop-in" />
        <h1 className="mt-3 font-display text-2xl font-semibold text-sand-900">Welcome back</h1>
        <p className="mt-2 text-sm text-sand-600">Sign in with Google, or your email and password.</p>
      </div>

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
