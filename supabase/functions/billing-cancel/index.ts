// Cancel the user's subscription at the end of the current cycle (ported from
// src/app/api/billing/cancel/route.ts). Access lasts until the period ends; the
// webhook flips the status on cancel.
import { authenticate } from "../_shared/auth.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { cancelSubscription } from "../_shared/razorpay.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ctx = await authenticate(req);
  if (!ctx) return json({ error: "Not signed in." }, 401);
  const { admin, userId } = ctx;

  const { data: sub } = await admin
    .from("subscriptions")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sub?.razorpay_subscription_id || ["cancelled", "completed", "expired"].includes(sub.status)) {
    return json({ error: "No active subscription to cancel." }, 400);
  }

  try {
    await cancelSubscription(sub.razorpay_subscription_id, true);
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }

  await admin
    .from("subscriptions")
    .update({ cancel_at_period_end: true })
    .eq("razorpay_subscription_id", sub.razorpay_subscription_id);

  return json({ ok: true });
});
