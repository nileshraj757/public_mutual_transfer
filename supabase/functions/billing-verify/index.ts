// Verify the Razorpay Checkout callback signature and mark the subscription
// active (ported from src/app/api/billing/verify/route.ts). The webhook remains
// the source of truth for billing periods/renewals.
import { authenticate } from "../_shared/auth.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { verifyPaymentSignature } from "../_shared/razorpay.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ctx = await authenticate(req);
  if (!ctx) return json({ error: "Not signed in." }, 401);
  const { admin, userId } = ctx;

  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = await req
    .json()
    .catch(() => ({}));

  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
    return json({ error: "Missing payment fields." }, 400);
  }
  if (!verifyPaymentSignature(razorpay_payment_id, razorpay_subscription_id, razorpay_signature)) {
    return json({ error: "Payment verification failed." }, 400);
  }

  await admin
    .from("subscriptions")
    .update({ status: "active" })
    .eq("razorpay_subscription_id", razorpay_subscription_id)
    .eq("profile_id", userId);

  await admin.from("notifications").insert({
    profile_id: userId,
    kind: "system",
    title: "Premium activated 🎉",
    body: "Thank you for subscribing. Premium features are now unlocked.",
    link: "/billing",
  });

  return json({ ok: true });
});
