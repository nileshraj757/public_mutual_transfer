import type { SupabaseClient } from "@supabase/supabase-js";
// import type { Subscription } from "@/lib/types";
// import { isActiveSubscription } from "@/lib/billing-core";

/**
 * Client-only (mobile) mirror of src/lib/billing.ts's isPremiumLocked — that
 * one is server-only (imports next/headers via supabase/server). Reads
 * NEXT_PUBLIC_RAZORPAY_KEY_ID directly, same as mobile/app/(app)/billing/page.tsx,
 * since Next.js inlines NEXT_PUBLIC_* vars into the client bundle at build time.
 *
 * Subscription flow is temporarily disabled on mobile — premium is unlocked
 * for everyone until it's reimplemented. Restore the commented-out body below
 * to bring the paywall back.
 */
export async function isPremiumLockedClient(_supabase: SupabaseClient, _userId: string): Promise<boolean> {
  return false;
  // if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) return false;
  // const { data } = await supabase
  //   .from("subscriptions")
  //   .select("*")
  //   .eq("profile_id", userId)
  //   .order("created_at", { ascending: false })
  //   .limit(1)
  //   .maybeSingle();
  // return !isActiveSubscription((data as Subscription) ?? null);
}
