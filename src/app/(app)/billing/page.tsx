import { requireProfile } from "@/lib/auth";
import { getLatestSubscription, isActiveSubscription } from "@/lib/billing";
import { BillingClient } from "@/components/billing-client";

export const metadata = { title: "Premium — Mutual Transfer" };

export default async function BillingPage() {
  const profile = await requireProfile("/billing");
  const sub = await getLatestSubscription(profile.id);
  const active = isActiveSubscription(sub);

  const configured = Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
  const planName = process.env.NEXT_PUBLIC_PREMIUM_NAME || "Mutual Transfer Premium";
  const priceLabel = process.env.NEXT_PUBLIC_PREMIUM_PRICE_LABEL || "Monthly subscription";

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-sand-900">Premium</h1>
        <p className="mt-1 text-sm text-sand-600">
          Premium unlocks the official joint-application document and priority match alerts. The actual transfer always
          depends on the competent authority&apos;s approval.
        </p>
      </div>

      <BillingClient
        configured={configured}
        isActive={active}
        status={sub?.status ?? null}
        currentEnd={sub?.current_end ?? null}
        cancelAtPeriodEnd={sub?.cancel_at_period_end ?? false}
        email={profile.contact_email}
        planName={planName}
        priceLabel={priceLabel}
      />

      <p className="text-xs text-sand-400">
        Payments are processed securely by Razorpay. We never store your card or bank details.
      </p>
    </div>
  );
}
