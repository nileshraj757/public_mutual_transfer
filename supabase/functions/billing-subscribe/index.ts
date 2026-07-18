// Create a Razorpay subscription for the signed-in user (ported from
// src/app/api/billing/subscribe/route.ts). Returns the subscription id for the
// in-app Razorpay Checkout.
import { authenticate } from "../_shared/auth.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { billingEnabled, createSubscription, epochToIso, publicKeyId } from "../_shared/razorpay.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ctx = await authenticate(req);
  if (!ctx) return json({ error: "Not signed in." }, 401);
  const { admin, userId, email } = ctx;

  if (!billingEnabled()) return json({ error: "Subscriptions aren't available yet." }, 503);

  // Already subscribed? Don't create a duplicate.
  const { data: existing } = await admin
    .from("subscriptions")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing && isActive(existing)) return json({ alreadyActive: true });

  try {
    const sub = await createSubscription({ profile_id: userId, email: email ?? "" });
    await admin.from("subscriptions").insert({
      profile_id: userId,
      razorpay_subscription_id: sub.id,
      razorpay_customer_id: sub.customer_id ?? null,
      plan_id: sub.plan_id,
      status: sub.status,
      short_url: sub.short_url,
      current_start: epochToIso(sub.current_start),
      current_end: epochToIso(sub.current_end),
    });
    return json({ subscriptionId: sub.id, keyId: publicKeyId(), shortUrl: sub.short_url });
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
});

function isActive(sub: { status: string; current_end: string | null }): boolean {
  if (sub.status !== "active" && sub.status !== "authenticated") return false;
  if (sub.current_end && new Date(sub.current_end).getTime() < Date.now()) return false;
  return true;
}
