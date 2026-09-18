import type { SupabaseClient } from "@supabase/supabase-js";
import type { Subscription } from "@/lib/types";
import { isActiveSubscription } from "@/lib/billing-core";

/**
 * Client-only (mobile) mirror of src/lib/billing.ts's isPremiumLocked — that
 * one is server-only (imports next/headers via supabase/server). Reads
 * NEXT_PUBLIC_RAZORPAY_KEY_ID directly, same as mobile/app/(app)/billing/page.tsx,
 * since Next.js inlines NEXT_PUBLIC_* vars into the client bundle at build time.
 */
export async function isPremiumLockedClient(supabase: SupabaseClient, userId: string): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) return false;
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return !isActiveSubscription((data as Subscription) ?? null);
}
