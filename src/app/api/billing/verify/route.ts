import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { notify } from "@/lib/notify";

/**
 * Verify the Razorpay Checkout callback signature and mark the subscription
 * active (optimistic). The webhook remains the source of truth for billing
 * periods and renewals.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = (await request
    .json()
    .catch(() => ({}))) as {
    razorpay_payment_id?: string;
    razorpay_subscription_id?: string;
    razorpay_signature?: string;
  };

  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment fields." }, { status: 400 });
  }

  if (!verifyPaymentSignature(razorpay_payment_id, razorpay_subscription_id, razorpay_signature)) {
    return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin
    .from("subscriptions")
    .update({ status: "active" })
    .eq("razorpay_subscription_id", razorpay_subscription_id)
    .eq("profile_id", user.id);

  await notify({
    profileId: user.id,
    kind: "system",
    title: "Premium activated 🎉",
    body: "Thank you for subscribing. Premium features are now unlocked.",
    link: "/billing",
  });

  return NextResponse.json({ ok: true });
}
