import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { epochToIso, verifyWebhookSignature } from "@/lib/razorpay";
import { notify } from "@/lib/notify";
import type { SubscriptionStatus } from "@/lib/types";

/**
 * Razorpay webhook — the source of truth for subscription lifecycle.
 *
 * Configure in Razorpay Dashboard → Settings → Webhooks with the URL
 *   https://<your-app>/api/webhooks/razorpay
 * the secret RAZORPAY_WEBHOOK_SECRET, and the `subscription.*` events.
 *
 * We read the RAW body (required for signature verification) via request.text().
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Bad payload." }, { status: 400 });
  }

  const entity = event?.payload?.subscription?.entity;
  if (!entity?.id) {
    // Not a subscription event we track — acknowledge so Razorpay stops retrying.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("subscriptions")
    .select("id, profile_id, status")
    .eq("razorpay_subscription_id", entity.id)
    .maybeSingle();

  const update: Record<string, unknown> = {
    status: entity.status as SubscriptionStatus,
    current_start: epochToIso(entity.current_start),
    current_end: epochToIso(entity.current_end),
  };

  await admin.from("subscriptions").update(update).eq("razorpay_subscription_id", entity.id);

  // Notify the user on meaningful transitions.
  if (row?.profile_id) {
    const type: string = event.event ?? "";
    if (type === "subscription.activated" || (type === "subscription.charged" && row.status !== "active")) {
      await notify({
        profileId: row.profile_id,
        kind: "system",
        title: "Premium is active",
        body: "Your subscription is active. Enjoy premium features.",
        link: "/billing",
      });
    } else if (type === "subscription.halted" || type === "subscription.pending") {
      await notify({
        profileId: row.profile_id,
        kind: "system",
        title: "Action needed on your subscription",
        body: "Your last payment didn't go through. Please update your payment method.",
        link: "/billing",
      });
    } else if (type === "subscription.cancelled") {
      await notify({
        profileId: row.profile_id,
        kind: "system",
        title: "Subscription cancelled",
        body: "Your premium access will end at the close of the current billing period.",
        link: "/billing",
      });
    }
  }

  return NextResponse.json({ ok: true });
}
