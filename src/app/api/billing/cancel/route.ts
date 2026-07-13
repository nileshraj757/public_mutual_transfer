import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { cancelSubscription } from "@/lib/razorpay";
import { getLatestSubscription } from "@/lib/billing";

/** Cancel the user's subscription at the end of the current cycle. */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const sub = await getLatestSubscription(user.id);
  if (!sub?.razorpay_subscription_id || ["cancelled", "completed", "expired"].includes(sub.status)) {
    return NextResponse.json({ error: "No active subscription to cancel." }, { status: 400 });
  }

  try {
    await cancelSubscription(sub.razorpay_subscription_id, true);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  // Keep access until the period ends; the webhook will flip status on cancel.
  const admin = createAdminClient();
  await admin
    .from("subscriptions")
    .update({ cancel_at_period_end: true })
    .eq("razorpay_subscription_id", sub.razorpay_subscription_id);

  return NextResponse.json({ ok: true });
}
