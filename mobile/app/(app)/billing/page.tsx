"use client";

import { useCallback, useEffect, useState } from "react";
import { BillingClient } from "@/components/billing-client";
import { isActiveSubscription } from "@/lib/billing-core";
import type { Subscription } from "@/lib/types";
import { ScreenHeader } from "../../_components/screen-header";
import { useAuth } from "../../providers";
import { Splash } from "../../_components/splash";

// Subscription flow is temporarily disabled on mobile — forcing this false
// makes BillingClient render its "Premium is coming soon" fallback instead of
// a live Subscribe/Razorpay checkout. Restore the real check to bring it back:
// const configured = Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
const configured = false;
const planName = process.env.NEXT_PUBLIC_PREMIUM_NAME || "TransferSetu Premium";
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
    <div>
      <ScreenHeader title="Premium" />
      <p className="mb-4 text-sm leading-relaxed" style={{ color: "var(--ts-muted)" }}>
        Your profile and Search stay free. Premium unlocks your Matches, Chats, connection requests, alerts, and the
        official joint-application document. The actual transfer always depends on the competent authority&apos;s
        approval.
      </p>

      <BillingClient
        configured={configured}
        isActive={active}
        status={sub?.status ?? null}
        currentEnd={sub?.current_end ?? null}
        cancelAtPeriodEnd={sub?.cancel_at_period_end ?? false}
        email={profile.contact_email}
        planName={planName}
        priceLabel={priceLabel}
        onDone={load}
      />

      <p className="mt-3 text-xs" style={{ color: "var(--ts-faint)" }}>
        Payments are processed securely by Razorpay. We never store your card or bank details.
      </p>
    </div>
  );
}
