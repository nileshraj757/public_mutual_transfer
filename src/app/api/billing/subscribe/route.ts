import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { billingEnabled, createSubscription, epochToIso, publicKeyId } from "@/lib/razorpay";
import { getLatestSubscription, isActiveSubscription } from "@/lib/billing";
import { rateLimit } from "@/lib/rate-limit";

/** Create a Razorpay subscription for the user and return the id for Checkout. */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (!billingEnabled()) {
    return NextResponse.json({ error: "Subscriptions aren't available yet." }, { status: 503 });
  }

  const rl = rateLimit(`subscribe:${user.id}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });

  // Already subscribed? Don't create a duplicate.
  const existing = await getLatestSubscription(user.id);
  if (isActiveSubscription(existing)) {
    return NextResponse.json({ alreadyActive: true });
  }

  try {
    const sub = await createSubscription({ profile_id: user.id, email: user.email ?? "" });

    // Persist with the service role (RLS has no user-write policy by design).
    const admin = createAdminClient();
    await admin.from("subscriptions").insert({
      profile_id: user.id,
      razorpay_subscription_id: sub.id,
      razorpay_customer_id: sub.customer_id ?? null,
      plan_id: sub.plan_id,
      status: sub.status,
      short_url: sub.short_url,
      current_start: epochToIso(sub.current_start),
      current_end: epochToIso(sub.current_end),
    });

    return NextResponse.json({
      subscriptionId: sub.id,
      keyId: publicKeyId(),
      shortUrl: sub.short_url,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
