// Razorpay webhook — source of truth for subscription lifecycle (ported from
// src/app/api/webhooks/razorpay/route.ts). PUBLIC: no Bearer token; authenticity
// is proven by the x-razorpay-signature HMAC over the raw body.
//
// Point Razorpay Dashboard → Settings → Webhooks at:
//   https://<project-ref>.supabase.co/functions/v1/razorpay-webhook
// with the `subscription.*` events and RAZORPAY_WEBHOOK_SECRET.
//
// NOTE: deploy this function with `--no-verify-jwt` so Supabase doesn't require
// an Authorization header (Razorpay won't send one).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/cors.ts";
import { epochToIso, verifyWebhookSignature } from "../_shared/razorpay.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!verifyWebhookSignature(rawBody, signature)) {
    return json({ error: "Invalid signature." }, 400);
  }

  // deno-lint-ignore no-explicit-any
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "Bad payload." }, 400);
  }

  const entity = event?.payload?.subscription?.entity;
  if (!entity?.id) return json({ ok: true, ignored: true });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: row } = await admin
    .from("subscriptions")
    .select("id, profile_id, status")
    .eq("razorpay_subscription_id", entity.id)
    .maybeSingle();

  await admin
    .from("subscriptions")
    .update({
      status: entity.status,
      current_start: epochToIso(entity.current_start),
      current_end: epochToIso(entity.current_end),
    })
    .eq("razorpay_subscription_id", entity.id);

  if (row?.profile_id) {
    const type: string = event.event ?? "";
    let note: { title: string; body: string } | null = null;
    if (type === "subscription.activated" || (type === "subscription.charged" && row.status !== "active")) {
      note = { title: "Premium is active", body: "Your subscription is active. Enjoy premium features." };
    } else if (type === "subscription.halted" || type === "subscription.pending") {
      note = { title: "Action needed on your subscription", body: "Your last payment didn't go through. Please update your payment method." };
    } else if (type === "subscription.cancelled") {
      note = { title: "Subscription cancelled", body: "Your premium access will end at the close of the current billing period." };
    }
    if (note) {
      await admin.from("notifications").insert({
        profile_id: row.profile_id,
        kind: "system",
        title: note.title,
        body: note.body,
        link: "/billing",
      });
    }
  }

  return json({ ok: true });
});
