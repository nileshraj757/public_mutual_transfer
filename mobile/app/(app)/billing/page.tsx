"use client";

import { useCallback, useEffect, useState } from "react";
import { BillingClient } from "@/components/billing-client";
import { isActiveSubscription } from "@/lib/billing-core";
import type { Subscription } from "@/lib/types";
import { SUPABASE_URL } from "@/lib/env";
import { useAuth } from "../../providers";
import { Splash } from "../../_components/splash";

/**
 * Whether billing is configured for the mobile build. The public Razorpay key
 * isn't inlined into the static export the same way, so we treat billing as
 * "configured" when a public key env is present at build time; the actual
 * subscribe call ultimately fails gracefully via the Edge Function if not.
 */
const configured = Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
const planName = process.env.NEXT_PUBLIC_PREMIUM_NAME || "Transfer Setu Premium";
const priceLabel = process.env.NEXT_PUBLIC_PREMIUM_PRICE_LABEL || "Monthly subscription";

export default function BillingPage() {
  const { supabase, profile } = useAuth();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSub((data as Subscription) ?? null);
    setLoaded(true);
  }, [supabase, profile]);

  useEffect(() => {
    load();
  }, [load]);

  if (!profile || !loaded) return <Splash />;

  const active = isActiveSubscription(sub);

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-sand-900">Premium</h1>
        <p className="mt-1 text-sm text-sand-600">
          Premium unlocks priority match alerts. The actual transfer always depends on the competent authority&apos;s
          approval.
        </p>
      </div>

      <BillingClient
        configured={configured || Boolean(SUPABASE_URL)}
        isActive={active}
        status={sub?.status ?? null}
        currentEnd={sub?.current_end ?? null}
        cancelAtPeriodEnd={sub?.cancel_at_period_end ?? false}
        email={profile.contact_email}
        planName={planName}
        priceLabel={priceLabel}
        onDone={load}
      />

      <p className="text-xs text-sand-400">
        Payments are processed securely by Razorpay. We never store your card or bank details.
      </p>
    </div>
  );
}
